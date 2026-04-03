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
    
    // Extrair apenas os comandos INSERT
    const lines = sqlContent.split('\n');
    const insertStatements = [];
    
    for (const line of lines) {
      if (line.trim().startsWith('INSERT INTO')) {
        insertStatements.push(line.trim());
      }
    }
    
    console.log(`\nEncontrados ${insertStatements.length} comandos INSERT`);
    console.log('Restaurando dados...\n');
    
    let executed = 0;
    let failed = 0;
    
    for (const statement of insertStatements) {
      try {
        await connection.execute(statement);
        executed++;
        const table = statement.match(/INSERT INTO `(\w+)`/)?.[1] || 'unknown';
        console.log(`✓ ${table}: dados restaurados`);
      } catch (err) {
        failed++;
        const table = statement.match(/INSERT INTO `(\w+)`/)?.[1] || 'unknown';
        console.log(`✗ ${table}: ${err.message.substring(0, 80)}`);
      }
    }
    
    console.log(`\n✓ Restauração concluída!`);
    console.log(`  - Tabelas restauradas: ${executed}`);
    console.log(`  - Tabelas com erro: ${failed}`);
    await connection.end();
    
  } catch (error) {
    console.error('Erro ao restaurar backup:', error.message);
    process.exit(1);
  }
}

restoreBackup();
