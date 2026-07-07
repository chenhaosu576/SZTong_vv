import { analyzeImageWithAI } from "./picAI";

const WAIT_BASE = 240;

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function clone(payload) {
  return JSON.parse(JSON.stringify(payload));
}

const CLIENT_ORDERS_STORAGE_KEY = "szt_client_orders";

function splitOrderTime(time = "") {
  const trimmedTime = String(time || "").trim();
  if (!trimmedTime) {
    return { date: "", period: "" };
  }

  const [date = "", ...periodParts] = trimmedTime.split(" ");

  return {
    date: date.trim(),
    period: periodParts.join(" ").trim(),
  };
}

function deriveCategoryFromType(type = "") {
  const trimmedType = String(type || "").trim();
  if (!trimmedType) {
    return "";
  }

  return trimmedType.replace(/回收预约$/, "").trim();
}

function normalizeOrderRecord(order = {}) {
  const { date: parsedDate, period: parsedPeriod } = splitOrderTime(order.time);

  return {
    ...order,
    address: order.address || "",
    category: order.category || deriveCategoryFromType(order.type),
    contactName: order.contactName || "",
    date: order.date || parsedDate,
    note: order.note || "",
    period: order.period || parsedPeriod,
    phone: order.phone || "",
    weight: order.weight || "",
  };
}

function getWeightScore(weight = "") {
  return weight.includes("20")
    ? 70
    : weight.includes("10")
      ? 45
      : weight.includes("5")
        ? 28
        : 18;
}

function formatOrderDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function normalizeDonationText(value = "") {
  return String(value || "").trim();
}

function buildDonationWeight(payload = {}) {
  const weight = normalizeDonationText(payload.weight);
  if (weight) {
    return weight.endsWith("kg") ? weight : `${weight}kg`;
  }

  const quantity = normalizeDonationText(payload.quantity);
  return quantity ? `${quantity}件` : "待确认";
}

function buildDonationNote(payload = {}) {
  const noteParts = [
    normalizeDonationText(payload.itemName) && `物品：${normalizeDonationText(payload.itemName)}`,
    normalizeDonationText(payload.quantity) && `数量：${normalizeDonationText(payload.quantity)}件`,
    normalizeDonationText(payload.condition) && `成色：${normalizeDonationText(payload.condition)}`,
    normalizeDonationText(payload.logistics) && `物流：${normalizeDonationText(payload.logistics)}`,
  ].filter(Boolean);

  return noteParts.join("；");
}

function readStoredOrders() {
  if (typeof window === "undefined" || !window.localStorage) {
    return clone(ordersData);
  }

  const raw = window.localStorage.getItem(CLIENT_ORDERS_STORAGE_KEY);
  if (!raw) {
    const seededOrders = clone(ordersData);
    window.localStorage.setItem(CLIENT_ORDERS_STORAGE_KEY, JSON.stringify(seededOrders));
    return seededOrders;
  }

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // Fall through to seed with the default mock orders.
  }

  const seededOrders = clone(ordersData);
  window.localStorage.setItem(CLIENT_ORDERS_STORAGE_KEY, JSON.stringify(seededOrders));
  return seededOrders;
}

function writeStoredOrders(orders) {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }

  window.localStorage.setItem(CLIENT_ORDERS_STORAGE_KEY, JSON.stringify(orders));
}

