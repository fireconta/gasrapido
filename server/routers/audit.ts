/**
 * Router de Auditoria
 * Fornece endpoints para visualizar e gerenciar logs de auditoria
 */

import { z } from "zod";
import { router, adminProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { auditLogs } from "../../drizzle/schema";
import { and, gte, lte, eq, like, desc, count, sql, type SQL } from "drizzle-orm";

export const auditRouter = router({
  // Listar logs com filtros
  list: adminProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        action: z.string().optional(),
        userId: z.number().optional(),
        resourceType: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        searchTerm: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const offset = (input.page - 1) * input.limit;
      const conditions: SQL[] = [];

      if (input.action) {
        conditions.push(eq(auditLogs.action, input.action));
      }
      if (input.userId) {
        conditions.push(eq(auditLogs.userId, input.userId));
      }
      if (input.resourceType) {
        conditions.push(eq(auditLogs.resourceType, input.resourceType));
      }
      if (input.startDate) {
        conditions.push(gte(auditLogs.createdAt, input.startDate));
      }
      if (input.endDate) {
        conditions.push(lte(auditLogs.createdAt, input.endDate));
      }
      if (input.searchTerm) {
        conditions.push(
          like(auditLogs.resourceName, `%${input.searchTerm}%`)
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const logs = await db
        .select()
        .from(auditLogs)
        .where(whereClause)
        .orderBy(desc(auditLogs.createdAt))
        .limit(input.limit)
        .offset(offset);

      // Contar total de registros
      const countResult = await db
        .select({ count: count(auditLogs.id) })
        .from(auditLogs)
        .where(whereClause);

      const total = countResult[0]?.count || 0;

      return {
        logs,
        pagination: {
          page: input.page,
          limit: input.limit,
          total,
          pages: Math.ceil(total / input.limit),
        },
      };
    }),

  // Obter estatísticas de auditoria
  stats: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Últimas 24 horas
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const stats = await db
      .select({
        action: auditLogs.action,
        count: count(auditLogs.id),
      })
      .from(auditLogs)
      .where(gte(auditLogs.createdAt, last24h))
      .groupBy(auditLogs.action);

    const totalLast24h = stats.reduce((sum, s) => sum + s.count, 0);

    return {
      totalLast24h,
      actionBreakdown: stats,
    };
  }),

  // Obter atividades por hora (últimas 24h)
  activityByHour: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Buscar todos os logs das últimas 24h
    const logs = await db
      .select()
      .from(auditLogs)
      .where(gte(auditLogs.createdAt, last24h));

    // Agrupar por hora
    const hourlyData: Record<string, number> = {};

    for (let i = 0; i < 24; i++) {
      const hour = new Date();
      hour.setHours(hour.getHours() - i, 0, 0, 0);
      const hourKey = hour.toISOString().substring(0, 13); // "2026-03-16T15"
      hourlyData[hourKey] = 0;
    }

    logs.forEach((log) => {
      const hourKey = log.createdAt.toISOString().substring(0, 13);
      if (hourKey in hourlyData) {
        hourlyData[hourKey]++;
      }
    });

    return Object.entries(hourlyData)
      .map(([hour, count]) => ({
        hour,
        count,
      }))
      .reverse();
  }),

  // Obter detalhes de um log específico
  getById: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const log = await db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.id, input.id))
        .limit(1);

      return log[0] || null;
    }),

  // Exportar logs como CSV
  exportCsv: adminProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions: SQL[] = [];
      if (input.startDate) {
        conditions.push(gte(auditLogs.createdAt, input.startDate));
      }
      if (input.endDate) {
        conditions.push(lte(auditLogs.createdAt, input.endDate));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const logs = await db
        .select()
        .from(auditLogs)
        .where(whereClause)
        .orderBy(desc(auditLogs.createdAt));

      // Gerar CSV
      const headers = [
        "ID",
        "Ação",
        "Tipo",
        "Usuário",
        "Recurso",
        "Sucesso",
        "Data",
      ];
      const rows = logs.map((log) => [
        log.id,
        log.action,
        log.actionType,
        log.userName || "N/A",
        log.resourceName || "N/A",
        log.success ? "Sim" : "Não",
        log.createdAt.toISOString(),
      ]);

      const csv = [headers, ...rows]
        .map((row) => row.map((cell) => `"${cell}"`).join(","))
        .join("\n");

      return {
        csv,
        filename: `audit-logs-${new Date().toISOString().split("T")[0]}.csv`,
      };
    }),
});
