import { and, desc, eq, gte, like, lte, or, sql, type SQL } from "drizzle-orm";
import { getTodayInTZ, getPeriodStartInTZ, getConfiguredTimezone, getTodayInTimezone } from "./timezone";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  products,
  customers,
  orders,
  orderItems,
  stockMovements,
  coupons,
  discountCoupons,
  settings,
  deliverers,
  adminUsers,
  type InsertProduct,
  type InsertCustomer,
  type InsertOrder,
  type InsertOrderItem,
  type InsertStockMovement,
  type InsertCoupon,
  type InsertSetting,
  type InsertDeliverer,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ───────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  textFields.forEach((field) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  });
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Products ────────────────────────────────────────────────────────────────
export async function getProducts(search?: string, category?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions: SQL[] = [];
  if (search) conditions.push(like(products.name, `%${search}%`));
  if (category && category !== "todos") conditions.push(eq(products.category, category));
  conditions.push(eq(products.isActive, true));
  // Filtra apenas produtos visíveis na loja dos clientes
  conditions.push(eq(products.isVisible, true));
  const query = db.select().from(products).orderBy(products.category, products.name);
  return query.where(and(...conditions));
}

export async function getAllProducts(search?: string, category?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions: SQL[] = [];
  if (search) conditions.push(like(products.name, `%${search}%`));
  if (category && category !== "todos") conditions.push(eq(products.category, category));
  const query = db.select().from(products).orderBy(desc(products.createdAt));
  if (conditions.length > 0) return query.where(and(...conditions));
  return query;
}

export async function getProductById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(products).where(eq(products.id, id)).limit(1);
  return result[0];
}

export async function createProduct(data: InsertProduct) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.insert(products).values(data);
}

export async function updateProduct(id: number, data: Partial<InsertProduct>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  
  // Filter out empty strings and convert them to null for optional fields
  const cleanData: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === "") {
      // Empty strings become null for optional fields
      if (["costPrice", "description", "imageUrl", "category", "unit"].includes(key)) {
        cleanData[key] = null;
      }
    } else if (value !== undefined) {
      cleanData[key] = value;
    }
  }
  
  return db.update(products).set(cleanData as any).where(eq(products.id, id));
}

export async function deleteProduct(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.update(products).set({ isActive: false }).where(eq(products.id, id));
}

export async function getLowStockProducts() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(products)
    .where(
      and(
        eq(products.isActive, true),
        sql`${products.stockQty} <= ${products.minStock}`
      )
    );
}

// ─── Customers ───────────────────────────────────────────────────────────────
export async function getCustomers(search?: string) {
  const db = await getDb();
  if (!db) return [];
  if (search) {
    // Busca case-insensitive: converte o termo para maiúsculas para comparar com nomes em caixa alta
    const searchUpper = search.toUpperCase();
    const cpfRaw = search.replace(/\D/g, "");
    const conditions = [
      like(customers.name, `%${searchUpper}%`),
      like(customers.name, `%${search}%`),
      like(customers.phone, `%${search}%`),
      like(customers.email, `%${search}%`),
      like(customers.cpf, `%${search}%`),
      ...(cpfRaw.length >= 3 ? [like(customers.cpf, `%${cpfRaw}%`)] : []),
    ];
    return db
      .select()
      .from(customers)
      .where(or(...conditions))
      .orderBy(desc(customers.createdAt));
  }
  return db.select().from(customers).orderBy(desc(customers.createdAt));
}

export async function getCustomerById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
  return result[0];
}

export async function createCustomer(data: InsertCustomer) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.insert(customers).values(data);
}

export async function updateCustomer(id: number, data: Partial<InsertCustomer>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.update(customers).set(data).where(eq(customers.id, id));
}

