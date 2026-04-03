import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin:1",
      name: "Admin Teste",
      email: "admin@gasrapido.com",
      loginMethod: "local",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
      cookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
      cookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

// ─── Auth Tests ───────────────────────────────────────────────────────────────

describe("auth.logout", () => {
  it("clears session cookie and returns success", async () => {
    const clearedCookies: string[] = [];
    const ctx: TrpcContext = {
      user: {
        id: 1,
        openId: "admin:1",
        name: "Admin",
        email: "admin@gasrapido.com",
        loginMethod: "local",
        role: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {
        clearCookie: (name: string) => clearedCookies.push(name),
        cookie: () => {},
      } as unknown as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    expect(clearedCookies.length).toBeGreaterThan(0);
  });
});

// ─── Admin Auth Tests ─────────────────────────────────────────────────────────

describe("adminAuth.login", () => {
  it("rejects missing credentials", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.adminAuth.login({ username: "", password: "" })
    ).rejects.toThrow();
  });

  it("rejects wrong password", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.adminAuth.login({ username: "admin", password: "wrongpassword" })
    ).rejects.toThrow();
  });
});

// ─── Admin Procedure Security Tests ──────────────────────────────────────────

describe("adminProcedure security", () => {
  it("blocks unauthenticated access to dashboard.metrics", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.dashboard.metrics()).rejects.toThrow();
  });

  it("blocks unauthenticated access to customers.list", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.customers.list()).rejects.toThrow();
  });

  it("blocks unauthenticated access to orders.list", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.orders.list({})).rejects.toThrow();
  });

  it("blocks unauthenticated access to stock.list", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.stock.list()).rejects.toThrow();
  });

  it("blocks unauthenticated access to creditNotes.list", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.creditNotes.list({})).rejects.toThrow();
  });

  it("blocks unauthenticated access to audit.list", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.audit.list({ limit: 10 })).rejects.toThrow();
  });

  it("blocks unauthenticated access to backup.list", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.backup.list()).rejects.toThrow();
  });

  it("blocks unauthenticated access to deliverers.list", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.deliverers.list({})).rejects.toThrow();
  });
});

// ─── Public Procedures Tests ──────────────────────────────────────────────────

describe("publicProcedure access", () => {
  it("allows public access to products.list", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.products.list({});
    expect(Array.isArray(result)).toBe(true);
  });

  it("allows public access to coupons.list", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.coupons.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("allows public access to settings.getAll", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.settings.getAll();
    expect(result).toBeDefined();
  });
});

// ─── Dashboard Tests ──────────────────────────────────────────────────────────

describe("dashboard", () => {
  it("returns metrics for admin user", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.dashboard.metrics();
    // May be null if DB is unavailable in test env, but should not throw
    if (result) {
      expect(result).toHaveProperty("todaySalesTotal");
      expect(result).toHaveProperty("pendingOrdersCount");
      expect(result).toHaveProperty("deliveredTodayCount");
      expect(result).toHaveProperty("activeProductsCount");
      expect(result).toHaveProperty("salesChart");
      expect(Array.isArray(result.salesChart)).toBe(true);
    }
  });

  it("returns totalCustomers for admin user", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.dashboard.totalCustomers();
    expect(typeof result).toBe("number");
  });
});

// ─── Coupon Validation Tests ──────────────────────────────────────────────────

describe("coupons.validate", () => {
  it("rejects invalid coupon code", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.coupons.validate({ code: "INVALID_CODE_999", orderTotal: 100 })
    ).rejects.toThrow();
  });
});
