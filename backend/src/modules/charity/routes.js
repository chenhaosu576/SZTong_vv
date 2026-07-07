// modules/charity/routes.js
// GET /api/v1/client/charity/projects
// GET /api/v1/client/charity/projects/:id
// 公开接口, 不挂 authMiddleware (用户未登录也能浏览项目)

const express = require('express');
const asyncHandler = require('../../utils/asyncHandler');
const { ok } = require('../../utils/response');
const service = require('./charity.service');

const router = express.Router();

router.get(
  '/projects',
  asyncHandler(async (req, res) => {
    const data = await service.listProjects({
      region: req.query.region,
      urgency: req.query.urgency,
    });
    res.json(ok(data));
  }),
);

router.get(
  '/projects/:id',
  asyncHandler(async (req, res) => {
    const data = await service.getProjectById(Number(req.params.id));
    res.json(ok(data));
  }),
);

module.exports = router;