// ─── Orders ──────────────────────────────────────────────────────────────────
export async function getOrders(status?: string, search?: string, limit?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions: SQL[] = [];
  if (status && status !== "todos") conditions.push(eq(orders.status, status as any));
  if (search) {
    const searchCond = or(
      like(orders.customerName, `%${search}%`),
      like(orders.customerPhone, `%${search}%`),
      like(orders.orderNumber, `%${search}%`)
    );
    if (searchCond) conditions.push(searchCond);
  }
  const query = db
    .select()
    .from(orders)
    .orderBy(desc(orders.createdAt))
    .limit(limit ?? 200);
  if (conditions.length > 0) return query.where(and(...conditions));
  return query;
}

export async function getOrderById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  return result[0];
}

export async function getOrdersByCustomer(customerId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(orders)
    .where(eq(orders.customerId, customerId))
    .orderBy(desc(orders.createdAt))
    .limit(limit);
}

export async function getOrderByNumber(orderNumber: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber)).limit(1);
  return result[0];
}

export async function getOrderItems(orderId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
}

export async function createOrder(
  orderData: Omit<InsertOrder, 'orderNumber'>,
  items: Omit<InsertOrderItem, 'orderId'>[]
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  // Generate order number
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const orderNumber = `GR${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

  const result = await db.insert(orders).values({ ...orderData, orderNumber });
  const insertId = (result as any)[0]?.insertId ?? (result as any).insertId;

  if (insertId && items.length > 0) {
    await db.insert(orderItems).values(
      items.map((item) => ({ ...item, orderId: insertId }))
    );
    // Decrease stock
    for (const item of items) {
      if (item.productId) {
        const prod = await getProductById(item.productId);
        if (prod) {
          const newQty = Math.max(0, prod.stockQty - item.quantity);
          await db.update(products).set({ stockQty: newQty }).where(eq(products.id, item.productId));
          await db.insert(stockMovements).values({
            productId: item.productId,
            productName: item.productName,
            type: "saida",
            quantity: item.quantity,
            previousQty: prod.stockQty,
            newQty,
            reason: `Pedido #${orderNumber}`,
            orderId: insertId,
          });
        }
      }
    }
  }

  return { id: insertId, orderNumber };
}

export async function updateOrderStatus(
  id: number,
  status: string,
  extra?: { delivererId?: number; delivererName?: string; paymentConfirmed?: boolean }
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const updateData: Record<string, unknown> = { status };
  if (extra?.delivererId) updateData.delivererId = extra.delivererId;
  if (extra?.delivererName) updateData.delivererName = extra.delivererName;
  if (extra?.paymentConfirmed !== undefined) {
    updateData.paymentConfirmed = extra.paymentConfirmed;
    if (extra.paymentConfirmed) updateData.paymentConfirmedAt = new Date();
  }
  if (status === "entregue") {
    updateData.deliveredAt = new Date();
    updateData.paymentConfirmed = true;
    updateData.paymentConfirmedAt = new Date();
  }
  return db.update(orders).set(updateData).where(eq(orders.id, id));
}

// ─── Deliverers ──────────────────────────────────────────────────────────────
export async function getDeliverers(onlineOnly?: boolean, includeInactive?: boolean) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (!includeInactive) conditions.push(eq(deliverers.isActive, true));
  if (onlineOnly) conditions.push(eq(deliverers.isOnline, true));
  const rows = await db.select({
    id: deliverers.id,
    name: deliverers.name,
    phone: deliverers.phone,
    email: deliverers.email,
    vehicle: deliverers.vehicle,
    isActive: deliverers.isActive,
    isOnline: deliverers.isOnline,
    lastSeen: deliverers.lastSeen,
    createdAt: deliverers.createdAt,
  }).from(deliverers)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(deliverers.isOnline), deliverers.name);

  // Enrich with delivery stats
  const enriched = await Promise.all(rows.map(async (d) => {
    const deliveryStats = await db!.select({
      total: sql<number>`count(*)`,
      totalRevenue: sql<string>`coalesce(sum(${orders.total}), 0)`,
      activeCount: sql<number>`sum(case when ${orders.status} in ('saiu_entrega', 'aguardando_entregador') then 1 else 0 end)`,
      completedCount: sql<number>`sum(case when ${orders.status} = 'entregue' then 1 else 0 end)`,
    }).from(orders).where(eq(orders.delivererId, d.id));
    const stats = deliveryStats[0];
    return {
      ...d,
      totalDeliveries: Number(stats?.total ?? 0),
      totalRevenue: stats?.totalRevenue ?? '0',
      activeOrders: Number(stats?.activeCount ?? 0),
      completedOrders: Number(stats?.completedCount ?? 0),
    };
  }));
  return enriched;
}

