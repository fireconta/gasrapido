/**
 * Router de Gerenciamento de Backups
 * Persiste metadados no banco de dados (tabela backup_files) e arquivos no S3.
 * Suporta gerenciamento de agendamentos (backup_schedules).
 */
import { z } from "zod";
import { router, adminProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { storagePut } from "../storage";
import { runBackup, reloadBackupSchedules } from "../backupScheduler";

// ─── Helper: formatar bytes ──────────────────────────────────────────────────
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// ─── Helper: gerar SQL de backup via queries ─────────────────────────────────
async function generateBackupSQL(): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");

  const lines: string[] = [];
  lines.push(`-- Gas Rapido Database Backup`);
  lines.push(`-- Generated at: ${new Date().toISOString()}`);
  lines.push(`-- Version: 4.4`);
  lines.push(``);

  const tables = [
    "admin_users", "customers", "products", "orders", "order_items",
    "deliverers", "stock_movements", "gas_count", "truck_deliveries",
    "truck_delivery_items", "credit_notes", "credit_note_payments",
    "coupons", "settings", "audit_logs", "benefits", "customer_benefits",
    "gas_vouchers", "chat_messages", "deliverer_locations", "backup_schedules",
  ];

  for (const table of tables) {
    try {
      const rows = await (db as any).execute(`SELECT * FROM \`${table}\``);
      const data = Array.isArray(rows) ? rows[0] : rows;
      const dataArray = Array.isArray(data) ? data : [];

      lines.push(`-- Table: ${table}`);
      lines.push(`-- Rows: ${dataArray.length}`);

      if (dataArray.length > 0) {
        const cols = Object.keys(dataArray[0]);
        lines.push(`INSERT INTO \`${table}\` (${cols.map(c => `\`${c}\``).join(", ")}) VALUES`);
        const valueRows = dataArray.map((row: any) => {
          const vals = cols.map(col => {
            const v = row[col];
            if (v === null || v === undefined) return "NULL";
            if (typeof v === "number" || typeof v === "boolean") return String(Number(v));
            if (v instanceof Date) return `'${v.toISOString().slice(0, 19).replace("T", " ")}'`;
            const str = String(v).replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n").replace(/\r/g, "\\r");
            return `'${str}'`;
          });
          return `  (${vals.join(", ")})`;
        });
        lines.push(valueRows.join(",\n") + ";");
      } else {
        lines.push(`-- (empty table)`);
      }
      lines.push(``);
    } catch {
      lines.push(`-- Table ${table}: SKIPPED (not found or error)`);
      lines.push(``);
    }
  }

  return lines.join("\n");
}

export const backupsRouter = router({
  // ─── Listar backups ────────────────────────────────────────────────────────
  list: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    try {
      const [rows] = await (db as any).execute(
        "SELECT id, name, size, sizeFormatted, url, createdBy, backupType, backupStatus, errorMessage, createdAt FROM backup_files ORDER BY createdAt DESC LIMIT 30"
      );
      return (Array.isArray(rows) ? rows : []).map((r: any) => ({
        id: Number(r.id),
        name: r.name as string,
        size: Number(r.size),
        sizeFormatted: r.sizeFormatted as string,
        createdAt: new Date(r.createdAt),
        url: r.url as string,
        createdBy: r.createdBy as string,
        backupType: (r.backupType ?? "manual") as "manual" | "auto",
        backupStatus: (r.backupStatus ?? "success") as "success" | "failed",
        errorMessage: r.errorMessage as string | null,
      }));
    } catch {
      return [];
    }
  }),

  // ─  // ─── Criar backup manual ─────────────────────────────────────────────
  create: adminProcedure.mutation(async ({ ctx }) => {
    try {
      console.log(`[BACKUP] Manual iniciado por ${ctx.user?.name} (${ctx.user?.id})`);

      const sqlContent = await generateBackupSQL();
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      const filename = `gas-rapido-backup-${timestamp}-manual.sql`;
      const fileKey = `backups/${filename}`;

      const buffer = Buffer.from(sqlContent, "utf-8");
      const sizeFormatted = formatBytes(buffer.length);

      // Tenta fazer upload para S3; se falhar, usa URL vazia como fallback
      let url = "";
      let storageError: string | null = null;
      try {
        const result = await storagePut(fileKey, buffer, "text/plain");
        url = result.url;
        console.log(`[BACKUP] Upload S3 OK: ${url}`);
      } catch (s3Err: any) {
        storageError = s3Err?.message ?? "Erro no upload S3";
        console.warn(`[BACKUP] Upload S3 falhou (${storageError}), salvando apenas no banco`);
      }

      // Salva metadados no banco independente do S3
      const db = await getDb();
      if (db) {
        await (db as any).execute(
          "INSERT INTO backup_files (name, size, sizeFormatted, url, createdBy, backupType, backupStatus, errorMessage) VALUES (?, ?, ?, ?, ?, 'manual', ?, ?)",
          [
            filename,
            buffer.length,
            sizeFormatted,
            url,
            ctx.user?.name ?? "admin",
            storageError ? "failed" : "success",
            storageError,
          ]
        );
      }

      console.log(`[BACKUP] Manual concluído: ${filename} (${sizeFormatted})`);
      // Retorna o conteúdo SQL em base64 para download direto no frontend
      const sqlBase64 = buffer.toString("base64");
      return {
        success: true,
        file: filename,
        size: sizeFormatted,
        url,
        sqlBase64,
        storageError,
      };
    } catch (error: any) {
      console.error("[BACKUP] Erro:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Erro ao criar backup: ${error?.message ?? "Erro desconhecido"}`,
      });
    }
  }),

  // ─── Deletar backup ────────────────────────────────────────────────────────
  delete: adminProcedure
    .input(z.object({ name: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (db) {
        await (db as any).execute("DELETE FROM backup_files WHERE name = ?", [input.name]);
      }
      console.log(`[BACKUP] Removido por ${ctx.user?.name}: ${input.name}`);
      return { success: true };
    }),

  // ─── Estatísticas ──────────────────────────────────────────────────────────
  stats: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { count: 0, totalSize: 0, totalSizeFormatted: "0 B", averageSize: "0 B", lastBackup: null, failedCount: 0, autoCount: 0 };
    try {
      const [rows] = await (db as any).execute(
        "SELECT COUNT(*) as count, COALESCE(SUM(size), 0) as totalSize, MAX(createdAt) as lastBackup, SUM(backupStatus = 'failed') as failedCount, SUM(backupType = 'auto') as autoCount FROM backup_files"
      );
      const r = Array.isArray(rows) ? rows[0] : rows;
      const count = Number(r?.count ?? 0);
      const totalSize = Number(r?.totalSize ?? 0);
      return {
        count,
        totalSize,
        totalSizeFormatted: formatBytes(totalSize),
        averageSize: count > 0 ? formatBytes(totalSize / count) : "0 B",
        lastBackup: r?.lastBackup ? new Date(r.lastBackup) : null,
        failedCount: Number(r?.failedCount ?? 0),
        autoCount: Number(r?.autoCount ?? 0),
      };
    } catch {
      return { count: 0, totalSize: 0, totalSizeFormatted: "0 B", averageSize: "0 B", lastBackup: null, failedCount: 0, autoCount: 0 };
    }
  }),

  // ─── Listar agendamentos ───────────────────────────────────────────────────
  listSchedules: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    try {
      const [rows] = await (db as any).execute(
        "SELECT id, hour, minute, isActive, label, createdAt FROM backup_schedules ORDER BY hour ASC, minute ASC"
      );
      return (Array.isArray(rows) ? rows : []).map((r: any) => ({
        id: Number(r.id),
        hour: Number(r.hour),
        minute: Number(r.minute),
        isActive: Boolean(r.isActive),
        label: r.label as string | null,
        createdAt: new Date(r.createdAt),
      }));
    } catch {
      return [];
    }
  }),

  // ─── Adicionar agendamento ─────────────────────────────────────────────────
  addSchedule: adminProcedure
    .input(z.object({
      hour: z.number().min(0).max(23),
      minute: z.number().min(0).max(59).default(0),
      label: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      const label = input.label || `Backup ${String(input.hour).padStart(2, "0")}:${String(input.minute).padStart(2, "0")}`;
      try {
        await (db as any).execute(
          "INSERT INTO backup_schedules (hour, minute, isActive, label) VALUES (?, ?, 1, ?)",
          [input.hour, input.minute, label]
        );
        await reloadBackupSchedules();
        return { success: true };
      } catch (e: any) {
        if (e?.code === "ER_DUP_ENTRY") {
          throw new TRPCError({ code: "CONFLICT", message: "Já existe um agendamento para este horário" });
        }
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: e?.message ?? "Erro ao adicionar agendamento" });
      }
    }),

  // ─── Atualizar agendamento (ativar/desativar ou renomear) ──────────────────
  updateSchedule: adminProcedure
    .input(z.object({
      id: z.number(),
      isActive: z.boolean().optional(),
      label: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      if (input.isActive !== undefined) {
        await (db as any).execute(
          "UPDATE backup_schedules SET isActive = ? WHERE id = ?",
          [input.isActive ? 1 : 0, input.id]
        );
      }
      if (input.label !== undefined) {
        await (db as any).execute(
          "UPDATE backup_schedules SET label = ? WHERE id = ?",
          [input.label, input.id]
        );
      }
      await reloadBackupSchedules();
      return { success: true };
    }),

  // ─── Remover agendamento ───────────────────────────────────────────────────
  deleteSchedule: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      await (db as any).execute("DELETE FROM backup_schedules WHERE id = ?", [input.id]);
      await reloadBackupSchedules();
      return { success: true };
    }),
});