const serviceCentersData = [
  {
    id: "xuhui-caohejing",
    name: "徐汇·漕河泾服务站",
    address: "徐汇区宜山路 501 号",
    status: "营业中",
    hours: "09:00-21:00",
    distance: "约 1.8km",
    services: ["小家电", "纸塑金属", "大件家具", "旧衣回收"],
    description:
      "面向漕河泾与徐家汇片区提供预约上门、社区定点回收和可复用物品分拣服务，适合办公楼与居民小区的日常回收需求。",
    contact: "021-5600-2101",
    ctaTo: "/recycle-booking",
  },
  {
    id: "changning-zhongshan",
    name: "长宁·中山公园服务站",
    address: "长宁区凯旋路 1200 号",
    status: "营业中",
    hours: "09:00-20:30",
    distance: "约 3.2km",
    services: ["纸塑金属", "纺织旧衣", "公益捐赠", "智能称重"],
    description:
      "连接中山公园商圈、周边社区与公益机构，支持旧衣筛选、二次流转和积分入账，让可复用物品更快进入再利用链路。",
    contact: "021-5600-2102",
    ctaTo: "/recycle-booking",
  },
  {
    id: "jingan-pengpu",
    name: "静安·彭浦服务站",
    address: "静安区江场路 80 号",
    status: "营业中",
    hours: "10:00-21:00",
    distance: "约 5.6km",
    services: ["旧衣回收", "小家电", "社区活动", "上门预约"],
    description:
      "服务彭浦与大宁片区的居民回收场景，重点覆盖旧衣、闲置小家电和社区环保活动协同。",
    contact: "021-5600-2103",
    ctaTo: "/recycle-booking",
  },
  {
    id: "putuo-zhenru",
    name: "普陀·真如服务站",
    address: "普陀区真北路 1000 号",
    status: "预约优先",
    hours: "09:30-19:30",
    distance: "约 6.4km",
    services: ["有害垃圾", "大件家具", "小家电", "规范转运"],
    description:
      "提供有害垃圾专项收运和大件家具预约回收，适合需要规范转运、单独标记和安全处理的回收任务。",
    contact: "021-5600-2104",
    ctaTo: "/recycle-booking",
  },
];

const appointmentMeta = {
  categories: ["小家电", "纸塑金属", "纺织旧衣", "有害垃圾", "大件家具"],
  weights: ["0-5kg", "5-10kg", "10-20kg", "20kg 以上"],
  periods: ["09:00-12:00", "13:00-16:00", "18:00-21:00"],
  tips: [
    "请提前将可回收物打包，并保持表面干燥。",
    "玻璃、刀具等尖锐物请单独标记，便于上门人员安全处理。",
    "大件家具建议在备注里补充尺寸、电梯情况和搬运路径。",
  ],
};

const ordersData = [
  {
    id: "SZT-20260324-001",
    type: "小家电",
    time: "2026-03-25 13:00-16:00",
    status: "待上门",
    points: 35,
    station: "徐汇·漕河泾服务站",
    address: "徐汇区宜山路 501 号",
    note: "请上门前 10 分钟电话联系。",
  },
  {
    id: "SZT-20260320-011",
    type: "纸塑金属",
    time: "2026-03-20 09:00-12:00",
    status: "已完成",
    points: 20,
    station: "长宁·中山公园服务站",
    address: "长宁区凯旋路 1200 号",
    note: "已完成称重并入库。",
  },
  {
    id: "SZT-20260316-028",
    type: "纺织旧衣",
    time: "2026-03-16 18:00-21:00",
    status: "已完成",
    points: 46,
    station: "静安·彭浦服务站",
    address: "静安区江场路 80 号",
    note: "衣物包装完整，已进入复用筛选。",
  },
  {
    id: "SZT-20260311-102",
    type: "有害垃圾",
    time: "2026-03-11 13:00-16:00",
    status: "已取消",
    points: 0,
    station: "普陀·真如服务站",
    address: "普陀区真北路 1000 号",
    note: "用户改期后取消，本次未产生运力消耗。",
  },
];

const questionAnswerMap = {
  "电池可回收吗？":
    "可以。纽扣电池、充电电池等都属于有害垃圾，建议单独密封后交给社区回收点或预约专门回收。",
  "旧衣服怎么分类处理？":
    "可穿着衣物优先捐赠或流转；干净的旧纺织品可以进入旧衣回收；沾有油污或严重发霉的衣物应按其他垃圾处理。",
  "过期药品应该怎么处理？":
    "建议投放到社区药品回收箱，不要冲入下水道或和厨余垃圾混放，以免污染环境。",
  "家里废旧电饭煲可以上门回收吗？":
    "可以。它属于小家电回收范围，在预约页选择“小家电”即可申请上门服务。",
  "牛奶盒算可回收物吗？":
    "多数牛奶盒属于复合包装，建议先冲洗压平，再根据当地分类规范投放到可回收物或专门纸塑复合回收点。",
};

