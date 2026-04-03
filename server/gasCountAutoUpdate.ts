/**
 * Gas Count Auto Update — Versão Corrigida
 *
 * Quando um pedido é CRIADO/CONFIRMADO:
 *   GÁS NORMAL (reposição): -N cheios, +N vazios
 *   GÁS COMPLETO (troca):   -N cheios, -N vazios (cliente entrega o vazio)
 *
 * Quando um pedido é CANCELADO:
 *   Reverte as quantidades (operação inversa)
 *
 * Regra: fullStockQty e emptyStockQty nos produtos são a fonte de verdade.
 * A tabela gas_count registra o histórico diário.
 */

import { eq, and, sql } from "drizzle-orm";
import { gasCount, orders, orderItems, products } from "../drizzle/schema";
import { getDb } from "./db";

/** Detecta se um produto é gás completo (troca de botijão) */
function isFullGasProduct(productName: string): boolean {
  const fullGasKeywords = ["completo", "troca", "cheio", "full"];
  return fullGasKeywords.some((kw) => productName.toLowerCase().includes(kw));
}

/**
 * Atualiza a contagem de gás e o estoque quando um pedido é criado.
 * Decrementa cheios e incrementa vazios (ou decrementa ambos para gás completo).
 */
export async function updateGasCountOnOrderCreation(orderId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  // Obter pedido
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) {
    console.warn(`[GasCountAutoUpdate] Pedido ${orderId} não encontrado`);
    return;
  }

  // Obter itens do pedido com dados do produto
  const items = await db
    .select({
      quantity: orderItems.quantity,
      productId: orderItems.productId,
      productName: orderItems.productName,
    })
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));

  if (items.length === 0) {
    console.warn(`[GasCountAutoUpdate] Nenhum item no pedido ${orderId}`);
    return;
  }

  const today = new Date().toISOString().slice(0, 10);

  for (const item of items) {
    const qty = item.quantity || 0;
    if (qty <= 0) continue;

    const productName = item.productName || "Produto";
    const isFullGas = isFullGasProduct(productName);

    // Buscar produto para obter estoque atual
    let currentFull = 0;
    let currentEmpty = 0;
    if (item.productId) {
      const [prod] = await db
        .select({ stockQty: products.stockQty, fullStockQty: products.fullStockQty, emptyStockQty: products.emptyStockQty })
        .from(products)
        .where(eq(products.id, item.productId))
        .limit(1);
      if (prod) {
        currentFull = prod.fullStockQty ?? prod.stockQty ?? 0;
        currentEmpty = prod.emptyStockQty ?? 0;
      }
    }

    // Calcular novos valores
    const newFull = Math.max(0, currentFull - qty);
    const newEmpty = isFullGas
      ? Math.max(0, currentEmpty - qty) // troca: cliente entrega vazio
      : currentEmpty + qty;             // reposição: cliente devolve vazio

    console.log(
      `[GasCountAutoUpdate] ${isFullGas ? "TROCA" : "REPOSIÇÃO"} ${productName} x${qty}: ` +
      `cheios ${currentFull}→${newFull}, vazios ${currentEmpty}→${newEmpty}`
    );

    // Atualizar estoque do produto
    if (item.productId) {
      await db.execute(sql`
        UPDATE products
        SET fullStockQty  = ${newFull},
            emptyStockQty = ${newEmpty},
            stockQty      = ${newFull}
        WHERE id = ${item.productId}
      `);
    }

    // Registrar/atualizar contagem diária
    const [existing] = await db
      .select()
      .from(gasCount)
      .where(and(eq(gasCount.countDate, today), eq(gasCount.productName, productName)))
      .limit(1);

    if (existing) {
      await db
        .update(gasCount)
        .set({
          fullQty: newFull,
          emptyQty: newEmpty,
          soldQty: (existing.soldQty || 0) + qty,
        })
        .where(and(eq(gasCount.countDate, today), eq(gasCount.productName, productName)));
    } else {
      await db.insert(gasCount).values({
        countDate: today,
        productId: item.productId ?? null,
        productName,
        fullQty: newFull,
        emptyQty: newEmpty,
        soldQty: qty,
        returnedQty: 0,
        notes: `${isFullGas ? "Troca" : "Reposição"} automática — Pedido #${order.orderNumber || orderId}`,
        createdBy: "sistema_automatico",
      });
    }
  }

  return { success: true, orderId, itemsProcessed: items.length };
}