export async function getDelivererById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(deliverers).where(eq(deliverers.id, id)).limit(1);
  return result[0];
}

export async function createDeliverer(data: InsertDeliverer) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.insert(deliverers).values(data);
}

export async function updateDeliverer(id: number, data: Partial<InsertDeliverer>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.update(deliverers).set(data).where(eq(deliverers.id, id));
}

export async function getDelivererOrders(delivererId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(orders)
    .where(eq(orders.delivererId, delivererId))
    .orderBy(desc(orders.createdAt))
    .limit(50);
}

// ─── Settings ────────────────────────────────────────────────────────────────
export async function getAllSettings(): Promise<Record<string, string>> {
  const db = await getDb();
  if (!db) return {};
  const rows = await db.select().from(settings);
  const result: Record<string, string> = {};
  for (const row of rows) {
    if (row.key && row.value !== null && row.value !== undefined) {
      result[row.key] = row.value;
    }
  }
  return result;
}

export async function getSettingByKey(key: string): Promise<{ key: string; value: string | null } | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  return rows.length > 0 ? rows[0] : null;
}

export async function setSettings(data: Record<string, string>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  for (const [key, value] of Object.entries(data)) {
    await db
      .insert(settings)
      .values({ key, value })
      .onDuplicateKeyUpdate({ set: { value } });
  }
  return { success: true };
}

// ─── Stock ───────────────────────────────────────────────────────────────────
export async function getStockMovements(productId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (productId) {
    return db
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.productId, productId))
      .orderBy(desc(stockMovements.createdAt))
      .limit(100);
  }
  return db.select().from(stockMovements).orderBy(desc(stockMovements.createdAt)).limit(200);
}

export async function addStockMovement(data: InsertStockMovement) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(stockMovements).values(data);
  await db.update(products).set({ stockQty: data.newQty }).where(eq(products.id, data.productId));
  return { success: true };
}

// ─── Coupons ─────────────────────────────────────────────────────────────────
export async function getCoupons() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(coupons).orderBy(desc(coupons.createdAt));
}

export async function getCouponByCode(code: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(coupons).where(eq(coupons.code, code.toUpperCase())).limit(1);
  return result[0];
}

// Busca na tabela discount_coupons (usada pelo sistema de checkout)
export async function getDiscountCouponByCode(code: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(discountCoupons).where(eq(discountCoupons.code, code.toUpperCase())).limit(1);
  return result[0];
}

export async function createCoupon(data: InsertCoupon) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.insert(coupons).values(data);
}

export async function updateCoupon(id: number, data: Partial<InsertCoupon>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.update(coupons).set(data).where(eq(coupons.id, id));
}

export async function deleteCoupon(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.delete(coupons).where(eq(coupons.id, id));
}

