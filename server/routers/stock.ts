import { z } from "zod";
import { publicProcedure, adminProcedure, router } from "../_core/trpc";
import { getStockMovements, addStockMovement, getLowStockProducts, getAllProducts, getProductById } from "../db";
import { notifyOwner } from "../_core/notification";
import { getDb } from "../db";
import { sql } from "drizzle-orm";

export const stockRouter = router({
  // Movimentações de estoque — apenas admin
  movements: adminProcedure
    .input(z.object({ productId: z.number().optional(), limit: z.number().optional() }))
    .query(({ input }) => getStockMovements(input.productId)),

  // Produtos com estoque baixo — apenas admin
  lowStock: adminProcedure.query(() => getLowStockProducts()),

  // Visão geral do estoque — apenas admin
  overview: adminProcedure.query(async () => {
    const allProducts = await getAllProducts();
    const lowStock = await getLowStockProducts();
    const totalUnits = allProducts.reduce((acc, p) => acc + p.stockQty, 0);
    return { allProducts, lowStock, totalUnits };
  }),

  // Exportar movimentações de estoque em CSV
  exportCsv: adminProcedure.query(async () => {
    const movements = await getStockMovements();
    return movements.map((m) => ({
      id: m.id,
      productName: m.productName,
      type: m.type,
      quantity: m.quantity,
      previousQty: m.previousQty,
      newQty: m.newQty,
      reason: m.reason ?? "",
      createdAt: m.createdAt,
    }));
  }),

  // Ajuste de cheios e vazios separadamente (para produtos de gás)
  adjustGas: adminProcedure
    .input(z.object({
      productId: z.number(),
      fullQty: z.number().int().min(0),
      emptyQty: z.number().int().min(0),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Banco de dados indisponível");
      const product = await getProductById(input.productId);
      if (!product) throw new Error("Produto não encontrado");
      const previousQty = product.stockQty;
      const newStockQty = input.fullQty; // stockQty = cheios disponíveis
      await db.execute(sql`
        UPDATE products
        SET fullStockQty = ${input.fullQty},
            emptyStockQty = ${input.emptyQty},
            stockQty = ${newStockQty}
        WHERE id = ${input.productId}
      `);
      await addStockMovement({
        productId: input.productId,
        productName: product.name,
        type: "ajuste",
        quantity: Math.abs(newStockQty - previousQty),
        previousQty,
        newQty: newStockQty,
        reason: input.reason ?? `Ajuste manual: ${input.fullQty} cheios / ${input.emptyQty} vazios`,
      });
      return { success: true, fullQty: input.fullQty, emptyQty: input.emptyQty };
    }),

  // Ajuste de estoque — apenas admin
  adjust: adminProcedure
    .input(
      z.object({
        productId: z.number(),
        quantity: z.number().int(),
        type: z.enum(["entrada", "ajuste"]),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const product = await getProductById(input.productId);
      if (!product) throw new Error("Produto não encontrado");
      const previousQty = product.stockQty;
      const newQty = input.type === "entrada" ? previousQty + input.quantity : Math.max(0, input.quantity);
      await addStockMovement({
        productId: input.productId,
        productName: product.name,
        type: input.type,
        quantity: input.quantity,
        previousQty,
        newQty,
        reason: input.reason,
      });
      const lowStockItems = await getLowStockProducts();
      const affectedProduct = lowStockItems.find((p) => p.id === input.productId);
      if (affectedProduct) {
        await notifyOwner({
          title: `⚠️ Estoque Baixo: ${affectedProduct.name}`,
          content: `O produto "${affectedProduct.name}" está com apenas ${affectedProduct.stockQty} unidades (mínimo: ${affectedProduct.minStock}).`,
        });
      }
      return { success: true, newQty };
    }),
});
