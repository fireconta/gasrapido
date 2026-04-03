/**
 * timezone.ts — Utilitários de fuso horário para o backend
 *
 * O sistema usa America/Sao_Paulo (UTC-3) como padrão.
 * O admin pode alterar o fuso nas configurações (chave "timezone" na tabela settings).
 */

import { getDb } from "./db";
import { settings } from "../drizzle/schema";
import { eq } from "drizzle-orm";

// Cache simples para evitar consultas repetidas ao banco
let _cachedTZ: string | null = null;
let _cacheExpiresAt = 0;
const CACHE_TTL_MS = 60_000; // 1 minuto

/**
 * Retorna o timezone configurado (padrão: America/Sao_Paulo).
 */
export async function getConfiguredTimezone(): Promise<string> {
  const now = Date.now();
  if (_cachedTZ && now < _cacheExpiresAt) return _cachedTZ;

  try {
    const db = await getDb();
    if (db) {
      const rows = await db
        .select()
        .from(settings)
        .where(eq(settings.key, "timezone"))
        .limit(1);
      if (rows.length > 0 && rows[0].value) {
        _cachedTZ = rows[0].value;
        _cacheExpiresAt = now + CACHE_TTL_MS;
        return _cachedTZ;
      }
    }
  } catch {
    // fallback silencioso
  }

  _cachedTZ = "America/Sao_Paulo";
  _cacheExpiresAt = now + CACHE_TTL_MS;
  return _cachedTZ;
}

/** Invalida o cache de timezone (chamar após salvar configurações). */
export function invalidateTimezoneCache(): void {
  _cachedTZ = null;
  _cacheExpiresAt = 0;
}

/**
 * Retorna a data "hoje" (meia-noite) no fuso configurado como objeto Date UTC.
 * Útil para queries de banco que comparam com timestamps UTC.
 */
export async function getTodayInTZ(): Promise<{ start: Date; end: Date; dateStr: string }> {
  const tz = await getConfiguredTimezone();
  return getTodayInTimezone(tz);
}

/**
 * Retorna a data "hoje" (meia-noite) em um timezone específico como objeto Date UTC.
 */
export function getTodayInTimezone(tz: string): { start: Date; end: Date; dateStr: string } {
  // Obtém a data atual no timezone desejado
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const dateStr = formatter.format(now); // "YYYY-MM-DD"

  // Converte meia-noite local para UTC
  const start = new Date(`${dateStr}T00:00:00`);
  // Ajuste: new Date("YYYY-MM-DDT00:00:00") é interpretado como local do servidor
  // Usamos o offset do timezone para calcular corretamente
  const offsetMs = getTimezoneOffsetMs(tz, now);
  const startUTC = new Date(new Date(`${dateStr}T00:00:00Z`).getTime() - offsetMs);
  const endUTC = new Date(startUTC.getTime() + 24 * 60 * 60 * 1000);

  return { start: startUTC, end: endUTC, dateStr };
}

/**
 * Retorna o offset em ms de um timezone em relação ao UTC para uma data específica.
 * Positivo = atrás do UTC (ex: America/Sao_Paulo = +3h = +10800000ms)
 */
function getTimezoneOffsetMs(tz: string, date: Date): number {
  // Formata a data em UTC e no timezone alvo, calcula a diferença
  const utcStr = date.toLocaleString("en-US", { timeZone: "UTC" });
  const tzStr = date.toLocaleString("en-US", { timeZone: tz });
  const utcDate = new Date(utcStr);
  const tzDate = new Date(tzStr);
  return utcDate.getTime() - tzDate.getTime();
}

/**
 * Retorna a string "YYYY-MM-DD" para hoje no timezone configurado.
 */
export async function getTodayDateStr(): Promise<string> {
  const tz = await getConfiguredTimezone();
  const now = new Date();
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/**
 * Retorna o início de um período (day/week/month) no timezone configurado.
 */
export async function getPeriodStartInTZ(period: "day" | "week" | "month"): Promise<{ start: Date; end: Date }> {
  const tz = await getConfiguredTimezone();
  const now = new Date();

  // Data atual no timezone
  const dateStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

  let startStr: string;
  if (period === "day") {
    startStr = dateStr;
  } else if (period === "week") {
    const d = new Date(`${dateStr}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 7);
    startStr = d.toISOString().slice(0, 10);
  } else {
    startStr = dateStr.slice(0, 7) + "-01";
  }

  const offsetMs = getTimezoneOffsetMs(tz, now);
  const start = new Date(new Date(`${startStr}T00:00:00Z`).getTime() - offsetMs);
  const end = new Date(new Date(`${dateStr}T00:00:00Z`).getTime() - offsetMs + 24 * 60 * 60 * 1000);

  return { start, end };
}
