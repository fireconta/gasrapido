/**
 * Script de importação dos dados do backup SQL (gas_rapido_backup_20260326_full.sql)
 * Importa apenas DADOS (não estrutura) para o banco atual, usando INSERT IGNORE para evitar duplicatas
 */

import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL não encontrado no .env");
  process.exit(1);
}

const connection = await mysql.createConnection(DATABASE_URL);
console.log("✅ Conectado ao banco de dados");

async function run() {
  try {
    // ─── 1. CUSTOMERS (27 clientes reais de Quirinópolis/GO) ───────────────────
    console.log("\n📦 Importando clientes...");
    const customers = [
      [1, "Naiguel (Stop Grill)", "64984452281", null, "", "Av. Garibaldi Teixeira", "São Francisco", "Quirinópolis", "", 0, "0.00", "2026-03-17 11:42:45", "2026-03-17 19:41:10", null],
      [30001, "GIZELE FERREIRA DE FARIAS", "", null, "", "21  DE ABRIL", "SANTA CLARA", "Quirinópolis", "", 0, "0.00", "2026-03-17 23:12:25", "2026-03-17 23:12:25", "89 A"],
      [60001, "BETH DO SALGADO", "", null, "", "DOMINGOS BATISTA DE SOUZA", "HELIO LEÃO 3", "Quirinópolis", "", 0, "0.00", "2026-03-18 11:55:56", "2026-03-18 11:55:56", "08"],
      [60002, "GILVANEA PRIMA", "", null, "", "RUA 01", "TALISMÃ", "Quirinópolis", "", 0, "0.00", "2026-03-18 12:14:13", "2026-03-18 12:14:13", "QD 34 LT09"],
      [60003, "PANIFICADORA AMERIA", "64 99641-4767", null, "", "RUA 18", "JARDIM VITORIA", "Quirinópolis", "", 0, "0.00", "2026-03-18 12:20:18", "2026-03-18 12:21:40", "78"],
      [60004, "PÃO DE MEL", "64 99260-5304", null, "", "R. Domingos Jacinto da Luz, 207 - Municipal, Quirinópolis - GO, 7586000", "MUNICIPAL", "Quirinópolis", "", 0, "0.00", "2026-03-18 12:26:49", "2026-03-18 12:27:24", "207"],
      [60005, "CLEIDIVALDO VENDEDOR", "64 99202-8658", null, "", "PROFESSOR GLICERIO DA CUNHA", "CENTRO", "Quirinópolis", "", 0, "0.00", "2026-03-18 12:32:25", "2026-03-18 12:32:25", "60"],
      [60006, "CARLIN SUJEIRA", "64 98455-9179", null, "", "RUA 12", "ELDORADO", "Quirinópolis", "", 0, "0.00", "2026-03-18 12:33:52", "2026-03-18 12:33:52", "19"],
      [60007, "DONA RITA", "64 98445-8832", null, "", "RUA 04", "ELDORADO", "Quirinópolis", "", 0, "0.00", "2026-03-18 12:35:53", "2026-03-18 12:35:53", "79"],
      [60008, "ELIEL PEDREIRO", "64 98461-4575", null, "", "PROFESSOR GLICERIO DA CUNHA", "MUNICIPAL", "Quirinópolis", "", 0, "0.00", "2026-03-18 12:37:56", "2026-03-18 12:37:56", "141 B"],
      [60009, "ELIENE OU WILIAN RAPIDO CAR", "64 98139-9917", null, "", "JOSE QUINTILIANO LEÃO", "CENTRO", "Quirinópolis", "", 0, "0.00", "2026-03-18 12:41:25", "2026-03-18 12:41:25", "170"],
      [60010, "FRANCISCO DE CASTRO", "", null, "", "ALMINDA LUZIA CABRAL", "PEDRO CARDOSO", "Quirinópolis", "", 0, "0.00", "2026-03-18 12:43:03", "2026-03-18 12:43:03", "66"],
      [60011, "LUIZ FELIPE VIZINHO MONTADOR DE MOVEIS", "64 98421-0349", null, "", "JOSE QUINTILIANO LEÃO", "SÃO FRANCISCO", "Quirinópolis", "", 0, "0.00", "2026-03-18 12:44:37", "2026-03-18 12:44:37", "348"],
      [60012, "GUSTAVO CABRAL", "64 98127-3202", null, "", "21 DE ABRIL", "PEDRO CARDOSO", "Quirinópolis", "", 0, "0.00", "2026-03-18 12:46:06", "2026-03-18 12:46:06", "19"],
      [90001, "JOSE WALTER DA CAIXA", "64 98441-5052", null, "", "JOSÉ QUINTILIANO LEÃO", "CENTRO", "Quirinópolis", "", 0, "0.00", "2026-03-18 16:03:49", "2026-03-18 16:03:49", "187"],
      [90002, "JOSÉ MARCIO DE OLIVEIRA", "64 98427-3512", null, "", "JOSÉ QUINTILIANO LEÃO", "SÃO FRANCISCO", "QUIRINOPOLIS", "", 0, "0.00", "2026-03-18 16:05:43", "2026-03-18 16:05:43", "364"],
      [90003, "LEANDRIN PINTOR", "64 98432-2875", null, "", "JOSE VICENTE DE PAULA", "SOL NASCENTE", "Quirinópolis", "", 0, "0.00", "2026-03-18 16:07:39", "2026-03-18 16:07:39", "235"],
      [90004, "MARIA DIAS", "64 98429-9379", null, "", "MANOEL JOSE CABRAL QUITO", "CADEIA", "Quirinópolis", "", 0, "0.00", "2026-03-18 16:09:55", "2026-03-18 16:09:55", "46"],
      [90005, "LILIAN (MARIA APARECIDA)", "64 99289-2341", null, "", "ONICIO RESENDE", "ALEXANDRINA", "Quirinópolis", "", 0, "0.00", "2026-03-18 16:12:08", "2026-03-18 16:12:08", "62 FUNDOS"],
      [90006, "MARIA AMELIO", "64 98443-4385", null, "", "FABIO GARCIA", "CENTRO", "Quirinópolis", "", 0, "0.00", "2026-03-18 16:13:32", "2026-03-18 16:13:32", "84"],
      [90007, "MARIA HELENA MÃE DO GUIL", "64 98427-2148", null, "", "LAZARO XAVIER", "HELIO LEÃO 3", "Quirinópolis", "", 0, "0.00", "2026-03-18 16:15:33", "2026-03-18 16:15:33", "328"],
      [90008, "MARIA APARECIA (NINA)", "64 98405-1115", null, "", "APRIJIO DE ANDRADE", "CHICO JUNQUEIRA", "Quirinópolis", "", 0, "0.00", "2026-03-18 16:17:29", "2026-03-18 16:17:29", "29"],
      [90009, "RENATA DA EDICULA", "64 98406-8882", null, "", "JOÃO GONÇALVES RODRIGUES", "GRANVILLE", "Quirinópolis", "", 0, "0.00", "2026-03-18 16:21:15", "2026-03-18 16:21:15", "QD;71 LT;"],
      [120001, "SIRLENE DO JAMIL", "64 98415-9408", null, "", "RUA 03", "ALPHAVILLE", "Quirinópolis", "", 0, "0.00", "2026-03-18 18:38:04", "2026-03-18 18:38:04", "54"],
      [120002, "SONIA MARIA", "64 98442-7745", null, "", "ANTONIO JOAQUIN DE ANDRADE", "CHICO JUNQUEIRA", "Quirinópolis", "", 0, "0.00", "2026-03-18 18:40:00", "2026-03-18 18:40:00", "31"],
      [120003, "SILVANA DA ZILDA", "64 99320-5893", null, "", "LAZARO XAVIER", "HELIO LEÃO 3", "Quirinópolis", "", 0, "0.00", "2026-03-18 18:41:27", "2026-03-18 18:41:27", "321"],
    ];

    let insertedCustomers = 0;
    let skippedCustomers = 0;
    for (const c of customers) {
      const [id, name, phone, whatsapp, email, address, neighborhood, city, notes, totalOrders, totalSpent, createdAt, updatedAt, addressNumber] = c;
      const [result] = await connection.execute(
        `INSERT IGNORE INTO customers (id, name, phone, whatsapp, email, address, neighborhood, city, notes, totalOrders, totalSpent, createdAt, updatedAt, addressNumber)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, name, phone, whatsapp, email, address, neighborhood, city, notes, totalOrders, totalSpent, createdAt, updatedAt, addressNumber]
      );
      if (result.affectedRows > 0) insertedCustomers++;
      else skippedCustomers++;
    }
    console.log(`  ✅ Clientes: ${insertedCustomers} inseridos, ${skippedCustomers} já existiam`);

    // ─── 2. PRODUCTS (atualizar estoque e preços do backup) ────────────────────
    console.log("\n📦 Atualizando produtos...");
    const products = [
      [1, "Botíjão de Gás 13kg", "Botíjão GLP 13kg. Ideal para uso doméstico. Entrega rápida na sua porta.", 120.00, null, null, "gas", "unidade", 336, 10, 1],
      [2, "Botíjão de Gás 20kg", "Botíjão GLP 20kg. Ideal para comércios e restaurantes.", 180.00, null, null, "gas", "unidade", 30, 5, 1],
      [3, "Botíjão de Gás 45kg", "Botíjão GLP 45kg. Para grandes estabelecimentos e indústrias.", 380.00, null, null, "gas", "unidade", 15, 3, 1],
      [4, "Água Mineral 20L", "Galão de água mineral natural 20 litros. Entrega com troca de vasilhame.", 18.00, null, null, "agua", "galão", 40, 10, 1],
      [5, "Mangueira de Gás 1,20m", "Mangueira de gás com 1,20m. Alta resistência e segurança.", 28.00, null, null, "acessorio", "unidade", 20, 5, 1],
      [6, "Regulador de Gás", "Regulador de pressão para botíjão. Homologado pelo INMETRO.", 35.00, null, null, "acessorio", "unidade", 15, 5, 1],
    ];

    let updatedProducts = 0;
    for (const p of products) {
      const [id, name, description, price, costPrice, imageUrl, category, unit, stockQty, minStock, isActive] = p;
      const [result] = await connection.execute(
        `INSERT INTO products (id, name, description, price, costPrice, imageUrl, category, unit, stockQty, minStock, isActive)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           price = VALUES(price),
           stockQty = VALUES(stockQty),
           minStock = VALUES(minStock),
           description = VALUES(description)`,
        [id, name, description, price, costPrice, imageUrl, category, unit, stockQty, minStock, isActive]
      );
      if (result.affectedRows > 0) updatedProducts++;
    }
    console.log(`  ✅ Produtos: ${updatedProducts} atualizados/inseridos`);

    // ─── 3. DELIVERERS ─────────────────────────────────────────────────────────
    console.log("\n📦 Importando entregadores...");
    const [delivererResult] = await connection.execute(
      `INSERT IGNORE INTO deliverers (id, name, phone, email, passwordHash, vehicle, isActive, isOnline, lastSeen, createdAt, updatedAt)
       VALUES (1, 'carlos mqss', '(64) 99324-2074', 'carlos@e.com', '$2b$12$Qbzlq/HucLpH9OL0SQ8JbOQCEDjUHvcmNwKTpPoD8fO6J6PXOdd1e', '', 1, 1, '2026-03-18 19:05:18', '2026-03-16 22:41:19', '2026-03-18 19:05:17')`
    );
    console.log(`  ✅ Entregadores: ${delivererResult.affectedRows > 0 ? "1 inserido" : "já existia"}`);

    // ─── 4. ORDERS ─────────────────────────────────────────────────────────────
    console.log("\n📦 Importando pedidos...");
    const [orderResult] = await connection.execute(
      `INSERT IGNORE INTO orders (id, orderNumber, customerId, customerName, customerPhone, deliveryAddress, neighborhood, status, paymentMethod, paymentConfirmed, paymentConfirmedAt, delivererId, delivererName, subtotal, deliveryFee, discount, total, couponCode, notes, deliveredAt, createdAt, updatedAt)
       VALUES (120003, 'GR20260318224250', NULL, 'carlos', '(64) 9939-9999', 'sol, nº 44', 'sol nascente', 'entregue', 'fiado', 1, '2026-03-18 22:44:19', 1, 'carlos mqss', 120.00, 0.00, 0.00, 120.00, NULL, '', '2026-03-18 22:44:19', '2026-03-18 22:42:50', '2026-03-18 22:44:19')`
    );
    console.log(`  ✅ Pedidos: ${orderResult.affectedRows > 0 ? "1 inserido" : "já existia"}`);

    // ─── 5. ORDER_ITEMS ────────────────────────────────────────────────────────
    console.log("\n📦 Importando itens de pedidos...");
    const [itemResult] = await connection.execute(
      `INSERT IGNORE INTO order_items (id, orderId, productId, productName, unitPrice, quantity, subtotal)
       VALUES (120003, 120003, 1, 'Botíjão de Gás 13kg', 120.00, 1, 120.00)`
    );
    console.log(`  ✅ Itens de pedidos: ${itemResult.affectedRows > 0 ? "1 inserido" : "já existia"}`);

    // ─── 6. COUPONS ────────────────────────────────────────────────────────────
    console.log("\n📦 Importando cupons...");
    const [couponResult] = await connection.execute(
      `INSERT IGNORE INTO coupons (id, code, description, type, value, minOrderValue, maxUses, usedCount, isActive, validFrom, validUntil, createdAt)
       VALUES (30001, 'PAX', '', 'fixo', 5.00, 0.00, NULL, 0, 1, '2026-03-18 00:00:00', '2030-12-15 00:00:00', '2026-03-18 20:32:05')`
    );
    console.log(`  ✅ Cupons: ${couponResult.affectedRows > 0 ? "1 inserido" : "já existia"}`);

    // ─── 7. BENEFITS ───────────────────────────────────────────────────────────
    console.log("\n📦 Importando benefícios...");
    const [benefitResult] = await connection.execute(
      `INSERT IGNORE INTO benefits (id, name, description, type, discountType, discountValue, voucherProductId, voucherProductName, isActive, requiresMinOrder, maxUsesPerCustomer, totalUses, notes, createdAt, updatedAt)
       VALUES (1, 'Gás do Povo', 'Programa social que concede um vale gás P-13 gratuito para famílias cadastradas', 'vale_gas', 'fixo', 0.00, NULL, 'Botijão P13 (13kg)', 1, 0.00, 1, 0, 'Benefício social - Gás do Povo', '2026-03-26 19:38:38', '2026-03-26 19:38:38')`
    );
    console.log(`  ✅ Benefícios: ${benefitResult.affectedRows > 0 ? "1 inserido" : "já existia"}`);

    // ─── 8. SETTINGS (atualizar configurações do backup) ───────────────────────
    console.log("\n📦 Atualizando configurações...");
    const settings = [
      [1, "storeName", "Gás Rápido"],
      [2, "phone", "(64) 3651-1874"],
      [3, "whatsapp", "(64) 98456-5616"],
      [4, "address", "Av. José Quintiliano Leão, 346 B"],
      [5, "city", "Quirinópolis"],
      [6, "state", "GO"],
      [7, "openingHours", "Seg-Sáb: 07:00 - 19:00 | Dom: 08:00 - 12:00"],
      [8, "deliveryFee", "0.00"],
      [9, "minOrderValue", "0.00"],
      [240088, "zipCode", ""],
      [240092, "deliveryRadius", "10"],
      [240093, "adminEmail", "admin@gasrapido.com"],
      [240094, "lowStockThreshold", "10"],
    ];

    let updatedSettings = 0;
    for (const [id, key, value] of settings) {
      await connection.execute(
        `INSERT INTO settings (\`key\`, value) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE value = VALUES(value)`,
        [key, value]
      );
      updatedSettings++;
    }
    console.log(`  ✅ Configurações: ${updatedSettings} atualizadas`);

    // ─── 9. STOCK_MOVEMENTS ────────────────────────────────────────────────────
    console.log("\n📦 Importando movimentações de estoque...");
    const stockMovements = [
      [60001, 1, "Botíjão de Gás 13kg", "saida", 1, 252, 251, "Pedido #GR20260318122154", 60001, "2026-03-18 12:21:54"],
      [90001, 1, "Botíjão de Gás 13kg", "saida", 1, 311, 310, "Pedido #GR20260318194658", 90001, "2026-03-18 19:46:58"],
      [90002, 1, "Botíjão de Gás 13kg", "saida", 1, 310, 309, "Pedido #GR20260318203106", 90002, "2026-03-18 20:31:06"],
      [120001, 1, "Botíjão de Gás 13kg", "saida", 1, 339, 338, "Pedido #GR20260318223800", 120001, "2026-03-18 22:38:00"],
      [120002, 1, "Botíjão de Gás 13kg", "saida", 1, 338, 337, "Pedido #GR20260318224152", 120002, "2026-03-18 22:41:52"],
      [120003, 1, "Botíjão de Gás 13kg", "saida", 1, 337, 336, "Pedido #GR20260318224250", 120003, "2026-03-18 22:42:50"],
    ];

    let insertedMovements = 0;
    let skippedMovements = 0;
    for (const [id, productId, productName, type, quantity, previousQty, newQty, reason, orderId, createdAt] of stockMovements) {
      const [result] = await connection.execute(
        `INSERT IGNORE INTO stock_movements (id, productId, productName, type, quantity, previousQty, newQty, reason, orderId, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, productId, productName, type, quantity, previousQty, newQty, reason, orderId, createdAt]
      );
      if (result.affectedRows > 0) insertedMovements++;
      else skippedMovements++;
    }
    console.log(`  ✅ Movimentações de estoque: ${insertedMovements} inseridas, ${skippedMovements} já existiam`);

    // ─── 10. TRUCK_DELIVERIES ──────────────────────────────────────────────────
    console.log("\n📦 Importando entregas de caminhão...");
    const truckDeliveries = [
      [270001, "2026-03-18 18:10:17", "ABC-1234", null, "João Silva", "concluido", 30, 40, "Teste de entrega", "2026-03-18 18:10:18", "2026-03-18 18:10:18", "2026-03-18 18:10:17", "2026-03-18 18:10:17"],
      [270002, "2026-03-18 18:10:18", "", null, "João", "planejado", 0, 0, null, null, null, "2026-03-18 18:10:17", "2026-03-18 18:10:17"],
      [300001, "2026-03-18 19:02:07", "ABC-1234", null, "João Silva", "concluido", 30, 40, "Teste de entrega", "2026-03-18 19:02:08", "2026-03-18 19:02:08", "2026-03-18 19:02:07", "2026-03-18 19:02:07"],
      [360001, "2026-03-20 16:19:58", "365353", null, "Gdgss", "planejado", 0, 0, "\n", null, null, "2026-03-20 16:19:57", "2026-03-20 16:19:57"],
    ];

    let insertedTruck = 0;
    let skippedTruck = 0;
    for (const [id, deliveryDate, truckPlate, driverId, driverName, status, emptyQty, fullQty, notes, departureTime, arrivalTime, createdAt, updatedAt] of truckDeliveries) {
      const [result] = await connection.execute(
        `INSERT IGNORE INTO truck_deliveries (id, deliveryDate, truckPlate, driverId, driverName, status, totalEmptyReceived, totalFullDelivered, notes, arrivedAt, completedAt, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, deliveryDate, truckPlate, driverId, driverName, status, emptyQty, fullQty, notes, departureTime, arrivalTime, createdAt, updatedAt]
      );
      if (result.affectedRows > 0) insertedTruck++;
      else skippedTruck++;
    }
    console.log(`  ✅ Entregas de caminhão: ${insertedTruck} inseridas, ${skippedTruck} já existiam`);

    // ─── RESUMO ────────────────────────────────────────────────────────────────
    console.log("\n🎉 Importação concluída com sucesso!");
    console.log("   Dados importados do backup gas_rapido_backup_20260326_full.sql");

    // Verificar totais
    const [[{ total: totalCustomers }]] = await connection.execute("SELECT COUNT(*) as total FROM customers");
    const [[{ total: totalOrders }]] = await connection.execute("SELECT COUNT(*) as total FROM orders");
    const [[{ total: totalProducts }]] = await connection.execute("SELECT COUNT(*) as total FROM products");
    console.log(`\n📊 Totais no banco:`);
    console.log(`   Clientes: ${totalCustomers}`);
    console.log(`   Pedidos: ${totalOrders}`);
    console.log(`   Produtos: ${totalProducts}`);

  } catch (err) {
    console.error("❌ Erro durante importação:", err.message);
    console.error(err);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

run();
