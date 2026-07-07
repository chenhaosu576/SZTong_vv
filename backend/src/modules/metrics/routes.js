// modules/metrics/routes.js
// GET /api/v1/client/metrics/top  公开

const express = require('express');
const asyncHandler = require('../../utils/asyncHandler');
const { ok } = require('../../utils/response');
const metricsService = require('./metrics.service');

const router = express.Router();

router.get(
  '/top',
  asyncHandler(async (req, res) => {
    const data = await metricsService.getTop();
    res.json(ok(data));
  }),
);

module.exports = router;