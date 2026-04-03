import { z } from "zod";
import { adminProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { promotions } from "../../drizzle/schema";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";

export const promotionsRouter = router({
  // ─── Listar promoções ────────────────────────────────────────────────────────
  list: adminProcedure
    .input(z.object({
      search: z.string().optional(),
      activeOnly: z.boolean().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Banco de dados indisponível");

      const rows = await db
        .select()
        .from(promotions)
        .orderBy(desc(promotions.createdAt));

      let filtered = rows;
      if (input.search) {
        const s = input.search.toLowerCase();
        filtered = filtered.filter(p =>
          p.name.toLowerCase().includes(s) ||
          (p.description ?? "").toLowerCase().includes(s)
        );
      }
      if (input.activeOnly) {
        const now = new Date();
        filtered = filtered.filter(p =>
          p.isActive &&
          (p.validFrom ? new Date(p.validFrom) <= now : true) &&
          (!p.validUntil || new Date(p.validUntil) >= now) &&
          (!p.maxUses || (p.usedCount ?? 0) < p.maxUses)
        );
      }
      return filtered;
    }),

  // ─── Promoções públicas (para o frontend do cliente) ─────────────────────────
  listActive: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const now = new Date();
    const rows = await db
      .select()
      .from(promotions)
      .where(eq(promotions.isActive, true))
      .orderBy(desc(promotions.isFeatured), desc(promotions.createdAt));
    return rows.filter(p =>
      (p.validFrom ? new Date(p.validFrom) <= now : true) &&
      (!p.validUntil || new Date(p.validUntil) >= now) &&
      (!p.maxUses || (p.usedCount ?? 0) < p.maxUses)
    );
  }),

  // ─── Estatísticas ────────────────────────────────────────────────────────────
  stats: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Banco de dados indisponível");
    const now = new Date();
    const all = await db.select().from(promotions);
    const active = all.filter(p =>
      p.isActive &&
      (p.validFrom ? new Date(p.validFrom) <= now : true) &&
      (!p.validUntil || new Date(p.validUntil) >= now)
    );
    const totalUsed = all.reduce((s, p) => s + (p.usedCount ?? 0), 0);
    return {
      total: all.length,
      active: active.length,
      inactive: all.length - active.length,
      totalUsed,
    };
  }),

  // ─── Criar promoção ──────────────────────────────────────────────────────────
  create: adminProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      discountType: z.enum(["percentual", "fixo", "frete_gratis"]),
      discountValue: z.string(),
      appliesTo: z.enum(["todos", "categoria", "produto"]).default("todos"),
      appliesToCategory: z.string().optional(),
      appliesToProductId: z.number().optional(),
      minOrderValue: z.string().optional(),
      minQuantity: z.number().int().min(1).default(1),
      validFrom: z.string(),
      validUntil: z.string().optional(),
      maxUses: z.number().int().optional(),
      maxUsesPerCustomer: z.number().int().optional(),
      isActive: z.boolean().default(true),
      imageUrl: z.string().optional(),
      isFeatured: z.boolean().default(false),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Banco de dados indisponível");
      const [result] = await db.insert(promotions).values({
        name: input.name,
        description: input.description,
        discountType: input.discountType,
        discountValue: input.discountValue,
        appliesTo: input.appliesTo,
        appliesToCategory: input.appliesToCategory,
        appliesToProductId: input.appliesToProductId,
        minOrderValue: input.minOrderValue ?? "0",
        minQuantity: input.minQuantity,
        validFrom: new Date(input.validFrom),
        validUntil: input.validUntil ? new Date(input.validUntil) : null,
        maxUses: input.maxUses,
        maxUsesPerCustomer: input.maxUsesPerCustomer,
        isActive: input.isActive,
        imageUrl: input.imageUrl,
        isFeatured: input.isFeatured,
        notes: input.notes,
      });
      return { success: true };
    }),

  // ─── Atualizar promoção ──────────────────────────────────────────────────────
  update: adminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      discountType: z.enum(["percentual", "fixo", "frete_gratis"]).optional(),
      discountValue: z.string().optional(),
      appliesTo: z.enum(["todos", "categoria", "produto"]).optional(),
      appliesToCategory: z.string().optional(),
      appliesToProductId: z.number().optional(),
      minOrderValue: z.string().optional(),
      minQuantity: z.number().int().min(1).optional(),
      validFrom: z.string().optional(),
      validUntil: z.string().optional().nullable(),
      maxUses: z.number().int().optional().nullable(),
      maxUsesPerCustomer: z.number().int().optional().nullable(),
      isActive: z.boolean().optional(),
      imageUrl: z.string().optional(),
      isFeatured: z.boolean().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Banco de dados indisponível");
      const { id, validFrom, validUntil, ...rest } = input;
      const updateData: any = { ...rest };
      if (validFrom) updateData.validFrom = new Date(validFrom);
      if (validUntil !== undefined) updateData.validUntil = validUntil ? new Date(validUntil) : null;
      await db.update(promotions).set(updateData).where(eq(promotions.id, id));
      return { success: true };
    }),

  // ─── Deletar promoção ────────────────────────────────────────────────────────
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Banco de dados indisponível");
      await db.delete(promotions).where(eq(promotions.id, input.id));
      return { success: true };
    }),

  // ─── Ativar/Desativar promoção ───────────────────────────────────────────────
  toggleActive: adminProcedure
    .input(z.object({ id: z.number(), isActive: z.boolean() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Banco de dados indisponível");
      await db.update(promotions)
        .set({ isActive: input.isActive })
        .where(eq(promotions.id, input.id));
      return { success: true };
    }),
});
