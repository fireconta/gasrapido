import webpush from "web-push";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { pushSubscriptions, deliverers } from "../../drizzle/schema";

// Configurar VAPID
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY!;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY!;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    "mailto:admin@sistemagasrapido.com",
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

export const pushNotificationsRouter = router({
  // Registrar subscription de push para um entregador
  subscribe: publicProcedure
    .input(
      z.object({
        delivererId: z.number(),
        endpoint: z.string(),
        p256dhKey: z.string(),
        authKey: z.string(),
        userAgent: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database não disponível");

      // Verificar se o entregador existe
      const deliverer = await db
        .select()
        .from(deliverers)
        .where(eq(deliverers.id, input.delivererId))
        .limit(1);
      if (!deliverer.length) throw new Error("Entregador não encontrado");

      // Upsert: remover subscription antiga com mesmo endpoint e inserir nova
      const existing = await db
        .select()
        .from(pushSubscriptions)
        .where(eq(pushSubscriptions.endpoint, input.endpoint))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(pushSubscriptions)
          .set({
            delivererId: input.delivererId,
            p256dhKey: input.p256dhKey,
            authKey: input.authKey,
            userAgent: input.userAgent,
          })
          .where(eq(pushSubscriptions.id, existing[0].id));
      } else {
        await db.insert(pushSubscriptions).values({
          delivererId: input.delivererId,
          endpoint: input.endpoint,
          p256dhKey: input.p256dhKey,
          authKey: input.authKey,
          userAgent: input.userAgent,
        });
      }

      return { success: true };
    }),

  // Remover subscription de push
  unsubscribe: publicProcedure
    .input(z.object({ endpoint: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database não disponível");

      await db
        .delete(pushSubscriptions)
        .where(eq(pushSubscriptions.endpoint, input.endpoint));

      return { success: true };
    }),

  // Obter chave pública VAPID
  getVapidPublicKey: publicProcedure.query(() => {
    return { publicKey: process.env.VAPID_PUBLIC_KEY ?? "" };
  }),
});

// Função utilitária para enviar push para um entregador específico
export async function sendPushToDeliverer(
  delivererId: number,
  payload: { title: string; body: string; data?: Record<string, unknown> }
) {
  const db = await getDb();
  if (!db) return;

  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.delivererId, delivererId));

  if (!subs.length) return;

  const payloadStr = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: "/icons/icon-192x192.png",
    badge: "/icons/badge-72x72.png",
    data: payload.data ?? {},
    vibrate: [200, 100, 200],
    requireInteraction: true,
  });

  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dhKey ?? '', auth: sub.authKey ?? '' },
        },
        payloadStr
      )
    )
  );

  // Remover subscriptions inválidas (410 Gone)
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === "rejected") {
      const err = result.reason as { statusCode?: number };
      if (err?.statusCode === 410 || err?.statusCode === 404) {
        await db
          .delete(pushSubscriptions)
          .where(eq(pushSubscriptions.id, subs[i].id));
      }
    }
  }
}

// Função para enviar push para todos os entregadores online
export async function sendPushToAllDeliverers(payload: {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}) {
  const db = await getDb();
  if (!db) return;

  const subs = await db.select().from(pushSubscriptions);
  if (!subs.length) return;

  const payloadStr = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: "/icons/icon-192x192.png",
    badge: "/icons/badge-72x72.png",
    data: payload.data ?? {},
    vibrate: [200, 100, 200],
    requireInteraction: true,
  });

  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dhKey ?? '', auth: sub.authKey ?? '' },
        },
        payloadStr
      )
    )
  );

  // Limpar subscriptions inválidas
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === "rejected") {
      const err = result.reason as { statusCode?: number };
      if (err?.statusCode === 410 || err?.statusCode === 404) {
        await db
          .delete(pushSubscriptions)
          .where(eq(pushSubscriptions.id, subs[i].id));
      }
    }
  }
}
