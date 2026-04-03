import { SignJWT, jwtVerify } from "jose";
import { ENV } from "./env";

const JWT_EXPIRY_SECONDS = 60 * 60 * 24 * 30; // 30 dias

function getJwtSecret() {
  return new TextEncoder().encode(ENV.cookieSecret || "gas-rapido-secret-key-2024");
}

export async function signAdminJwt(
  adminId: number,
  username: string,
  name: string,
  email: string
): Promise<string> {
  return new SignJWT({ adminId, username, name, email, type: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(`${JWT_EXPIRY_SECONDS}s`)
    .setIssuedAt()
    .sign(getJwtSecret());
}

export async function verifyAdminJwt(
  token: string
): Promise<{ adminId: number; username: string; name: string; email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    if (payload.type !== "admin" || !payload.adminId) return null;
    return {
      adminId: payload.adminId as number,
      username: payload.username as string,
      name: payload.name as string,
      email: payload.email as string,
    };
  } catch {
    return null;
  }
}
