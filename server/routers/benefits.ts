/**
 * Router de Benefícios
 * Gerencia benefícios, programas sociais (Gás do Povo) e concessão a clientes
 */
import { z } from "zod";
import { router, adminProcedure, publicProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { benefits, customerBenefits, gasVouchers, customers, orders } from "../../drizzle/schema";
import { eq, desc, and, sql, like, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";

// ─── Helper: gerar código de vale gás ────────────────────────────────────────
function generateVoucherCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "VG-";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export const benefitsRouter = router({
  // ─── Listar todos os benefícios ──────────────────────────────────────────
  list: adminProcedure
    .input(z.object({
      search: z.string().optional(),
      type: z.string().optional(),
      isActive: z.boolean().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      let rows = await db.select().from(benefits).orderBy(desc(benefits.createdAt));

      if (input?.search) {
        const s = input.search.toLowerCase();
        rows = rows.filter(b => b.name.toLowerCase().includes(s) || (b.description ?? "").toLowerCase().includes(s));
      }
      if (input?.type) {
        rows = rows.filter(b => b.type === input.type);
      }
      if (input?.isActive !== undefined) {
        rows = rows.filter(b => b.isActive === input.isActive);
      }

      return rows;
    }),

  // ─── Criar benefício ─────────────────────────────────────────────────────
  create: adminProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      type: z.enum(["desconto", "vale_gas", "frete_gratis", "brinde", "outro"]),
      discountType: z.enum(["fixo", "percentual"]).optional(),
      discountValue: z.number().min(0).optional(),
      voucherProductId: z.number().optional(),
      voucherProductName: z.string().optional(),
      isActive: z.boolean().default(true),
      requiresMinOrder: z.number().min(0).default(0),
      maxUsesPerCustomer: z.number().min(1).default(1),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      const [result] = await db.insert(benefits).values({
        name: input.name,
        description: input.description ?? null,
        type: input.type,
        discountType: input.discountType ?? "fixo",
        discountValue: String(input.discountValue ?? 0),
        voucherProductId: input.voucherProductId ?? null,
        voucherProductName: input.voucherProductName ?? null,
        isActive: input.isActive,
        requiresMinOrder: String(input.requiresMinOrder ?? 0),
        maxUsesPerCustomer: input.maxUsesPerCustomer ?? 1,
        totalUses: 0,
        notes: input.notes ?? null,
      });

      return { success: true, id: (result as any).insertId };
    }),

  // ─── Atualizar benefício ─────────────────────────────────────────────────
  update: adminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      type: z.enum(["desconto", "vale_gas", "frete_gratis", "brinde", "outro"]).optional(),
      discountType: z.enum(["fixo", "percentual"]).optional(),
      discountValue: z.number().min(0).optional(),
      voucherProductId: z.number().optional(),
      voucherProductName: z.string().optional(),
      isActive: z.boolean().optional(),
      requiresMinOrder: z.number().min(0).optional(),
      maxUsesPerCustomer: z.number().min(1).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      const { id, ...data } = input;
      const updateData: any = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.type !== undefined) updateData.type = data.type;
      if (data.discountType !== undefined) updateData.discountType = data.discountType;
      if (data.discountValue !== undefined) updateData.discountValue = String(data.discountValue);
      if (data.voucherProductId !== undefined) updateData.voucherProductId = data.voucherProductId;
      if (data.voucherProductName !== undefined) updateData.voucherProductName = data.voucherProductName;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;
      if (data.requiresMinOrder !== undefined) updateData.requiresMinOrder = String(data.requiresMinOrder);
      if (data.maxUsesPerCustomer !== undefined) updateData.maxUsesPerCustomer = data.maxUsesPerCustomer;
      if (data.notes !== undefined) updateData.notes = data.notes;

      await db.update(benefits).set(updateData).where(eq(benefits.id, id));
      return { success: true };
    }),

  // ─── Deletar benefício ───────────────────────────────────────────────────
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      await db.delete(benefits).where(eq(benefits.id, input.id));
      return { success: true };
    }),

  // ─── Conceder benefício a um cliente ─────────────────────────────────────
  grantToCustomer: adminProcedure
    .input(z.object({
      customerId: z.number(),
      customerName: z.string(),
      benefitId: z.number(),
      orderId: z.number().optional(),
      notes: z.string().optional(),
      expiresInDays: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      // Buscar o benefício
      const [benefit] = await db.select().from(benefits).where(eq(benefits.id, input.benefitId)).limit(1);
      if (!benefit) throw new TRPCError({ code: "NOT_FOUND", message: "Benefício não encontrado" });

      const expiresAt = input.expiresInDays
        ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000)
        : null;

      // Criar o customer_benefit
      await db.insert(customerBenefits).values({
        customerId: input.customerId,
        customerName: input.customerName,
        benefitId: input.benefitId,
        benefitName: benefit.name,
        status: "ativo",
        orderId: input.orderId ?? null,
        grantedAt: new Date(),
        expiresAt,
        notes: input.notes ?? null,
      });

      // Se for vale_gas, criar o voucher automaticamente
      if (benefit.type === "vale_gas") {
        const code = generateVoucherCode();
        await db.insert(gasVouchers).values({
          code,
          customerId: input.customerId,
          customerName: input.customerName,
          benefitId: input.benefitId,
          productId: benefit.voucherProductId ?? null,
          productName: benefit.voucherProductName ?? "Botijão P13 (13kg)",
          status: "ativo",
          issuedAt: new Date(),
          expiresAt,
          issuedBy: ctx.user?.name ?? "admin",
          notes: input.notes ?? null,
        });
      }

      // Incrementar totalUses
      await db.update(benefits)
        .set({ totalUses: sql`${benefits.totalUses} + 1` })
        .where(eq(benefits.id, input.benefitId));

      return { success: true };
    }),

  // ─── Listar benefícios de um cliente ─────────────────────────────────────
  getCustomerBenefits: adminProcedure
    .input(z.object({ customerId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      return db.select().from(customerBenefits)
        .where(eq(customerBenefits.customerId, input.customerId))
        .orderBy(desc(customerBenefits.createdAt));
    }),

  // ─── Listar todos os customer_benefits com paginação ─────────────────────
  listCustomerBenefits: adminProcedure
    .input(z.object({
      search: z.string().optional(),
      status: z.string().optional(),
      benefitId: z.number().optional(),
      limit: z.number().default(50),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      let rows = await db.select().from(customerBenefits)
        .orderBy(desc(customerBenefits.createdAt))
        .limit(input.limit);

      if (input.search) {
        const s = input.search.toLowerCase();
        rows = rows.filter(r => (r.customerName ?? "").toLowerCase().includes(s) || (r.benefitName ?? "").toLowerCase().includes(s));
      }
      if (input.status) rows = rows.filter(r => r.status === input.status);
      if (input.benefitId) rows = rows.filter(r => r.benefitId === input.benefitId);

      return rows;
    }),

  // ─── Estatísticas de benefícios ──────────────────────────────────────────
  stats: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

    const allBenefits = await db.select().from(benefits);
    const allCustomerBenefits = await db.select().from(customerBenefits);
    const allVouchers = await db.select().from(gasVouchers);

    const active = allCustomerBenefits.filter(b => b.status === "ativo").length;
    const used = allCustomerBenefits.filter(b => b.status === "usado").length;
    const vouchersActive = allVouchers.filter(v => v.status === "ativo").length;
    const vouchersUsed = allVouchers.filter(v => v.status === "usado").length;

    return {
      totalBenefits: allBenefits.length,
      activeBenefits: allBenefits.filter(b => b.isActive).length,
      totalGranted: allCustomerBenefits.length,
      activeGrants: active,
      usedGrants: used,
      totalVouchers: allVouchers.length,
      activeVouchers: vouchersActive,
      usedVouchers: vouchersUsed,
      benefitBreakdown: allBenefits.map(b => ({
        id: b.id,
        name: b.name,
        type: b.type,
        totalUses: b.totalUses,
        isActive: b.isActive,
      })),
    };
  }),
});
