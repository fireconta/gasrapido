import { z } from "zod";
import {
  getOrders,
  getOrderById,
  getOrderItems,
  createOrder,
  updateOrderStatus,
  updateOrder,
  deleteOrder,
  getOrderByNumber,
  getDelivererById,
  getDeliverers,
  getSettingByKey,
  getDb,
} from "../db";
import { auditLogs, orderItems as orderItemsTable, orders as ordersTable } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { notifyOwner } from "../_core/notification";
import { sendPushToDeliverer, sendPushToAllDeliverers } from "./pushNotifications";
import { whatsappService } from "../_core/whatsappService";
import { geocodeAddress } from "../_core/geocoding";
import { updateGasCountOnOrderCreation, revertGasCountOnOrderCancellation, getTodayGasCountSummary } from "../gasCountAutoUpdate";
import { validateFullGasPermission, logFullGasOrder } from "./ordersPermission";
import { router, publicProcedure, adminProcedure } from "../_core/trpc";
import { checkRateLimit, validateOrderInput, logSecurityEvent } from "../security";

// ─── Helper: normalizar número para formato internacional ────────────────────
function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  return cleaned.startsWith("55") ? `+${cleaned}` : `+55${cleaned}`;
}

// ─── Helper: buscar número(s) de entregador para notificação ─────────────────
async function getNotificationPhones(delivererId?: number): Promise<string[]> {
  const phones: string[] = [];

  // 1. Se um entregador específico foi atribuído, usar o número dele
  if (delivererId) {
    const deliverer = await getDelivererById(delivererId);
    if (deliverer?.phone) {
      phones.push(normalizePhone(deliverer.phone));
      return phones;
    }
  }

  // 2. Verificar se há número de notificação padrão nas configurações
  const defaultPhoneSetting = await getSettingByKey("whatsapp_notification_phone").catch(() => null);
  if (defaultPhoneSetting?.value) {
    phones.push(normalizePhone(defaultPhoneSetting.value));
    return phones;
  }

  // 3. Fallback: enviar para todos os entregadores online
  const onlineDeliverers = await getDeliverers(true).catch(() => []);
  for (const d of onlineDeliverers) {
    if (d.phone) phones.push(normalizePhone(d.phone));
  }

  return phones;
}

