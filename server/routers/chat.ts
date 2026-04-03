import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc";
import { adminProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { chatMessages, deliverers } from "../../drizzle/schema";
import { eq, desc, and, isNull, sql } from "drizzle-orm";
import { verifyDelivererToken } from "./tracking";
import { sendPushToDeliverer } from "./pushNotifications";

// ─── Enviar push para o admin quando entregador manda mensagem ────────────────
async function notifyAdminNewMessage(delivererName: string, message: string) {
  // Usa o sistema de notificação do owner (admin) da Manus
  try {
    const { notifyOwner } = await import("../_core/notification");
    await notifyOwner({
      title: `💬 Nova mensagem de ${delivererName}`,
      content: message.length > 100 ? message.slice(0, 100) + "..." : message,
    });
  } catch {
    // Silently fail — notificação de owner é opcional
  }
}

export const chatRouter = router({
  // ─── ENDPOINTS PARA O ENTREGADOR (autenticados via token JWT) ──────────────

  // Enviar mensagem (entregador → admin)
  delivererSend: publicProcedure
    .input(z.object({
      token: z.string(),
      message: z.string().min(1).max(1000),
      orderId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const { delivererId } = await verifyDelivererToken(input.token);
      const db = await getDb();
      if (!db) throw new Error("DB indisponível");

      await db.insert(chatMessages).values({
        delivererId,
        orderId: input.orderId ?? null,
        senderRole: "deliverer",
        message: input.message,
      });

      // Notificar o admin
      const delivererRows = await db
        .select({ name: deliverers.name })
        .from(deliverers)
        .where(eq(deliverers.id, delivererId))
        .limit(1);
      const delivererName = delivererRows[0]?.name ?? "Entregador";
      await notifyAdminNewMessage(delivererName, input.message);

      return { success: true };
    }),

  // Buscar mensagens da conversa (entregador)
  delivererGetMessages: publicProcedure
    .input(z.object({
      token: z.string(),
      limit: z.number().min(1).max(100).default(50),
      before: z.number().optional(), // id da última mensagem para paginação
    }))
    .query(async ({ input }) => {
      const { delivererId } = await verifyDelivererToken(input.token);
      const db = await getDb();
      if (!db) return { messages: [] };

      const msgs = await db
        .select()
        .from(chatMessages)
        .where(
          and(
            eq(chatMessages.delivererId, delivererId),
            input.before ? sql`${chatMessages.id} < ${input.before}` : undefined,
          )
        )
        .orderBy(desc(chatMessages.createdAt))
        .limit(input.limit);

      // Marcar mensagens do admin como lidas
      const unreadAdminMsgs = msgs.filter(m => m.senderRole === "admin" && !m.readAt);
      if (unreadAdminMsgs.length > 0) {
        await db
          .update(chatMessages)
          .set({ readAt: new Date() })
          .where(
            and(
              eq(chatMessages.delivererId, delivererId),
              eq(chatMessages.senderRole, "admin"),
              isNull(chatMessages.readAt),
            )
          );
      }

      return { messages: msgs.reverse() };
    }),

  // Contar mensagens não lidas do admin para o entregador
  delivererUnreadCount: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const { delivererId } = await verifyDelivererToken(input.token);
      const db = await getDb();
      if (!db) return { count: 0 };

      const result = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(chatMessages)
        .where(
          and(
            eq(chatMessages.delivererId, delivererId),
            eq(chatMessages.senderRole, "admin"),
            isNull(chatMessages.readAt),
          )
        );

      return { count: Number(result[0]?.count ?? 0) };
    }),

  // ─── ENDPOINTS PARA O ADMIN (autenticados via adminProcedure) ──────────────

  // Listar todas as conversas com resumo (admin)
  adminGetConversations: adminProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) return { conversations: [] };

      // Buscar todos os entregadores ativos
      const allDeliverers = await db
        .select({
          id: deliverers.id,
          name: deliverers.name,
          phone: deliverers.phone,
          isOnline: deliverers.isOnline,
        })
        .from(deliverers)
        .where(eq(deliverers.isActive, true));

      // Para cada entregador, buscar a última mensagem e contagem de não lidas
      const conversations = await Promise.all(
        allDeliverers.map(async (d) => {
          const [lastMsg] = await db
            .select()
            .from(chatMessages)
            .where(eq(chatMessages.delivererId, d.id))
            .orderBy(desc(chatMessages.createdAt))
            .limit(1);

          const [unreadResult] = await db
            .select({ count: sql<number>`COUNT(*)` })
            .from(chatMessages)
            .where(
              and(
                eq(chatMessages.delivererId, d.id),
                eq(chatMessages.senderRole, "deliverer"),
                isNull(chatMessages.readAt),
              )
            );

          return {
            deliverer: d,
            lastMessage: lastMsg ?? null,
            unreadCount: Number(unreadResult?.count ?? 0),
          };
        })
      );

      // Ordenar: conversas com mensagens não lidas primeiro, depois por data da última mensagem
      conversations.sort((a, b) => {
        if (a.unreadCount !== b.unreadCount) return b.unreadCount - a.unreadCount;
        const aTime = a.lastMessage?.createdAt?.getTime() ?? 0;
        const bTime = b.lastMessage?.createdAt?.getTime() ?? 0;
        return bTime - aTime;
      });

      return { conversations };
    }),

  // Buscar mensagens de um entregador específico (admin)
  adminGetMessages: adminProcedure
    .input(z.object({
      delivererId: z.number(),
      limit: z.number().min(1).max(100).default(50),
      before: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { messages: [] };

      const msgs = await db
        .select()
        .from(chatMessages)
        .where(
          and(
            eq(chatMessages.delivererId, input.delivererId),
            input.before ? sql`${chatMessages.id} < ${input.before}` : undefined,
          )
        )
        .orderBy(desc(chatMessages.createdAt))
        .limit(input.limit);

      // Marcar mensagens do entregador como lidas pelo admin
      const unread = msgs.filter(m => m.senderRole === "deliverer" && !m.readAt);
      if (unread.length > 0) {
        await db
          .update(chatMessages)
          .set({ readAt: new Date() })
          .where(
            and(
              eq(chatMessages.delivererId, input.delivererId),
              eq(chatMessages.senderRole, "deliverer"),
              isNull(chatMessages.readAt),
            )
          );
      }

      return { messages: msgs.reverse() };
    }),

  // Enviar mensagem do admin para o entregador
  adminSend: adminProcedure
    .input(z.object({
      delivererId: z.number(),
      message: z.string().min(1).max(1000),
      orderId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB indisponível");

      await db.insert(chatMessages).values({
        delivererId: input.delivererId,
        orderId: input.orderId ?? null,
        senderRole: "admin",
        message: input.message,
      });

      // Enviar push notification para o entregador
      await sendPushToDeliverer(input.delivererId, {
        title: "💬 Mensagem do Admin",
        body: input.message.length > 80 ? input.message.slice(0, 80) + "..." : input.message,
        data: { type: "chat", delivererId: input.delivererId, orderId: input.orderId },
      });

      return { success: true };
    }),

  // Contar total de mensagens não lidas de todos os entregadores (para badge no sidebar)
  adminTotalUnread: adminProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) return { count: 0 };

      const result = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(chatMessages)
        .where(
          and(
            eq(chatMessages.senderRole, "deliverer"),
            isNull(chatMessages.readAt),
          )
        );

      return { count: Number(result[0]?.count ?? 0) };
    }),

  // Buscar novas mensagens desde um ID (polling incremental)
  adminPollNewMessages: adminProcedure
    .input(z.object({
      delivererId: z.number(),
      afterId: z.number().default(0),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { messages: [] };

      const msgs = await db
        .select()
        .from(chatMessages)
        .where(
          and(
            eq(chatMessages.delivererId, input.delivererId),
            sql`${chatMessages.id} > ${input.afterId}`,
          )
        )
        .orderBy(chatMessages.createdAt)
        .limit(50);

      return { messages: msgs };
    }),

  // Polling para o entregador (novas mensagens do admin)
  delivererPollNewMessages: publicProcedure
    .input(z.object({
      token: z.string(),
      afterId: z.number().default(0),
    }))
    .query(async ({ input }) => {
      const { delivererId } = await verifyDelivererToken(input.token);
      const db = await getDb();
      if (!db) return { messages: [] };

      const msgs = await db
        .select()
        .from(chatMessages)
        .where(
          and(
            eq(chatMessages.delivererId, delivererId),
            eq(chatMessages.senderRole, "admin"),
            sql`${chatMessages.id} > ${input.afterId}`,
          )
        )
        .orderBy(chatMessages.createdAt)
        .limit(50);

      return { messages: msgs };
    }),
});
