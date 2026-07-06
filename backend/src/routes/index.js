// routes/index.js
// 业务路由汇总。
// 职责:
//   - P0 步骤 1：单一 passthrough 到 modules/ai（业务路由模块仅此一处）
//   - P0-2 起：变成真正的多模块聚合点（require modules/auth, modules/orders ...）
// 使用方: src/app.js 通过 app.use('/api', router) 挂载

const express = require('express');
const router = express.Router();

router.use(require('../modules/ai/routes'));

module.exports = router;
