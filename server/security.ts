/**
 * Módulo de Segurança do System Gas
 * Implementa proteções contra ataques comuns e validações rigorosas
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";

// ─── Rate Limiting ──────────────────────────────────────────────────────────
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(identifier: string, maxRequests: number = 100, windowMs: number = 60000): boolean {
  const now = Date.now();
  const record = requestCounts.get(identifier);

  if (!record || now > record.resetTime) {
    requestCounts.set(identifier, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= maxRequests) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Muitas requisições. Tente novamente mais tarde.",
    });
  }

  record.count++;
  return true;
}

// ─── Sanitização de Entrada ────────────────────────────────────────────────
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>\"']/g, "") // Remove caracteres perigosos
    .substring(0, 500); // Limita tamanho
}

export function sanitizeAddress(address: string): string {
  return address
    .trim()
    .replace(/[<>\"']/g, "")
    .substring(0, 255);
}

export function sanitizePhone(phone: string): string {
  return phone.replace(/\D/g, "").substring(0, 15);
}

// ─── Validação com Zod (mais rigorosa) ─────────────────────────────────────
export const OrderInputSchema = z.object({
  customerId: z.number().optional(),
  customerName: z.string().min(2).max(100).refine(
    (val) => !/<|>|"|'/.test(val),
    "Nome contém caracteres inválidos"
  ),
  customerPhone: z.string().regex(/^\d{10,15}$/, "Telefone inválido"),
  address: z.string().min(5).max(255).refine(
    (val) => !/<|>|"|'/.test(val),
    "Endereço contém caracteres inválidos"
  ),
  city: z.string().min(2).max(100),
  neighborhood: z.string().max(100).optional(),
  items: z.array(
    z.object({
      productId: z.number().positive(),
      productName: z.string().min(1).max(100),
      quantity: z.number().positive().max(1000),
      price: z.number().positive().max(99999),
    })
  ).min(1),
  total: z.number().positive().max(999999),
  paymentMethod: z.enum(["dinheiro", "pix", "debito", "credito", "fiado"]),
  discount: z.number().min(0).max(999999).optional(),
  notes: z.string().max(500).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

// ─── Proteção contra CSRF ──────────────────────────────────────────────────
const csrfTokens = new Set<string>();

export function generateCSRFToken(): string {
  const token = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
  csrfTokens.add(token);
  return token;
}

export function validateCSRFToken(token: string): boolean {
  const isValid = csrfTokens.has(token);
  if (isValid) {
    csrfTokens.delete(token); // Token de uso único
  }
  return isValid;
}

// ─── Proteção contra XSS ──────────────────────────────────────────────────
export function escapeHTML(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (char) => map[char] || char);
}

// ─── Validação de Permissões ───────────────────────────────────────────────
export function requireAdmin(role?: string): void {
  if (role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Apenas administradores podem realizar esta ação",
    });
  }
}

export function requireDeliverer(role?: string): void {
  if (role !== "deliverer" && role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Apenas entregadores podem realizar esta ação",
    });
  }
}

// ─── Logging de Segurança ──────────────────────────────────────────────────
export interface SecurityLog {
  timestamp: Date;
  action: string;
  userId?: number;
  userRole?: string;
  details: Record<string, unknown>;
  ipAddress?: string;
  success: boolean;
}

const securityLogs: SecurityLog[] = [];

export function logSecurityEvent(log: SecurityLog): void {
  securityLogs.push(log);
  
  // Manter apenas últimos 10000 logs em memória
  if (securityLogs.length > 10000) {
    securityLogs.shift();
  }

  // Log sensível para console
  if (!log.success) {
    console.warn(`[SECURITY] ${log.action}:`, log.details);
  }
}

export function getSecurityLogs(limit: number = 100): SecurityLog[] {
  return securityLogs.slice(-limit);
}

// ─── Validação de Entrada para Pedidos ─────────────────────────────────────
export function validateOrderInput(input: unknown): void {
  try {
    OrderInputSchema.parse(input);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Entrada inválida: ${(error.issues as any)[0]?.message ?? error.message}`,
      });
    }
    throw error;
  }
}
