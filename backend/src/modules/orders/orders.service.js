// modules/orders/orders.service.js
// 订单核心业务: 列表 / 详情 / 创建回收 / 创建捐赠
// 失败抛 ApiError;成功返回纯数据对象(不带 code/message 包装)
//
// 状态机:
//   recycle: pending_review → confirmed → assigned → in_progress → weighed → completed / cancelled
//   donation: submitted → accepted → in_transit → received → completed / cancelled
//
// 积分规则:
//   recycle estimated_points 走 weightBand 查表
//   donation estimated_points = 0(本轮不接 B 端,granted_points 仅 B 端发放)

const { Order, RecycleOrder, DonationOrder, ServiceCenter } = require('../../db/models');
const { Op } = require('sequelize');
const ApiError = require('../../utils/ApiError');

const RECYCLE_CATEGORIES = ['小家电', '纸塑金属', '纺织旧衣', '有害垃圾', '大件家具'];
const WEIGHT_BANDS = ['0-5kg', '5-10kg', '10-20kg', '20kg以上'];
const POINTS_BY_BAND = { '0-5kg': 18, '5-10kg': 45, '10-20kg': 70, '20kg以上': 100 };
const PHONE_REGEX = /^1[3-9]\d{9}$/;

function generateOrderNo(prefix) {
  const ts = new Date();
  const ymd = `${ts.getFullYear()}${String(ts.getMonth() + 1).padStart(2, '0')}${String(ts.getDate()).padStart(2, '0')}`;
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `${prefix}-${ymd}-${rand}`;
}

function generatePickupCode() {
  return `P${Math.floor(Math.random() * 9000) + 1000}`;
}

function pickOrderPayload(order, recycleDetail, donationDetail, center) {
  const base = {
    id: order.id,
    orderNo: order.orderNo,
    orderType: order.orderType,
    status: order.status,
    scheduledDate: order.scheduledDate,
    scheduledPeriod: order.scheduledPeriod,
    contactName: order.contactName,
    contactPhone: order.contactPhone,
    addressSnapshot: order.addressSnapshot,
    estimatedWeight: order.estimatedWeight,
    estimatedPoints: order.estimatedPoints,
    grantedPoints: order.grantedPoints,
    note: order.note,
    createdAt: order.createdAt,
  };
  if (center) {
    base.serviceCenter = {
      id: center.id,
      code: center.code,
      name: center.name,
    };
  }
  base.recycleDetail = recycleDetail
    ? {
        category: recycleDetail.category,
        weightBand: recycleDetail.weightBand,
        pickupCode: recycleDetail.pickupCode,
      }
    : null;
  base.donationDetail = donationDetail
    ? {
        itemType: donationDetail.itemType,
        itemName: donationDetail.itemName,
        quantityText: donationDetail.quantityText,
        weightText: donationDetail.weightText,
        conditionText: donationDetail.conditionText,
        logisticsType: donationDetail.logisticsType,
        projectTitle: donationDetail.projectTitle,
        projectLocation: donationDetail.projectLocation,
      }
    : null;
  return base;
}

async function listOrders(userId, { status, dateFrom, dateTo, page = 1, pageSize = 10 } = {}) {
  const where = { userId };
  if (status) where.status = status;
  if (dateFrom || dateTo) {
    where.scheduledDate = {};
    if (dateFrom) where.scheduledDate[Op.gte] = dateFrom;
    if (dateTo) where.scheduledDate[Op.lte] = dateTo;
  }

  const offset = (page - 1) * pageSize;
  const { rows, count } = await Order.findAndCountAll({
    where,
    include: [
      { model: RecycleOrder, as: 'recycleDetail' },
      { model: DonationOrder, as: 'donationDetail' },
      { model: ServiceCenter, as: 'serviceCenter' },
    ],
    order: [['createdAt', 'DESC']],
    limit: pageSize,
    offset,
  });

  const list = rows.map((o) =>
    pickOrderPayload(o, o.recycleDetail, o.donationDetail, o.serviceCenter),
  );
  return { list, total: count, page, pageSize };
}

async function getOrderForUser(userId, orderId) {
  const order = await Order.findOne({
    where: { id: orderId, userId },
    include: [
      { model: RecycleOrder, as: 'recycleDetail' },
      { model: DonationOrder, as: 'donationDetail' },
      { model: ServiceCenter, as: 'serviceCenter' },
    ],
  });
  if (!order) throw new ApiError(40401, '订单不存在');
  return pickOrderPayload(order, order.recycleDetail, order.donationDetail, order.serviceCenter);
}

