// scripts/ensure-charity-tables.js
// One-off bootstrap for charity_projects + charity_project_needs tables
// (the SQL migration bails on first "already exists" and these tables
// were never created in the partially-initialized dev DB).
// Idempotent: uses CREATE TABLE IF NOT EXISTS.

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const mysql = require('mysql2/promise');

const SQL = `
CREATE TABLE IF NOT EXISTS \`charity_projects\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`title\` VARCHAR(120) NOT NULL,
  \`location\` VARCHAR(120) DEFAULT NULL,
  \`region\` VARCHAR(60) DEFAULT NULL,
  \`tag\` VARCHAR(30) DEFAULT NULL,
  \`status\` TINYINT NOT NULL DEFAULT 0,
  \`urgent_days_threshold\` INT NOT NULL DEFAULT 0,
  \`current_progress\` INT NOT NULL DEFAULT 0,
  \`target_progress\` INT NOT NULL DEFAULT 0,
  \`progress_unit\` VARCHAR(20) DEFAULT NULL,
  \`beneficiary\` VARCHAR(120) DEFAULT NULL,
  \`cover_image\` VARCHAR(255) DEFAULT NULL,
  \`description\` TEXT,
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_charity_projects_status\` (\`status\`),
  KEY \`idx_charity_projects_region\` (\`region\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`charity_project_needs\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`charity_project_id\` BIGINT UNSIGNED NOT NULL,
  \`title\` VARCHAR(100) NOT NULL,
  \`description\` VARCHAR(255) DEFAULT NULL,
  \`sort_order\` INT NOT NULL DEFAULT 0,
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_charity_project_needs_project_id_sort\` (\`charity_project_id\`, \`sort_order\`),
  CONSTRAINT \`fk_charity_project_needs_project_id\` FOREIGN KEY (\`charity_project_id\`) REFERENCES \`charity_projects\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'sztong',
    multipleStatements: true,
  });
  try {
    await conn.query(SQL);
    console.log('OK: charity_projects + charity_project_needs tables ready');
  } catch (e) {
    console.error('FAIL:', e.message);
    process.exit(1);
  } finally {
    await conn.end();
  }
})();