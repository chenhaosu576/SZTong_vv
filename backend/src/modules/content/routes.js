// modules/content/routes.js
// GET /api/v1/client/content/home        公开
// GET /api/v1/client/content/faq         公开
// GET /api/v1/client/content/profile-demo 需登录

const express = require('express');
const authMiddleware = require('../../middlewares/auth');
const asyncHandler = require('../../utils/asyncHandler');
const { ok } = require('../../utils/response');
const contentService = require('./content.service');

const router = express.Router();

router.get(
  '/home',
  asyncHandler(async (req, res) => {
    const data = await contentService.getHome();
    res.json(ok(data));
  }),
);

router.get(
  '/faq',
  asyncHandler(async (req, res) => {
    const data = await contentService.getFaq();
    res.json(ok(data));
  }),
);

router.get(
  '/profile-demo',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const data = await contentService.getProfileDemo();
    res.json(ok(data));
  }),
);

module.exports = router;