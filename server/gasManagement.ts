/**
 * Gas Management System
 * Funções para gerenciar contagem de gás, entrega de caminhão e ajustes de inventário
 */

import { and, eq, desc, type SQL } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  gasCount,
  truckDeliveries,
  truckDeliveryItems,
  inventoryAdjustments,
  products,
  type InsertGasCount,
  type InsertTruckDelivery,
  type InsertTruckDeliveryItem,
  type InsertInventoryAdjustment,
} from "../drizzle/schema";
import { getDb } from "./db";

/**
 * Registra contagem diária de gás
 * Calcula automaticamente: total = cheios + vazios
 */
export async function recordDailyGasCount(data: {
  countDate: string; // YYYY-MM-DD
  productId: number;
  productName: string;
  fullQty: number;      // botijões cheios
  emptyQty: number;     // botijões vazios
  soldQty?: number;     // vendidos no dia
  returnedQty?: number; // devolvidos
  notes?: string;
  createdBy?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const countData: InsertGasCount = {
    countDate: data.countDate,
    productId: data.productId,
    productName: data.productName,
    fullQty: data.fullQty,
    emptyQty: data.emptyQty,
    soldQty: data.soldQty ?? 0,
    returnedQty: data.returnedQty ?? 0,
    notes: data.notes,
    createdBy: data.createdBy,
  };

  return db.insert(gasCount).values(countData);
}

/**
 * Obtém contagem de gás de um dia específico
 */
export async function getDailyGasCount(countDate: string) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(gasCount)
    .where(eq(gasCount.countDate, countDate))
    .orderBy(gasCount.productName);
}

/**
 * Obtém histórico de contagem de gás
 */
export async function getGasCountHistory(productId?: number, limit: number = 30) {
  const db = await getDb();
  if (!db) return [];
  
  const query = db
    .select()
    .from(gasCount)
    .orderBy(desc(gasCount.countDate))
    .limit(limit);

  if (productId) {
    return query.where(eq(gasCount.productId, productId));
  }
  return query;
}

/**
 * Cria uma entrega de caminhão
 * Status: planejado → em_transito → chegou → processando → concluido
 */
