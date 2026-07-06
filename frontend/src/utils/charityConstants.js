// charityConstants.js
// 公益页面共享的静态数据常量。
// 集中在此避免散落到 view / composable 顶部。
//
// 包含:
//   - projects: mock 项目列表(3 项,含进度 / 紧急需求 / 受助方 / 详情等)
//   - categories / urgencyOptions / regionOptions: 筛选条枚举项
//   - processSteps: 四步流程文案
//   - trustFeatures: 信任背书 4 个特性
//   - urgentDaysThreshold: 紧急 / 常态募集的分界天数
//
// 使用方:
//   - CharityPage.vue (顶部 import 透传给 panel)
//   - useCharityFilters.js (urgentDaysThreshold)

export const projects = [
  {
    id: 1,
    title: "大凉山冬季暖心计划",
    location: "四川·凉山",
    region: "西部地区",
    categories: ["衣物", "文具"],
    tag: "紧急项目",
    tagColor: "bg-red-600",
    urgentNeeds: "急需：儿童冬衣 / 棉鞋 / 书包",
    progress: 72,
    current: 864,
    total: 1200,
    unit: "件",
    daysLeft: 14,
    beneficiary: "瓦吾小学学生",
    image: "https://images.pexels.com/photos/15311442/pexels-photo-15311442.jpeg?cs=srgb&dl=pexels-akh-taufiq-202388902-15311442.jpg&fm=jpg",
    description: "瓦吾小学位于海拔2700米的山巅,冬长夏短,温差极大。冬季早晨气温常在零下,许多孩子穿着单薄的布鞋和外套步行数公里上学。我们希望汇聚社会力量,为山区的孩子们送去温暖。",
    needs: [
      { title: "儿童冬装外套", desc: "标准:8 成新以上,无破损,男女不限" },
      { title: "保暖棉鞋 / 运动鞋", desc: "标准:全新或近全新,码数 28-38 码" },
      { title: "加厚袜 / 手套 / 围巾", desc: "标准:仅限全新" },
    ],
  },
  {
    id: 2,
    title: "乡村阅读角落建设",
    location: "甘肃·定西",
    region: "西部地区",
    categories: ["图书", "文具"],
    tag: "教育支持",
    tagColor: "bg-green-600",
    urgentNeeds: "急需:青少年绘本 / 文具盒",
    progress: 45,
    current: 2250,
    total: 5000,
    unit: "本",
    daysLeft: null,
    beneficiary: "定西乡村小学",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuD-vEYpZWELSaBiQHUCU5s9K4GHjrYKzSyZBrawpw6Lv05z0bZ0wL-uO4j2y-EUe9pBHXaIj-UoJ8Cbvz5cY-yNn2713dOteo3UPa9afcLIqC5tojajG2gJDT-_pzl1vjWCDzwZzWr_a7BgbfG9MsWErniWFYh6p6YuNAay0TlKOwSYtMpIsz0ctwBakfAP0Us2kzxN1rYV_g29cDm8c5m5cutNHoJJEglIZAYa92zWZDeu1K8YVvAPv5vASnLJxvl8T7Smixo3I0I",
  },
  {
    id: 3,
    title: "社区闲置循环共享舱",
    location: "上海·普陀",
    region: "华东地区",
    categories: ["家居", "其他"],
    tag: "社区帮扶",
    tagColor: "bg-green-600",
    urgentNeeds: "急需:烧水壶 / 电风扇 / 梯子",
    progress: 91,
    current: 182,
    total: 200,
    unit: "件",
    daysLeft: 3,
    beneficiary: "社区困难家庭",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAhgvU0cLJleG-KawwH5lajDo83Pp50_vmCcVrYuk2zJwomDpIzxFTkrZy8KuqAuLdHnT_-xmiE2DodbiW7Tld_yrexaDnhdbVhn4V-ukUtH9mAvJ3HCXdDfPu3jKF3WyFvA2yAERGVW0LIfwcxETX1xbANp_ihHA52UYVS8UW6_ITa_Q5KuoWy2l3qOPWXjkH5Pumj_vXh4GCisGw8t858XYjUrT8dsYRAgKyziIdpkLMMX_TYh7AJX4S0KrSfe5iouhQTtTOqNTI",
  },
];

export const categories = ["全部需求", "图书", "衣物", "文具", "家居", "其他"];

export const urgencyOptions = ["全部", "紧急募集中", "常态募集中"];

export const urgentDaysThreshold = 7;

export const regionOptions = ["全国", ...new Set(projects.map((project) => project.region))];

export const processSteps = [
  { icon: "search", title: "浏览项目", desc: "查看当前正在募集的公益需求" },
  { icon: "check_circle", title: "选择项目", desc: "找到最匹配您手中物资的受助方向" },
  { icon: "edit_document", title: "填写信息", desc: "登记捐赠详情,选择物流配送方式" },
  { icon: "send", title: "完成提交并等待反馈", desc: "物资送达后您将收到实时签收通知" },
];

export const trustFeatures = [
  { icon: "fact_check", title: "项目真实性审核", desc: "所有发布项目均经过三方机构实地核验与平台二次风控审核。" },
  { icon: "track_changes", title: "物资去向追踪", desc: "从出库、运输到最终发放,每一个节点均同步数字轨迹。" },
  { icon: "rate_review", title: "如何查看签收反馈", desc: "发放完成后,平台会上传受助人签收单及物资分发纪实现场照片。" },
  { icon: "gavel", title: "合规信息披露", desc: "平台财务状况与审计报告定期向公众开放,接受社会化监督。" },
];