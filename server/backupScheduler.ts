/**
 * Backup Scheduler
 * Executa backups automáticos nos horários configurados no banco de dados.
 * Gera SQL via queries (compatível com TiDB Cloud / MySQL remoto).
 * Deleta backups com mais de 7 dias automaticamente.
 * Notifica o admin ao concluir ou em caso de falha.
 */

import cron from "node-cron";
import { getDb } from "./db";
import { notifyOwner } from "./_core/notification";
import { storagePut } from "./storage";
import { sql } from "drizzle-orm";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/**
 * Gera o conteúdo SQL do backup via queries ao banco de dados.
 * Compatível com TiDB Cloud e MySQL remoto (não usa mysqldump).
 */
async function generateBackupSQL(): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados não disponível");

  const lines: string[] = [];
  lines.push(`-- Gas Rapido Database Backup`);
  lines.push(`-- Generated at: ${new Date().toISOString()}`);
  lines.push(`-- Method: query-based (TiDB/MySQL compatible)`);
  lines.push(`-- Version: 5.0`);
  lines.push(``);
  lines.push(`SET FOREIGN_KEY_CHECKS=0;`);
  lines.push(``);

  const tables = [
    "users", "admin_users", "customers", "products", "orders", "order_items",
    "deliverers", "deliverer_locations", "stock_movements", "gas_count",
    "gas_replenishment", "gas_replenishment_items", "truck_deliveries",
    "truck_delivery_items", "credit_notes", "credit_note_payments",
    "coupons", "promotions", "settings", "audit_logs", "benefits",
    "customer_benefits", "gas_vouchers", "chat_messages", "payment_discounts",
    "inventory_adjustments", "push_subscriptions", "whatsapp_message_log",
    "backup_schedules",
  ];

  for (const table of tables) {
    try {
      const result = await (db as any).execute(`SELECT * FROM \`${table}\``);
      const data: any[] = Array.isArray(result) ? (Array.isArray(result[0]) ? result[0] : result) : [];

      lines.push(`-- ─── Table: ${table} (${data.length} rows) ───`);

      if (data.length > 0) {
        const cols = Object.keys(data[0]);
        const colList = cols.map((c) => `\`${c}\``).join(", ");

        const valueRows = data.map((row: any) => {
          const vals = cols.map((col) => {
            const v = row[col];
            if (v === null || v === undefined) return "NULL";
            if (typeof v === "number" || typeof v === "boolean") return String(Number(v));
            if (v instanceof Date) return `'${v.toISOString().slice(0, 19).replace("T", " ")}'`;
            const str = String(v)
              .replace(/\\/g, "\\\\")
              .replace(/'/g, "\\'")
              .replace(/\n/g, "\\n")
              .replace(/\r/g, "\\r");
            return `'${str}'`;
          });
          return `  (${vals.join(", ")})`;
        });

        lines.push(`INSERT INTO \`${table}\` (${colList}) VALUES`);
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

  lines.push(`SET FOREIGN_KEY_CHECKS=1;`);
  return lines.join("\n");
}

/**
 * Executa um backup do banco de dados e salva no S3.
 * Registra o resultado na tabela backup_files.
 */
export async function runBackup(
  triggeredBy: "auto" | "manual" = "auto"
): Promise<{ success: boolean; name?: string; url?: string; size?: string; error?: string }> {
  const db = await getDb();
  if (!db) return { success: false, error: "Banco de dados não disponível" };

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const backupName = `gas-rapido-backup-${timestamp}-${triggeredBy}.sql`;

  try {
    console.log(`[Backup] Gerando SQL do banco de dados...`);
    const sqlContent = await generateBackupSQL();
    const sqlBuffer = Buffer.from(sqlContent, "utf-8");
    const sizeBytes = sqlBuffer.length;
    const sizeFormatted = formatBytes(sizeBytes);

    // Upload para S3
    console.log(`[Backup] Enviando para S3: ${backupName} (${sizeFormatted})`);
    const fileKey = `backups/${backupName}`;
    const { url: fileUrl } = await storagePut(fileKey, sqlBuffer, "application/sql");

    // Registrar no banco
    await (db as any).execute(
      `INSERT INTO backup_files (name, size, sizeFormatted, url, createdBy, backupType, backupStatus)
       VALUES (?, ?, ?, ?, ?, ?, 'success')`,
      [
        backupName,
        sizeBytes,
        sizeFormatted,
        fileUrl,
        triggeredBy === "auto" ? "sistema" : "admin",
        triggeredBy,
      ]
    );

    console.log(`[Backup] ✅ Backup ${triggeredBy} concluído: ${backupName} (${sizeFormatted})`);
    return { success: true, name: backupName, url: fileUrl, size: sizeFormatted };
  } catch (error: any) {
    const errorMsg = error?.message ?? "Erro desconhecido";
    console.error(`[Backup] ❌ Falha no backup ${triggeredBy}:`, errorMsg);

    // Registrar falha no banco
    try {
      await (db as any).execute(
        `INSERT INTO backup_files (name, size, sizeFormatted, url, createdBy, backupType, backupStatus, errorMessage)
         VALUES (?, 0, '0 B', '', ?, ?, 'failed', ?)`,
        [
          backupName,
          triggeredBy === "auto" ? "sistema" : "admin",
          triggeredBy,
          errorMsg,
        ]
      );
    } catch (dbErr) {
      console.error("[Backup] Falha ao registrar erro no banco:", dbErr);
    }

    return { success: false, error: errorMsg };
  }
}

/**
 * Deleta backups com mais de 7 dias automaticamente.
 */
async function deleteOldBackups(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const cutoff = sevenDaysAgo.toISOString().slice(0, 19).replace("T", " ");

    const [oldBackups] = await (db as any).execute(
      `SELECT id, name FROM backup_files WHERE createdAt < ? AND backupStatus = 'success'`,
      [cutoff]
    ) as any;

    if (!oldBackups || oldBackups.length === 0) return;

    await (db as any).execute(
      `DELETE FROM backup_files WHERE createdAt < ? AND backupStatus = 'success'`,
      [cutoff]
    );

    console.log(`[Backup] 🗑️ ${oldBackups.length} backup(s) antigo(s) deletado(s) automaticamente`);
  } catch (error) {
    console.error("[Backup] Erro ao deletar backups antigos:", error);
  }
}

/**
 * Carrega os horários de backup do banco de dados.
 */
async function loadSchedules(): Promise<Array<{ id: number; hour: number; minute: number; label: string }>> {
  const db = await getDb();
  if (!db) return [];

  try {
    const [rows] = await (db as any).execute(
      `SELECT id, hour, minute, label FROM backup_schedules WHERE isActive = 1`
    ) as any;
    return (rows ?? []).map((r: any) => ({
      id: Number(r.id),
      hour: Number(r.hour),
      minute: Number(r.minute),
      label: r.label ?? `Backup ${formatTime(Number(r.hour), Number(r.minute))}`,
    }));
  } catch {
    return [];
  }
}

// Mapa de tarefas cron ativas (keyed por "HH:MM")
const activeCronJobs = new Map<string, ReturnType<typeof cron.schedule>>();

/**
 * Inicializa o agendador de backups.
 * Registra um cron para cada horário ativo no banco.
 * Também registra um cron diário para deletar backups antigos.
 */
export async function initBackupScheduler(): Promise<void> {
  console.log("[Backup] Inicializando agendador de backups...");

  // Cron diário às 03:00 para deletar backups antigos (> 7 dias)
  cron.schedule(
    "0 3 * * *",
    async () => {
      console.log("[Backup] Executando limpeza de backups antigos...");
      await deleteOldBackups();
    },
    { timezone: "America/Sao_Paulo" }
  );

  // Carregar horários do banco
  const schedules = await loadSchedules();

  if (schedules.length === 0) {
    // Fallback: usar horários padrão 13:00 e 20:00
    console.log("[Backup] Nenhum agendamento encontrado no banco. Usando padrão: 13:00 e 20:00");
    registerCronJob(13, 0, "Backup do almoço às 13:00");
    registerCronJob(20, 0, "Backup noturno às 20:00");
  } else {
    for (const s of schedules) {
      registerCronJob(s.hour, s.minute, s.label);
    }
  }

  console.log(`[Backup] ✅ ${activeCronJobs.size} agendamento(s) de backup ativo(s)`);
}

/**
 * Registra um cron job para um horário específico.
 */
function registerCronJob(hour: number, minute: number, label: string): void {
  const key = `${hour}:${minute}`;
  if (activeCronJobs.has(key)) return; // já registrado

  const cronExpression = `${minute} ${hour} * * *`;

  const job = cron.schedule(
    cronExpression,
    async () => {
      console.log(`[Backup] ⏰ Iniciando backup automático: ${label} (${formatTime(hour, minute)})`);

      const result = await runBackup("auto");

      // Notificar admin
      if (result.success) {
        await notifyOwner({
          title: `✅ Backup automático concluído — ${label}`,
          content: `O backup das ${formatTime(hour, minute)} foi concluído.\n\nArquivo: ${result.name}\nTamanho: ${result.size}`,
        }).catch(() => {});
      } else {
        await notifyOwner({
          title: `❌ Falha no backup automático — ${label}`,
          content: `O backup das ${formatTime(hour, minute)} falhou.\n\nErro: ${result.error}`,
        }).catch(() => {});
      }

      // Após cada backup, limpar os antigos
      await deleteOldBackups();
    },
    { timezone: "America/Sao_Paulo" }
  );

  activeCronJobs.set(key, job);
  console.log(`[Backup] ⏰ Agendado: ${label} às ${formatTime(hour, minute)} (${cronExpression})`);
}

/**
 * Recarrega os agendamentos do banco (usado quando o admin adiciona/remove horários).
 */
export async function reloadBackupSchedules(): Promise<void> {
  // Parar todos os jobs ativos
  activeCronJobs.forEach((job, key) => {
    job.stop();
    activeCronJobs.delete(key);
  });

  // Recarregar do banco
  const schedules = await loadSchedules();
  for (const s of schedules) {
    registerCronJob(s.hour, s.minute, s.label);
  }

  console.log(`[Backup] 🔄 Agendamentos recarregados: ${activeCronJobs.size} ativo(s)`);
}
