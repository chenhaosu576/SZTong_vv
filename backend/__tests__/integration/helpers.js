// __tests__/integration/helpers.js
// 共享的测试 DB 初始化 helper —— 每个 test file 的 beforeAll 调一次。
// 职责:
//   - 强制加载 .env.test(override: true 避免被 .env 覆盖)
//   - sync({ force: true }) 建表(每个 jest worker 各自一份 in-memory db)
//   - 暴露 closeDb() 给 afterAll 关闭连接

const path = require('path');
const dotenv = require('dotenv');
const { sequelize } = require('../../src/config/db');

let initialized = false;

async function setupTestDb() {
  if (initialized) return;
  dotenv.config({ path: path.join(__dirname, '../../.env.test'), override: true });
  await sequelize.sync({ force: true });
  initialized = true;
}

async function closeDb() {
  if (!initialized) return;
  await sequelize.close();
  initialized = false;
}

module.exports = { setupTestDb, closeDb };
