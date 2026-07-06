// modules/auth/routes.js
// /api/v1/client/auth/* 三个端点
// 使用方: src/routes/index.js 挂载到 /v1/client/auth

const express = require('express');
const authMiddleware = require('../../middlewares/auth');
const asyncHandler = require('../../utils/asyncHandler');
const { ok } = require('../../utils/response');
const authService = require('./auth.service');

const router = express.Router();

router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const data = await authService.register(req.body || {});
    res.status(201).json(ok(data));
  }),
);

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const data = await authService.login(req.body || {});
    res.json(ok(data));
  }),
);

router.get(
  '/me',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const data = await authService.fetchMe(req.user.id);
    res.json(ok(data));
  }),
);

module.exports = router;