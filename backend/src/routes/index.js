// routes/index.js
// 业务路由汇总。
// 职责:
//   - P0 起：聚合 modules/ai（业务路由模块）+ modules/health（诊断路由）
//   - 后续阶段追加 modules/auth, modules/orders ...
// 使用方: src/app.js 通过 app.use('/api', router) 挂载

const express = require('express');
const router = express.Router();

router.use(require('../modules/ai/routes'));
router.use('/_health', require('../modules/health/routes'));

module.exports = router;