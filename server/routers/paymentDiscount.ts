import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  applyPaymentDiscount,
  getOrderDiscounts,
  createGasReplenishment,
  addGasReplenishmentItem,
  processGasReplenishment,
  getReplenishmentHistory,
  getReplenishmentDetails,
  getDiscountHistory,
  getDiscountStatistics,
} from "../paymentDiscountManagement";

export const paymentDiscountRouter = router({
  /**
   * Aplicar desconto em reais ao pagamento
   */
  applyDiscount: protectedProcedure
    .input(
      z.object({
        orderId: z.number(),
        paymentMethod: z.enum(["dinheiro", "pix", "debito", "credito", "fiado"]),
        discountAmount: z.number().min(0, "Desconto não pode ser negativo"),
        discountReason: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user?.role !== "admin") {
        throw new Error("Apenas administradores podem aplicar descontos");
      }

      return applyPaymentDiscount({
        orderId: input.orderId,
        paymentMethod: input.paymentMethod,
        discountAmount: input.discountAmount,
        discountReason: input.discountReason,
        appliedBy: ctx.user?.name || undefined,
        notes: input.notes,
      });
    }),

  /**
   * Obter descontos de um pedido
   */
  getOrderDiscounts: protectedProcedure
    .input(z.object({ orderId: z.number() }))
    .query(async ({ input }) => {
      return getOrderDiscounts(input.orderId);
    }),

  /**
   * Criar reposição de gás na distribuidora
   */
  createReplenishment: protectedProcedure
    .input(
      z.object({
        distributorName: z.string().min(1, "Nome da distribuidora é obrigatório"),
        truckPlate: z.string().optional(),
        driverName: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user?.role !== "admin") {
        throw new Error("Apenas administradores podem criar reposições");
      }

      return createGasReplenishment({
        distributorName: input.distributorName,
        truckPlate: input.truckPlate,
        driverName: input.driverName,
        notes: input.notes,
      });
    }),

  /**
   * Adicionar item à reposição
   */
  addReplenishmentItem: protectedProcedure
    .input(
      z.object({
        replenishmentId: z.number(),
        productId: z.number(),
        productName: z.string(),
        emptySent: z.number().min(0, "Quantidade de vazios não pode ser negativa"),
        fullReceived: z.number().min(0, "Quantidade de cheios não pode ser negativa"),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user?.role !== "admin") {
        throw new Error("Apenas administradores podem adicionar itens");
      }

      return addGasReplenishmentItem({
        replenishmentId: input.replenishmentId,
        productId: input.productId,
        productName: input.productName,
        emptySent: input.emptySent,
        fullReceived: input.fullReceived,
        notes: input.notes,
      });
    }),

  /**
   * Processar reposição (finalizar e atualizar estoque)
   */
  processReplenishment: protectedProcedure
    .input(z.object({ replenishmentId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user?.role !== "admin") {
        throw new Error("Apenas administradores podem processar reposições");
      }

      return processGasReplenishment(input.replenishmentId, ctx.user?.name || "Sistema");
    }),

  /**
   * Obter histórico de reposições
   */
  replenishmentHistory: protectedProcedure
    .input(z.object({ limit: z.number().optional() }).optional())
    .query(async ({ input }) => {
      return getReplenishmentHistory(input?.limit ?? 50);
    }),

  /**
   * Obter detalhes de uma reposição
   */
  replenishmentDetails: protectedProcedure
    .input(z.object({ replenishmentId: z.number() }))
    .query(async ({ input }) => {
      return getReplenishmentDetails(input.replenishmentId);
    }),

  /**
   * Obter histórico de descontos
   */
  discountHistory: protectedProcedure
    .input(z.object({ limit: z.number().optional() }).optional())
    .query(async ({ input }) => {
      return getDiscountHistory(input?.limit ?? 100);
    }),

  /**
   * Obter estatísticas de descontos
   */
  discountStatistics: protectedProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ input }) => {
      return getDiscountStatistics(input.startDate, input.endDate);
    }),
});
