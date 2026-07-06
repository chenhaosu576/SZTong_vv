// scripts/db-check.js
// 数据库连通自检脚本。
// 职责:
//   - authenticate() 验证连接
//   - 打 MySQL 版本、服务端时间
//   - 7 张核心表 COUNT(*)
//   - 退出码 0/1，CI 可用
// 使用方: npm run db:check（独立进程，需手动 require dotenv）

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const { sequelize } = require('../src/config/db');

const TABLES = [
  'roles', 'admins', 'users',
  'service_centers', 'orders',
  'recycle_orders', 'donation_orders',
];

(async () => {
  try {
    await sequelize.authenticate();
    const [v] = await sequelize.query('SELECT VERSION() AS version, NOW() AS server_time');
    const counts = {};
    for (const t of TABLES) {
      const [r] = await sequelize.query(`SELECT COUNT(*) AS n FROM \`${t}\``);
      counts[t] = Number(r[0].n);
    }
    console.log(JSON.stringify({
      ok: true,
      version: v[0].version,
      server_time: v[0].server_time,
      table_counts: counts,
    }, null, 2));
    process.exit(0);
  } catch (e) {
    console.error(JSON.stringify({ ok: false, error: e.message }, null, 2));
    process.exit(1);
  }
})();
