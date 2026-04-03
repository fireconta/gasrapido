/**
 * Cron Jobs — Gas Rápido System
 * Executa tarefas agendadas no servidor:
 *  - Verificação diária de notas de fiado vencidas/próximas do vencimento
 */

import { getDb } from "./db";
import { creditNotes } from "../drizzle/schema";
import { eq, or } from "drizzle-orm";
import { notifyOwner } from "./_core/notification";
import { getTodayDateStr } from "./timezone";

// Intervalo de verificação: 1 hora (em ms)
const CHECK_INTERVAL_MS = 60 * 60 * 1000;

// Controle de última execução diária (evita múltiplas notificações no mesmo dia)
let lastDailyCheckDate: string | null = null;

async function checkOverdueCreditNotes() {
  const today = await getTodayDateStr();

  // Executar apenas uma vez por dia
  if (lastDailyCheckDate === today) {
    return;
  }

  try {
    const db = await getDb();
    if (!db) {
      console.warn("[Cron] Banco de dados indisponível — pulando verificação de fiados");
      return;
    }

    const now = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const in3Days = new Date();
    in3Days.setDate(in3Days.getDate() + 3);

    // Buscar notas pendentes e parciais
    const allNotes = await db
      .select()
      .from(creditNotes)
      .where(or(eq(creditNotes.status, "pendente"), eq(creditNotes.status, "parcial")));

    const overdue: typeof allNotes = [];
    const dueTomorrow: typeof allNotes = [];
    const dueIn3Days: typeof allNotes = [];
    let notifiedCount = 0;

    for (const note of allNotes) {
      const dueDate = new Date(note.dueDate);

      // Verificar se já foi notificado nas últimas 24h
      const lastNotified = note.notifiedAt ? new Date(note.notifiedAt) : null;
      const alreadyNotifiedToday = lastNotified &&
        (now.getTime() - lastNotified.getTime()) < 24 * 60 * 60 * 1000;

      if (alreadyNotifiedToday) continue;

      if (dueDate < now) {
        overdue.push(note);
      } else if (dueDate <= tomorrow) {
        dueTomorrow.push(note);
      } else if (dueDate <= in3Days) {
        dueIn3Days.push(note);
      }
    }

    // Notificar notas vencidas (agrupadas em uma mensagem)
    if (overdue.length > 0) {
      const totalOverdue = overdue.reduce(
        (sum, n) => sum + parseFloat(String(n.amount)) - parseFloat(String(n.paidAmount)), 0
      );

      const notesList = overdue
        .slice(0, 10) // máx 10 por notificação
        .map((n) => {
          const remaining = parseFloat(String(n.amount)) - parseFloat(String(n.paidAmount));
          const daysOverdue = Math.floor((now.getTime() - new Date(n.dueDate).getTime()) / (1000 * 60 * 60 * 24));
          return `• ${n.customerName} — R$ ${remaining.toFixed(2)} (${daysOverdue}d atraso)${n.customerPhone ? ` | ${n.customerPhone}` : ""}`;
        })
        .join("\n");

      await notifyOwner({
        title: `🚨 ${overdue.length} Fiado${overdue.length > 1 ? "s" : ""} Vencido${overdue.length > 1 ? "s" : ""} — Total: R$ ${totalOverdue.toFixed(2)}`,
        content: notesList + (overdue.length > 10 ? `\n... e mais ${overdue.length - 10} notas` : ""),
      });

      // Marcar como notificado e atualizar status
      for (const note of overdue) {
        await db.update(creditNotes)
          .set({ notifiedAt: now, status: "vencido" })
          .where(eq(creditNotes.id, note.id));
        notifiedCount++;
      }

      console.log(`[Cron] Notificou ${overdue.length} fiado(s) vencido(s) — Total: R$ ${totalOverdue.toFixed(2)}`);
    }

    // Notificar notas vencendo amanhã
    if (dueTomorrow.length > 0) {
      const totalDueTomorrow = dueTomorrow.reduce(
        (sum, n) => sum + parseFloat(String(n.amount)) - parseFloat(String(n.paidAmount)), 0
      );

      const notesList = dueTomorrow
        .map((n) => {
          const remaining = parseFloat(String(n.amount)) - parseFloat(String(n.paidAmount));
          return `• ${n.customerName} — R$ ${remaining.toFixed(2)}${n.customerPhone ? ` | ${n.customerPhone}` : ""}`;
        })
        .join("\n");

      await notifyOwner({
        title: `⚠️ ${dueTomorrow.length} Fiado${dueTomorrow.length > 1 ? "s" : ""} Vence${dueTomorrow.length > 1 ? "m" : ""} Amanhã — R$ ${totalDueTomorrow.toFixed(2)}`,
        content: notesList,
      });

      for (const note of dueTomorrow) {
        await db.update(creditNotes)
          .set({ notifiedAt: now })
          .where(eq(creditNotes.id, note.id));
        notifiedCount++;
      }

      console.log(`[Cron] Notificou ${dueTomorrow.length} fiado(s) vencendo amanhã`);
    }

    // Notificar notas vencendo em 3 dias (lembrete antecipado)
    if (dueIn3Days.length > 0) {
      const totalDue3 = dueIn3Days.reduce(
        (sum, n) => sum + parseFloat(String(n.amount)) - parseFloat(String(n.paidAmount)), 0
      );

      const notesList = dueIn3Days
        .map((n) => {
          const remaining = parseFloat(String(n.amount)) - parseFloat(String(n.paidAmount));
          const daysLeft = Math.ceil((new Date(n.dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          return `• ${n.customerName} — R$ ${remaining.toFixed(2)} (em ${daysLeft} dias)${n.customerPhone ? ` | ${n.customerPhone}` : ""}`;
        })
        .join("\n");

      await notifyOwner({
        title: `📅 ${dueIn3Days.length} Fiado${dueIn3Days.length > 1 ? "s" : ""} Vence${dueIn3Days.length > 1 ? "m" : ""} em Breve — R$ ${totalDue3.toFixed(2)}`,
        content: notesList,
      });

      for (const note of dueIn3Days) {
        await db.update(creditNotes)
          .set({ notifiedAt: now })
          .where(eq(creditNotes.id, note.id));
        notifiedCount++;
      }

      console.log(`[Cron] Notificou ${dueIn3Days.length} fiado(s) vencendo em 3 dias`);
    }

    if (notifiedCount === 0) {
      console.log("[Cron] Verificação de fiados concluída — nenhuma notificação necessária");
    }

    // Marcar como executado hoje
    lastDailyCheckDate = today;

  } catch (err) {
    console.error("[Cron] Erro ao verificar fiados:", err);
  }
}

/**
 * Inicia todos os cron jobs do sistema.
 * Chamar uma vez ao iniciar o servidor.
 */
export function startCronJobs() {
  console.log("[Cron] Iniciando jobs agendados...");

  // Executar imediatamente ao iniciar (após 30s para aguardar o DB)
  setTimeout(async () => {
    console.log("[Cron] Executando verificação inicial de fiados...");
    await checkOverdueCreditNotes();
  }, 30 * 1000);

  // Verificar a cada hora
  setInterval(async () => {
    await checkOverdueCreditNotes();
  }, CHECK_INTERVAL_MS);

  console.log(`[Cron] Jobs iniciados — verificação de fiados a cada ${CHECK_INTERVAL_MS / 1000 / 60} minutos`);
}
