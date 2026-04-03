/**
 * checkpoint-push.mjs
 * Exporta dump SQL do banco de dados atual e faz push para o GitHub.
 * Uso: node scripts/checkpoint-push.mjs [mensagem opcional]
 */

import { execSync, spawnSync } from "child_process";
import { createWriteStream, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";
import "dotenv/config";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const BACKUPS_DIR = join(ROOT, "database-backups");

// Garantir que o diretório de backups existe
if (!existsSync(BACKUPS_DIR)) {
  mkdirSync(BACKUPS_DIR, { recursive: true });
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL não encontrada no ambiente.");
  process.exit(1);
}

// Extrair partes da URL de conexão
const urlMatch = DATABASE_URL.match(
  /mysql2?:\/\/([^:]+):([^@]+)@([^:\/]+):?(\d+)?\/([^?]+)/
);
if (!urlMatch) {
  console.error("❌ Formato de DATABASE_URL inválido.");
  process.exit(1);
}

const [, user, password, host, port = "3306", database] = urlMatch;

// Nome do arquivo com timestamp
const now = new Date();
const timestamp = now
  .toISOString()
  .replace(/T/, "_")
  .replace(/:/g, "")
  .replace(/\..+/, "");
const sqlFileName = `gas_rapido_backup_${timestamp}.sql`;
const sqlFilePath = join(BACKUPS_DIR, sqlFileName);

console.log("📦 Iniciando exportação do banco de dados...");
console.log(`   Host: ${host}:${port}`);
console.log(`   Database: ${database}`);
console.log(`   Arquivo: database-backups/${sqlFileName}`);

// Gerar dump SQL usando Node.js (sem depender do mysqldump instalado)
async function generateSqlDump() {
  const connection = await mysql.createConnection({
    host,
    port: parseInt(port),
    user,
    password,
    database,
    ssl: { rejectUnauthorized: false },
  });

  const [tables] = await connection.execute("SHOW TABLES");
  const tableNames = tables.map((row) => Object.values(row)[0]);

  const lines = [];
  lines.push(`-- Gás Rápido — Backup SQL`);
  lines.push(`-- Gerado em: ${now.toISOString()}`);
  lines.push(`-- Banco: ${database}`);
  lines.push(`-- Host: ${host}`);
  lines.push(``);
  lines.push(`SET FOREIGN_KEY_CHECKS=0;`);
  lines.push(``);

  for (const tableName of tableNames) {
    console.log(`   → Exportando tabela: ${tableName}`);

    // CREATE TABLE
    const [[createResult]] = await connection.execute(
      `SHOW CREATE TABLE \`${tableName}\``
    );
    const createSql = createResult["Create Table"];
    lines.push(`-- Tabela: ${tableName}`);
    lines.push(`DROP TABLE IF EXISTS \`${tableName}\`;`);
    lines.push(`${createSql};`);
    lines.push(``);

    // INSERT INTO
    const [rows] = await connection.execute(
      `SELECT * FROM \`${tableName}\``
    );
    if (rows.length > 0) {
      const columns = Object.keys(rows[0])
        .map((c) => `\`${c}\``)
        .join(", ");

      const valueGroups = rows.map((row) => {
        const vals = Object.values(row).map((val) => {
          if (val === null || val === undefined) return "NULL";
          if (val instanceof Date) {
            // Tratar datas inválidas (Invalid Date)
            if (isNaN(val.getTime())) return "NULL";
            return `'${val.toISOString().slice(0, 19).replace("T", " ")}'`;
          }
          if (typeof val === "number") return val;
          if (typeof val === "boolean") return val ? 1 : 0;
          if (Buffer.isBuffer(val)) return `X'${val.toString("hex")}'`;
          return `'${String(val).replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n").replace(/\r/g, "\\r")}'`;
        });
        return `(${vals.join(", ")})`;
      });

      // Dividir em chunks de 100 registros para evitar queries muito longas
      const chunkSize = 100;
      for (let i = 0; i < valueGroups.length; i += chunkSize) {
        const chunk = valueGroups.slice(i, i + chunkSize);
        lines.push(
          `INSERT INTO \`${tableName}\` (${columns}) VALUES`
        );
        lines.push(chunk.join(",\n") + ";");
        lines.push(``);
      }
    }
  }

  lines.push(`SET FOREIGN_KEY_CHECKS=1;`);
  lines.push(``);
  lines.push(`-- Fim do backup`);

  await connection.end();
  return lines.join("\n");
}

try {
  const sqlContent = await generateSqlDump();

  // Salvar o arquivo SQL
  const { writeFileSync } = await import("fs");
  writeFileSync(sqlFilePath, sqlContent, "utf8");
  console.log(`✅ Dump SQL gerado: ${sqlFilePath}`);

  // Também salvar como "latest" para referência fácil
  const latestPath = join(BACKUPS_DIR, "latest.sql");
  writeFileSync(latestPath, sqlContent, "utf8");

  // Adicionar ao .gitignore os backups antigos (manter apenas o latest e o atual)
  const gitignorePath = join(ROOT, ".gitignore");
  const { readFileSync, appendFileSync } = await import("fs");
  let gitignore = "";
  try { gitignore = readFileSync(gitignorePath, "utf8"); } catch {}
  if (!gitignore.includes("database-backups/*.sql")) {
    appendFileSync(gitignorePath, "\n# Database backups (tracked individually)\n");
  }

  // Adicionar o arquivo SQL ao git
  console.log("\n📤 Adicionando arquivos ao git...");
  execSync(`cd "${ROOT}" && git add database-backups/ .gitignore`, { stdio: "inherit" });
  
  // Verificar se há mudanças para commitar
  const statusResult = spawnSync("git", ["status", "--porcelain"], { cwd: ROOT, encoding: "utf8" });
  const hasChanges = statusResult.stdout.trim().length > 0;

  if (hasChanges) {
    const commitMsg = process.argv[2] || `Backup automático: ${timestamp}`;
    execSync(`cd "${ROOT}" && git add -A && git commit -m "📦 ${commitMsg} — backup SQL incluído"`, { stdio: "inherit" });
    console.log("✅ Commit criado com sucesso.");
  } else {
    console.log("ℹ️  Nenhuma mudança para commitar.");
  }

  // Push para GitHub
  console.log("\n🚀 Enviando para o GitHub (fireconta/gasrapido)...");
  const pushResult = spawnSync("git", ["push", "github", "main", "--force"], {
    cwd: ROOT,
    encoding: "utf8",
    stdio: "inherit",
  });

  if (pushResult.status === 0) {
    console.log("✅ Push para GitHub concluído com sucesso!");
    console.log(`   → https://github.com/fireconta/gasrapido`);
  } else {
    console.error("❌ Erro ao fazer push para o GitHub.");
    process.exit(1);
  }

  console.log("\n🎉 Checkpoint completo!");
  console.log(`   SQL: database-backups/${sqlFileName}`);
  console.log(`   GitHub: https://github.com/fireconta/gasrapido`);
} catch (err) {
  console.error("❌ Erro:", err.message);
  process.exit(1);
}
