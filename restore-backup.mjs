import mysql from 'mysql2/promise';
import fs from 'fs';

async function restoreBackup() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('ERROR: DATABASE_URL não está definida');
    process.exit(1);
  }

  console.log('Conectando ao banco de dados...');
  
  try {
    const connection = await mysql.createConnection(databaseUrl);
    console.log('✓ Conectado ao banco de dados');
    
    // Ler o arquivo SQL
    const sqlFile = '/home/ubuntu/upload/gas_rapido_backup_20260402_205914.sql';
    const sqlContent = fs.readFileSync(sqlFile, 'utf-8');
    
    // Dividir por `;` para executar cada comando separadamente
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--') && !s.startsWith('/*'));
    
    console.log(`Executando ${statements.length} comandos SQL...`);
    
    let executed = 0;
    let skipped = 0;
    for (const statement of statements) {
      try {
        await connection.execute(statement);
        executed++;
        if (executed % 20 === 0) {
          console.log(`  ${executed}/${statements.length} comandos executados...`);
        }
      } catch (err) {
        // Ignorar erros de DROP TABLE se não existir
        if (err.message.includes('Unknown table') || err.message.includes('already exists')) {
          skipped++;
        } else {
          console.warn(`Aviso: ${err.message.substring(0, 100)}`);
        }
      }
    }
    
    console.log(`✓ Backup restaurado com sucesso!`);
    console.log(`  - Comandos executados: ${executed}`);
    console.log(`  - Comandos ignorados: ${skipped}`);
    await connection.end();
    
  } catch (error) {
    console.error('Erro ao restaurar backup:', error.message);
    process.exit(1);
  }
}

restoreBackup();
