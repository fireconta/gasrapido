import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { verifyAdminJwt } from "./adminJwt";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  adminId?: number;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;
  let adminId: number | undefined;

  // 1. Tentar autenticação via Manus OAuth (cookie de sessão)
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch {
    user = null;
  }

  // 2. Se não autenticado via OAuth, tentar via token JWT do painel admin
  if (!user) {
    const authHeader = opts.req.headers["authorization"];
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const adminPayload = await verifyAdminJwt(token);
      if (adminPayload) {
        // Criar objeto user sintético com role admin para o adminProcedure
        user = {
          id: adminPayload.adminId,
          openId: `admin_${adminPayload.adminId}`,
          name: adminPayload.name,
          email: adminPayload.email,
          loginMethod: "admin_jwt",
          role: "admin",
          createdAt: new Date(),
          updatedAt: new Date(),
          lastSignedIn: new Date(),
        } as User;
        adminId = adminPayload.adminId;
      }
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    adminId,
  };
}
