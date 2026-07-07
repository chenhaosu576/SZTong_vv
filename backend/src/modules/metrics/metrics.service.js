// modules/metrics/metrics.service.js
// TopBar 用的运营统计。失败抛 ApiError;成功返回 4 字段(数字)。

const { SiteStats } = require('../../db/models');
const ApiError = require('../../utils/ApiError');

function pickTopPayload(s) {
  return {
    processedToday: s.processedToday,
    activeSites: s.activeSites,
    avgResponseHour: Number(s.avgResponseHour),
    carbonReducedKg: Number(s.carbonReducedKg),
  };
}

async function getTop() {
  const row = await SiteStats.findByPk(1);
  if (!row) throw new ApiError(40401, '运营统计不存在');
  return pickTopPayload(row);
}

module.exports = { getTop };