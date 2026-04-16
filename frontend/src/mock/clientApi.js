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

const homeData = {
  hero: {
    primaryCta: {
      to: "/ai-identify",
    },
  },
  serviceCenters: serviceCentersData,
  heroStats: [
    { value: "18,240+", label: "累计服务家庭" },
    { value: "286 吨", label: "进入再生链路的旧物" },
    { value: "96.4%", label: "上门准时完成率" },
    { value: "39", label: "社区协同网点" },
  ],
  principleRail: [
    {
      title: "识别先行",
      note: "用对话和图片识别降低判断成本，让用户先知道怎么分，再决定如何回收。",
    },
    {
      title: "智能调度",
      note: "系统根据品类、地址、时间段和机构运力自动匹配最近可服务网点。",
    },
    {
      title: "结果可追踪",
      note: "每一笔回收都形成订单、积分和减排记录，用户与机构都能看到结果。",
    },
  ],
  cityStages: [
    {
      title: "居民发起",
      text: "从看不懂分类，到几秒钟完成识别和预约，把环保动作变成一件轻松的小事。",
      metric: "平均决策时长缩短 43%",
    },
    {
      title: "社区协同",
      text: "社区回收点、志愿者和服务站统一协同，让不同街区也能共享同一套处理逻辑。",
      metric: "履约效率提升 29%",
    },
    {
      title: "机构回流",
      text: "机构在管理端获得更稳定的派单、入库和复用数据，提升运营连续性。",
      metric: "月度复用率持续增长",
    },
  ],
  institutionSteps: [
    "提交机构资质、覆盖片区与主营回收品类。",
    "接入平台审核与调度规则，建立订单协作关系。",
    "开通机构管理端，查看派单、仓储、排班和报表。",
    "参与城市联营计划，联合开展社区回收活动。",
  ],
  contacts: [
    "商务合作：bd@shouzhitong.cn",
    "机构入驻：partner@shouzhitong.cn",
    "用户支持：400-8855-227",
    "总部地址：上海市徐汇区龙漕路 299 号绿创港 A2",
  ],
};

const topMetrics = {
  processedToday: 421,
  activeSites: 39,
  avgResponseHour: 2.1,
  carbonReducedKg: 1860,
};

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

const profileData = {
  name: "林岚",
  level: "Lv.4 城市循环合伙人",
  points: 1260,
  carbon: "累计减排 186 kgCO2",
  tracks: [
    { name: "回收活跃度", value: 82 },
    { name: "分类准确率", value: 91 },
    { name: "社区参与度", value: 68 },
  ],
  menu: ["地址管理", "回收偏好", "积分兑换", "隐私设置"],
  badges: ["连续 4 周回收", "旧衣分类达标", "社区环保志愿者"],
  weeklyTrend: [42, 54, 61, 48, 68, 72, 77],
};

const faqData = {
  standards: [
    { name: "可回收物", text: "纸类、塑料、金属、玻璃及其制品，尽量保持清洁干燥后投放。" },
    { name: "有害垃圾", text: "电池、灯管、过期药品、油漆桶等需进入专门回收链路。" },
    { name: "厨余垃圾", text: "剩菜剩饭、果皮、茶渣等易腐有机物，应与包装分离投放。" },
    { name: "其他垃圾", text: "受污染纸巾、一次性餐具、破损陶瓷等难以回收的生活废弃物。" },
  ],
  faqs: [
    {
      category: "塑料类",
      q: "塑料瓶盖需要单独拧开吗？",
      a: "建议瓶身与瓶盖分开投放，便于后续按材质分拣；瓶内液体也要尽量倒空。",
    },
    {
      category: "外卖类",
      q: "外卖盒可以直接扔进可回收物吗？",
      a: "先清掉剩余油污和食物残渣，简单冲洗后再投放，会更利于再生处理。",
    },
    {
      category: "家具类",
      q: "旧家具只能丢弃吗？",
      a: "能复用的家具建议优先捐赠或二次流转；无法复用时再预约大件上门回收。",
    },
    {
      category: "有害类",
      q: "过期药品可以混入厨余垃圾吗？",
      a: "不可以。过期药品应投入社区药品回收箱，避免污染水体和土壤。",
    },
  ],
  science: [
    "1 吨废纸回收后，通常可减少约 17 棵树木砍伐。",
    "铝罐回收再造的能耗，仅为原生铝生产的约 5%。",
    "厨余资源化可以进一步转化为生物质能源与土壤改良材料。",
  ],
  diy: [
    "玻璃瓶改造：阳台水培小花器",
    "旧 T 恤改造：无缝环保购物袋",
    "纸箱改造：桌面抽屉收纳格",
  ],
};

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

export async function fetchTopMetrics() {
  await wait(WAIT_BASE);
  return clone(topMetrics);
}

export async function fetchHomeData() {
  await wait(WAIT_BASE + 120);
  return clone(homeData);
}

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

export async function fetchProfileData() {
  await wait(WAIT_BASE + 120);
  return clone(profileData);
}

export async function fetchFaqData() {
  await wait(WAIT_BASE + 140);
  return clone(faqData);
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