/**
 * Reverte a contagem de gás quando um pedido é cancelado.
 * Restaura cheios e reverte vazios.
 */
export async function revertGasCountOnOrderCancellation(orderId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const items = await db
    .select({
      quantity: orderItems.quantity,
      productId: orderItems.productId,
      productName: orderItems.productName,
    })
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));

  if (items.length === 0) return;

  const today = new Date().toISOString().slice(0, 10);

  for (const item of items) {
    const qty = item.quantity || 0;
    if (qty <= 0 || !item.productId) continue;

    const productName = item.productName || "Produto";
    const isFullGas = isFullGasProduct(productName);

    const [prod] = await db
      .select({ stockQty: products.stockQty, fullStockQty: products.fullStockQty, emptyStockQty: products.emptyStockQty })
      .from(products)
      .where(eq(products.id, item.productId))
      .limit(1);

    if (!prod) continue;

    const currentFull = prod.fullStockQty ?? prod.stockQty ?? 0;
    const currentEmpty = prod.emptyStockQty ?? 0;

    // Reverter: devolver cheios, remover vazios que foram adicionados
    const newFull = currentFull + qty;
    const newEmpty = isFullGas
      ? currentEmpty + qty  // troca revertida: devolver vazio
      : Math.max(0, currentEmpty - qty); // reposição revertida: remover vazio

    console.log(
      `[GasCountAutoUpdate] CANCELAMENTO ${productName} x${qty}: ` +
      `cheios ${currentFull}→${newFull}, vazios ${currentEmpty}→${newEmpty}`
    );

    await db.execute(sql`
      UPDATE products
      SET fullStockQty  = ${newFull},
          emptyStockQty = ${newEmpty},
          stockQty      = ${newFull}
      WHERE id = ${item.productId}
    `);

    // Atualizar contagem do dia
    const [existing] = await db
      .select()
      .from(gasCount)
      .where(and(eq(gasCount.countDate, today), eq(gasCount.productName, productName)))
      .limit(1);

    if (existing) {
      await db
        .update(gasCount)
        .set({
          fullQty: newFull,
          emptyQty: newEmpty,
          soldQty: Math.max(0, (existing.soldQty || 0) - qty),
        })
        .where(and(eq(gasCount.countDate, today), eq(gasCount.productName, productName)));
    }
  }

  return { success: true, orderId };
}

/**
 * Obtém o resumo da contagem de gás de hoje
 */
export async function getTodayGasCountSummary() {
  const db = await getDb();
  if (!db) return null;

  const today = new Date().toISOString().slice(0, 10);
  const counts = await db.select().from(gasCount).where(eq(gasCount.countDate, today));

  if (counts.length === 0) return null;

  return {
    date: today,
    items: counts,
    totalFull: counts.reduce((sum, c) => sum + (c.fullQty ?? 0), 0),
    totalEmpty: counts.reduce((sum, c) => sum + (c.emptyQty ?? 0), 0),
    totalSold: counts.reduce((sum, c) => sum + c.soldQty, 0),
    totalReturned: counts.reduce((sum, c) => sum + (c.returnedQty ?? 0), 0),
  };
}

/**
 * Reseta a contagem de gás de um dia específico
 */
export async function resetGasCountForDate(date: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  await db.delete(gasCount).where(eq(gasCount.countDate, date));
  console.log(`[GasCountAutoUpdate] Contagem de gás resetada para ${date}`);
  return { success: true, date };
}