export const ordersRouter = router({
  list: adminProcedure
    .input(
      z.object({
        status: z.string().optional(),
        search: z.string().optional(),
        limit: z.number().optional(),
      })
    )
    .query(({ input }) => getOrders(input.status, input.search, input.limit)),

  // Acompanhamento público por número do pedido (sem auth)
  trackByNumber: publicProcedure
    .input(z.object({ orderNumber: z.string(), phone: z.string().optional() }))
    .query(async ({ input }) => {
      const order = await getOrderByNumber(input.orderNumber);
      if (!order) return null;
      if (input.phone && order.customerPhone) {
        const clean = (s: string) => s.replace(/\D/g, "");
        if (clean(order.customerPhone) !== clean(input.phone)) return null;
      }
      const items = await getOrderItems(order.id);
      return { ...order, items };
    }),

  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const order = await getOrderById(input.id);
      if (!order) return null;
      const items = await getOrderItems(input.id);
      return { ...order, items };
    }),

  create: publicProcedure
    .input(
      z.object({
        customerId: z.number().optional(),
        customerName: z.string(),
        customerPhone: z.string(),
        address: z.string(),
        city: z.string(),
        neighborhood: z.string().optional(),
        items: z.array(
          z.object({
            productId: z.number(),
            productName: z.string(),
            quantity: z.number(),
            price: z.number(),
          })
        ),
        total: z.number(),
        paymentMethod: z.enum(["dinheiro", "pix", "debito", "credito", "fiado"]),
        discount: z.number().default(0),
        notes: z.string().optional(),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // ── Rate limiting ──────────────────────────────────────
      checkRateLimit(`order-${ctx.user?.id || 'anonymous'}`, 50, 60000);

      // ── Validação de entrada ──────────────────────────────────────
      validateOrderInput(input);

      // ── Validação: Apenas admin pode criar pedidos de gás completo ──────────
      validateFullGasPermission(input.items, ctx.user?.role);

      // ── Log de segurança ──────────────────────────────────────
      logSecurityEvent({
        timestamp: new Date(),
        action: 'ORDER_CREATE',
        userId: ctx.user?.id,
        userRole: ctx.user?.role,
        details: { customerName: input.customerName, total: input.total },
        success: true,
      });

      const { items, ...orderData } = input;
      const orderItems = items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        unitPrice: String(item.price),
        quantity: item.quantity,
        subtotal: String(item.price * item.quantity),
      }));

      const result = await createOrder(
        {
          customerId: orderData.customerId,
          customerName: orderData.customerName,
          customerPhone: orderData.customerPhone,
          deliveryAddress: orderData.address,
          neighborhood: orderData.neighborhood,
          total: String(orderData.total),
          subtotal: String(orderData.total + (orderData.discount ?? 0)), // subtotal = total antes do desconto
          paymentMethod: orderData.paymentMethod,
          discount: String(orderData.discount ?? 0),
          notes: orderData.notes,
        },
        orderItems
      );

      // ── Log de auditoria para pedidos de gás completo ──────────────────────
      const hasFullGas = input.items.some(item => 
        item.productName.toLowerCase().includes('completo') || 
        item.productName.toLowerCase().includes('troca')
      );
      if (hasFullGas && ctx.user) {
        logFullGasOrder(result.id, ctx.user.name || 'Admin', input.items.length);
      }

      // ── Notificação ao dono do sistema ──────────────────────────────────────
      notifyOwner({
        title: `🛵 Novo Pedido #${result.orderNumber ?? result.id}`,
        content: `Pedido de ${input.customerName} — Total: R$ ${input.total.toFixed(2)}`,
      }).catch(() => {});

      // ── Push Notification: NOVO PEDIDO para todos os entregadores ────────────
      sendPushToAllDeliverers({
        title: `📦 Novo Pedido #${result.orderNumber ?? result.id}`,
        body: `${input.customerName} — ${input.address}`,
        data: { orderId: result.id, url: "/entregador" },
      }).catch(() => {});

      // ── WhatsApp ao entregador: NOVO PEDIDO com endereço + GPS ──────────────
      void (async () => {
        if (!(await whatsappService.isConfigured())) return;
        try {
            const itemsText = items.map((i) => `${i.quantity}x ${i.productName}`).join(", ");

            // Geocodificar o endereço para obter link GPS
            let mapsDirectionsUrl: string | undefined;
            let mapsUrl: string | undefined;

            const geo = await geocodeAddress(
              input.address,
              input.city,
              input.neighborhood
            );
            if (geo) {
              mapsDirectionsUrl = geo.googleMapsDirectionsUrl;
              mapsUrl = geo.googleMapsUrl;
              console.log(`[Geocoding] Endereço geocodificado: ${geo.formattedAddress} (${geo.lat}, ${geo.lng})`);
            } else {
              console.warn(`[Geocoding] Não foi possível geocodificar: ${input.address}`);
            }

            // Buscar números de entregadores para notificação
            const phones = await getNotificationPhones();
            if (phones.length === 0) {
              console.warn("[WhatsApp] Nenhum entregador disponível para notificação de novo pedido");
              return;
            }

            for (const phone of phones) {
              await whatsappService.sendNewOrderNotification({
                delivererPhone: phone,
                orderId: result.id,
                orderNumber: String(result.orderNumber ?? result.id),
                customerName: input.customerName,
                customerPhone: input.customerPhone,
                address: input.address,
                neighborhood: input.neighborhood,
                city: input.city,
                items: itemsText,
                total: input.total,
                paymentMethod: input.paymentMethod,
                mapsDirectionsUrl,
                mapsUrl,
              });
              console.log(`[WhatsApp] Novo pedido #${result.id} notificado ao entregador ${phone}`);
            }
          } catch (err) {
            console.error("[WhatsApp] Erro ao enviar notificação de novo pedido:", err);
          }
      })();

      // ── Atualizar contagem de gás automaticamente ──────────────────────────
      try {
        await updateGasCountOnOrderCreation(result.id);
        console.log(`[Orders] Contagem de gás atualizada para pedido #${result.id}`);
      } catch (err) {
        console.error(`[Orders] Erro ao atualizar contagem de gás:`, err);
      }

      return result;
    }),

  // Obter resumo da contagem de gás de hoje
  getTodayGasCount: adminProcedure
    .query(async () => {
      return getTodayGasCountSummary();
    }),

  updateStatus: adminProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["novo", "em_preparo", "aguardando_entregador", "saiu_entrega", "entregue", "cancelado"]),
        delivererId: z.number().optional(),
        delivererName: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await updateOrderStatus(input.id, input.status, {
        delivererId: input.delivererId,
        delivererName: input.delivererName,
      });

      // ── Reverter estoque de gás ao cancelar pedido ───────────────────────
      if (input.status === "cancelado") {
        try {
          await revertGasCountOnOrderCancellation(input.id);
          console.log(`[Orders] Estoque de gás revertido para pedido cancelado #${input.id}`);
        } catch (err) {
          console.error("[GasCount] Erro ao reverter estoque no cancelamento:", err);
        }
      }

      // ── Push Notification: PEDIDO ATRIBUÍDO ao entregador ────────────────
      if (input.status === "aguardando_entregador") {
        (async () => {
          try {
            const order = await getOrderById(input.id);
            if (!order) return;
            const pushPayload = {
              title: `🚚 Pedido Pronto para Entrega #${order.orderNumber}`,
              body: `${order.customerName} — ${order.deliveryAddress ?? "Endereço não informado"}`,
              data: { orderId: input.id, url: "/entregador" },
            };
            if (input.delivererId) {
              await sendPushToDeliverer(input.delivererId, pushPayload);
            } else {
              await sendPushToAllDeliverers(pushPayload);
            }
          } catch (err) {
            console.error("[Push] Erro ao enviar push de pedido pronto:", err);
          }
        })();
      }

      // ── WhatsApp ao entregador: PEDIDO PRONTO PARA ENTREGA ──────────────
      void (async () => {
        if (input.status !== "aguardando_entregador") return;
        if (!(await whatsappService.isConfigured())) return;
        try {
            const order = await getOrderById(input.id);
            if (!order) return;

            const items = await getOrderItems(input.id);
            const itemsText = items.map((i: any) => `${i.quantity}x ${i.productName}`).join(", ");

            // Geocodificar endereço para link GPS atualizado
            let mapsDirectionsUrl: string | undefined;
            const geo = await geocodeAddress(
              order.deliveryAddress || "",
              undefined,
              order.neighborhood ?? undefined
            );
            if (geo) mapsDirectionsUrl = geo.googleMapsDirectionsUrl;

            // Buscar número do entregador atribuído
            const phones = await getNotificationPhones(input.delivererId);
            if (phones.length === 0) {
              console.warn(`[WhatsApp] Nenhum entregador para notificar pedido pronto #${input.id}`);
              return;
            }

            for (const phone of phones) {
              await whatsappService.sendOrderReadyNotification(
                phone,
                order.id,
                order.customerName || "Cliente",
                order.deliveryAddress || "Endereço não informado",
                "",
                itemsText,
                Number(order.total) || 0,
                mapsDirectionsUrl
              );
              console.log(`[WhatsApp] Pedido pronto #${order.id} notificado ao entregador ${phone}`);
            }
          } catch (error) {
            console.error("[WhatsApp] Erro ao enviar notificação de pedido pronto:", error);
          }
      })();

      return result;
    }),

  // Entregador finaliza entrega e confirma pagamento
  confirmDelivery: adminProcedure
    .input(z.object({ id: z.number(), delivererId: z.number(), delivererName: z.string() }))
    .mutation(({ input }) =>
      updateOrderStatus(input.id, "entregue", {
        delivererId: input.delivererId,
        delivererName: input.delivererName,
        paymentConfirmed: true,
      })
    ),

  // Admin: editar dados de um pedido
  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        customerName: z.string().optional(),
        customerPhone: z.string().optional(),
        deliveryAddress: z.string().optional(),
        neighborhood: z.string().optional(),
        paymentMethod: z.enum(["dinheiro", "pix", "debito", "credito", "fiado"]).optional(),
        discount: z.string().optional(),
        // Edição manual do valor total do pedido
        total: z.string().optional(),
        notes: z.string().optional(),
        delivererName: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      // Registrar auditoria se o total foi alterado manualmente
      if (data.total) {
        const db = await getDb();
        const order = await getOrderById(id);
        if (order && db) {
          const adminName = ctx.user?.name ?? "Admin";
          const adminEmail = ctx.user?.email ?? "";
          await db.insert(auditLogs).values({
            action: "Edição manual de valor do pedido",
            actionType: "update",
            userName: adminName,
            userEmail: adminEmail,
            userRole: "admin",
            resourceType: "order",
            resourceId: id,
            resourceName: `Pedido #${order.orderNumber}`,
            oldData: { total: order.total } as any,
            newData: { total: data.total } as any,
            changes: `Total alterado de R$ ${order.total} para R$ ${data.total}`,
            success: true,
          });
        }
      }
      await updateOrder(id, data);
      return { success: true };
    }),

  // Admin: excluir pedido permanentemente
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteOrder(input.id);
      return { success: true };
    }),

  // Exportar pedidos em CSV
  exportCsv: adminProcedure
    .input(z.object({
      status: z.string().optional(),
      search: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const orderList = await getOrders(input.status, input.search, 1000);
      return orderList.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        customerName: o.customerName ?? "",
        customerPhone: o.customerPhone ?? "",
        deliveryAddress: o.deliveryAddress ?? "",
        neighborhood: o.neighborhood ?? "",
        status: o.status,
        paymentMethod: o.paymentMethod,
        total: parseFloat((o.total ?? '0').toString()),
        delivererName: o.delivererName ?? "",
        createdAt: o.createdAt,
      }));
    }),

  // ─── Auditoria: buscar histórico de edições de um pedido ────────────────────
  getAuditLog: adminProcedure
    .input(z.object({ orderId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const logs = await db
        .select()
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.resourceType, "order"),
            eq(auditLogs.resourceId, input.orderId)
          )
        )
        .orderBy(desc(auditLogs.createdAt))
        .limit(50);
      return logs;
    }),

  // ─── Editar valor total do pedido ──────────────────────────────────────────
  updateTotal: adminProcedure
    .input(
      z.object({
        orderId: z.number(),
        newTotal: z.number().min(0),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Banco indisponível");

      // Buscar pedido atual
      const order = await getOrderById(input.orderId);
      if (!order) throw new Error("Pedido não encontrado");

      const oldTotal = parseFloat(String(order.total));

      // Atualizar o total
      await db
        .update(ordersTable)
        .set({ total: String(input.newTotal) })
        .where(eq(ordersTable.id, input.orderId));

      // Registrar na auditoria
      const adminName = ctx.user?.name ?? "Admin";
      const adminEmail = ctx.user?.email ?? "";
      await db.insert(auditLogs).values({
        action: "Edição de valor total do pedido",
        actionType: "update",
        userName: adminName,
        userEmail: adminEmail,
        userRole: "admin",
        resourceType: "order",
        resourceId: input.orderId,
        resourceName: `Pedido #${order.orderNumber}`,
        oldData: { total: oldTotal } as any,
        newData: { total: input.newTotal } as any,
        changes: `Total alterado de R$ ${oldTotal.toFixed(2)} para R$ ${input.newTotal.toFixed(2)}`,
        success: true,
      });

      return { success: true, newTotal: input.newTotal };
    }),

  // ─── Adicionar mais produtos a um pedido existente ──────────────────────────
  addProductsToOrder: adminProcedure
    .input(
      z.object({
        orderId: z.number(),
        products: z.array(
          z.object({
            productId: z.number().optional(),
            productName: z.string(),
            unitPrice: z.number().min(0),
            quantity: z.number().min(1),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Banco indisponível");

      // Buscar pedido atual
      const order = await getOrderById(input.orderId);
      if (!order) throw new Error("Pedido não encontrado");

      // Buscar itens existentes
      const existingItems = await getOrderItems(input.orderId);

      // Calcular subtotal dos novos produtos
      const newProductsSubtotal = input.products.reduce(
        (sum, item) => sum + item.unitPrice * item.quantity,
        0
      );

      // Inserir novos itens
      if (input.products.length > 0) {
        await db.insert(orderItemsTable).values(
          input.products.map((item) => ({
            orderId: input.orderId,
            productId: item.productId ?? null,
            productName: item.productName,
            unitPrice: String(item.unitPrice),
            quantity: item.quantity,
            subtotal: String(item.unitPrice * item.quantity),
          }))
        );
      }

      // Recalcular total do pedido
      const currentSubtotal = parseFloat(String(order.subtotal));
      const newSubtotal = currentSubtotal + newProductsSubtotal;
      const discount = parseFloat(String(order.discount ?? 0));
      const deliveryFee = parseFloat(String(order.deliveryFee ?? 0));
      const finalTotal = Math.max(0, newSubtotal - discount + deliveryFee);

      await db
        .update(ordersTable)
        .set({ total: String(finalTotal), subtotal: String(newSubtotal) })
        .where(eq(ordersTable.id, input.orderId));

      // Registrar na auditoria
      const adminName = ctx.user?.name ?? "Admin";
      const adminEmail = ctx.user?.email ?? "";
      await db.insert(auditLogs).values({
        action: "Adição de produtos ao pedido",
        actionType: "update",
        userName: adminName,
        userEmail: adminEmail,
        userRole: "admin",
        resourceType: "order",
        resourceId: input.orderId,
        resourceName: `Pedido #${order.orderNumber}`,
        oldData: { itemsCount: existingItems.length, total: parseFloat(String(order.total)) } as any,
        newData: { itemsCount: existingItems.length + input.products.length, total: finalTotal } as any,
        changes: `${input.products.length} produto(s) adicionado(s). Novo total: R$ ${finalTotal.toFixed(2)}`,
        success: true,
      });

      return { success: true, newTotal: finalTotal, productsAdded: input.products.length };
    }),

  // ─── Editar itens de um pedido com recálculo automático ─────────────────────
  updateItems: adminProcedure
    .input(
      z.object({
        orderId: z.number(),
        items: z.array(
          z.object({
            productId: z.number().optional(),
            productName: z.string(),
            unitPrice: z.number().min(0),
            quantity: z.number().min(1),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Banco indisponível");

      // Buscar pedido atual para auditoria
      const order = await getOrderById(input.orderId);
      if (!order) throw new Error("Pedido não encontrado");

      const oldItems = await getOrderItems(input.orderId);

      // Deletar todos os itens atuais do pedido
      await db.delete(orderItemsTable).where(eq(orderItemsTable.orderId, input.orderId));

      // Inserir novos itens
      if (input.items.length > 0) {
        await db.insert(orderItemsTable).values(
          input.items.map((item) => ({
            orderId: input.orderId,
            productId: item.productId ?? null,
            productName: item.productName,
            unitPrice: String(item.unitPrice),
            quantity: item.quantity,
            subtotal: String(item.unitPrice * item.quantity),
          }))
        );
      }

      // Recalcular total do pedido
      const newSubtotal = input.items.reduce(
        (sum, item) => sum + item.unitPrice * item.quantity,
        0
      );
      const discount = parseFloat(String(order.discount ?? 0));
      const deliveryFee = parseFloat(String(order.deliveryFee ?? 0));
      const finalTotal = Math.max(0, newSubtotal - discount + deliveryFee);

      await db
        .update(ordersTable)
        .set({ total: String(finalTotal), subtotal: String(newSubtotal) })
        .where(eq(ordersTable.id, input.orderId));

      // Registrar na auditoria
      const adminName = ctx.user?.name ?? "Admin";
      const adminEmail = ctx.user?.email ?? "";
      await db.insert(auditLogs).values({
        action: "Edição de itens do pedido",
        actionType: "update",
        userName: adminName,
        userEmail: adminEmail,
        userRole: "admin",
        resourceType: "order",
        resourceId: input.orderId,
        resourceName: `Pedido #${order.orderNumber}`,
        oldData: oldItems as any,
        newData: input.items as any,
        changes: `Itens atualizados. Novo total: R$ ${finalTotal.toFixed(2)}`,
        success: true,
      });

      return { success: true, newTotal: finalTotal };
    }),
});
