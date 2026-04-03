import {
  boolean,
  decimal,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

// ─── Users (Manus OAuth) ──────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Admin Users ──────────────────────────────────────────────────────────────
export const adminUsers = mysqlTable("admin_users", {
  id: int("id").autoincrement().primaryKey(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  resetToken: varchar("resetToken", { length: 64 }),
  resetTokenExpiry: timestamp("resetTokenExpiry"),
  lastLogin: timestamp("lastLogin"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type AdminUser = typeof adminUsers.$inferSelect;
export type InsertAdminUser = typeof adminUsers.$inferInsert;

// ─── Deliverers (Entregadores) ────────────────────────────────────────────────
export const deliverers = mysqlTable("deliverers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 320 }).notNull().default(""),
  username: varchar("username", { length: 100 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  isOnline: boolean("isOnline").default(false).notNull(),
  lastSeen: timestamp("lastSeen"),
  vehicle: varchar("vehicle", { length: 100 }),
  notes: text("notes"),
  lastLogin: timestamp("lastLogin"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  totalDeliveries: int("totalDeliveries").default(0),
  rating: decimal("rating", { precision: 3, scale: 2 }),
  currentOrderId: int("currentOrderId"),
});
export type Deliverer = typeof deliverers.$inferSelect;
export type InsertDeliverer = typeof deliverers.$inferInsert;

// ─── Customers ────────────────────────────────────────────────────────────────
export const customers = mysqlTable("customers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  whatsapp: varchar("whatsapp", { length: 20 }),
  email: varchar("email", { length: 320 }),
  address: text("address"),
  addressNumber: varchar("addressNumber", { length: 20 }),
  neighborhood: varchar("neighborhood", { length: 100 }),
  city: varchar("city", { length: 100 }),
  notes: text("notes"),
  totalOrders: int("totalOrders").default(0).notNull(),
  totalSpent: decimal("totalSpent", { precision: 12, scale: 2 }).default("0").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastOrderDate: timestamp("lastOrderDate"),
  complement: varchar("complement", { length: 100 }),
  zipCode: varchar("zipCode", { length: 10 }),
  state: varchar("state", { length: 2 }),
  lat: decimal("lat", { precision: 10, scale: 7 }),
  lng: decimal("lng", { precision: 10, scale: 7 }),
  isActive: boolean("isActive").default(true).notNull(),
  source: varchar("source", { length: 50 }),
  loyaltyPoints: int("loyaltyPoints").default(0),
  isBlocked: boolean("isBlocked").default(false),
  referralCode: varchar("referralCode", { length: 20 }),
  cpf: varchar("cpf", { length: 14 }),
});
export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = typeof customers.$inferInsert;

// ─── Products ─────────────────────────────────────────────────────────────────
export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  costPrice: decimal("costPrice", { precision: 10, scale: 2 }),
  imageUrl: text("imageUrl"),
  category: varchar("category", { length: 50 }).default("gas").notNull(),
  unit: varchar("unit", { length: 20 }).default("unidade").notNull(),
  stockQty: int("stockQty").default(0).notNull(),
  fullStockQty: int("fullStockQty").default(0).notNull(),
  emptyStockQty: int("emptyStockQty").default(0).notNull(),
  minStock: int("minStock").default(5).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  isVisible: boolean("isVisible").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  weight: decimal("weight", { precision: 8, scale: 3 }),
  barcode: varchar("barcode", { length: 50 }),
  supplier: varchar("supplier", { length: 255 }),
  notes: text("notes"),
});
export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

// ─── Orders ───────────────────────────────────────────────────────────────────
export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  orderNumber: varchar("orderNumber", { length: 20 }).notNull().unique(),
  customerId: int("customerId"),
  customerName: varchar("customerName", { length: 255 }),
  customerPhone: varchar("customerPhone", { length: 20 }),
  customerWhatsapp: varchar("customerWhatsapp", { length: 20 }),
  address: text("address"),
  deliveryAddress: text("deliveryAddress"),
  neighborhood: varchar("neighborhood", { length: 100 }),
  status: mysqlEnum("status", [
    "novo",
    "em_preparo",
    "aguardando_entregador",
    "saiu_entrega",
    "entregue",
    "cancelado",
  ]).default("novo").notNull(),
  paymentMethod: mysqlEnum("paymentMethod", [
    "dinheiro",
    "pix",
    "debito",
    "credito",
    "fiado",
  ]).notNull(),
  paymentStatus: varchar("paymentStatus", { length: 50 }),
  paymentConfirmed: boolean("paymentConfirmed").default(false).notNull(),
  paymentConfirmedAt: timestamp("paymentConfirmedAt"),
  delivererId: int("delivererId"),
  delivererName: varchar("delivererName", { length: 255 }),
  totalAmount: decimal("totalAmount", { precision: 10, scale: 2 }),
  discountAmount: decimal("discountAmount", { precision: 10, scale: 2 }).default("0"),
  deliveryFee: decimal("deliveryFee", { precision: 10, scale: 2 }).default("0").notNull(),
  finalAmount: decimal("finalAmount", { precision: 10, scale: 2 }),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }),
  discount: decimal("discount", { precision: 10, scale: 2 }).default("0"),
  total: decimal("total", { precision: 10, scale: 2 }),
  couponCode: varchar("couponCode", { length: 50 }),
  couponDiscount: decimal("couponDiscount", { precision: 10, scale: 2 }),
  change: decimal("change", { precision: 10, scale: 2 }),
  notes: text("notes"),
  source: varchar("source", { length: 50 }),
  cancelReason: text("cancelReason"),
  estimatedDelivery: timestamp("estimatedDelivery"),
  deliverBy: timestamp("deliverBy"),
  deliveredAt: timestamp("deliveredAt"),
  cancelledAt: timestamp("cancelledAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

// ─── Order Items ──────────────────────────────────────────────────────────────
export const orderItems = mysqlTable("order_items", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  productId: int("productId"),
  productName: varchar("productName", { length: 255 }).notNull(),
  unitPrice: decimal("unitPrice", { precision: 10, scale: 2 }).notNull(),
  quantity: int("quantity").notNull(),
  totalPrice: decimal("totalPrice", { precision: 10, scale: 2 }),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }),
  discount: decimal("discount", { precision: 10, scale: 2 }).default("0"),
  notes: text("notes"),
});
export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = typeof orderItems.$inferInsert;

