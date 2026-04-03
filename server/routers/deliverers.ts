import { z } from "zod";
import { publicProcedure, adminProcedure, router } from "../_core/trpc";
import {
  getDeliverers,
  getDelivererById,
  createDeliverer,
  updateDeliverer,
  getDelivererOrders,
  getOrders,
  updateOrderStatus,
  getDb,
} from "../db";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { ENV } from "../_core/env";

const DELIVERER_SESSION_COOKIE = "gdr_deliverer_session";

async function signDelivererJwt(delivererId: number) {
  const secret = new TextEncoder().encode(ENV.cookieSecret);
  return new SignJWT({ delivererId, type: "deliverer" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(secret);
}

async function verifyDelivererJwt(token: string) {
  try {
    const secret = new TextEncoder().encode(ENV.cookieSecret);
    const { payload } = await jwtVerify(token, secret);
    if (payload.type !== "deliverer") return null;
    return payload as { delivererId: number; type: string };
  } catch {
    return null;
  }
}

export const deliverersRouter = router({
  // ─── Admin: listar entregadores ──────────────────────────────────────────
  list: adminProcedure
    .input(z.object({ onlineOnly: z.boolean().optional(), includeInactive: z.boolean().optional() }))
    .query(({ input }) => getDeliverers(input.onlineOnly, input.includeInactive)),

  // ─── Admin: desativar entregador ─────────────────────────────────────────
  deactivate: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => updateDeliverer(input.id, { isActive: false })),

  // ─── Admin: reativar entregador ──────────────────────────────────────────
  reactivate: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => updateDeliverer(input.id, { isActive: true })),

  // ─── Admin: estatísticas de um entregador ────────────────────────────────
  stats: adminProcedure
    .input(z.object({ delivererId: z.number() }))
    .query(async ({ input }) => {
      const orders = await getDelivererOrders(input.delivererId);
      const completed = orders.filter((o) => o.status === "entregue");
      const totalRevenue = completed.reduce((sum, o) => sum + Number(o.total), 0);
      return {
        totalDeliveries: orders.length,
        completedDeliveries: completed.length,
        totalRevenue,
      };
    }),

  getById: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getDelivererById(input.id)),

  // ─── Admin: criar entregador ─────────────────────────────────────────────
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        phone: z.string().optional(),
        email: z.string().email().optional(),
        username: z.string().min(3),
        password: z.string().min(6),
        vehicle: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const passwordHash = await bcrypt.hash(input.password, 12);
      return createDeliverer({
        name: input.name,
        phone: input.phone ?? "",
        email: input.email ?? "",
        username: input.username,
        passwordHash,
        vehicle: input.vehicle,
        notes: input.notes,
        isActive: true,
        isOnline: false,
      });
    }),

  // ─── Admin: editar entregador ────────────────────────────────────────────
  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        username: z.string().optional(),
        vehicle: z.string().optional(),
        notes: z.string().optional(),
        isActive: z.boolean().optional(),
        password: z.string().min(6).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, password, ...data } = input;
      const updateData: Record<string, unknown> = { ...data };
      if (password) {
        updateData.passwordHash = await bcrypt.hash(password, 12);
      }
      return updateDeliverer(id, updateData as any);
    }),

  // ─── Admin: histórico de entregas de um entregador ───────────────────────
  history: adminProcedure
    .input(z.object({ delivererId: z.number() }))
    .query(({ input }) => getDelivererOrders(input.delivererId)),

  // ─── Entregador: login por email ─────────────────────────────────────────
  login: publicProcedure
    .input(z.object({ email: z.string().email(), password: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { deliverers } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) throw new Error("Serviço indisponível");
      const results = await db.select().from(deliverers).where(eq(deliverers.email, input.email)).limit(1);
      const deliverer = results[0];
      if (!deliverer || !deliverer.isActive) throw new Error("Credenciais inválidas");
      const valid = await bcrypt.compare(input.password, deliverer.passwordHash);
      if (!valid) throw new Error("Credenciais inválidas");
      await updateDeliverer(deliverer.id, { isOnline: true, lastSeen: new Date() });
      const token = await signDelivererJwt(deliverer.id);
      ctx.res.cookie(DELIVERER_SESSION_COOKIE, token, {
        httpOnly: true, secure: true, sameSite: "none",
        maxAge: 7 * 24 * 60 * 60 * 1000, path: "/",
      });
      return {
        success: true,
        deliverer: { id: deliverer.id, name: deliverer.name, phone: deliverer.phone, vehicle: deliverer.vehicle },
      };
    }),

  // ─── Entregador: logout ──────────────────────────────────────────────────
  logout: publicProcedure.mutation(async ({ ctx }) => {
    const cookieHeader = ctx.req.headers.cookie ?? "";
    const cookieMap = Object.fromEntries(
      cookieHeader.split(";").map((c) => {
        const [k, ...v] = c.trim().split("=");
        return [k?.trim(), decodeURIComponent(v.join("="))];
      })
    );
    const token = cookieMap[DELIVERER_SESSION_COOKIE];
    if (token) {
      const payload = await verifyDelivererJwt(token);
      if (payload) await updateDeliverer(payload.delivererId, { isOnline: false });
    }
    ctx.res.clearCookie(DELIVERER_SESSION_COOKIE, { httpOnly: true, secure: true, sameSite: "none", path: "/" });
    return { success: true };
  }),

  // ─── Entregador: sessão atual ────────────────────────────────────────────
  me: publicProcedure.query(async ({ ctx }) => {
    const cookieHeader = ctx.req.headers.cookie ?? "";
    const cookieMap = Object.fromEntries(
      cookieHeader.split(";").map((c) => {
        const [k, ...v] = c.trim().split("=");
        return [k?.trim(), decodeURIComponent(v.join("="))];
      })
    );
    const token = cookieMap[DELIVERER_SESSION_COOKIE];
    if (!token) return null;
    const payload = await verifyDelivererJwt(token);
    if (!payload) return null;
    const deliverer = await getDelivererById(payload.delivererId);
    if (!deliverer || !deliverer.isActive) return null;
    await updateDeliverer(deliverer.id, { lastSeen: new Date() });
    return { id: deliverer.id, name: deliverer.name, phone: deliverer.phone, vehicle: deliverer.vehicle, isOnline: deliverer.isOnline };
  }),

  // ─── Entregador: ver entregas disponíveis (aguardando_entregador) ────────
  availableOrders: publicProcedure
    .input(z.object({ delivererId: z.number().optional() }))
    .query(() => getOrders("aguardando_entregador", undefined, 50)),

  // ─── Entregador: minhas entregas ativas ──────────────────────────────────
  myActiveOrders: publicProcedure
    .input(z.object({ delivererId: z.number() }))
    .query(async ({ input }) => {
      const all = await getDelivererOrders(input.delivererId);
      return all.filter((o) => o.status === "saiu_entrega" || o.status === "aguardando_entregador");
    }),

  // ─── Entregador: atualizar status online ────────────────────────────────
  setOnline: publicProcedure
    .input(z.object({ delivererId: z.number(), isOnline: z.boolean() }))
    .mutation(({ input }) =>
      updateDeliverer(input.delivererId, { isOnline: input.isOnline, lastSeen: new Date() })
    ),

  // ─── Entregador: aceitar entrega ────────────────────────────────────────
  acceptOrder: publicProcedure
    .input(z.object({ orderId: z.number(), delivererId: z.number() }))
    .mutation(async ({ input }) => {
      const deliverer = await getDelivererById(input.delivererId);
      await updateOrderStatus(input.orderId, "saiu_entrega", {
        delivererId: input.delivererId,
        delivererName: deliverer?.name ?? "Entregador",
      });
      return { success: true };
    }),

  // ─── Entregador: iniciar entrega ─────────────────────────────────────────
  startDelivery: publicProcedure
    .input(z.object({ orderId: z.number(), delivererId: z.number() }))
    .mutation(async ({ input }) => {
      await updateOrderStatus(input.orderId, "saiu_entrega");
      return { success: true };
    }),

  // ─── Entregador: finalizar entrega ───────────────────────────────────────
  finishDelivery: publicProcedure
    .input(z.object({ orderId: z.number(), delivererId: z.number(), paymentMethod: z.enum(["dinheiro", "pix", "debito", "credito", "fiado"]) }))
    .mutation(async ({ input }) => {
      const { orders } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      await db.update(orders).set({ paymentMethod: input.paymentMethod }).where(eq(orders.id, input.orderId));
      await updateOrderStatus(input.orderId, "entregue", { paymentConfirmed: true });
      return { success: true };
    }),

  // ─── Entregador: meu histórico ───────────────────────────────────────────
  myHistory: publicProcedure
    .input(z.object({ delivererId: z.number() }))
    .query(({ input }) => getDelivererOrders(input.delivererId)),

  // ─── Admin: pedidos ativos de um entregador (com itens) ─────────────────
  activeOrders: adminProcedure
    .input(z.object({ delivererId: z.number() }))
    .query(async ({ input }) => {
      const { orders, orderItems } = await import("../../drizzle/schema");
      const { eq, and, inArray } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) return [];
      const activeOrders = await db
        .select()
        .from(orders)
        .where(
          and(
            eq(orders.delivererId, input.delivererId),
            inArray(orders.status, ["novo", "em_preparo", "aguardando_entregador", "saiu_entrega"])
          )
        )
        .orderBy(orders.createdAt);
      if (activeOrders.length === 0) return [];
      const orderIds = activeOrders.map((o) => o.id);
      const items = await db
        .select()
        .from(orderItems)
        .where(inArray(orderItems.orderId, orderIds));
      return activeOrders.map((order) => ({
        ...order,
        items: items.filter((item) => item.orderId === order.id),
      }));
    }),

  // ─── Login com username ──────────────────────────────────────────────────
  loginByUsername: publicProcedure
    .input(z.object({ username: z.string(), password: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { deliverers } = await import("../../drizzle/schema");
      const { or, eq } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) throw new Error("Serviço indisponível");
      const results = await db.select().from(deliverers).where(
        or(eq(deliverers.username, input.username), eq(deliverers.email, input.username))
      ).limit(1);
      const deliverer = results[0];
      if (!deliverer || !deliverer.isActive) throw new Error("Credenciais inválidas");
      const valid = await bcrypt.compare(input.password, deliverer.passwordHash);
      if (!valid) throw new Error("Credenciais inválidas");
      await updateDeliverer(deliverer.id, { isOnline: true, lastSeen: new Date() });
      const token = await signDelivererJwt(deliverer.id);
      ctx.res.cookie(DELIVERER_SESSION_COOKIE, token, {
        httpOnly: true, secure: true, sameSite: "none",
        maxAge: 7 * 24 * 60 * 60 * 1000, path: "/",
      });
      return {
        success: true,
        id: deliverer.id,
        name: deliverer.name,
        token,
      };
    }),
});
