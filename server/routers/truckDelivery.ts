import { z } from "zod";
import { adminProcedure, router } from "../_core/trpc";
import {
  createTruckDelivery,
  addTruckDeliveryItem,
  processTruckDelivery,
  getTruckDeliveryHistory,
  getTruckDeliveryDetails,
  getInventoryAdjustmentHistory,
  getStockReport,
  getStockStatistics,
  getDailyGasCount,
  recordDailyGasCount,
  getGasCountHistory,
} from "../gasManagement";

export const truckDeliveryRouter = router({
  /** Criar uma nova entrega de caminhão */
  create: adminProcedure
    .input(
      z.object({
        truckPlate: z.string().min(1, "Placa do caminhão é obrigatória"),
        driverId: z.number().optional(),
        driverName: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return createTruckDelivery({
        truckPlate: input.truckPlate,
        driverId: input.driverId,
        driverName: input.driverName,
        notes: input.notes,
      });
    }),

  /** Adicionar item à entrega do caminhão */
  addItem: adminProcedure
    .input(
      z.object({
        truckDeliveryId: z.number(),
        productId: z.number(),
        productName: z.string(),
        emptyReceived: z.number().min(0, "Quantidade de vazios não pode ser negativa"),
        fullDelivered: z.number().min(0, "Quantidade de cheios não pode ser negativa"),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return addTruckDeliveryItem({
        truckDeliveryId: input.truckDeliveryId,
        productId: input.productId,
        productName: input.productName,
        emptyReceived: input.emptyReceived,
        fullDelivered: input.fullDelivered,
        notes: input.notes,
      });
    }),

  /** Processar entrega do caminhão (finalizar) — atualiza estoque automaticamente */
  process: adminProcedure
    .input(z.object({ truckDeliveryId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      return processTruckDelivery(input.truckDeliveryId, ctx.user?.name || "Sistema");
    }),

  /** Obter histórico de entregas */
  history: adminProcedure
    .input(z.object({ limit: z.number().optional() }).optional())
    .query(async ({ input }) => {
      return getTruckDeliveryHistory(input?.limit ?? 50);
    }),

  /** Obter detalhes de uma entrega */
  details: adminProcedure
    .input(z.object({ truckDeliveryId: z.number() }))
    .query(async ({ input }) => {
      return getTruckDeliveryDetails(input.truckDeliveryId);
    }),

  /** Registrar contagem diária de gás */
  recordDailyCount: adminProcedure
    .input(
      z.object({
        countDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD"),
        productId: z.number(),
        productName: z.string(),
        fullQty: z.number().min(0, "Quantidade de cheios não pode ser negativa"),
        emptyQty: z.number().min(0, "Quantidade de vazios não pode ser negativa"),
        soldQty: z.number().min(0).optional(),
        returnedQty: z.number().min(0).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return recordDailyGasCount({
        countDate: input.countDate,
        productId: input.productId,
        productName: input.productName,
        fullQty: input.fullQty,
        emptyQty: input.emptyQty,
        soldQty: input.soldQty,
        returnedQty: input.returnedQty,
        notes: input.notes,
        createdBy: ctx.user?.name || undefined,
      });
    }),

  /** Obter contagem diária de um dia específico */
  getDailyCount: adminProcedure
    .input(z.object({ countDate: z.string() }))
    .query(async ({ input }) => {
      return getDailyGasCount(input.countDate);
    }),

  /** Obter histórico de contagem */
  countHistory: adminProcedure
    .input(
      z.object({
        productId: z.number().optional(),
        limit: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      return getGasCountHistory(input.productId, input.limit ?? 30);
    }),

  /** Obter histórico de ajustes de inventário */
  adjustmentHistory: adminProcedure
    .input(
      z.object({
        productId: z.number().optional(),
        type: z.string().optional(),
        limit: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      return getInventoryAdjustmentHistory(input.productId, input.type, input.limit ?? 100);
    }),

  /** Obter relatório de estoque */
  stockReport: adminProcedure.query(async () => {
    return getStockReport();
  }),

  /** Obter estatísticas de estoque */
  stockStatistics: adminProcedure.query(async () => {
    return getStockStatistics();
  }),
});
