// scripts/run-sql.js
// 执行 migrations-sql/001-init-core-tables.sql 的脚本。
// 职责:
//   - mysql2 直连（连接时不指定 database，让 CREATE DATABASE 自举）
//   - multipleStatements 一次性执行整个 SQL 文件
//   - 失败抛错 + 退出码 1；成功打印逐条 OK
// 使用方: npm run db:migrate:sql

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

(async () => {
  const sqlPath = path.resolve(__dirname, '../migrations-sql/001-init-core-tables.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  // 连接时不指定 database——脚本要自举 CREATE DATABASE
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    multipleStatements: true,
  });

  try {
    await conn.query(sql);
    // 列出本次执行的 CREATE TABLE 数量做粗校验
    const creates = (sql.match(/CREATE TABLE/gi) || []).length;
    console.log(`OK: ${creates} 张表 CREATE 完成`);
    process.exit(0);
  } catch (e) {
    console.error('FAIL:', e.message);
    process.exit(1);
  } finally {
    await conn.end();
  }
})();