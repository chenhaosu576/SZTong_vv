// utils/orderStatus.js
// 订单 7 阶段状态 → 4 展示阶段映射
// recycle: pending_review → confirmed → assigned → in_progress → weighed → completed / cancelled
// donation: submitted → accepted → in_transit → received → completed / cancelled
//
// 展示阶段: pending | processing | completed | cancelled
// (与前端 useOrdersList 现有 badge 配色兼容)

const RECYCLE_MAP = {
  pending_review: "pending",
  confirmed: "pending",
  assigned: "processing",
  in_progress: "processing",
  weighed: "processing",
  completed: "completed",
  cancelled: "cancelled",
};

const DONATION_MAP = {
  submitted: "pending",
  accepted: "processing",
  in_transit: "processing",
  received: "processing",
  completed: "completed",
  cancelled: "cancelled",
};

export const DISPLAY_STAGES = ["pending", "processing", "completed", "cancelled"];

export function getOrderDisplayStage(order) {
  if (!order || !order.status) return "pending";
  const map = order.orderType === "donation" ? DONATION_MAP : RECYCLE_MAP;
  return map[order.status] || "pending";
}

export function isDonationOrder(order) {
  return order?.orderType === "donation";
}

export function isRecyclingOrder(order) {
  return order?.orderType === "recycle";
}