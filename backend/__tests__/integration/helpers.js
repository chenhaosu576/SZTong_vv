// __tests__/integration/helpers.js
// 共享的测试 DB 初始化 helper —— 每个 test file 的 beforeAll 调一次。
// 职责:
//   - 假定 setup-env.js 已注入 .env.test(DB_NAME=sztong_test)
//   - 如果 sztong_test 不存在就 CREATE DATABASE 创建
//   - sync({ force: true }) 建表
//   - 暴露 closeDb() 给 afterAll 关闭连接

const mysql = require('mysql2/promise');
const { sequelize } = require('../../src/config/db');
const backendConfig = require('../../src/config');

let initialized = false;

async function setupTestDb() {
  if (initialized) return;
  const db = backendConfig.db;
  const dbName = db.name;
  // 用管理员连接确保 test DB 存在
  const adminConn = await mysql.createConnection({
    host: db.host,
    port: db.port,
    user: db.user,
    password: db.pass,
  });
  try {
    await adminConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` DEFAULT CHARACTER SET utf8mb4`);
  } finally {
    await adminConn.end();
  }
  await sequelize.sync({ force: true });
  initialized = true;
}

async function closeDb() {
  if (!initialized) return;
  await sequelize.close();
  initialized = false;
}

module.exports = { setupTestDb, closeDb };
