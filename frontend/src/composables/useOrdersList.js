// useOrdersList.js
// Business state for the orders page: fetch + keyword / tab / service-type
// filtering + status normalization + statusStats aggregation. Drawer state
// (selectedOrder / showDrawer) is intentionally kept page-local because it
// only ever has one consumer and does not cross panels.
//
// Named functions (isDonationOrder / isRecyclingOrder / getServiceTypeClass
// / getStatusStage) and tab / class / stage constants are exported at the
// top so panels can import them without consuming the composable state
// (presentation-only consumers stay free of fetchOrders semantics).

import { computed, ref } from "vue";

import { fetchOrders } from "@/mock/clientApi";

export const ORDER_TABS = ["全部记录", "回收预约", "公益捐赠"];

export const ORDER_SERVICE_TYPES = ["所有服务类型", "回收预约", "公益捐赠", "旧物改造"];

export const SERVICE_TYPE_CLASS = {
  DONATION: "donation",
  RECYCLING: "recycling",
  REMAKING: "remaking",
};

export const STATUS_STAGE = {
  PENDING: "pending",
  PROCESSING: "processing",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
};

function getNormalizedType(item) {
  return String(item?.type || "").trim();
}

export function isDonationOrder(item) {
  return getNormalizedType(item).includes("捐赠");
}

export function isRecyclingOrder(item) {
  return getNormalizedType(item).includes("回收");
}

export function getServiceTypeClass(type) {
  const normalizedType = String(type || "").trim();
  if (normalizedType.includes("捐赠")) return SERVICE_TYPE_CLASS.DONATION;
  if (normalizedType.includes("回收")) return SERVICE_TYPE_CLASS.RECYCLING;
  return SERVICE_TYPE_CLASS.REMAKING;
}

export function getStatusStage(status) {
  const normalizedStatus = String(status || "").trim();

  if (!normalizedStatus) return STATUS_STAGE.PENDING;
  if (normalizedStatus.includes("取消") || normalizedStatus.includes("失效")) return STATUS_STAGE.CANCELLED;
  if (normalizedStatus.includes("完成") || normalizedStatus.includes("签收")) return STATUS_STAGE.COMPLETED;
  if (
    normalizedStatus.includes("待") ||
    normalizedStatus.includes("确认") ||
    normalizedStatus.includes("核验")
  ) {
    return STATUS_STAGE.PENDING;
  }
  if (
    normalizedStatus.includes("处理") ||
    normalizedStatus.includes("派送") ||
    normalizedStatus.includes("转运") ||
    normalizedStatus.includes("配送")
  ) {
    return STATUS_STAGE.PROCESSING;
  }

  return STATUS_STAGE.PENDING;
}

export function useOrdersList() {
  const loading = ref(true);
  const errorText = ref("");
  const allOrders = ref([]);
  const keyword = ref("");
  const activeTab = ref(ORDER_TABS[0]);
  const serviceTypeFilter = ref(ORDER_SERVICE_TYPES[0]);

  const filteredOrders = computed(() => {
    return allOrders.value.filter((item) => {
      const query = keyword.value.trim().toLowerCase();
      const passKeyword =
        !query ||
        String(item?.id || "").toLowerCase().includes(query) ||
        getNormalizedType(item).toLowerCase().includes(query) ||
        String(item?.station || "").toLowerCase().includes(query);
      const passTab =
        activeTab.value === ORDER_TABS[0] ||
        (activeTab.value === "回收预约" && isRecyclingOrder(item)) ||
        (activeTab.value === "公益捐赠" && isDonationOrder(item));
      const passServiceType =
        serviceTypeFilter.value === ORDER_SERVICE_TYPES[0] ||
        (serviceTypeFilter.value === "回收预约" && isRecyclingOrder(item)) ||
        (serviceTypeFilter.value === "公益捐赠" && isDonationOrder(item)) ||
        (serviceTypeFilter.value === "旧物改造" && !isRecyclingOrder(item) && !isDonationOrder(item));

      return passKeyword && passTab && passServiceType;
    });
  });

  const statusStats = computed(() => {
    const stats = {
      total: allOrders.value.length,
      processing: 0,
      pending: 0,
      completed: 0,
      cancelled: 0,
    };
    allOrders.value.forEach((item) => {
      const stage = getStatusStage(item.status);
      stats[stage]++;
    });
    return stats;
  });

  async function loadOrders() {
    loading.value = true;
    errorText.value = "";
    try {
      allOrders.value = await fetchOrders();
    } catch (error) {
      errorText.value = "订单数据加载失败，请稍后重试。";
    } finally {
      loading.value = false;
    }
  }

  return {
    loading,
    errorText,
    allOrders,
    keyword,
    activeTab,
    serviceTypeFilter,
    filteredOrders,
    statusStats,
    loadOrders,
  };
}