// ─── Dashboard ──────────────────────────────────────────────────────
export async function getDashboardStats() {
  const db = await getDb();
  if (!db) return null;
  // Usar fuso horário configurado (padrão: America/Sao_Paulo)
  const { start: today, end: tomorrow } = await getTodayInTZ();

  const [todaySales] = await db
    .select({ total: sql<string>`COALESCE(SUM(total), 0)` })
    .from(orders)
    .where(and(gte(orders.createdAt, today), lte(orders.createdAt, tomorrow), sql`${orders.status} != 'cancelado'`));

  const [todayCount] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(orders)
    .where(and(gte(orders.createdAt, today), lte(orders.createdAt, tomorrow)));

  const [pendingCount] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(orders)
    .where(sql`${orders.status} IN ('novo','em_preparo','aguardando_entregador','saiu_entrega')`);

  const [deliveredToday] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(orders)
    .where(and(gte(orders.createdAt, today), eq(orders.status, "entregue")));

  // Sales chart last 7 days (no fuso configurado)
  const salesChart: Array<{date: string; total: number; count: number}> = [];
  const tz = await getConfiguredTimezone();
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayStr = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
    // Calcular offset para este dia específico
    const refDate = new Date(dayStr + "T12:00:00Z");
    const offsetMs = (new Date(refDate.toLocaleString("en-US", { timeZone: "UTC" })).getTime()) - (new Date(refDate.toLocaleString("en-US", { timeZone: tz })).getTime());
    const thisDayStart = new Date(new Date(dayStr + "T00:00:00Z").getTime() - offsetMs);
    const thisDayEnd = new Date(thisDayStart.getTime() + 24 * 60 * 60 * 1000);
    const [dayData] = await db
      .select({ total: sql<string>`COALESCE(SUM(total), 0)`, count: sql<number>`COUNT(*)` })
      .from(orders)
      .where(and(gte(orders.createdAt, thisDayStart), lte(orders.createdAt, thisDayEnd), sql`${orders.status} != 'cancelado'`));
    (salesChart as Array<{date: string; total: number; count: number}>).push({
      date: new Date(dayStr + "T12:00:00Z").toLocaleDateString("pt-BR", { timeZone: tz, weekday: "short", day: "2-digit" }),
      total: parseFloat(dayData?.total ?? "0"),
      count: dayData?.count ?? 0,
    });
  }

  const lowStock = await getLowStockProducts();
  const recentOrders = await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(5);
  const [activeProductsRow] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(products)
    .where(eq(products.isActive, true));
  return {
    todaySalesTotal: parseFloat(todaySales?.total ?? "0"),
    todayOrdersCount: todayCount?.count ?? 0,
    pendingOrdersCount: pendingCount?.count ?? 0,
    deliveredTodayCount: deliveredToday?.count ?? 0,
    salesChart,
    lowStockCount: lowStock.length,
    recentOrders,
    activeProductsCount: activeProductsRow?.count ?? 0,
  };
}

// ─── Order CRUD (admin) ───────────────────────────────────────────────────────
export async function updateOrder(
  id: number,
  data: {
    customerName?: string;
    customerPhone?: string;
    deliveryAddress?: string;
    neighborhood?: string;
    paymentMethod?: string;
    discount?: string;
    notes?: string;
    delivererId?: number | null;
    delivererName?: string | null;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.update(orders).set(data as any).where(eq(orders.id, id));
}

export async function deleteOrder(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // Deletar itens do pedido primeiro
  await db.delete(orderItems).where(eq(orderItems.orderId, id));
  // Deletar o pedido
  return db.delete(orders).where(eq(orders.id, id));
}

export async function getSalesReport(period: "day" | "week" | "month") {
  const db = await getDb();
  if (!db) return null;
  const now = new Date();
  // Usar fuso horário configurado
  const { start: startDate } = await getPeriodStartInTZ(period);
  const ordersList = await db
    .select()
    .from(orders)
    .where(and(gte(orders.createdAt, startDate), sql`${orders.status} != 'cancelado'`))
    .orderBy(desc(orders.createdAt));

  const totalRevenue = ordersList.reduce((acc, o) => acc + parseFloat((o.total ?? '0').toString()), 0);
  const paymentBreakdown: Record<string, number> = {};
  for (const o of ordersList) {
    paymentBreakdown[o.paymentMethod] = (paymentBreakdown[o.paymentMethod] ?? 0) + 1;
  }
  return {
    period, startDate, endDate: now,
    totalRevenue, totalOrders: ordersList.length,
    deliveredOrders: ordersList.filter((o) => o.status === "entregue").length,
    paymentBreakdown, orders: ordersList,
  };
}