function validateRecyclePayload(payload) {
  const {
    category, weightBand, estimatedWeight, scheduledDate, scheduledPeriod,
    contactName, contactPhone, addressSnapshot,
  } = payload || {};
  if (!RECYCLE_CATEGORIES.includes(category)) {
    throw new ApiError(40001, `category 必须是: ${RECYCLE_CATEGORIES.join(', ')}`);
  }
  if (!WEIGHT_BANDS.includes(weightBand)) {
    throw new ApiError(40001, `weightBand 必须是: ${WEIGHT_BANDS.join(', ')}`);
  }
  const w = Number(estimatedWeight);
  if (!Number.isFinite(w) || w <= 0 || w > 100) {
    throw new ApiError(40001, 'estimatedWeight 必须在 (0, 100] 范围内');
  }
  if (!scheduledDate) throw new ApiError(40001, '请选择预约日期');
  if (!scheduledPeriod) throw new ApiError(40001, '请选择预约时段');
  if (!contactName || !contactName.trim()) throw new ApiError(40001, '请填写联系人');
  if (!contactPhone || !PHONE_REGEX.test(contactPhone)) {
    throw new ApiError(40001, '请输入有效手机号');
  }
  if (!addressSnapshot || !addressSnapshot.trim()) throw new ApiError(40001, '请填写服务地址');
}

function validateDonationPayload(payload) {
  const { itemType, itemName, contactName, contactPhone } = payload || {};
  if (!itemType || !itemType.trim()) throw new ApiError(40001, '请选择物品类型');
  if (!itemName || !itemName.trim()) throw new ApiError(40001, '请填写物品名称');
  if (!contactName || !contactName.trim()) throw new ApiError(40001, '请填写联系人');
  if (!contactPhone || !PHONE_REGEX.test(contactPhone)) {
    throw new ApiError(40001, '请输入有效手机号');
  }
}

async function createRecycleOrder(userId, payload) {
  validateRecyclePayload(payload);

  const order = await Order.create({
    orderNo: generateOrderNo('SZT'),
    userId,
    orderType: 'recycle',
    status: 'pending_review',
    serviceCenterId: null,
    contactName: payload.contactName.trim(),
    contactPhone: payload.contactPhone,
    addressSnapshot: payload.addressSnapshot.trim(),
    latitude: payload.latitude ?? null,
    longitude: payload.longitude ?? null,
    scheduledDate: payload.scheduledDate,
    scheduledPeriod: payload.scheduledPeriod,
    estimatedWeight: payload.estimatedWeight,
    estimatedPoints: POINTS_BY_BAND[payload.weightBand],
    grantedPoints: 0,
    note: payload.note || null,
  });

  const pickupCode = generatePickupCode();
  await RecycleOrder.create({
    orderId: order.id,
    category: payload.category,
    weightBand: payload.weightBand,
    itemImages: payload.itemImages || null,
    pickupCode,
  });

  return {
    id: order.id,
    orderNo: order.orderNo,
    pickupCode,
    estimatedPoints: order.estimatedPoints,
    status: order.status,
  };
}

async function createDonationOrder(userId, payload) {
  validateDonationPayload(payload);

  const order = await Order.create({
    orderNo: generateOrderNo('SZT-D'),
    userId,
    orderType: 'donation',
    status: 'submitted',
    serviceCenterId: null,
    contactName: payload.contactName.trim(),
    contactPhone: payload.contactPhone,
    addressSnapshot: payload.addressSnapshot?.trim() || '公益捐赠',
    estimatedWeight: null,
    estimatedPoints: 0,
    grantedPoints: 0,
    note: payload.note || null,
  });

  await DonationOrder.create({
    orderId: order.id,
    charityProjectId: null,
    projectTitle: payload.projectTitle?.trim() || null,
    projectLocation: payload.projectLocation?.trim() || null,
    itemType: payload.itemType.trim(),
    itemName: payload.itemName.trim(),
    quantityText: payload.quantityText?.trim() || null,
    weightText: payload.weightText?.trim() || null,
    conditionText: payload.conditionText?.trim() || null,
    logisticsType: payload.logisticsType?.trim() || null,
  });

  return {
    id: order.id,
    orderNo: order.orderNo,
    status: order.status,
  };
}

module.exports = {
  listOrders,
  getOrderForUser,
  createRecycleOrder,
  createDonationOrder,
};