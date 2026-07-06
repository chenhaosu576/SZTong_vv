// ordersPage.js
// Static fallback data displayed by OrdersSidePanel.
// Lives outside useOrdersList because side-panel rendering is
// presentation-only — the composable would pull fetchOrders semantics
// (loading / error / filter) the panel does not need.

export const IMPACT_FALLBACK = {
  totalRecycled: "24.5 kg",
  totalDonations: "5 次",
  co2Reduced: "12.8 kg",
  ecoPoints: "1,480",
};

export const FAQ_ITEMS = [
  { id: "donation-logistics", question: "如何查看捐赠物流信息？" },
  { id: "remaking-duration", question: "改造服务的工期多久？" },
  { id: "points-calculation", question: "积分是如何计算的？" },
];
