import { z } from "zod";
import { publicProcedure, adminProcedure, router } from "../_core/trpc";
import { getCoupons, getCouponByCode, createCoupon, updateCoupon, deleteCoupon } from "../db";

export const couponsRouter = router({
  list: publicProcedure.query(() => getCoupons()),

  validate: publicProcedure
    .input(z.object({ code: z.string(), orderValue: z.number() }))
    .query(async ({ input }) => {
      const coupon = await getCouponByCode(input.code);
      if (!coupon) return { valid: false, message: "Cupom não encontrado" };
      if (!coupon.isActive) return { valid: false, message: "Cupom inativo" };
      if (coupon.validUntil && new Date() > coupon.validUntil)
        return { valid: false, message: "Cupom expirado" };
      if (coupon.maxUses && coupon.usedCount >= coupon.maxUses)
        return { valid: false, message: "Limite de usos atingido" };
      const minValue = parseFloat(coupon.minOrderValue ?? "0");
      if (input.orderValue < minValue)
        return {
          valid: false,
          message: `Valor mínimo para este cupom: R$ ${minValue.toFixed(2)}`,
        };
      const discount =
        coupon.type === "percentual"
          ? (input.orderValue * parseFloat(coupon.value)) / 100
          : parseFloat(coupon.value);
      return { valid: true, coupon, discount };
    }),

  create: adminProcedure
    .input(
      z.object({
        code: z.string().min(1),
        description: z.string().optional(),
        type: z.enum(["percentual", "fixo"]),
        value: z.string(),
        minOrderValue: z.string().optional(),
        maxUses: z.number().optional(),
        validFrom: z.date().optional(),
        validUntil: z.date().optional(),
      })
    )
    .mutation(({ input }) =>
      createCoupon({
        ...input,
        isActive: true,
        usedCount: 0,
        validFrom: input.validFrom ?? new Date(),
      })
    ),

  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        isActive: z.boolean().optional(),
        validUntil: z.date().optional(),
        maxUses: z.number().optional(),
        description: z.string().optional(),
      })
    )
    .mutation(({ input }) => {
      const { id, ...data } = input;
      return updateCoupon(id, data);
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteCoupon(input.id)),

  // Relatório de efetividade dos cupons
  usageReport: adminProcedure.query(async () => {
    const all = await getCoupons();
    return all.map((c) => ({
      id: c.id,
      code: c.code,
      description: c.description ?? "",
      type: c.type,
      value: parseFloat(c.value.toString()),
      usedCount: c.usedCount,
      maxUses: c.maxUses ?? null,
      usageRate: c.maxUses ? Math.round((c.usedCount / c.maxUses) * 100) : null,
      isActive: c.isActive,
      validFrom: c.validFrom,
      validUntil: c.validUntil ?? null,
      createdAt: c.createdAt,
    }));
  }),

  // Exportar cupons em CSV
  exportCsv: adminProcedure.query(async () => {
    const all = await getCoupons();
    return all.map((c) => ({
      id: c.id,
      code: c.code,
      description: c.description ?? "",
      type: c.type === "percentual" ? "Percentual (%)" : "Fixo (R$)",
      value: parseFloat(c.value.toString()),
      minOrderValue: parseFloat((c.minOrderValue ?? "0").toString()),
      maxUses: c.maxUses ?? 0,
      usedCount: c.usedCount,
      isActive: c.isActive ? "Ativo" : "Inativo",
      validFrom: c.validFrom,
      validUntil: c.validUntil ?? null,
      createdAt: c.createdAt,
    }));
  }),
});
