import 'dotenv/config';
import mysql from 'mysql2/promise';

const url = new URL(process.env.DATABASE_URL);
const conn = await mysql.createConnection({
  host: url.hostname,
  port: parseInt(url.port || '3306'),
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1),
  ssl: { rejectUnauthorized: false }
});

const products = [
  { id: 1, name: 'Botíjão de Gás 13kg', price: 120.00, fullQty: 129, emptyQty: 10 },
  { id: 2, name: 'Botíjão de Gás 20kg', price: 180.00, fullQty: 3, emptyQty: 5 },
  { id: 3, name: 'Botíjão de Gás 45kg', price: 380.00, fullQty: 1, emptyQty: 3 },
  { id: 4, name: 'Água Mineral 20L', price: 18.00, fullQty: 40, emptyQty: 10 },
  { id: 5, name: 'Mangueira de Gás 1,20m', price: 28.00, fullQty: 20, emptyQty: 5 },
  { id: 6, name: 'Regulador de Gás', price: 35.00, fullQty: 15, emptyQty: 5 },
];

console.log('Atualizando estoque dos produtos...\n');

let updated = 0;
let failed = 0;

for (const product of products) {
  try {
    await conn.execute(
      'UPDATE products SET fullQty = ?, emptyQty = ?, price = ?, updatedAt = NOW() WHERE id = ?',
      [product.fullQty, product.emptyQty, product.price, product.id]
    );
    
    console.log(`✓ Produto ${product.id} (${product.name}): ${product.fullQty} cheios, ${product.emptyQty} vazios`);
    updated++;
  } catch (e) {
    console.log(`✗ Erro ao atualizar produto ${product.id}: ${e.message.substring(0, 60)}`);
    failed++;
  }
}

console.log(`\n=== RESULTADO ===`);
console.log(`Atualizados: ${updated}`);
console.log(`Falhados: ${failed}`);

await conn.end();