export async function createTruckDelivery(data: {
  truckPlate: string;
  driverId?: number;
  driverName?: string;
  notes?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const deliveryData: InsertTruckDelivery = {
    deliveryDate: new Date(),
    truckPlate: data.truckPlate,
    driverId: data.driverId,
    driverName: data.driverName,
    status: "planejado",
    totalEmptyReceived: 0,
    totalFullDelivered: 0,
    notes: data.notes,
  };

  const result = await db.insert(truckDeliveries).values(deliveryData);
  const insertId = (result as any)[0]?.insertId ?? (result as any).insertId;
  return { id: insertId, ...deliveryData };
}

/**
 * Registra itens da entrega do caminhão
 * Quando o caminhão chega: entrega botijões cheios e recebe vazios
 */
export async function addTruckDeliveryItem(data: {
  truckDeliveryId: number;
  productId: number;
  productName: string;
  emptyReceived: number;  // botijões vazios recebidos
  fullDelivered: number;  // botijões cheios entregues
  notes?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const itemData: InsertTruckDeliveryItem = {
    truckDeliveryId: data.truckDeliveryId,
    productId: data.productId,
    productName: data.productName,
    emptyReceived: data.emptyReceived,
    fullDelivered: data.fullDelivered,
    notes: data.notes,
  };

  // Atualizar totais na entrega
  const delivery = await db
    .select()
    .from(truckDeliveries)
    .where(eq(truckDeliveries.id, data.truckDeliveryId))
    .limit(1);

  if (delivery.length > 0) {
    const currentDelivery = delivery[0];
    await db
      .update(truckDeliveries)
      .set({
        totalEmptyReceived: (currentDelivery.totalEmptyReceived ?? 0) + data.emptyReceived,
        totalFullDelivered: (currentDelivery.totalFullDelivered ?? 0) + data.fullDelivered,
      })
      .where(eq(truckDeliveries.id, data.truckDeliveryId));
  }

  return db.insert(truckDeliveryItems).values(itemData);
}

/**
 * Processa a entrega do caminhão
 * Atualiza estoque: recebe vazios, entrega cheios
 */
export async function processTruckDelivery(truckDeliveryId: number, processedBy: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  // Obter todos os itens da entrega
  const items = await db
    .select()
    .from(truckDeliveryItems)
    .where(eq(truckDeliveryItems.truckDeliveryId, truckDeliveryId));

  // Processar cada item
  for (const item of items) {
    const product = await db
      .select()
      .from(products)
      .where(eq(products.id, item.productId))
      .limit(1);

    if (product.length > 0) {
      const prod = product[0];
      
      // Cálculo: recebe vazios (-) e entrega cheios (+)
      const emptyRec = item.emptyReceived ?? 0;
      const fullDel = item.fullDelivered ?? 0;
      const newQty = prod.stockQty - emptyRec + fullDel;

      // Atualizar estoque do produto
      await db
        .update(products)
        .set({ stockQty: newQty })
        .where(eq(products.id, item.productId));

      // Registrar ajuste de inventário - Recebimento de vazios
      if (emptyRec > 0) {
        await db.insert(inventoryAdjustments).values({
          adjustmentDate: new Date(),
          type: "entrega_caminhao",
          productId: item.productId,
          productName: item.productName,
          quantityBefore: prod.stockQty,
          quantityAfter: prod.stockQty - emptyRec,
          difference: -emptyRec,
          reason: `Recebimento de ${emptyRec} botijões vazios`,
          truckDeliveryId,
          createdBy: processedBy,
          notes: `Caminhão chegou com vazios - ${item.notes || ""}`,
        } as any);
      }

      // Registrar ajuste de inventário - Entrega de cheios
      if (fullDel > 0) {
        const qtyAfterEmpty = prod.stockQty - emptyRec;
        await db.insert(inventoryAdjustments).values({
          adjustmentDate: new Date(),
          type: "entrega_caminhao",
          productId: item.productId,
          productName: item.productName,
          quantityBefore: qtyAfterEmpty,
          quantityAfter: newQty,
          difference: fullDel,
          reason: `Entrega de ${fullDel} botijões cheios`,
          truckDeliveryId,
          createdBy: processedBy,
          notes: `Caminhão entregou cheios - ${item.notes || ""}`,
        } as any);
      }
    }
  }

  // Atualizar status da entrega para concluído
  await db
    .update(truckDeliveries)
    .set({
      status: "concluido",
      arrivedAt: new Date(),
      completedAt: new Date(),
    })
    .where(eq(truckDeliveries.id, truckDeliveryId));

  return { success: true, truckDeliveryId };
}

/**
 * Obtém histórico de entregas de caminhão
 */
export async function getTruckDeliveryHistory(limit: number = 50) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(truckDeliveries)
    .orderBy(desc(truckDeliveries.deliveryDate))
    .limit(limit);
}

/**
 * Obtém detalhes de uma entrega de caminhão
 */
export async function getTruckDeliveryDetails(truckDeliveryId: number) {
  const db = await getDb();
  if (!db) return null;

  const delivery = await db
    .select()
    .from(truckDeliveries)
    .where(eq(truckDeliveries.id, truckDeliveryId))
    .limit(1);

  if (delivery.length === 0) return null;

  const items = await db
    .select()
    .from(truckDeliveryItems)
    .where(eq(truckDeliveryItems.truckDeliveryId, truckDeliveryId));

  return {
    delivery: delivery[0],
    items,
  };
}

/**
 * Obtém histórico de ajustes de inventário
 */
export async function getInventoryAdjustmentHistory(
  productId?: number,
  type?: string,
  limit: number = 100
) {
  const db = await getDb();
  if (!db) return [];

  const conditions: SQL[] = [];
  if (productId) conditions.push(eq(inventoryAdjustments.productId, productId));
  if (type) conditions.push(eq(inventoryAdjustments.type, type as any));

  const query = db
    .select()
    .from(inventoryAdjustments)
    .orderBy(desc(inventoryAdjustments.adjustmentDate))
    .limit(limit);

  if (conditions.length > 0) {
    return query.where(and(...conditions));
  }
  return query;
}

/**
 * Gera relatório de estoque por produto
 */
export async function getStockReport() {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      id: products.id,
      name: products.name,
      category: products.category,
      stockQty: products.stockQty,
      minStock: products.minStock,
      price: products.price,
      isActive: products.isActive,
    })
    .from(products)
    .orderBy(products.category, products.name);
}

/**
 * Calcula estatísticas de estoque
 */
export async function getStockStatistics() {
  const db = await getDb();
  if (!db) return null;

  const allProducts = await db.select().from(products);
  
  const totalStock = allProducts.reduce((sum, p) => sum + p.stockQty, 0);
  const lowStockCount = allProducts.filter(
    (p) => p.isActive && p.stockQty <= p.minStock
  ).length;
  const outOfStockCount = allProducts.filter(
    (p) => p.isActive && p.stockQty === 0
  ).length;

  return {
    totalProducts: allProducts.length,
    activeProducts: allProducts.filter((p) => p.isActive).length,
    totalStock,
    lowStockCount,
    outOfStockCount,
    averageStock: allProducts.length > 0 ? totalStock / allProducts.length : 0,
  };
}
