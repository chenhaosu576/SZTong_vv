// modules/health/routes.js
// 健康检查路由（诊断接口，不属于业务）。
// 职责:
//   - GET /_health/db：SELECT VERSION() + 7 张表 COUNT(*)，返回统一格式
//   - 失败路由内自 catch：输出 { code: -1, message, data }，不走 error.js
// 使用方: src/routes/index.js 通过 router.use('/_health', ...) 挂载

const express = require('express');
const { sequelize } = require('../../config/db');

const router = express.Router();

const TABLES = [
  'roles', 'admins', 'users',
  'service_centers', 'orders',
  'recycle_orders', 'donation_orders',
];

router.get('/db', async (req, res) => {
  try {
    const [v] = await sequelize.query('SELECT VERSION() AS version, NOW() AS server_time');
    const counts = {};
    for (const t of TABLES) {
      const [r] = await sequelize.query(`SELECT COUNT(*) AS n FROM \`${t}\``);
      counts[t] = Number(r[0].n);
    }
    res.json({
      code: 0,
      message: 'ok',
      data: {
        version: v[0].version,
        server_time: v[0].server_time,
        table_counts: counts,
      },
    });
  } catch (e) {
    res.status(500).json({
      code: -1,
      message: 'db error',
      data: { detail: e.message },
    });
  }
});

module.exports = router;