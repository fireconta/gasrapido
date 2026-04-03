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

const customers = [
  { id: 60001, name: 'ADALBERTO DIAS', phone: '64 98405-1234', address: 'JOSÉ QUINTILIANO LEÃO', neighborhood: 'CENTRO', city: 'Quirinópolis' },
  { id: 60002, name: 'ADRIANO ALVES', phone: '64 98421-5678', address: 'APRIJIO DE ANDRADE', neighborhood: 'CHICO JUNQUEIRA', city: 'Quirinópolis' },
  { id: 60003, name: 'ALMIR FERREIRA', phone: '64 98427-9012', address: 'RUA 03', neighborhood: 'ALPHAVILLE', city: 'Quirinópolis' },
  { id: 60004, name: 'ALVARO TORRES', phone: '64 98432-3456', address: 'JOÃO GONÇALVES RODRIGUES', neighborhood: 'GRANVILLE', city: 'Quirinópolis' },
  { id: 60005, name: 'ANA PAULA SILVA', phone: '64 98441-7890', address: 'LAZARO XAVIER', neighborhood: 'HELIO LEÃO 3', city: 'Quirinópolis' },
  { id: 60006, name: 'ANDRE COSTA', phone: '64 98429-2345', address: 'MANOEL JOSE CABRAL QUITO', neighborhood: 'CADEIA', city: 'Quirinópolis' },
  { id: 60007, name: 'ANDRE GOMES', phone: '64 99289-6789', address: 'ONICIO RESENDE', neighborhood: 'ALEXANDRINA', city: 'Quirinópolis' },
  { id: 60008, name: 'ANDRE LUIZ', phone: '64 98443-0123', address: 'FABIO GARCIA', neighborhood: 'CENTRO', city: 'Quirinópolis' },
  { id: 60009, name: 'ANDRE OLIVEIRA', phone: '64 98405-4567', address: 'JOSE VICENTE DE PAULA', neighborhood: 'SOL NASCENTE', city: 'Quirinópolis' },
  { id: 60010, name: 'ANDRE PEREIRA', phone: '64 98427-8901', address: 'JOSÉ QUINTILIANO LEÃO', neighborhood: 'SÃO FRANCISCO', city: 'Quirinópolis' },
  { id: 60011, name: 'LUIZ FELIPE VIZINHO MONTADOR DE MOVEIS', phone: '64 98421-0349', address: 'JOSE QUINTILIANO LEÃO', neighborhood: 'SÃO FRANCISCO', city: 'Quirinópolis' },
  { id: 60012, name: 'GUSTAVO CABRAL', phone: '64 98127-3202', address: '21 DE ABRIL', neighborhood: 'PEDRO CARDOSO', city: 'Quirinópolis' },
  { id: 90001, name: 'JOSE WALTER DA CAIXA', phone: '64 98441-5052', address: 'JOSÉ QUINTILIANO LEÃO', neighborhood: 'CENTRO', city: 'Quirinópolis' },
  { id: 90002, name: 'JOSÉ MARCIO DE OLIVEIRA', phone: '64 98427-3512', address: 'JOSÉ QUINTILIANO LEÃO', neighborhood: 'SÃO FRANCISCO', city: 'QUIRINOPOLIS' },
  { id: 90003, name: 'LEANDRIN PINTOR', phone: '64 98432-2875', address: 'JOSE VICENTE DE PAULA', neighborhood: 'SOL NASCENTE', city: 'Quirinópolis' },
  { id: 90004, name: 'MARIA DIAS', phone: '64 98429-9379', address: 'MANOEL JOSE CABRAL QUITO', neighborhood: 'CADEIA', city: 'Quirinópolis' },
  { id: 90005, name: 'LILIAN (MARIA APARECIDA)', phone: '64 99289-2341', address: 'ONICIO RESENDE', neighborhood: 'ALEXANDRINA', city: 'Quirinópolis' },
  { id: 90006, name: 'MARIA AMELIO', phone: '64 98443-4385', address: 'FABIO GARCIA', neighborhood: 'CENTRO', city: 'Quirinópolis' },
  { id: 90007, name: 'MARIA HELENA MÃE DO GUIL', phone: '64 98427-2148', address: 'LAZARO XAVIER', neighborhood: 'HELIO LEÃO 3', city: 'Quirinópolis' },
  { id: 90008, name: 'MARIA APARECIA (NINA)', phone: '64 98405-1115', address: 'APRIJIO DE ANDRADE', neighborhood: 'CHICO JUNQUEIRA', city: 'Quirinópolis' },
  { id: 90009, name: 'RENATA DA EDICULA', phone: '64 98406-8882', address: 'JOÃO GONÇALVES RODRIGUES', neighborhood: 'GRANVILLE', city: 'Quirinópolis' },
  { id: 120001, name: 'SIRLENE DO JAMIL', phone: '64 98415-9408', address: 'RUA 03', neighborhood: 'ALPHAVILLE', city: 'Quirinópolis' },
  { id: 120002, name: 'SONIA MARIA', phone: '64 98442-7745', address: 'ANTONIO JOAQUIN DE ANDRADE', neighborhood: 'CHICO JUNQUEIRA', city: 'Quirinópolis' },
  { id: 120003, name: 'SILVANA DA ZILDA', phone: '64 99320-5893', address: 'LAZARO XAVIER', neighborhood: 'HELIO LEÃO 3', city: 'Quirinópolis' },
];

console.log('Inserindo clientes no banco de dados...\n');

let inserted = 0;
let skipped = 0;

for (const customer of customers) {
  try {
    // Verificar se cliente já existe
    const [existing] = await conn.execute('SELECT id FROM customers WHERE id = ?', [customer.id]);
    
    if (existing.length > 0) {
      console.log(`⊘ Cliente ${customer.id} (${customer.name}) já existe - pulando`);
      skipped++;
      continue;
    }

    // Inserir cliente
    await conn.execute(
      'INSERT INTO customers (id, name, phone, address, neighborhood, city, state, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())',
      [customer.id, customer.name, customer.phone, customer.address, customer.neighborhood, customer.city, 'GO']
    );
    
    console.log(`✓ Cliente ${customer.id} (${customer.name}) inserido`);
    inserted++;
  } catch (e) {
    console.log(`✗ Erro ao inserir cliente ${customer.id}: ${e.message.substring(0, 60)}`);
  }
}

console.log(`\n=== RESULTADO ===`);
console.log(`Inseridos: ${inserted}`);
console.log(`Pulados: ${skipped}`);

await conn.end();
