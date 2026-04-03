/**
 * WhatsApp Cloud API Service (Meta)
 * Integração direta com a API oficial da Meta — sem intermediários.
 * As credenciais são carregadas do banco de dados e configuradas pelo painel admin.
 */

import { eq } from "drizzle-orm";
import { whatsappConfig, whatsappMessageLog } from "../../drizzle/schema";
import { getDb } from "../db";

export type WhatsAppEventType =
  | "new_order"
  | "confirmed"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "credit_due"
  | "test";

export interface SendMessageParams {
  to: string;
  body: string;
  eventType?: WhatsAppEventType;
  referenceId?: number;
  referenceType?: "order" | "credit_note";
  toName?: string;
}

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  if (digits.length >= 10 && digits.length <= 11) return `55${digits}`;
  return digits;
}

export function applyTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => variables[key] ?? `{${key}}`);
}

class WhatsAppService {
  async isConfigured(): Promise<boolean> {
    const db = await getDb();
    if (!db) return false;
    const configs = await db.select().from(whatsappConfig).limit(1);
    const config = configs[0];
    return Boolean(config?.isActive && config?.accessToken && config?.phoneNumberId);
  }

  async sendMessage(params: SendMessageParams): Promise<string | null> {
    const db = await getDb();
    if (!db) return null;

    const configs = await db.select().from(whatsappConfig).limit(1);
    const config = configs[0];

    if (!config?.isActive || !config?.accessToken || !config?.phoneNumberId) {
      console.warn("[WhatsApp] Não configurado ou inativo");
      return null;
    }

    const toPhone = normalizePhone(params.to);
    if (!toPhone || toPhone.length < 10) {
      console.warn("[WhatsApp] Número inválido:", params.to);
      return null;
    }

    let logId = 0;
    try {
      const logResult = await db.insert(whatsappMessageLog).values({
        toPhone,
        toName: params.toName,
        messageBody: params.body,
        eventType: params.eventType ?? "test",
        referenceId: params.referenceId,
        referenceType: params.referenceType,
        status: "pending",
      });
      logId = Number((logResult as { insertId?: unknown }).insertId ?? 0);
    } catch (e) {
      console.warn("[WhatsApp] Erro ao criar log:", e);
    }

    try {
      const apiUrl = `https://graph.facebook.com/v20.0/${config.phoneNumberId}/messages`;
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: toPhone,
          type: "text",
          text: { preview_url: false, body: params.body },
        }),
      });

      const data = await response.json() as {
        messages?: Array<{ id: string }>;
        error?: { message: string; code: number };
      };

      if (!response.ok || data.error) {
        const errorMsg = data.error?.message ?? `HTTP ${response.status}`;
        console.error("[WhatsApp] Erro ao enviar:", errorMsg);
        if (logId) {
          await db.update(whatsappMessageLog)
            .set({ status: "failed", errorMessage: errorMsg })
            .where(eq(whatsappMessageLog.id, logId));
        }
        return null;
      }

      const messageId = data.messages?.[0]?.id ?? null;
      if (logId) {
        await db.update(whatsappMessageLog)
          .set({ status: "sent", whatsappMessageId: messageId ?? undefined, sentAt: new Date() })
          .where(eq(whatsappMessageLog.id, logId));
      }
      console.log("[WhatsApp] Mensagem enviada para", toPhone, "ID:", messageId);
      return messageId;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Erro desconhecido";
      console.error("[WhatsApp] Exceção ao enviar:", errorMsg);
      if (logId) {
        await db.update(whatsappMessageLog)
          .set({ status: "failed", errorMessage: errorMsg })
          .where(eq(whatsappMessageLog.id, logId));
      }
      return null;
    }
  }

  async sendNewOrderNotification(params: {
    customerPhone: string;
    customerName: string;
    orderNumber: string;
    total: number;
    orderId?: number;
    // Parâmetros legados (ignorados na nova versão)
    delivererPhone?: string;
    address?: string;
    neighborhood?: string;
    city?: string;
    items?: string;
    paymentMethod?: string;
    mapsDirectionsUrl?: string;
    mapsUrl?: string;
  }): Promise<string | null> {
    const db = await getDb();
    if (!db) return null;
    const configs = await db.select().from(whatsappConfig).limit(1);
    const config = configs[0];
    if (!config?.notifyOnNewOrder) return null;
    const template = config.templateNewOrder ?? "Olá {nome}! 🛢️ Seu pedido #{numero} foi recebido. Total: R$ {total}.";
    const body = applyTemplate(template, {
      nome: params.customerName,
      numero: params.orderNumber,
      total: params.total.toFixed(2),
    });
    return this.sendMessage({
      to: params.customerPhone,
      body,
      toName: params.customerName,
      eventType: "new_order",
      referenceId: params.orderId,
      referenceType: "order",
    });
  }

  async sendOrderConfirmedNotification(params: {
    customerPhone: string;
    customerName: string;
    orderNumber: string;
    orderId?: number;
  }): Promise<string | null> {
    const db = await getDb();
    if (!db) return null;
    const configs = await db.select().from(whatsappConfig).limit(1);
    const config = configs[0];
    if (!config?.notifyOnConfirmed) return null;
    const template = config.templateConfirmed ?? "Olá {nome}! ✅ Seu pedido #{numero} foi *confirmado*.";
    const body = applyTemplate(template, { nome: params.customerName, numero: params.orderNumber });
    return this.sendMessage({ to: params.customerPhone, body, toName: params.customerName, eventType: "confirmed", referenceId: params.orderId, referenceType: "order" });
  }

  async sendOrderReadyNotification(
    customerPhoneOrParams: string | {
      customerPhone: string;
      customerName: string;
      orderNumber: string;
      delivererName?: string;
      orderId?: number;
    },
    // Parâmetros legados (ignorados)
    _orderId?: number,
    _customerName?: string,
    _address?: string,
    _city?: string,
    _items?: string,
    _total?: number,
    _mapsDirectionsUrl?: string
  ): Promise<string | null> {
    const db = await getDb();
    if (!db) return null;
    const configs = await db.select().from(whatsappConfig).limit(1);
    const config = configs[0];
    if (!config?.notifyOnOutForDelivery) return null;

    // Suporte a ambas as assinaturas (nova e legada)
    let customerPhone: string;
    let customerName: string;
    let orderNumber: string;
    let delivererName: string;
    let orderId: number | undefined;

    if (typeof customerPhoneOrParams === "object") {
      customerPhone = customerPhoneOrParams.customerPhone;
      customerName = customerPhoneOrParams.customerName;
      orderNumber = customerPhoneOrParams.orderNumber;
      delivererName = customerPhoneOrParams.delivererName ?? "nosso entregador";
      orderId = customerPhoneOrParams.orderId;
    } else {
      // Assinatura legada — número do cliente como primeiro argumento
      customerPhone = customerPhoneOrParams;
      customerName = _customerName ?? "Cliente";
      orderNumber = String(_orderId ?? "");
      delivererName = "nosso entregador";
      orderId = _orderId;
    }

    const template = config.templateOutForDelivery ?? "Olá {nome}! 🚴 Seu pedido #{numero} *saiu para entrega* com {entregador}.";
    const body = applyTemplate(template, { nome: customerName, numero: orderNumber, entregador: delivererName });
    return this.sendMessage({ to: customerPhone, body, toName: customerName, eventType: "out_for_delivery", referenceId: orderId, referenceType: "order" });
  }

  async sendOrderDeliveredNotification(params: {
    customerPhone: string;
    customerName: string;
    orderNumber: string;
    orderId?: number;
  }): Promise<string | null> {
    const db = await getDb();
    if (!db) return null;
    const configs = await db.select().from(whatsappConfig).limit(1);
    const config = configs[0];
    if (!config?.notifyOnDelivered) return null;
    const template = config.templateDelivered ?? "Olá {nome}! 🎉 Seu pedido #{numero} foi *entregue*. Obrigado!";
    const body = applyTemplate(template, { nome: params.customerName, numero: params.orderNumber });
    return this.sendMessage({ to: params.customerPhone, body, toName: params.customerName, eventType: "delivered", referenceId: params.orderId, referenceType: "order" });
  }

  async sendOrderCancelledNotification(params: {
    customerPhone: string;
    customerName: string;
    orderNumber: string;
    orderId?: number;
  }): Promise<string | null> {
    const db = await getDb();
    if (!db) return null;
    const configs = await db.select().from(whatsappConfig).limit(1);
    const config = configs[0];
    if (!config?.notifyOnCancelled) return null;
    const template = config.templateCancelled ?? "Olá {nome}! ❌ Seu pedido #{numero} foi *cancelado*.";
    const body = applyTemplate(template, { nome: params.customerName, numero: params.orderNumber });
    return this.sendMessage({ to: params.customerPhone, body, toName: params.customerName, eventType: "cancelled", referenceId: params.orderId, referenceType: "order" });
  }

  async sendCreditDueNotification(params: {
    customerPhone: string;
    customerName: string;
    amount: string;
    dueDate: string;
    creditNoteId?: number;
  }): Promise<string | null> {
    const db = await getDb();
    if (!db) return null;
    const configs = await db.select().from(whatsappConfig).limit(1);
    const config = configs[0];
    if (!config?.notifyOnCreditDue) return null;
    const template = config.templateCreditDue ?? "Olá {nome}! 💰 Sua nota de fiado de *R$ {valor}* vence em *{data}*.";
    const body = applyTemplate(template, { nome: params.customerName, valor: params.amount, data: params.dueDate });
    return this.sendMessage({ to: params.customerPhone, body, toName: params.customerName, eventType: "credit_due", referenceId: params.creditNoteId, referenceType: "credit_note" });
  }

  async testConnection(): Promise<boolean> {
    return this.isConfigured();
  }

  /** @deprecated Mantido para compatibilidade — não retorna dados sensíveis */
  getConfig() {
    return { enabled: false };
  }

  /** @deprecated Mantido para compatibilidade — use saveConfig no router */
  updateConfig(_config: unknown) {
    return false;
  }
}

export const whatsappService = new WhatsAppService();
