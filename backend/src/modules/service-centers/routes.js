// modules/service-centers/routes.js
// GET /api/v1/client/service-centers
// GET /api/v1/client/service-centers/:code

const express = require('express');
const asyncHandler = require('../../utils/asyncHandler');
const { ok } = require('../../utils/response');
const service = require('./serviceCenters.service');

const router = express.Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const data = await service.listCenters({
      city: req.query.city,
      district: req.query.district,
    });
    res.json(ok({ list: data, total: data.length }));
  }),
);

router.get(
  '/:code',
  asyncHandler(async (req, res) => {
    const data = await service.getCenterByCode(req.params.code);
    res.json(ok(data));
  }),
);

module.exports = router;