export async function fetchServiceCenterById(siteId) {
  await wait(WAIT_BASE + 100);
  const normalizedSiteId = String(siteId || "").trim().toLowerCase();

  const center =
    serviceCentersData.find((item, index) => {
      const aliases = [
        item.id,
        String(index),
        String(index + 1),
        item.name,
        item.name.replace("·", "-"),
      ].map((value) => value.toLowerCase());

      return aliases.includes(normalizedSiteId);
    }) || null;

  return center ? clone(center) : null;
}

export async function fetchAppointmentMeta() {
  await wait(WAIT_BASE + 80);
  return clone(appointmentMeta);
}

export async function submitAppointment(payload) {
  await wait(WAIT_BASE + 360);
  const timestamp = Date.now().toString().slice(-6);
  const weightScore = getWeightScore(payload.weight);
  const orderId = `SZT-${timestamp}`;
  const pickupCode = `P${Math.floor(Math.random() * 9000) + 1000}`;
  const nextOrder = {
    id: orderId,
    type: `${payload.category || "小家电"}回收预约`,
    time: `${payload.date} ${payload.period}`.trim(),
    date: payload.date || "",
    period: payload.period || "",
    status: "待核验",
    station: "待分配服务站",
    address: payload.address,
    category: payload.category || "",
    weight: payload.weight || "",
    note: payload.note || "",
    points: weightScore,
    contactName: payload.contactName || "",
    phone: payload.phone || "",
  };
  const storedOrders = readStoredOrders();

  writeStoredOrders([nextOrder, ...storedOrders]);

  return {
    orderId,
    pickupCode,
    estimatedPoints: weightScore,
    etaMinutes: 35,
  };
}

export async function submitDonation(payload) {
  await wait(WAIT_BASE + 360);

  const timestamp = Date.now().toString().slice(-6);
  const randomSuffix = Math.floor(Math.random() * 900) + 100;
  const orderId = `SZT-DON-${timestamp}${randomSuffix}`;
  const date = formatOrderDate();
  const period = normalizeDonationText(payload.logistics) || "待安排";
  const stationLocation = normalizeDonationText(payload.projectLocation);
  const station = stationLocation ? `${stationLocation} 公益接收点` : "公益接收点";
  const address = [payload.projectTitle, payload.projectLocation]
    .map((item) => normalizeDonationText(item))
    .filter(Boolean)
    .join(" · ");
  const weightText = buildDonationWeight(payload);
  const note = buildDonationNote(payload);
  const pointsBase = getWeightScore(weightText);
  const nextOrder = {
    id: orderId,
    type: "公益捐赠",
    time: `${date} ${period}`.trim(),
    date,
    period,
    status: "待接收确认",
    station,
    address: address || station,
    category: normalizeDonationText(payload.itemType) || "待确认",
    weight: weightText,
    note,
    points: pointsBase,
    contactName: normalizeDonationText(payload.donorName),
    phone: normalizeDonationText(payload.phone),
    itemName: normalizeDonationText(payload.itemName),
    quantity: normalizeDonationText(payload.quantity),
    condition: normalizeDonationText(payload.condition),
    projectTitle: normalizeDonationText(payload.projectTitle),
    logistics: period,
  };
  const storedOrders = readStoredOrders();

  writeStoredOrders([nextOrder, ...storedOrders]);

  return {
    orderId,
    status: nextOrder.status,
    syncedToOrders: true,
  };
}

export async function fetchOrders() {
  await wait(WAIT_BASE + 180);
  return clone(readStoredOrders().map((item) => normalizeOrderRecord(item)));
}

export async function fetchAiQuickQuestions() {
  await wait(WAIT_BASE);
  return Object.keys(questionAnswerMap);
}

export async function askAiAssistant(question) {
  await wait(WAIT_BASE + 220);
  return (
    questionAnswerMap[question] ||
    "我已经收到你的问题。如果你愿意，可以继续告诉我具体物品名称、材质或使用场景，我会进一步帮你细分处理方式。"
  );
}

export async function analyzeImage(imageSource) {
  // 如果传入了文件对象，使用 AI 进行真实识别
  if (imageSource instanceof File) {
    try {
      const results = await analyzeImageWithAI(imageSource);
      return results;
    } catch (error) {
      console.error("AI 识别失败:", error);
      // AI 识别失败时返回空结果，让前端显示示例结果
      return [];
    }
  }

  // 如果没有传入图片，返回示例结果（前端会显示示例）
  return [];
}
