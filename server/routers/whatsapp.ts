/**
 * Router de WhatsApp — Meta Cloud API
 * Gerencia configuração da API, templates de mensagem e histórico de envios.
 * Todas as operações de escrita são protegidas por adminProcedure.
 */

import { desc, eq, like, or, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { whatsappConfig, whatsappMessageLog } from "../../drizzle/schema";
import { getDb } from "../db";
import { adminProcedure, publicProcedure, router } from "../_core/trpc";
import { normalizePhone, applyTemplate } from "../_core/whatsappService";

export const whatsappRouter = router({
  // ─── Buscar configuração atual ─────────────────────────────────────────────
  getConfig: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Banco de dados indisponível");

    const configs = await db.select().from(whatsappConfig).limit(1);
    const config = configs[0];

    const defaults = {
      id: 0,
      phoneNumberId: "",
      accessToken: "",
      businessAccountId: "",
      phoneNumber: "",
      isActive: false,
      notifyOnNewOrder: true,
      notifyOnConfirmed: true,
      notifyOnOutForDelivery: true,
      notifyOnDelivered: true,
      notifyOnCancelled: true,
      notifyOnCreditDue: true,
      templateNewOrder: "Olá {nome}! 🛢️ Seu pedido #{numero} foi recebido com sucesso. Total: R$ {total}. Aguarde a confirmação!",
      templateConfirmed: "Olá {nome}! ✅ Seu pedido #{numero} foi *confirmado* e está sendo preparado para entrega.",
      templateOutForDelivery: "Olá {nome}! 🚴 Seu pedido #{numero} *saiu para entrega* com {entregador}. Em breve chegará até você!",
      templateDelivered: "Olá {nome}! 🎉 Seu pedido #{numero} foi *entregue*. Obrigado pela preferência! Qualquer dúvida, estamos à disposição.",
      templateCancelled: "Olá {nome}! ❌ Seu pedido #{numero} foi *cancelado*. Entre em contato conosco para mais informações.",
      templateCreditDue: "Olá {nome}! 💰 Lembrete: sua nota de fiado de *R$ {valor}* vence em *{data}*. Entre em contato para regularizar.",
      _hasToken: false,
      updatedAt: new Date(),
    };

    if (!config) return defaults;

    return {
      ...config,
      // Mascarar o accessToken para exibição (mostrar apenas os últimos 8 caracteres)
      accessToken: config.accessToken
        ? `${"*".repeat(Math.max(0, config.accessToken.length - 8))}${config.accessToken.slice(-8)}`
        : "",
      _hasToken: Boolean(config.accessToken),
    };
  }),

  // ─── Status rápido (público — para exibir badge no painel) ────────────────
  getStatus: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { isConfigured: false, isActive: false };
    const configs = await db.select({
      isActive: whatsappConfig.isActive,
      hasToken: whatsappConfig.accessToken,
      hasPhoneId: whatsappConfig.phoneNumberId,
    }).from(whatsappConfig).limit(1);
    const config = configs[0];
    return {
      isConfigured: Boolean(config?.hasToken && config?.hasPhoneId),
      isActive: Boolean(config?.isActive),
    };
  }),

  // ─── Salvar configuração ───────────────────────────────────────────────────
  saveConfig: adminProcedure
    .input(
      z.object({
        phoneNumberId: z.string().min(1, "Phone Number ID é obrigatório"),
        accessToken: z.string().optional(),
        businessAccountId: z.string().min(1, "Business Account ID é obrigatório"),
        phoneNumber: z.string().min(8, "Número de telefone é obrigatório"),
        isActive: z.boolean(),
        notifyOnNewOrder: z.boolean(),
        notifyOnConfirmed: z.boolean(),
        notifyOnOutForDelivery: z.boolean(),
        notifyOnDelivered: z.boolean(),
        notifyOnCancelled: z.boolean(),
        notifyOnCreditDue: z.boolean(),
        templateNewOrder: z.string().min(1),
        templateConfirmed: z.string().min(1),
        templateOutForDelivery: z.string().min(1),
        templateDelivered: z.string().min(1),
        templateCancelled: z.string().min(1),
        templateCreditDue: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Banco de dados indisponível");

      const existing = await db.select().from(whatsappConfig).limit(1);

      // Se o accessToken não foi informado ou começa com *, manter o atual
      let accessToken = input.accessToken ?? "";
      if (!accessToken || accessToken.startsWith("*")) {
        accessToken = existing[0]?.accessToken ?? "";
      }

      const values = {
        phoneNumberId: input.phoneNumberId,
        accessToken,
        businessAccountId: input.businessAccountId,
        phoneNumber: input.phoneNumber,
        isActive: input.isActive,
        notifyOnNewOrder: input.notifyOnNewOrder,
        notifyOnConfirmed: input.notifyOnConfirmed,
        notifyOnOutForDelivery: input.notifyOnOutForDelivery,
        notifyOnDelivered: input.notifyOnDelivered,
        notifyOnCancelled: input.notifyOnCancelled,
        notifyOnCreditDue: input.notifyOnCreditDue,
        templateNewOrder: input.templateNewOrder,
        templateConfirmed: input.templateConfirmed,
        templateOutForDelivery: input.templateOutForDelivery,
        templateDelivered: input.templateDelivered,
        templateCancelled: input.templateCancelled,
        templateCreditDue: input.templateCreditDue,
      };

      if (existing[0]) {
        await db.update(whatsappConfig).set(values).where(eq(whatsappConfig.id, existing[0].id));
      } else {
        await db.insert(whatsappConfig).values(values);
      }

      return { success: true };
    }),

  // ─── Testar conexão enviando mensagem de teste ─────────────────────────────
  testConnection: adminProcedure
    .input(z.object({ toPhone: z.string().min(8, "Informe um número de telefone válido") }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Banco de dados indisponível");

      const configs = await db.select().from(whatsappConfig).limit(1);
      const config = configs[0];
      if (!config?.accessToken || !config?.phoneNumberId) {
        throw new Error("Configure o Phone Number ID e o Access Token antes de testar");
      }

      const toPhone = normalizePhone(input.toPhone);
      const body = "✅ Teste de conexão — Gas Rápido. Se você recebeu esta mensagem, a integração com WhatsApp Cloud API está funcionando corretamente!";

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
          text: { preview_url: false, body },
        }),
      });

      const data = await response.json() as {
        messages?: Array<{ id: string }>;
        error?: { message: string; code: number };
      };

      if (!response.ok || data.error) {
        throw new Error(data.error?.message ?? `HTTP ${response.status}: Verifique suas credenciais`);
      }

      return { success: true, messageId: data.messages?.[0]?.id };
    }),

  // ─── Enviar mensagem manual ────────────────────────────────────────────────
  sendManual: adminProcedure
    .input(
      z.object({
        toPhone: z.string().min(8),
        toName: z.string().optional(),
        message: z.string().min(1, "Mensagem não pode estar vazia"),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Banco de dados indisponível");

      const configs = await db.select().from(whatsappConfig).limit(1);
      const config = configs[0];
      if (!config?.isActive) throw new Error("WhatsApp não está ativo nas configurações");
      if (!config.accessToken || !config.phoneNumberId) throw new Error("Credenciais incompletas");

      const toPhone = normalizePhone(input.toPhone);

      const logResult = await db.insert(whatsappMessageLog).values({
        toPhone,
        toName: input.toName,
        messageBody: input.message,
        eventType: "test",
        status: "pending",
      });
      const logId = Number((logResult as { insertId?: unknown }).insertId ?? 0);

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
          text: { preview_url: false, body: input.message },
        }),
      });

      const data = await response.json() as {
        messages?: Array<{ id: string }>;
        error?: { message: string };
      };

      if (!response.ok || data.error) {
        const errorMsg = data.error?.message ?? `HTTP ${response.status}`;
        if (logId) {
          await db.update(whatsappMessageLog)
            .set({ status: "failed", errorMessage: errorMsg })
            .where(eq(whatsappMessageLog.id, logId));
        }
        throw new Error(errorMsg);
      }

      const whatsappMessageId = data.messages?.[0]?.id;
      if (logId) {
        await db.update(whatsappMessageLog)
          .set({ status: "sent", whatsappMessageId, sentAt: new Date() })
          .where(eq(whatsappMessageLog.id, logId));
      }

      return { success: true, messageId: whatsappMessageId };
    }),

  // ─── Histórico de mensagens ────────────────────────────────────────────────
  getMessageLog: adminProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(200).default(50),
        offset: z.number().min(0).default(0),
        status: z.enum(["sent", "failed", "pending", "all"]).default("all"),
        search: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { items: [], total: 0 };

      const conditions: SQL[] = [];
      if (input.status !== "all") {
        conditions.push(eq(whatsappMessageLog.status, input.status));
      }
      if (input.search) {
        const searchCond = or(
          like(whatsappMessageLog.toPhone, `%${input.search}%`),
          like(whatsappMessageLog.toName, `%${input.search}%`)
        );
        if (searchCond) conditions.push(searchCond);
      }

      const whereClause = conditions.length === 2
        ? sql`${conditions[0]} AND ${conditions[1]}`
        : conditions[0];

      const [items, countResult] = await Promise.all([
        db.select()
          .from(whatsappMessageLog)
          .where(whereClause)
          .orderBy(desc(whatsappMessageLog.createdAt))
          .limit(input.limit)
          .offset(input.offset),
        db.select({ count: sql<number>`COUNT(*)` })
          .from(whatsappMessageLog)
          .where(whereClause),
      ]);

      return {
        items,
        total: Number(countResult[0]?.count ?? 0),
      };
    }),

  // ─── Estatísticas de envio ─────────────────────────────────────────────────
  getStats: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { sent: 0, failed: 0, pending: 0, total: 0 };

    const stats = await db.select({
      status: whatsappMessageLog.status,
      count: sql<number>`COUNT(*)`,
    })
      .from(whatsappMessageLog)
      .groupBy(whatsappMessageLog.status);

    const result = { sent: 0, failed: 0, pending: 0, total: 0 };
    for (const row of stats) {
      const key = row.status as "sent" | "failed" | "pending";
      if (key in result) result[key] = Number(row.count);
      result.total += Number(row.count);
    }
    return result;
  }),

  // ─── Guia de configuração ─────────────────────────────────────────────────
  getSetupGuide: publicProcedure.query(() => {
    return {
      title: "Guia de Configuração — WhatsApp Cloud API (Meta)",
      steps: [
        {
          number: 1,
          title: "Criar conta Meta for Developers",
          description: "Acesse developers.facebook.com e crie uma conta de desenvolvedor",
          details: [
            "Acesse https://developers.facebook.com",
            "Clique em 'Começar' e faça login com sua conta Facebook/Meta",
            "Aceite os termos de desenvolvedor",
          ],
        },
        {
          number: 2,
          title: "Criar um App Meta",
          description: "Crie um novo aplicativo do tipo 'Business'",
          details: [
            "No painel, clique em 'Criar App'",
            "Selecione o tipo 'Business'",
            "Dê um nome ao app (ex: 'Gas Rapido')",
            "Associe a uma conta Business (ou crie uma)",
          ],
        },
        {
          number: 3,
          title: "Adicionar produto WhatsApp",
          description: "Adicione o produto WhatsApp ao seu app",
          details: [
            "No painel do app, clique em 'Adicionar produto'",
            "Encontre 'WhatsApp' e clique em 'Configurar'",
            "Você será redirecionado para a seção WhatsApp",
          ],
        },
        {
          number: 4,
          title: "Obter credenciais",
          description: "Copie o Phone Number ID e gere o Access Token",
          details: [
            "Em 'WhatsApp > Configuração da API', copie o 'Phone Number ID'",
            "Copie também o 'ID da conta do WhatsApp Business'",
            "Gere um token de acesso permanente em 'Configurações do sistema > Usuários do sistema'",
            "Para testes, use o token temporário exibido na página",
          ],
        },
        {
          number: 5,
          title: "Configurar número de telefone",
          description: "Adicione e verifique seu número de telefone",
          details: [
            "Em 'WhatsApp > Números de telefone', adicione seu número",
            "O número NÃO pode estar vinculado ao WhatsApp pessoal ou Business App",
            "Verifique o número via SMS ou ligação",
            "Para produção, solicite aprovação do número",
          ],
        },
        {
          number: 6,
          title: "Inserir credenciais no sistema",
          description: "Cole as credenciais na página de configuração do WhatsApp",
          details: [
            "Acesse o painel admin > WhatsApp",
            "Cole o Phone Number ID",
            "Cole o Access Token",
            "Cole o Business Account ID",
            "Informe o número de telefone verificado",
            "Clique em 'Salvar Configuração'",
          ],
        },
      ],
      notes: [
        "⚠️ O número usado na API NÃO pode ser o mesmo do WhatsApp pessoal ou Business App",
        "💰 Mensagens de utilidade (confirmação de pedido, entrega) são gratuitas dentro da janela de 24h",
        "📱 Para testes, use o número de teste fornecido pela Meta gratuitamente",
        "🔑 Para produção, gere um token de acesso permanente (não expira)",
        "✅ Não é necessário WABA pago ou qualquer intermediário",
      ],
    };
  }),
});
