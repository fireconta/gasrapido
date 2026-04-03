import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock do módulo web-push para não precisar de chaves VAPID reais nos testes
vi.mock("web-push", () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn().mockResolvedValue({ statusCode: 201 }),
  },
}));

// Mock do banco de dados
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue({
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ id: 1, name: "Entregador Teste", status: "ativo" }]),
        }),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  }),
}));

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("pushNotifications router", () => {
  it("getVapidPublicKey retorna a chave pública VAPID", async () => {
    // Configurar variável de ambiente para o teste
    process.env.VAPID_PUBLIC_KEY = "BEIpEPNyaBBHTZrB8JB0WNDLUVrLT9gBP6FPTk4nXQNVpSlLaZ1HvLFHDFVFRPe0TC-E3QawPOBcuypjhT8DLjE";

    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.pushNotifications.getVapidPublicKey();

    expect(result).toHaveProperty("publicKey");
    expect(typeof result.publicKey).toBe("string");
    expect(result.publicKey.length).toBeGreaterThan(0);
  });

  it("subscribe salva subscription de entregador", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.pushNotifications.subscribe({
      delivererId: 1,
      endpoint: "https://fcm.googleapis.com/fcm/send/test-endpoint-123",
      p256dhKey: "BNcRdreALRFXTkOOUHK1EtK2wtZ5MRy5dkMYZFT1RLbvJPMPSBfMFAAAAAA",
      authKey: "tBHItJI5svbpez7KI4CCXg==",
      userAgent: "Mozilla/5.0 (Android 12; Mobile)",
    });

    expect(result).toEqual({ success: true });
  });

  it("unsubscribe remove subscription pelo endpoint", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.pushNotifications.unsubscribe({
      endpoint: "https://fcm.googleapis.com/fcm/send/test-endpoint-123",
    });

    expect(result).toEqual({ success: true });
  });

  it("subscribe falha se delivererId não existe", async () => {
    // Sobrescrever mock para simular entregador não encontrado
    const { getDb } = await import("./db");
    vi.mocked(getDb).mockResolvedValueOnce({
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]), // Entregador não encontrado
          }),
        }),
      }),
    } as any);

    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.pushNotifications.subscribe({
        delivererId: 9999,
        endpoint: "https://fcm.googleapis.com/fcm/send/test-endpoint-999",
        p256dhKey: "BNcRdreALRFXTkOOUHK1EtK2wtZ5MRy5dkMYZFT1RLbvJPMPSBfMFAAAAAA",
        authKey: "tBHItJI5svbpez7KI4CCXg==",
      })
    ).rejects.toThrow("Entregador não encontrado");
  });
});

describe("sendPushToDeliverer (função utilitária)", () => {
  it("exporta a função sendPushToDeliverer", async () => {
    const { sendPushToDeliverer } = await import("./routers/pushNotifications");
    expect(typeof sendPushToDeliverer).toBe("function");
  });

  it("exporta a função sendPushToAllDeliverers", async () => {
    const { sendPushToAllDeliverers } = await import("./routers/pushNotifications");
    expect(typeof sendPushToAllDeliverers).toBe("function");
  });

  it("sendPushToDeliverer não lança erro quando não há subscriptions", async () => {
    const { getDb } = await import("./db");
    vi.mocked(getDb).mockResolvedValueOnce({
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]), // Sem subscriptions
        }),
      }),
    } as any);

    const { sendPushToDeliverer } = await import("./routers/pushNotifications");

    // Não deve lançar erro
    await expect(
      sendPushToDeliverer(1, { title: "Teste", body: "Mensagem de teste" })
    ).resolves.toBeUndefined();
  });
});
