import { z } from "zod";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { deliverers } from "../../drizzle/schema";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "../_core/cookies";

export const delivererAuthRouter = router({
  login: publicProcedure
    .input(
      z.object({
        username: z.string().min(1, "Usuário é obrigatório"),
        password: z.string().min(1, "Senha é obrigatória"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database não disponível");
      }

      // Buscar entregador no banco por email (username)
      const result = await db
        .select()
        .from(deliverers)
        .where(eq(deliverers.email, input.username))
        .limit(1);

      const deliverer = result.length > 0 ? result[0] : null;

      if (!deliverer) {
        throw new Error("Usuário ou senha incorretos");
      }

      if (!deliverer.isActive) {
        throw new Error("Sua conta foi desativada. Contate o administrador.");
      }

      // Verificar senha
      const passwordMatch = await bcrypt.compare(input.password, deliverer.passwordHash);
      if (!passwordMatch) {
        throw new Error("Usuário ou senha incorretos");
      }

      // Atualizar lastSeen
      await db
        .update(deliverers)
        .set({ lastSeen: new Date() })
        .where(eq(deliverers.id, deliverer.id));

      // Criar sessão
      const sessionData = {
        userId: deliverer.id,
        email: deliverer.email,
        name: deliverer.name,
        role: "deliverer",
      };

      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(`${COOKIE_NAME}_deliverer`, JSON.stringify(sessionData), {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
      });

      return {
        success: true,
        deliverer: {
          id: deliverer.id,
          email: deliverer.email,
          name: deliverer.name,
          phone: deliverer.phone,
          vehicle: deliverer.vehicle,
        },
      };
    }),

  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(`${COOKIE_NAME}_deliverer`, { ...cookieOptions, maxAge: -1 });
    return { success: true };
  }),

  me: publicProcedure.query(({ ctx }) => {
    // Verificar se é entregador
    return (ctx.user?.role as any) === "deliverer" ? ctx.user : null;
  }),

  verify: publicProcedure.query(({ ctx }) => {
    return { isDeliverer: !!ctx.user && (ctx.user.role as any) === "deliverer" };
  }),

  updatePassword: publicProcedure
    .input(
      z.object({
        delivererId: z.number(),
        currentPassword: z.string().min(1, "Senha atual é obrigatória"),
        newPassword: z.string().min(6, "Nova senha deve ter no mínimo 6 caracteres"),
        confirmPassword: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      if (input.newPassword !== input.confirmPassword) {
        throw new Error("As senhas não coincidem");
      }

      const db = await getDb();
      if (!db) {
        throw new Error("Database não disponível");
      }

      // Buscar entregador
      const result = await db
        .select()
        .from(deliverers)
        .where(eq(deliverers.id, input.delivererId))
        .limit(1);

      const deliverer = result.length > 0 ? result[0] : null;
      if (!deliverer) {
        throw new Error("Entregador não encontrado");
      }

      // Verificar senha atual
      const passwordMatch = await bcrypt.compare(input.currentPassword, deliverer.passwordHash);
      if (!passwordMatch) {
        throw new Error("Senha atual incorreta");
      }

      // Atualizar senha
      const newPasswordHash = await bcrypt.hash(input.newPassword, 12);
      await db
        .update(deliverers)
        .set({ passwordHash: newPasswordHash })
        .where(eq(deliverers.id, deliverer.id));

      return { success: true, message: "Senha atualizada com sucesso" };
    }),

  updateStatus: publicProcedure
    .input(z.object({ delivererId: z.number(), isOnline: z.boolean() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database não disponível");
      }

      await db
        .update(deliverers)
        .set({ isOnline: input.isOnline, lastSeen: new Date() })
        .where(eq(deliverers.id, input.delivererId));

      return { success: true, isOnline: input.isOnline };
    }),
});
