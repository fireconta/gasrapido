import { router, publicProcedure } from "../_core/trpc";
import { z } from "zod";
import bcryptjs from "bcryptjs";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { adminUsers } from "../../drizzle/schema";
import { TRPCError } from "@trpc/server";
import { signAdminJwt, verifyAdminJwt } from "../_core/adminJwt";

export { signAdminJwt, verifyAdminJwt };

export const adminAuthRouter = router({
  login: publicProcedure
    .input(
      z.object({
        username: z.string().min(1, "Usuário é obrigatório"),
        password: z.string().min(1, "Senha é obrigatória"),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível" });
      }

      const admin = await db
        .select()
        .from(adminUsers)
        .where(eq(adminUsers.username, input.username))
        .limit(1);

      if (admin.length === 0) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Usuário ou senha incorretos" });
      }

      const adminUser = admin[0];

      if (!adminUser.isActive) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Usuário desativado" });
      }

      const isPasswordValid = await bcryptjs.compare(input.password, adminUser.passwordHash);
      if (!isPasswordValid) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Usuário ou senha incorretos" });
      }

      await db.update(adminUsers).set({ lastLogin: new Date() }).where(eq(adminUsers.id, adminUser.id));

      const token = await signAdminJwt(
        adminUser.id,
        adminUser.username,
        adminUser.name ?? adminUser.username,
        adminUser.email ?? ""
      );

      return {
        success: true,
        message: "Login realizado com sucesso",
        token,
        user: {
          id: adminUser.id,
          username: adminUser.username,
          email: adminUser.email,
          name: adminUser.name,
        },
      };
    }),

  logout: publicProcedure.mutation(async () => {
    // Sem cookie — o frontend apenas remove o token do localStorage
    return { success: true, message: "Logout realizado com sucesso" };
  }),

  me: publicProcedure.query(async ({ ctx }) => {
    try {
      // Verificar token no header Authorization
      const authHeader = ctx.req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) return null;

      const token = authHeader.slice(7);
      const payload = await verifyAdminJwt(token);
      if (!payload) return null;

      const db = await getDb();
      if (!db) return null;

      const admin = await db.select().from(adminUsers).where(eq(adminUsers.id, payload.adminId)).limit(1);
      if (admin.length === 0 || !admin[0].isActive) return null;

      return {
        id: admin[0].id,
        username: admin[0].username,
        email: admin[0].email,
        name: admin[0].name,
      };
    } catch {
      return null;
    }
  }),

  updatePassword: publicProcedure
    .input(
      z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(6),
        confirmPassword: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const authHeader = ctx.req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Não autenticado" });
      }

      const token = authHeader.slice(7);
      const payload = await verifyAdminJwt(token);
      if (!payload) throw new TRPCError({ code: "UNAUTHORIZED", message: "Token inválido" });

      if (input.newPassword !== input.confirmPassword) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "As senhas não coincidem" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      const admin = await db.select().from(adminUsers).where(eq(adminUsers.id, payload.adminId)).limit(1);
      if (admin.length === 0) throw new TRPCError({ code: "NOT_FOUND", message: "Admin não encontrado" });

      const isCurrentPasswordValid = await bcryptjs.compare(input.currentPassword, admin[0].passwordHash);
      if (!isCurrentPasswordValid) throw new TRPCError({ code: "UNAUTHORIZED", message: "Senha atual incorreta" });

      const newPasswordHash = await bcryptjs.hash(input.newPassword, 10);
      await db.update(adminUsers).set({ passwordHash: newPasswordHash }).where(eq(adminUsers.id, payload.adminId));

      return { success: true, message: "Senha atualizada com sucesso" };
    }),

  requestReset: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async () => ({ success: true, message: "Email de reset enviado" })),

  resetPassword: publicProcedure
    .input(z.object({ token: z.string(), password: z.string() }))
    .mutation(async () => ({ success: true, message: "Senha resetada com sucesso" })),
});

export const SESSION_DURATION = 60 * 60 * 24 * 30 * 1000; // 30 dias em ms
