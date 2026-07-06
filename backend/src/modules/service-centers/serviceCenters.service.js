// modules/service-centers/serviceCenters.service.js
// 服务站列表 / 详情。
// 列表支持 city / district 过滤(status 默认 1)
// 详情按 code(URL slug)查找,找不到抛 40401

const { ServiceCenter } = require('../../db/models');
const ApiError = require('../../utils/ApiError');

function pickCenterPayload(c) {
  return {
    id: c.id,
    code: c.code,
    name: c.name,
    city: c.city,
    district: c.district,
    address: c.address,
    businessHours: c.businessHours,
    phone: c.phone,
    description: c.description,
    status: c.status,
  };
}

async function listCenters({ city, district } = {}) {
  const where = { status: 1 };
  if (city) where.city = city;
  if (district) where.district = district;

  const rows = await ServiceCenter.findAll({
    where,
    order: [['id', 'ASC']],
  });
  return rows.map(pickCenterPayload);
}

async function getCenterByCode(code) {
  if (!code) throw new ApiError(40401, '服务站不存在');
  const c = await ServiceCenter.findOne({ where: { code } });
  if (!c || c.status !== 1) throw new ApiError(40401, '服务站不存在');
  return pickCenterPayload(c);
}

module.exports = { listCenters, getCenterByCode };
