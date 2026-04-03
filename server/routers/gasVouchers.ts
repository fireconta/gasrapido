/**
 * Router de Vale Gás
 * Gerencia emissão, consulta e uso de vales gás
 */
import { z } from "zod";
import { router, adminProcedure, publicProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { gasVouchers, benefits, customers } from "../../drizzle/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

function generateVoucherCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "VG-";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export const gasVouchersRouter = router({
  // ─── Listar todos os vales gás ───────────────────────────────────────────
  list: adminProcedure
    .input(z.object({
      search: z.string().optional(),
      status: z.string().optional(),
      limit: z.number().default(100),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      let rows = await db.select().from(gasVouchers)
        .orderBy(desc(gasVouchers.createdAt))
        .limit(input.limit);

      if (input.search) {
        const s = input.search.toLowerCase();
        rows = rows.filter(v =>
          v.code.toLowerCase().includes(s) ||
          (v.customerName ?? "").toLowerCase().includes(s) ||
          (v.customerPhone ?? "").includes(s)
        );
      }
      if (input.status) {
        rows = rows.filter(v => v.status === input.status);
      }

      return rows;
    }),

  // ─── Emitir novo vale gás manualmente ────────────────────────────────────
  issue: adminProcedure
    .input(z.object({
      customerId: z.number().optional(),
      customerName: z.string().min(1),
      customerPhone: z.string().optional(),
      benefitId: z.number().optional(),
      productId: z.number().optional(),
      productName: z.string().default("Botijão P13 (13kg)"),
      expiresInDays: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      // Gerar código único
      let code = generateVoucherCode();
      let attempts = 0;
      while (attempts < 10) {
        const existing = await db.select({ id: gasVouchers.id })
          .from(gasVouchers).where(eq(gasVouchers.code, code)).limit(1);
        if (existing.length === 0) break;
        code = generateVoucherCode();
        attempts++;
      }

      const expiresAt = input.expiresInDays
        ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000)
        : null;

      const [result] = await db.insert(gasVouchers).values({
        code,
        customerId: input.customerId ?? null,
        customerName: input.customerName,
        customerPhone: input.customerPhone ?? null,
        benefitId: input.benefitId ?? null,
        productId: input.productId ?? null,
        productName: input.productName,
        status: "ativo",
        issuedAt: new Date(),
        expiresAt,
        issuedBy: ctx.user?.name ?? "admin",
        notes: input.notes ?? null,
      });

      return { success: true, code, id: (result as any).insertId };
    }),

  // ─── Consultar vale gás por código ───────────────────────────────────────
  getByCode: publicProcedure
    .input(z.object({ code: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      const [voucher] = await db.select().from(gasVouchers)
        .where(eq(gasVouchers.code, input.code.toUpperCase())).limit(1);

      if (!voucher) return null;
      return voucher;
    }),

  // ─── Usar vale gás em um pedido ──────────────────────────────────────────
  use: adminProcedure
    .input(z.object({
      code: z.string(),
      orderId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      const [voucher] = await db.select().from(gasVouchers)
        .where(eq(gasVouchers.code, input.code.toUpperCase())).limit(1);

      if (!voucher) throw new TRPCError({ code: "NOT_FOUND", message: "Vale gás não encontrado" });
      if (voucher.status !== "ativo") {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Vale gás está ${voucher.status}` });
      }
      if (voucher.expiresAt && new Date(voucher.expiresAt) < new Date()) {
        await db.update(gasVouchers).set({ status: "expirado" }).where(eq(gasVouchers.id, voucher.id));
        throw new TRPCError({ code: "BAD_REQUEST", message: "Vale gás expirado" });
      }

      await db.update(gasVouchers).set({
        status: "usado",
        usedAt: new Date(),
        usedOrderId: input.orderId ?? null,
      }).where(eq(gasVouchers.id, voucher.id));

      return { success: true, voucher };
    }),

  // ─── Cancelar vale gás ───────────────────────────────────────────────────
  cancel: adminProcedure
    .input(z.object({ id: z.number(), reason: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      await db.update(gasVouchers).set({
        status: "cancelado",
        notes: input.reason ?? null,
      }).where(eq(gasVouchers.id, input.id));

      return { success: true };
    }),

  // ─── Estatísticas de vale gás ────────────────────────────────────────────
  stats: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

    const all = await db.select().from(gasVouchers);
    const today = new Date().toISOString().slice(0, 10);

    const active = all.filter(v => v.status === "ativo").length;
    const used = all.filter(v => v.status === "usado").length;
    const expired = all.filter(v => v.status === "expirado").length;
    const cancelled = all.filter(v => v.status === "cancelado").length;
    const issuedToday = all.filter(v => v.issuedAt && new Date(v.issuedAt).toISOString().slice(0, 10) === today).length;
    const usedToday = all.filter(v => v.usedAt && new Date(v.usedAt).toISOString().slice(0, 10) === today).length;

    return {
      total: all.length,
      active,
      used,
      expired,
      cancelled,
      issuedToday,
      usedToday,
    };
  }),
});
