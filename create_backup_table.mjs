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

const sql = `CREATE TABLE IF NOT EXISTS backup_files (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  size INT NOT NULL,
  sizeFormatted VARCHAR(50) NOT NULL,
  url LONGTEXT,
  createdBy VARCHAR(255) NOT NULL,
  backupType ENUM('manual', 'auto') DEFAULT 'manual' NOT NULL,
  backupStatus ENUM('success', 'failed') DEFAULT 'success' NOT NULL,
  errorMessage LONGTEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
)`;

try {
  await conn.execute(sql);
  console.log('✓ backup_files table created successfully');
  
  // Verify structure
  const [cols] = await conn.execute(`DESCRIBE backup_files`);
  console.log('\nTable structure:');
  cols.forEach(c => console.log(`  - ${c.Field}: ${c.Type}`));
} catch(e) {
  console.log('Error:', e.message);
}

await conn.end();
