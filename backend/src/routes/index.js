// routes/index.js
// 业务路由汇总。
// 职责:
//   - /api 兼容老路径(AI 代理 + health)
//   - /api/v1/client 挂新业务模块: auth / orders / service-centers / content / metrics
// 使用方: src/app.js 通过 app.use('/api', router) 挂载

const express = require('express');
const router = express.Router();

router.use(require('../modules/ai/routes'));
router.use('/_health', require('../modules/health/routes'));

// /api/v1/client/*
router.use('/v1/client/auth', require('../modules/auth/routes'));
router.use('/v1/client/orders', require('../modules/orders/routes'));
router.use('/v1/client/service-centers', require('../modules/service-centers/routes'));
router.use('/v1/client/content', require('../modules/content/routes'));
router.use('/v1/client/metrics', require('../modules/metrics/routes'));
router.use('/v1/client/charity', require('../modules/charity/routes'));

module.exports = router;
