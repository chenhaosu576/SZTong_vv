// modules/orders/routes.js
// 全部需登录(authMiddleware 挂载)
// GET    /api/v1/client/orders              列表
// GET    /api/v1/client/orders/:id          详情
// POST   /api/v1/client/orders/recycle      创建回收订单
// POST   /api/v1/client/orders/donation     创建捐赠订单

const express = require('express');
const authMiddleware = require('../../middlewares/auth');
const asyncHandler = require('../../utils/asyncHandler');
const { ok } = require('../../utils/response');
const service = require('./orders.service');

const router = express.Router();

// 写操作先注册,避免被 /:id 路由吞掉
router.post(
  '/recycle',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const data = await service.createRecycleOrder(req.user.id, req.body || {});
    res.status(201).json(ok(data));
  }),
);

router.post(
  '/donation',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const data = await service.createDonationOrder(req.user.id, req.body || {});
    res.status(201).json(ok(data));
  }),
);

router.get(
  '/',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const data = await service.listOrders(req.user.id, {
      status: req.query.status,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      page: Number(req.query.page) || 1,
      pageSize: Number(req.query.pageSize) || 10,
    });
    res.json(ok(data));
  }),
);

router.get(
  '/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const data = await service.getOrderForUser(req.user.id, Number(req.params.id));
    res.json(ok(data));
  }),
);

module.exports = router;