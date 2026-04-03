import mysql from 'mysql2/promise';
import fs from 'fs';

async function smartRestore() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('ERROR: DATABASE_URL não está definida');
    process.exit(1);
  }

  console.log('Conectando ao banco de dados...');
  
  try {
    const connection = await mysql.createConnection(databaseUrl);
    console.log('✓ Conectado ao banco de dados\n');
    
    const sqlFile = '/home/ubuntu/upload/gas_rapido_backup_20260402_205914.sql';
    const sqlContent = fs.readFileSync(sqlFile, 'utf-8');
    
    let stats = {
      users: 0,
      customers: 0,
      products: 0,
      orders: 0,
      deliverers: 0,
      coupons: 0,
      settings: 0
    };

    // Extrair e importar USERS
    console.log('📥 Importando USERS...');
    const usersMatch = sqlContent.match(/INSERT INTO `users` VALUES \((.*?)\);/s);
    if (usersMatch) {
      const rows = usersMatch[1].split('),(');
      for (const row of rows) {
        try {
          const cleanRow = row.replace(/^\(/, '').replace(/\)$/, '');
          const sql = `INSERT IGNORE INTO users VALUES (${cleanRow})`;
          await connection.execute(sql);
          stats.users++;
        } catch (err) {
          // Ignorar
        }
      }
    }
    console.log(`  ✓ ${stats.users} usuários\n`);

    // Extrair e importar CUSTOMERS
    console.log('📥 Importando CUSTOMERS...');
    const customersMatch = sqlContent.match(/INSERT INTO `customers` VALUES \((.*?)\);/s);
    if (customersMatch) {
      const rows = customersMatch[1].split('),(');
      for (const row of rows) {
        try {
          const cleanRow = row.replace(/^\(/, '').replace(/\)$/, '');
          const sql = `INSERT IGNORE INTO customers VALUES (${cleanRow})`;
          await connection.execute(sql);
          stats.customers++;
        } catch (err) {
          // Ignorar
        }
      }
    }
    console.log(`  ✓ ${stats.customers} clientes\n`);

    // Extrair e importar PRODUCTS
    console.log('📥 Importando PRODUCTS...');
    const productsMatch = sqlContent.match(/INSERT INTO `products` VALUES \((.*?)\);/s);
    if (productsMatch) {
      const rows = productsMatch[1].split('),(');
      for (const row of rows) {
        try {
          const cleanRow = row.replace(/^\(/, '').replace(/\)$/, '');
          const sql = `INSERT IGNORE INTO products VALUES (${cleanRow})`;
          await connection.execute(sql);
          stats.products++;
        } catch (err) {
          // Ignorar
        }
      }
    }
    console.log(`  ✓ ${stats.products} produtos\n`);

    // Extrair e importar ORDERS
    console.log('📥 Importando ORDERS...');
    const ordersMatch = sqlContent.match(/INSERT INTO `orders` VALUES \((.*?)\);/s);
    if (ordersMatch) {
      const rows = ordersMatch[1].split('),(');
      for (const row of rows) {
        try {
          const cleanRow = row.replace(/^\(/, '').replace(/\)$/, '');
          const sql = `INSERT IGNORE INTO orders VALUES (${cleanRow})`;
          await connection.execute(sql);
          stats.orders++;
        } catch (err) {
          // Ignorar
        }
      }
    }
    console.log(`  ✓ ${stats.orders} pedidos\n`);

    // Extrair e importar DELIVERERS
    console.log('📥 Importando DELIVERERS...');
    const deliverersMatch = sqlContent.match(/INSERT INTO `deliverers` VALUES \((.*?)\);/s);
    if (deliverersMatch) {
      const rows = deliverersMatch[1].split('),(');
      for (const row of rows) {
        try {
          const cleanRow = row.replace(/^\(/, '').replace(/\)$/, '');
          const sql = `INSERT IGNORE INTO deliverers VALUES (${cleanRow})`;
          await connection.execute(sql);
          stats.deliverers++;
        } catch (err) {
          // Ignorar
        }
      }
    }
    console.log(`  ✓ ${stats.deliverers} entregadores\n`);

    // Extrair e importar COUPONS
    console.log('📥 Importando COUPONS...');
    const couponsMatch = sqlContent.match(/INSERT INTO `coupons` VALUES \((.*?)\);/s);
    if (couponsMatch) {
      const rows = couponsMatch[1].split('),(');
      for (const row of rows) {
        try {
          const cleanRow = row.replace(/^\(/, '').replace(/\)$/, '');
          const sql = `INSERT IGNORE INTO coupons VALUES (${cleanRow})`;
          await connection.execute(sql);
          stats.coupons++;
        } catch (err) {
          // Ignorar
        }
      }
    }
    console.log(`  ✓ ${stats.coupons} cupons\n`);

    // Extrair e importar SETTINGS
    console.log('📥 Importando SETTINGS...');
    const settingsMatch = sqlContent.match(/INSERT INTO `settings` VALUES \((.*?)\);/s);
    if (settingsMatch) {
      const rows = settingsMatch[1].split('),(');
      for (const row of rows) {
        try {
          const cleanRow = row.replace(/^\(/, '').replace(/\)$/, '');
          const sql = `INSERT IGNORE INTO settings VALUES (${cleanRow})`;
          await connection.execute(sql);
          stats.settings++;
        } catch (err) {
          // Ignorar
        }
      }
    }
    console.log(`  ✓ ${stats.settings} configurações\n`);

    const total = Object.values(stats).reduce((a, b) => a + b, 0);
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ RESTAURAÇÃO CONCLUÍDA!');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`\n📊 Total de ${total} registros importados\n`);
    
    await connection.end();
    
  } catch (error) {
    console.error('Erro:', error.message);
    process.exit(1);
  }
}

smartRestore();
