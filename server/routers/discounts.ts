import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getCouponByCode, getDiscountCouponByCode } from "../db";

export const discountsRouter = router({
  // Validar e calcular desconto de cupom — como mutation para aceitar POST do frontend
  validateCoupon: publicProcedure
    .input(z.object({
      code: z.string().min(1),
      orderTotal: z.number().min(0).optional(),
      subtotal: z.number().min(0).optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        const code = input.code.toUpperCase().trim();
        const orderValue = input.orderTotal ?? input.subtotal ?? 0;

        // Busca primeiro na tabela discount_coupons, depois na coupons
        const coupon = (await getDiscountCouponByCode(code) ?? await getCouponByCode(code)) as any;

        if (!coupon) {
          return { valid: false, message: "Cupom não encontrado", discountAmount: 0, coupon: null };
        }

        // Verificar se está ativo
        if (!coupon.isActive) {
          return { valid: false, message: "Cupom inativo", discountAmount: 0, coupon: null };
        }

        // Verificar validade
        const now = new Date();
        const expiry = coupon.validUntil ?? coupon.expiresAt ?? coupon.expiryAt ?? coupon.expiryDate;
        if (expiry && new Date(expiry) < now) {
          return { valid: false, message: "Cupom expirado", discountAmount: 0, coupon: null };
        }

        // Verificar data de início
        if (coupon.validFrom && new Date(coupon.validFrom) > now) {
          return { valid: false, message: "Cupom ainda não está válido", discountAmount: 0, coupon: null };
        }

        // Verificar limite de usos
        const maxUses = coupon.maxUses ?? coupon.usageLimit;
        const usedCount = coupon.usedCount ?? 0;
        if (maxUses && usedCount >= maxUses) {
          return { valid: false, message: "Limite de usos atingido", discountAmount: 0, coupon: null };
        }

        // Verificar valor mínimo do pedido
        const minValue = parseFloat(String(coupon.minOrderValue ?? "0"));
        if (orderValue < minValue) {
          return {
            valid: false,
            message: `Valor mínimo para este cupom: R$ ${minValue.toFixed(2)}`,
            discountAmount: 0,
            coupon: null
          };
        }

        // Calcular desconto — suporta campos type/discountType e value/discountValue
        const discountType = coupon.discountType ?? coupon.type ?? "fixo";
        const rawValue = coupon.discountValue ?? coupon.value ?? 0;
        const couponValue = parseFloat(String(rawValue));
        let discountAmount = 0;

        if (discountType === "percentual" || discountType === "percent") {
          discountAmount = (orderValue * couponValue) / 100;
          const maxDiscount = coupon.maxDiscount;
          if (maxDiscount) {
            discountAmount = Math.min(discountAmount, parseFloat(String(maxDiscount)));
          }
        } else {
          discountAmount = couponValue;
        }

        // Garantir que o desconto não ultrapasse o total
        discountAmount = Math.min(discountAmount, orderValue);
        discountAmount = Number(discountAmount.toFixed(2));

        return {
          valid: true,
          message: coupon.description ?? "Cupom válido",
          discountAmount,
          coupon: {
            code: coupon.code,
            discountType,
            discountValue: couponValue,
            description: coupon.description ?? ""
          }
        };
      } catch (error) {
        console.error("[Discount] Error validating coupon:", error);
        return { valid: false, message: "Erro ao validar cupom", discountAmount: 0, coupon: null };
      }
    }),

  // Calcular desconto por tipo (percentual ou fixo)
  calculate: publicProcedure
    .input(z.object({
      type: z.enum(["percentual", "fixo"]),
      value: z.number().min(0),
      subtotal: z.number().min(0)
    }))
    .query(({ input }) => {
      let discount = 0;
      if (input.type === "percentual") {
        discount = (input.subtotal * input.value) / 100;
      } else {
        discount = input.value;
      }
      discount = Math.min(discount, input.subtotal);
      return {
        discount: Number(discount.toFixed(2)),
        finalTotal: Number((input.subtotal - discount).toFixed(2))
      };
    }),
});
