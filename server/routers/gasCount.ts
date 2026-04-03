import { z } from "zod";
import { adminProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { gasCount } from "../../drizzle/schema";
import { eq, desc, sql } from "drizzle-orm";
import { notifyOwner } from "../_core/notification";
import { getTodayDateStr } from "../timezone";

export const gasCountRouter = router({
  // ─── AUTOMÁTICO: Dados em tempo real do estoque + vendas ─────────────────────
  autoStats: adminProcedure
    .input(z.object({ date: z.string().optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Banco de dados indisponível");

      const date = input.date ?? await getTodayDateStr();
      const dateStart = `${date} 00:00:00`;
      const dateEnd = `${date} 23:59:59`;

      // Buscar todos os produtos de gás com estoque atual (inclui cheios e vazios)
      const products = await db.execute(sql`
        SELECT id, name, category, stockQty, fullStockQty, emptyStockQty, price
        FROM products
        WHERE category = 'gas' AND isActive = 1
        ORDER BY name
      `);

      // Vendidos no dia (por produto)
      const soldToday = await db.execute(sql`
        SELECT 
          oi.productId,
          p.name as productName,
          SUM(oi.quantity) as soldQty
        FROM order_items oi
        JOIN products p ON p.id = oi.productId
        JOIN orders o ON o.id = oi.orderId
        WHERE o.status != 'cancelado'
          AND o.createdAt BETWEEN ${dateStart} AND ${dateEnd}
          AND p.category = 'gas'
        GROUP BY oi.productId, p.name
      `);

      // Contagem manual do dia (se houver)
      const manualCount = await db
        .select()
        .from(gasCount)
        .where(eq(gasCount.countDate, date));

      const soldMap: Record<number, number> = {};
      for (const row of soldToday as any[]) {
        soldMap[row.productId] = Number(row.soldQty);
      }

      const manualMap: Record<string, typeof manualCount[0]> = {};
      for (const row of manualCount) {
        const key = row.productId ? String(row.productId) : row.productName;
        manualMap[key] = row;
      }

      const items = (products as any[]).map((p) => {
        const sold = soldMap[p.id] ?? 0;
        const manual = manualMap[String(p.id)] ?? manualMap[p.name];
        // Cheios: prioridade = contagem manual > fullStockQty do banco > stockQty
        const fullQty = manual ? (manual.fullQty ?? 0) : (Number(p.fullStockQty) > 0 ? Number(p.fullStockQty) : Number(p.stockQty));
        // Vazios: prioridade = contagem manual > emptyStockQty do banco
        const emptyQty = manual ? (manual.emptyQty ?? 0) : Number(p.emptyStockQty);

        return {
          productId: p.id,
          productName: p.name,
          category: p.category,
          price: p.price,
          // Estoque atual (cheios disponíveis no sistema)
          stockQty: Number(p.stockQty),
          // Cheios (manual ou estoque atual)
          fullQty,
          // Vazios (manual)
          emptyQty,
          // Vendidos no dia (automático via pedidos)
          soldQty: sold,
          // Total físico = cheios + vazios
          totalPhysical: fullQty + emptyQty,
          hasManualCount: !!manual,
        };
      });

      // Totais gerais
      const totalStock = items.reduce((s, i) => s + i.stockQty, 0);
      const totalFull = items.reduce((s, i) => s + i.fullQty, 0);
      const totalEmpty = items.reduce((s, i) => s + i.emptyQty, 0);
      const totalSold = items.reduce((s, i) => s + i.soldQty, 0);
      const totalPhysical = items.reduce((s, i) => s + i.totalPhysical, 0);

      // Receita do dia
      const revenueToday = await db.execute(sql`
        SELECT COALESCE(SUM(o.total), 0) as revenue
        FROM orders o
        WHERE o.status != 'cancelado'
          AND o.createdAt BETWEEN ${dateStart} AND ${dateEnd}
      `);
      const revenue = Number((revenueToday as any[])[0]?.revenue ?? 0);

      // Histórico de vendas últimos 7 dias
      const salesHistory = await db.execute(sql`
        SELECT 
          DATE(o.createdAt) as saleDate,
          SUM(oi.quantity) as totalSold,
          COALESCE(SUM(o.total), 0) as revenue
        FROM orders o
        JOIN order_items oi ON oi.orderId = o.id
        JOIN products p ON p.id = oi.productId
        WHERE o.status != 'cancelado'
          AND p.category = 'gas'
          AND o.createdAt >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
        GROUP BY DATE(o.createdAt)
        ORDER BY saleDate DESC
      `);

      return {
        date,
        items,
        totals: {
          totalStock,
          totalFull,
          totalEmpty,
          totalSold,
          totalPhysical,
          revenue,
        },
        salesHistory: (salesHistory as any[]).map((r) => ({
          date: r.saleDate,
          totalSold: Number(r.totalSold),
          revenue: Number(r.revenue),
        })),
      };
    }),

  // ─── MANUAL: Listar contagens por data ───────────────────────────────────────
  list: adminProcedure
    .input(z.object({ date: z.string().optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Banco de dados indisponível");
      const date = input.date ?? await getTodayDateStr();
      const rows = await db
        .select()
        .from(gasCount)
        .where(eq(gasCount.countDate, date))
        .orderBy(gasCount.productName);
      return rows;
    }),

  // ─── Histórico de contagens (últimos 30 dias) ────────────────────────────────
  history: adminProcedure
    .input(z.object({ limit: z.number().default(30) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Banco de dados indisponível");
      const rows = await db
        .select()
        .from(gasCount)
        .orderBy(desc(gasCount.countDate), gasCount.productName)
        .limit(input.limit * 10);
      const grouped: Record<string, typeof rows> = {};
      for (const row of rows) {
        if (!grouped[row.countDate]) grouped[row.countDate] = [];
        grouped[row.countDate].push(row);
      }
      return Object.entries(grouped)
        .slice(0, input.limit)
        .map(([date, items]) => ({
          date,
          items,
          totalFull: items.reduce((s, i) => s + (i.fullQty ?? 0), 0),
          totalEmpty: items.reduce((s, i) => s + (i.emptyQty ?? 0), 0),
          totalSold: items.reduce((s, i) => s + (i.soldQty ?? 0), 0),
        }));
    }),

  // ─── Salvar contagem manual do dia ───────────────────────────────────────────
  save: adminProcedure
    .input(z.object({
      date: z.string(),
      items: z.array(z.object({
        id: z.number().optional(),
        productId: z.number().optional(),
        productName: z.string(),
        fullQty: z.number().min(0),
        emptyQty: z.number().min(0),
        soldQty: z.number().min(0),
        returnedQty: z.number().min(0).default(0),
        notes: z.string().optional(),
      })),
      createdBy: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Banco de dados indisponível");
      await db.delete(gasCount).where(eq(gasCount.countDate, input.date));
      if (input.items.length > 0) {
        await db.insert(gasCount).values(
          input.items.map((item) => ({
            countDate: input.date,
            productId: item.productId ?? null,
            productName: item.productName,
            fullQty: item.fullQty,
            emptyQty: item.emptyQty,
            soldQty: item.soldQty,
            returnedQty: item.returnedQty,
            notes: item.notes ?? null,
            createdBy: input.createdBy ?? "admin",
          }))
        );
        // Sincronizar fullStockQty e emptyStockQty nos produtos do banco
        for (const item of input.items) {
          if (item.productId) {
            await db.execute(sql`
              UPDATE products
              SET fullStockQty = ${item.fullQty},
                  emptyStockQty = ${item.emptyQty},
                  stockQty = ${item.fullQty}
              WHERE id = ${item.productId}
            `);
          }
        }
      }
      const totalFull = input.items.reduce((s, i) => s + i.fullQty, 0);
      const totalEmpty = input.items.reduce((s, i) => s + i.emptyQty, 0);
      const totalSold = input.items.reduce((s, i) => s + i.soldQty, 0);
      await notifyOwner({
        title: `📦 Contagem de Gás — ${input.date}`,
        content: `Contagem salva: ${totalFull} cheios | ${totalEmpty} vazios | ${totalSold} vendidos`,
      });
      return { success: true };
    }),

  // ─── Deletar contagem de um dia ──────────────────────────────────────────────
  deleteByDate: adminProcedure
    .input(z.object({ date: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Banco de dados indisponível");
      await db.delete(gasCount).where(eq(gasCount.countDate, input.date));
      return { success: true };
    }),

  // ─── Resumo geral ────────────────────────────────────────────────────────────
  summary: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Banco de dados indisponível");
    const today = await getTodayDateStr();
    const todayRows = await db
      .select()
      .from(gasCount)
      .where(eq(gasCount.countDate, today));
    return {
      today: {
        date: today,
        totalFull: todayRows.reduce((s, i) => s + (i.fullQty ?? 0), 0),
        totalEmpty: todayRows.reduce((s, i) => s + (i.emptyQty ?? 0), 0),
        totalSold: todayRows.reduce((s, i) => s + (i.soldQty ?? 0), 0),
        items: todayRows,
      },
    };
  }),
});
