/**
 * Seed script: cria o usuário administrador padrão com senha criptografada.
 * Executado automaticamente na inicialização do servidor se não existir.
 */
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { adminUsers, products, settings } from "../drizzle/schema";
import { getDb } from "./db";

const DEFAULT_ADMIN = {
  username: "admin",
  email: "admin@gasrapido.com",
  name: "Administrador",
  password: "Gas2026",
};

const DEFAULT_PRODUCTS = [
  { name: "Botíjão de Gás 13kg", description: "Botíjão GLP 13kg. Ideal para uso doméstico. Entrega rápida na sua porta.", price: "120.00", category: "gas", unit: "unidade", stockQty: 50, minStock: 10, isActive: true },
  { name: "Botíjão de Gás 20kg", description: "Botíjão GLP 20kg. Ideal para comércios e restaurantes.", price: "180.00", category: "gas", unit: "unidade", stockQty: 30, minStock: 5, isActive: true },
  { name: "Botíjão de Gás 45kg", description: "Botíjão GLP 45kg. Para grandes estabelecimentos e indústrias.", price: "380.00", category: "gas", unit: "unidade", stockQty: 15, minStock: 3, isActive: true },
  { name: "Água Mineral 20L", description: "Galão de água mineral natural 20 litros. Entrega com troca de vasilhame.", price: "18.00", category: "agua", unit: "galão", stockQty: 40, minStock: 10, isActive: true },
  { name: "Mangueira de Gás 1,20m", description: "Mangueira de gás com 1,20m. Alta resistência e segurança.", price: "28.00", category: "acessorio", unit: "unidade", stockQty: 20, minStock: 5, isActive: true },
  { name: "Regulador de Gás", description: "Regulador de pressão para botíjão. Homologado pelo INMETRO.", price: "35.00", category: "acessorio", unit: "unidade", stockQty: 15, minStock: 5, isActive: true },
];

const DEFAULT_SETTINGS = [
  { key: "storeName", value: "Gás Rápido" },
  { key: "phone", value: "(64) 3651-1874" },
  { key: "whatsapp", value: "(64) 98456-5616" },
  { key: "address", value: "Av. José Quintiliano Leão, 346 B" },
  { key: "city", value: "Quirinópolis" },
  { key: "state", value: "GO" },
  { key: "openingHours", value: "Seg-Sáb: 07:00 - 19:00 | Dom: 08:00 - 12:00" },
  { key: "deliveryFee", value: "5.00" },
  { key: "minOrderValue", value: "0.00" },
];

export async function seedAdminUser() {
  const db = await getDb();
  if (!db) {
    console.warn("[Seed] DB not available, skipping admin seed");
    return;
  }

  try {
    const existing = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.username, DEFAULT_ADMIN.username))
      .limit(1);

    if (existing.length === 0) {
      const passwordHash = await bcrypt.hash(DEFAULT_ADMIN.password, 12);
      await db.insert(adminUsers).values({ username: DEFAULT_ADMIN.username, email: DEFAULT_ADMIN.email, name: DEFAULT_ADMIN.name, passwordHash, isActive: true });
      console.log(`[Seed] ✅ Admin criado: ${DEFAULT_ADMIN.username} / ${DEFAULT_ADMIN.password}`);
    }
    // Seed products
    const existingProducts = await db.select().from(products).limit(1);
    if (existingProducts.length === 0) {
      await db.insert(products).values(DEFAULT_PRODUCTS as any);
      console.log(`[Seed] ✅ ${DEFAULT_PRODUCTS.length} produtos criados`);
    }
    // Seed settings
    for (const s of DEFAULT_SETTINGS) {
      await db.insert(settings).values(s).onDuplicateKeyUpdate({ set: { value: s.value } });
    }
    console.log("[Seed] ✅ Configurações padrão aplicadas");
  } catch (err: any) {
    // Apenas avisar sobre o erro, não falhar
    const errorMsg = err?.message || String(err);
    if (errorMsg.includes("ECONNREFUSED") || errorMsg.includes("connect")) {
      console.warn("[Seed] ⚠️  Banco de dados não disponível. Pulando seed.");
    } else {
      console.warn("[Seed] ⚠️  Erro ao fazer seed:", errorMsg);
    }
  }
}
