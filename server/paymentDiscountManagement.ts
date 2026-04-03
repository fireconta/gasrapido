/**
 * Payment Discount Management
 * Funções para gerenciar descontos em pagamentos e reposição de gás
 */

import { and, eq, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  paymentDiscounts,
  gasReplenishment,
  gasReplenishmentItems,
  orders,
  products,
  inventoryAdjustments,
  type InsertPaymentDiscount,
  type InsertGasReplenishment,
  type InsertGasReplenishmentItem,
} from "../drizzle/schema";
import { getDb } from "./db";

/**
 * Aplica desconto em reais ao pagamento de um pedido
 */
export async function applyPaymentDiscount(data: {
  orderId: number;
  paymentMethod: "dinheiro" | "pix" | "debito" | "credito" | "fiado";
  discountAmount: number; // desconto em reais
  discountReason?: string;
  appliedBy?: string; // nome do entregador
  notes?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  if (data.discountAmount < 0) {
    throw new Error("Desconto não pode ser negativo");
  }

  // Validar se o pedido existe
  const order = await db
    .select()
    .from(orders)
    .where(eq(orders.id, data.orderId))
    .limit(1);

  if (order.length === 0) {
    throw new Error("Pedido não encontrado");
  }

  const discountData: InsertPaymentDiscount = {
    orderId: data.orderId,
    paymentMethod: data.paymentMethod,
    discountAmount: data.discountAmount.toString(),
    discountReason: data.discountReason,
    appliedBy: data.appliedBy,
    notes: data.notes,
  };

  // Registrar desconto
  const result = await db.insert(paymentDiscounts).values(discountData);

  // Atualizar total do pedido (subtrair desconto)
  const currentOrder = order[0];
  const newTotal = parseFloat((currentOrder.total ?? '0').toString()) - data.discountAmount;
  const newDiscount = parseFloat((currentOrder.discount ?? '0').toString()) + data.discountAmount;

  await db
    .update(orders)
    .set({
      total: newTotal.toString(),
      discount: newDiscount.toString(),
    })
    .where(eq(orders.id, data.orderId));

  return {
    success: true,
    orderId: data.orderId,
    discountAmount: data.discountAmount,
    newTotal,
  };
}

/**
 * Obtém descontos aplicados a um pedido
 */
export async function getOrderDiscounts(orderId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(paymentDiscounts)
    .where(eq(paymentDiscounts.orderId, orderId))
    .orderBy(desc(paymentDiscounts.createdAt));
}

/**
 * Cria uma reposição de gás vazio na distribuidora
 */
export async function createGasReplenishment(data: {
  distributorName: string;
  truckPlate?: string;
  driverName?: string;
  notes?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  if (!data.distributorName) {
    throw new Error("Nome da distribuidora é obrigatório");
  }

  const replenishmentData: InsertGasReplenishment = {
    replenishmentDate: new Date(),
    distributorName: data.distributorName,
    truckPlate: data.truckPlate,
    driverName: data.driverName,
    status: "planejado",
    notes: data.notes,
  };

  const result = await db.insert(gasReplenishment).values(replenishmentData);
  const insertId = (result as any)[0]?.insertId ?? (result as any).insertId;

  return { id: insertId, ...replenishmentData };
}

/**
 * Adiciona itens à reposição de gás
 */
export async function addGasReplenishmentItem(data: {
  replenishmentId: number;
  productId: number;
  productName: string;
  emptySent: number;     // botijões vazios enviados
  fullReceived: number;  // botijões cheios recebidos
  notes?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const itemData: InsertGasReplenishmentItem = {
    replenishmentId: data.replenishmentId,
    productId: data.productId,
    productName: data.productName,
    emptySent: data.emptySent,
    fullReceived: data.fullReceived,
    notes: data.notes,
  };

  // Atualizar totais na reposição
  const replenishment = await db
    .select()
    .from(gasReplenishment)
    .where(eq(gasReplenishment.id, data.replenishmentId))
    .limit(1);

  if (replenishment.length > 0) {
    const current = replenishment[0];
    await db
      .update(gasReplenishment)
      .set({
        totalEmptySent: (current.totalEmptySent ?? 0) + data.emptySent,
        totalFullReceived: (current.totalFullReceived ?? 0) + data.fullReceived,
      })
      .where(eq(gasReplenishment.id, data.replenishmentId));
  }

  return db.insert(gasReplenishmentItems).values(itemData);
}

/**
 * Processa a reposição de gás (atualiza estoque)
 * Quando o caminhão volta da distribuidora com gás cheio
 */
export async function processGasReplenishment(replenishmentId: number, processedBy: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  // Obter todos os itens da reposição
  const items = await db
    .select()
    .from(gasReplenishmentItems)
    .where(eq(gasReplenishmentItems.replenishmentId, replenishmentId));

  // Processar cada item
  for (const item of items) {
    const product = await db
      .select()
      .from(products)
      .where(eq(products.id, item.productId))
      .limit(1);

    if (product.length > 0) {
      const prod = product[0];

      // Cálculo: envia vazios (-) e recebe cheios (+)
      const emptySent = item.emptySent ?? 0;
      const fullReceived = item.fullReceived ?? 0;
      const newQty = prod.stockQty - emptySent + fullReceived;

      // Atualizar estoque do produto
      await db
        .update(products)
        .set({ stockQty: newQty })
        .where(eq(products.id, item.productId));

      // Registrar ajuste - Envio de vazios
      if (emptySent > 0) {
        await db.insert(inventoryAdjustments).values({
          adjustmentDate: new Date(),
          type: "entrega_caminhao" as any,
          productId: item.productId,
          productName: item.productName,
          quantityBefore: prod.stockQty,
          quantityAfter: prod.stockQty - emptySent,
          difference: -emptySent,
          reason: `Envio de ${emptySent} botijões vazios para distribuidora`,
          createdBy: processedBy,
          notes: `Reposição #${replenishmentId} - ${item.notes || ""}`,
        } as any);
      }

      // Registrar ajuste - Recebimento de cheios
      if (fullReceived > 0) {
        const qtyAfterEmpty = prod.stockQty - emptySent;
        await db.insert(inventoryAdjustments).values({
          adjustmentDate: new Date(),
          type: "entrega_caminhao" as any,
          productId: item.productId,
          productName: item.productName,
          quantityBefore: qtyAfterEmpty,
          quantityAfter: newQty,
          difference: fullReceived,
          reason: `Recebimento de ${fullReceived} botijões cheios da distribuidora`,
          createdBy: processedBy,
          notes: `Reposição #${replenishmentId} - ${item.notes || ""}`,
        } as any);
      }
    }
  }

  // Atualizar status da reposição
  await db
    .update(gasReplenishment)
    .set({
      status: "concluido",
      arrivedAt: new Date(),
      completedAt: new Date(),
    })
    .where(eq(gasReplenishment.id, replenishmentId));

  return { success: true, replenishmentId };
}

/**
 * Obtém histórico de reposições
 */
export async function getReplenishmentHistory(limit: number = 50) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(gasReplenishment)
    .orderBy(desc(gasReplenishment.replenishmentDate))
    .limit(limit);
}

/**
 * Obtém detalhes de uma reposição
 */
export async function getReplenishmentDetails(replenishmentId: number) {
  const db = await getDb();
  if (!db) return null;

  const replenishment = await db
    .select()
    .from(gasReplenishment)
    .where(eq(gasReplenishment.id, replenishmentId))
    .limit(1);

  if (replenishment.length === 0) return null;

  const items = await db
    .select()
    .from(gasReplenishmentItems)
    .where(eq(gasReplenishmentItems.replenishmentId, replenishmentId));

  return {
    replenishment: replenishment[0],
    items,
  };
}

/**
 * Obtém histórico de descontos
 */
export async function getDiscountHistory(limit: number = 100) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(paymentDiscounts)
    .orderBy(desc(paymentDiscounts.createdAt))
    .limit(limit);
}

/**
 * Calcula total de descontos aplicados
 */
export async function getDiscountStatistics(startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) return null;

  const discounts = await db.select().from(paymentDiscounts);

  let filtered = discounts;
  if (startDate && endDate) {
    filtered = discounts.filter(
      (d) =>
        new Date(d.createdAt) >= startDate &&
        new Date(d.createdAt) <= endDate
    );
  }

  const totalDiscountAmount = filtered.reduce(
    (sum, d) => sum + parseFloat(d.discountAmount.toString()),
    0
  );

  return {
    totalDiscounts: filtered.length,
    totalDiscountAmount,
    averageDiscount: filtered.length > 0 ? totalDiscountAmount / filtered.length : 0,
    byPaymentMethod: {
      dinheiro: filtered.filter((d) => d.paymentMethod === "dinheiro").length,
      pix: filtered.filter((d) => d.paymentMethod === "pix").length,
      debito: filtered.filter((d) => d.paymentMethod === "debito").length,
      credito: filtered.filter((d) => d.paymentMethod === "credito").length,
      fiado: filtered.filter((d) => d.paymentMethod === "fiado").length,
    },
  };
}
