// modules/service-centers/routes.js
// GET /api/v1/client/service-centers
// GET /api/v1/client/service-centers/:code
// GET /api/v1/client/service-centers/:code/slots

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

// 写路径先于 :code 注册 —— 即便 path 段数不冲突(/:code 不会吞 /:code/slots),
// 显式排序能让读者一眼看清 slots 是平级子资源而不是 :code 的子动作。
router.get(
  '/:code/slots',
  asyncHandler(async (req, res) => {
    const data = await service.listSlots(req.params.code, {
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
    });
    res.json(ok(data));
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