// ─── Stock Movements ──────────────────────────────────────────────────────────
export const stockMovements = mysqlTable("stock_movements", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull(),
  productName: varchar("productName", { length: 255 }).notNull(),
  type: mysqlEnum("type", ["entrada", "saida", "ajuste"]).notNull(),
  quantity: int("quantity").notNull(),
  previousQty: int("previousQty").notNull(),
  newQty: int("newQty").notNull(),
  reason: varchar("reason", { length: 255 }),
  referenceId: int("referenceId"),
  orderId: int("orderId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type StockMovement = typeof stockMovements.$inferSelect;
export type InsertStockMovement = typeof stockMovements.$inferInsert;

// ─── Coupons ──────────────────────────────────────────────────────────────────
export const coupons = mysqlTable("coupons", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  description: varchar("description", { length: 255 }),
  type: mysqlEnum("type", ["percentual", "fixo"]).notNull(),
  value: decimal("value", { precision: 10, scale: 2 }).notNull(),
  minOrderValue: decimal("minOrderValue", { precision: 10, scale: 2 }).default("0"),
  maxUses: int("maxUses"),
  usedCount: int("usedCount").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  validFrom: timestamp("validFrom").defaultNow().notNull(),
  validUntil: timestamp("validUntil"),
  // Colunas extras presentes no banco (do backup de produção)
  maxDiscount: decimal("maxDiscount", { precision: 10, scale: 2 }),
  expiryDate: timestamp("expiryDate"),
  usageLimit: int("usageLimit"),
  expiryAt: timestamp("expiryAt"),
  expiresAt: timestamp("expiresAt"),
  startDate: timestamp("startDate"),
  maxUsesPerCustomer: int("maxUsesPerCustomer"),
  applicableProducts: text("applicableProducts"),
  applicableCategories: text("applicableCategories"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});
export type Coupon = typeof coupons.$inferSelect;
export type InsertCoupon = typeof coupons.$inferInsert;

// ─── Gas Count (Contagem Diária de Gás) ─────────────────────────────────────
export const gasCount = mysqlTable("gas_count", {
  id: int("id").autoincrement().primaryKey(),
  countDate: varchar("countDate", { length: 10 }).notNull(),
  productId: int("productId"),
  productName: varchar("productName", { length: 255 }).notNull(),
  initialQty: int("initialQty").default(0),
  soldQty: int("soldQty").default(0).notNull(),
  finalQty: int("finalQty").default(0),
  difference: int("difference").default(0),
  // Aliases usados pelo código
  fullQty: int("fullQty").default(0),
  emptyQty: int("emptyQty").default(0),
  returnedQty: int("returnedQty").default(0),
  notes: text("notes"),
  createdBy: varchar("createdBy", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type GasCount = typeof gasCount.$inferSelect;
export type InsertGasCount = typeof gasCount.$inferInsert;

// ─── Truck Deliveries (Entregas do Caminhão) ──────────────────────────────────
export const truckDeliveries = mysqlTable("truck_deliveries", {
  id: int("id").autoincrement().primaryKey(),
  deliveryDate: timestamp("deliveryDate").defaultNow().notNull(),
  licensePlate: varchar("licensePlate", { length: 20 }),
  driverName: varchar("driverName", { length: 255 }),
  status: mysqlEnum("status", ["planejado", "em_transito", "chegou", "processando", "concluido", "cancelado"]).default("planejado").notNull(),
  emptyBottlesReceived: int("emptyBottlesReceived").default(0),
  fullBottlesDelivered: int("fullBottlesDelivered").default(0),
  // Aliases usados pelo código (nomes alternativos)
  truckPlate: varchar("truckPlate", { length: 20 }),
  driverId: int("driverId"),
  totalEmptyReceived: int("totalEmptyReceived"),
  totalFullDelivered: int("totalFullDelivered"),
  arrivedAt: timestamp("arrivedAt"),
  notes: text("notes"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type TruckDelivery = typeof truckDeliveries.$inferSelect;
export type InsertTruckDelivery = typeof truckDeliveries.$inferInsert;

// ─── Truck Delivery Items (Itens da Entrega do Caminhão) ──────────────────────
export const truckDeliveryItems = mysqlTable("truck_delivery_items", {
  id: int("id").autoincrement().primaryKey(),
  deliveryId: int("deliveryId"),
  truckDeliveryId: int("truckDeliveryId"),
  productId: int("productId").notNull(),
  productName: varchar("productName", { length: 255 }).notNull(),
  // Colunas do banco real
  quantity: int("quantity").default(0),
  quantityDelivered: int("quantityDelivered"),
  quantityReturned: int("quantityReturned"),
  unitCost: decimal("unitCost", { precision: 10, scale: 2 }),
  // Aliases usados pelo código
  emptyReceived: int("emptyReceived"),
  fullDelivered: int("fullDelivered"),
  createdAt: timestamp("createdAt"),
  notes: text("notes"),
});
export type TruckDeliveryItem = typeof truckDeliveryItems.$inferSelect;
export type InsertTruckDeliveryItem = typeof truckDeliveryItems.$inferInsert;

// ─── Inventory Adjustments (Ajustes de Inventário) ────────────────────────────
export const inventoryAdjustments = mysqlTable("inventory_adjustments", {
  id: int("id").autoincrement().primaryKey(),
  adjustmentDate: timestamp("adjustmentDate").defaultNow().notNull(),
  type: varchar("type", { length: 100 }).notNull(),
  productId: int("productId").notNull(),
  productName: varchar("productName", { length: 255 }).notNull(),
  previousQty: int("previousQty").notNull(),
  newQty: int("newQty").notNull(),
  difference: int("difference").notNull(),
  reason: varchar("reason", { length: 255 }),
  referenceId: int("referenceId"),
  notes: text("notes"),
  createdBy: varchar("createdBy", { length: 255 }),
  details: json("details"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type InventoryAdjustment = typeof inventoryAdjustments.$inferSelect;
export type InsertInventoryAdjustment = typeof inventoryAdjustments.$inferInsert;

// ─── Credit Notes (Notas de Fiado) ───────────────────────────────────────────
export const creditNotes = mysqlTable("credit_notes", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customerId"),
  customerName: varchar("customerName", { length: 255 }).notNull(),
  customerPhone: varchar("customerPhone", { length: 20 }),
  orderId: int("orderId"),
  orderNumber: varchar("orderNumber", { length: 20 }),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paidAmount: decimal("paidAmount", { precision: 10, scale: 2 }).default("0").notNull(),
  remainingAmount: decimal("remainingAmount", { precision: 10, scale: 2 }),
  dueDate: timestamp("dueDate").notNull(),
  status: mysqlEnum("status", ["pendente", "pago", "vencido", "parcial"]).default("pendente").notNull(),
  description: text("description"),
  notifiedAt: timestamp("notifiedAt"),
  notes: text("notes"),
  paidAt: timestamp("paidAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type CreditNote = typeof creditNotes.$inferSelect;
export type InsertCreditNote = typeof creditNotes.$inferInsert;

// ─── Credit Note Payments (Pagamentos parciais de fiado) ─────────────────────
export const creditNotePayments = mysqlTable("credit_note_payments", {
  id: int("id").autoincrement().primaryKey(),
  creditNoteId: int("creditNoteId").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: mysqlEnum("paymentMethod", ["dinheiro", "pix", "debito", "credito"]).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type CreditNotePayment = typeof creditNotePayments.$inferSelect;
export type InsertCreditNotePayment = typeof creditNotePayments.$inferInsert;

// ─── System Settings ──────────────────────────────────────────────────────────
export const settings = mysqlTable("settings", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Setting = typeof settings.$inferSelect;
export type InsertSetting = typeof settings.$inferInsert;

// ─── Payment Discounts (Descontos de Pagamento) ────────────────────────────────
// NOTA: O banco real tem colunas diferentes das que o Drizzle original definia.
// Esta definição inclui TODAS as colunas presentes no banco.
export const paymentDiscounts = mysqlTable("payment_discounts", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  paymentMethod: mysqlEnum("paymentMethod", [
    "dinheiro",
    "pix",
    "debito",
    "credito",
    "fiado",
  ]).notNull(),
  // Colunas do banco real (backup de produção)
  originalAmount: decimal("originalAmount", { precision: 10, scale: 2 }),
  discountAmount: decimal("discountAmount", { precision: 10, scale: 2 }).default("0").notNull(),
  finalAmount: decimal("finalAmount", { precision: 10, scale: 2 }),
  discountPercentage: decimal("discountPercentage", { precision: 5, scale: 2 }),
  appliedAt: timestamp("appliedAt"),
  appliedBy: varchar("appliedBy", { length: 255 }),
  discountType: varchar("discountType", { length: 50 }),
  discountValue: decimal("discountValue", { precision: 10, scale: 2 }),
  isActive: boolean("isActive").default(true),
  // Colunas adicionadas pelo Drizzle (para compatibilidade com o router)
  discountReason: varchar("discountReason", { length: 255 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type PaymentDiscount = typeof paymentDiscounts.$inferSelect;
export type InsertPaymentDiscount = typeof paymentDiscounts.$inferInsert;

// ─── Gas Replenishment (Reposição de Gás Vazio) ────────────────────────────────
// NOTA: O banco real usa nomes de colunas diferentes (date, supplierName, etc.)
// Esta definição inclui TODAS as colunas presentes no banco.
export const gasReplenishment = mysqlTable("gas_replenishment", {
  id: int("id").autoincrement().primaryKey(),
  // Colunas do banco real (backup de produção)
  date: timestamp("date"),
  supplierName: varchar("supplierName", { length: 255 }),
  invoiceNumber: varchar("invoiceNumber", { length: 100 }),
  totalCost: decimal("totalCost", { precision: 10, scale: 2 }),
  receivedBy: varchar("receivedBy", { length: 255 }),
  receivedAt: timestamp("receivedAt"),
  createdBy: varchar("createdBy", { length: 255 }),
  delivererId: int("delivererId"),
  // Colunas adicionadas pelo Drizzle (para compatibilidade com o router)
  replenishmentDate: timestamp("replenishmentDate"),
  distributorName: varchar("distributorName", { length: 255 }),
  truckPlate: varchar("truckPlate", { length: 20 }),
  driverName: varchar("driverName", { length: 255 }),
  status: mysqlEnum("status", [
    "planejado",
    "em_transito",
    "chegou",
    "processando",
    "concluido",
    "cancelado",
  ]).default("planejado").notNull(),
  totalEmptySent: int("totalEmptySent").default(0),
  totalFullReceived: int("totalFullReceived").default(0),
  notes: text("notes"),
  arrivedAt: timestamp("arrivedAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type GasReplenishment = typeof gasReplenishment.$inferSelect;
export type InsertGasReplenishment = typeof gasReplenishment.$inferInsert;

// ─── Gas Replenishment Items (Itens da Reposição) ────────────────────────────
// NOTA: O banco real tem colunas diferentes. Esta definição inclui todas.
export const gasReplenishmentItems = mysqlTable("gas_replenishment_items", {
  id: int("id").autoincrement().primaryKey(),
  replenishmentId: int("replenishmentId").notNull(),
  productId: int("productId").notNull(),
  productName: varchar("productName", { length: 255 }).notNull(),
  // Colunas do banco real
  quantity: int("quantity").default(0),
  unitCost: decimal("unitCost", { precision: 10, scale: 2 }),
  totalCost: decimal("totalCost", { precision: 10, scale: 2 }),
  emptyQty: int("emptyQty"),
  fullQty: int("fullQty"),
  // Colunas adicionadas pelo Drizzle
  emptySent: int("emptySent").default(0),
  fullReceived: int("fullReceived").default(0),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow(),
});
export type GasReplenishmentItem = typeof gasReplenishmentItems.$inferSelect;
export type InsertGasReplenishmentItem = typeof gasReplenishmentItems.$inferInsert;

// ─── Push Subscriptions (Web Push Notifications) ─────────────────────────────
// NOTA: O banco real usa p256dh/auth (nomes curtos), o Drizzle usava p256dhKey/authKey.
// Esta definição inclui todas as variantes.
export const pushSubscriptions = mysqlTable("push_subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  endpoint: text("endpoint").notNull(),
  // Colunas do banco real
  p256dh: text("p256dh"),
  auth: text("auth"),
  userId: int("userId"),
  userType: varchar("userType", { length: 50 }),
  // Colunas adicionadas pelo Drizzle
  delivererId: int("delivererId"),
  p256dhKey: text("p256dhKey"),
  authKey: text("authKey"),
  userAgent: varchar("userAgent", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = typeof pushSubscriptions.$inferInsert;

// ─── Audit Logs (Logs de Auditoria) ──────────────────────────────────────────
export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  action: varchar("action", { length: 100 }).notNull(),
  entity: varchar("entity", { length: 100 }),
  entityId: int("entityId"),
  userId: int("userId"),
  userName: varchar("userName", { length: 255 }),
  userRole: varchar("userRole", { length: 50 }),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  oldData: json("oldData"),
  newData: json("newData"),
  metadata: json("metadata"),
  severity: varchar("severity", { length: 20 }),
  status: varchar("status", { length: 20 }),
  errorMessage: text("errorMessage"),
  duration: int("duration"),
  sessionId: varchar("sessionId", { length: 100 }),
  // Campos usados pelo código
  changes: text("changes"),
  resourceType: varchar("resourceType", { length: 100 }),
  resourceId: int("resourceId"),
  resourceName: varchar("resourceName", { length: 255 }),
  actionType: varchar("actionType", { length: 100 }),
  userEmail: varchar("userEmail", { length: 255 }),
  success: boolean("success").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

// ─── WhatsApp Config (Configuração do WhatsApp) ────────────────────────────────
export const whatsappConfig = mysqlTable("whatsapp_config", {
  id: int("id").autoincrement().primaryKey(),
  provider: varchar("provider", { length: 50 }),
  apiUrl: text("apiUrl"),
  apiKey: text("apiKey"),
  instanceName: varchar("instanceName", { length: 100 }),
  phoneNumber: varchar("phoneNumber", { length: 30 }).notNull().default(""),
  isActive: boolean("isActive").default(false).notNull(),
  webhookUrl: text("webhookUrl"),
  webhookSecret: varchar("webhookSecret", { length: 255 }),
  autoReply: boolean("autoReply").default(false),
  autoReplyMessage: text("autoReplyMessage"),
  orderConfirmationTemplate: text("orderConfirmationTemplate"),
  orderDeliveredTemplate: text("orderDeliveredTemplate"),
  orderCancelledTemplate: text("orderCancelledTemplate"),
  newOrderNotification: boolean("newOrderNotification").default(true),
  adminPhone: varchar("adminPhone", { length: 30 }),
  connectionStatus: varchar("connectionStatus", { length: 50 }),
  // Campos do schema antigo (WhatsApp Cloud API Meta) — mantidos para compatibilidade
  phoneNumberId: varchar("phoneNumberId", { length: 100 }),
  accessToken: text("accessToken"),
  businessAccountId: varchar("businessAccountId", { length: 100 }),
  notifyOnNewOrder: boolean("notifyOnNewOrder").default(true),
  notifyOnConfirmed: boolean("notifyOnConfirmed").default(true),
  notifyOnOutForDelivery: boolean("notifyOnOutForDelivery").default(true),
  notifyOnDelivered: boolean("notifyOnDelivered").default(true),
  notifyOnCancelled: boolean("notifyOnCancelled").default(true),
  notifyOnCreditDue: boolean("notifyOnCreditDue").default(true),
  templateNewOrder: text("templateNewOrder"),
  templateConfirmed: text("templateConfirmed"),
  templateOutForDelivery: text("templateOutForDelivery"),
  templateDelivered: text("templateDelivered"),
  templateCancelled: text("templateCancelled"),
  templateCreditDue: text("templateCreditDue"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type WhatsappConfig = typeof whatsappConfig.$inferSelect;
export type InsertWhatsappConfig = typeof whatsappConfig.$inferInsert;

// ─── WhatsApp Message Log (Histórico de Mensagens) ────────────────────────────
export const whatsappMessageLog = mysqlTable("whatsapp_message_log", {
  id: int("id").autoincrement().primaryKey(),
  phone: varchar("phone", { length: 30 }),
  message: text("message"),
  type: varchar("type", { length: 50 }),
  status: mysqlEnum("status", ["sent", "failed", "pending"]).default("pending").notNull(),
  orderId: int("orderId"),
  // Colunas extras do banco real
  customerId: int("customerId"),
  errorMessage: text("errorMessage"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
  messageId: varchar("messageId", { length: 100 }),
  // Coluna adicionada pelo Drizzle
  error: text("error"),
  // Campo do schema antigo
  whatsappMessageId: varchar("whatsappMessageId", { length: 100 }),
  sentAt: timestamp("sentAt"),
  toPhone: varchar("toPhone", { length: 30 }),
  toName: varchar("toName", { length: 255 }),
  messageBody: text("messageBody"),
  eventType: varchar("eventType", { length: 50 }),
  referenceId: int("referenceId"),
  referenceType: varchar("referenceType", { length: 50 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type WhatsappMessageLog = typeof whatsappMessageLog.$inferSelect;
export type InsertWhatsappMessageLog = typeof whatsappMessageLog.$inferInsert;

// ─── Deliverer Locations (Rastreamento GPS em Tempo Real) ─────────────────────
export const delivererLocations = mysqlTable("deliverer_locations", {
  id: int("id").autoincrement().primaryKey(),
  delivererId: int("delivererId").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  // Aliases usados pelo código
  lat: decimal("lat", { precision: 10, scale: 7 }),
  lng: decimal("lng", { precision: 10, scale: 7 }),
  accuracy: decimal("accuracy", { precision: 8, scale: 2 }),
  speed: decimal("speed", { precision: 6, scale: 2 }),
  heading: decimal("heading", { precision: 6, scale: 2 }),
  altitude: decimal("altitude", { precision: 8, scale: 2 }),
  orderId: int("orderId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type DelivererLocation = typeof delivererLocations.$inferSelect;
export type InsertDelivererLocation = typeof delivererLocations.$inferInsert;

// ─── Chat Messages (Chat em Tempo Real) ──────────────────────────────────────
export const chatMessages = mysqlTable("chat_messages", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customerId"),
  delivererId: int("delivererId"),
  orderId: int("orderId"),
  senderType: varchar("senderType", { length: 50 }),
  senderRole: mysqlEnum("senderRole", ["admin", "deliverer", "customer"]),
  message: text("message").notNull(),
  messageType: varchar("messageType", { length: 50 }),
  attachmentUrl: text("attachmentUrl"),
  isRead: boolean("isRead").default(false),
  readAt: timestamp("readAt"),
  customerPhone: varchar("customerPhone", { length: 20 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;

// ─── Benefits (Benefícios para Clientes) ─────────────────────────────────────
export const benefits = mysqlTable("benefits", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  type: mysqlEnum("type", ["desconto", "vale_gas", "frete_gratis", "brinde", "outro"]).default("outro").notNull(),
  // Colunas extras do banco real (do backup de produção)
  value: decimal("value", { precision: 10, scale: 2 }),
  minOrders: int("minOrders"),
  minSpent: decimal("minSpent", { precision: 10, scale: 2 }),
  expiresAt: timestamp("expiresAt"),
  usageLimit: int("usageLimit"),
  usedCount: int("usedCount").default(0),
  imageUrl: text("imageUrl"),
  terms: text("terms"),
  // Colunas adicionadas pelo Drizzle
  discountType: mysqlEnum("discountType", ["fixo", "percentual"]).default("fixo"),
  discountValue: decimal("discountValue", { precision: 10, scale: 2 }).default("0"),
  voucherProductId: int("voucherProductId"),
  voucherProductName: varchar("voucherProductName", { length: 255 }),
  isActive: boolean("isActive").default(true).notNull(),
  requiresMinOrder: decimal("requiresMinOrder", { precision: 10, scale: 2 }).default("0"),
  maxUsesPerCustomer: int("maxUsesPerCustomer").default(1),
  totalUses: int("totalUses").default(0).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Benefit = typeof benefits.$inferSelect;
export type InsertBenefit = typeof benefits.$inferInsert;

// ─── Customer Benefits (Benefícios Concedidos a Clientes) ────────────────────
export const customerBenefits = mysqlTable("customer_benefits", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customerId").notNull(),
  benefitId: int("benefitId").notNull(),
  // Colunas do banco real
  grantedAt: timestamp("grantedAt").defaultNow(),
  expiresAt: timestamp("expiresAt"),
  usedAt: timestamp("usedAt"),
  status: mysqlEnum("status", ["pendente", "ativo", "usado", "expirado", "cancelado"]).default("ativo").notNull(),
  orderId: int("orderId"),
  notes: text("notes"),
  grantedBy: varchar("grantedBy", { length: 255 }),
  customerName: varchar("customerName", { length: 255 }),
  benefitName: varchar("benefitName", { length: 255 }),
  benefitType: varchar("benefitType", { length: 50 }),
  benefitValue: decimal("benefitValue", { precision: 10, scale: 2 }),
  // Colunas adicionadas pelo Drizzle
  usedOrderId: int("usedOrderId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});
export type CustomerBenefit = typeof customerBenefits.$inferSelect;
export type InsertCustomerBenefit = typeof customerBenefits.$inferInsert;

// ─── Gas Vouchers (Vale Gás) ──────────────────────────────────────────────────
export const gasVouchers = mysqlTable("gas_vouchers", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  customerId: int("customerId"),
  customerName: varchar("customerName", { length: 255 }),
  customerPhone: varchar("customerPhone", { length: 20 }),
  productId: int("productId"),
  productName: varchar("productName", { length: 255 }).notNull().default("Botijão P13 (13kg)"),
  // Colunas do banco real
  quantity: int("quantity").default(1),
  usedQuantity: int("usedQuantity").default(0),
  status: mysqlEnum("status", ["ativo", "usado", "expirado", "cancelado"]).default("ativo").notNull(),
  expiresAt: timestamp("expiresAt"),
  usedAt: timestamp("usedAt"),
  orderId: int("orderId"),
  notes: text("notes"),
  createdBy: varchar("createdBy", { length: 255 }),
  value: decimal("value", { precision: 10, scale: 2 }),
  usedAmount: decimal("usedAmount", { precision: 10, scale: 2 }),
  isActive: boolean("isActive").default(true),
  // Colunas adicionadas pelo Drizzle
  benefitId: int("benefitId"),
  issuedAt: timestamp("issuedAt").defaultNow(),
  usedOrderId: int("usedOrderId"),
  issuedBy: varchar("issuedBy", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type GasVoucher = typeof gasVouchers.$inferSelect;
export type InsertGasVoucher = typeof gasVouchers.$inferInsert;

// ─── Promotions (Promoções / Campanhas) ──────────────────────────────────────
export const promotions = mysqlTable("promotions", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  // Colunas do banco real (backup de produção)
  type: varchar("type", { length: 50 }),
  value: decimal("value", { precision: 10, scale: 2 }),
  minOrderValue: decimal("minOrderValue", { precision: 10, scale: 2 }).default("0"),
  maxDiscount: decimal("maxDiscount", { precision: 10, scale: 2 }),
  productIds: text("productIds"),
  categoryIds: text("categoryIds"),
  isActive: boolean("isActive").default(true).notNull(),
  startDate: timestamp("startDate"),
  endDate: timestamp("endDate"),
  usageLimit: int("usageLimit"),
  usedCount: int("usedCount").default(0),
  imageUrl: text("imageUrl"),
  terms: text("terms"),
  priority: int("priority").default(0),
  buyQuantity: int("buyQuantity"),
  getQuantity: int("getQuantity"),
  // Colunas adicionadas pelo Drizzle
  discountType: mysqlEnum("discountType", ["percentual", "fixo", "frete_gratis"]),
  discountValue: decimal("discountValue", { precision: 10, scale: 2 }).default("0"),
  appliesTo: mysqlEnum("appliesTo", ["todos", "categoria", "produto"]).default("todos"),
  appliesToCategory: varchar("appliesToCategory", { length: 50 }),
  appliesToProductId: int("appliesToProductId"),
  minQuantity: int("minQuantity").default(1),
  validFrom: timestamp("validFrom"),
  validUntil: timestamp("validUntil"),
  maxUses: int("maxUses"),
  maxUsesPerCustomer: int("maxUsesPerCustomer"),
  isFeatured: boolean("isFeatured").default(false),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Promotion = typeof promotions.$inferSelect;
export type InsertPromotion = typeof promotions.$inferInsert;

// ─── Backup Files (Arquivos de Backup) ───────────────────────────────────────
export const backupFiles = mysqlTable("backup_files", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  size: int("size").notNull(),
  sizeFormatted: varchar("sizeFormatted", { length: 50 }).notNull(),
  url: text("url"),
  createdBy: varchar("createdBy", { length: 255 }).notNull(),
  backupType: mysqlEnum("backupType", ["manual", "auto"]).default("manual").notNull(),
  backupStatus: mysqlEnum("backupStatus", ["success", "failed"]).default("success").notNull(),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type BackupFile = typeof backupFiles.$inferSelect;
export type InsertBackupFile = typeof backupFiles.$inferInsert;

// ─── Backup Schedules (Agendamentos de Backup) ────────────────────────────────
export const backupSchedules = mysqlTable("backup_schedules", {
  id: int("id").autoincrement().primaryKey(),
  hour: int("hour").notNull(),
  minute: int("minute").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  label: varchar("label", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type BackupSchedule = typeof backupSchedules.$inferSelect;
export type InsertBackupSchedule = typeof backupSchedules.$inferInsert;

// ─── Discount Coupons (Cupons de Desconto — tabela extra do banco real) ────────
// Esta tabela existe no banco mas não estava no schema Drizzle original.
export const discountCoupons = mysqlTable("discount_coupons", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  description: varchar("description", { length: 255 }),
  discountType: varchar("discountType", { length: 50 }),
  discountValue: decimal("discountValue", { precision: 10, scale: 2 }),
  minOrderValue: decimal("minOrderValue", { precision: 10, scale: 2 }),
  maxUses: int("maxUses"),
  currentUses: int("currentUses").default(0),
  isActive: boolean("isActive").default(true),
  expiresAt: timestamp("expiresAt"),
  type: varchar("type", { length: 50 }),
  value: decimal("value", { precision: 10, scale: 2 }),
  usedCount: int("usedCount").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type DiscountCoupon = typeof discountCoupons.$inferSelect;
export type InsertDiscountCoupon = typeof discountCoupons.$inferInsert;
