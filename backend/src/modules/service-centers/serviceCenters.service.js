// modules/service-centers/serviceCenters.service.js
// 服务站列表 / 详情 / 可预约时段。
// 列表支持 city / district 过滤(status 默认 1)
// 详情按 code(URL slug)查找,找不到抛 40401
// 时段按 (center, [dateFrom, dateTo]) 返回 status=1 的 service_slots,
// 默认窗口 14 天、最大 30 天,过滤掉运营下线的行。

const { ServiceCenter, ServiceSlot } = require('../../db/models');
const { Op } = require('sequelize');
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

const DEFAULT_RANGE_DAYS = 14;
const MAX_RANGE_DAYS = 30;

function parseDateParam(s, field) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    throw new ApiError(40001, `${field} 必须是 YYYY-MM-DD 格式`);
  }
  return s;
}

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDaysIso(iso, days) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

function pickSlotPayload(s) {
  const available = s.status === 1 && s.reservedCount < s.capacity;
  return {
    id: s.id,
    date: s.serviceDate,
    period: s.period,
    capacity: s.capacity,
    reservedCount: s.reservedCount,
    available,
    status: s.status,
  };
}

async function listSlots(code, { dateFrom, dateTo } = {}) {
  if (!code) throw new ApiError(40401, '服务站不存在');
  const center = await ServiceCenter.findOne({ where: { code } });
  if (!center || center.status !== 1) throw new ApiError(40401, '服务站不存在');

  const from = dateFrom ? parseDateParam(dateFrom, 'dateFrom') : todayIso();
  const to   = dateTo   ? parseDateParam(dateTo, 'dateTo')     : addDaysIso(from, DEFAULT_RANGE_DAYS - 1);
  if (from > to) throw new ApiError(40020, '日期范围不合法');
  if (addDaysIso(from, MAX_RANGE_DAYS) < to) {
    throw new ApiError(40020, '查询范围不能超过 30 天');
  }

  const rows = await ServiceSlot.findAll({
    where: {
      serviceCenterId: center.id,
      serviceDate: { [Op.between]: [from, to] },
      status: 1,
    },
    order: [['service_date', 'ASC'], ['period', 'ASC']],
  });

  return {
    center: { id: center.id, code: center.code, name: center.name },
    range: { dateFrom: from, dateTo: to },
    list: rows.map(pickSlotPayload),
  };
}

module.exports = { listCenters, getCenterByCode, listSlots };
