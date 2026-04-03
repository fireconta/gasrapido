import { publicProcedure, adminProcedure, router } from "../_core/trpc";
import { getDashboardStats, getSalesReport, getCustomers } from "../db";
import { z } from "zod";

export const dashboardRouter = router({
  metrics: adminProcedure.query(() => getDashboardStats()),

  salesReport: adminProcedure
    .input(z.object({ period: z.enum(["diario", "semanal", "mensal"]) }))
    .query(async ({ input }) => {
      const periodMap = { diario: "day", semanal: "week", mensal: "month" } as const;
      return getSalesReport(periodMap[input.period]);
    }),

  totalCustomers: adminProcedure.query(async () => {
    const list = await getCustomers();
    return list.length;
  }),
});
