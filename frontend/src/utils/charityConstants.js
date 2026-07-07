// charityConstants.js
// 公益页面共享的静态数据常量 (projects / regionOptions 已迁到后端,本文件
// 只保留筛选条枚举 + 静态文案)。
//
// 包含:
//   - categories: 类目 chips(后端暂不返回,留作占位)
//   - urgencyOptions: 紧急度筛选项
//   - processSteps: 四步流程文案
//   - trustFeatures: 信任背书 4 个特性
//
// 使用方: views/client/CharityPage.vue (顶部 import 透传给 panel)

export const categories = ["全部需求", "图书", "衣物", "文具", "家居", "其他"];

export const urgencyOptions = ["全部", "紧急募集中", "常态募集中"];

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