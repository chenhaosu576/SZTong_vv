// useOrdersList.js
// Business state for the orders page: keyword / tab / service-type filtering
// + statusStats aggregation. State is delegated to useOrdersStore (Pinia);
// composable adds presentation-level filters / tabs that view panels consume.
//
// Named functions (isDonationOrder / isRecyclingOrder / getServiceTypeClass
// / getStatusStage) and tab / class / stage constants are exported at the
// top so panels can import them without consuming the composable state
// (presentation-only consumers stay free of fetchOrders semantics).

import { computed, ref } from "vue";

import { useOrdersStore } from "@/stores/orders";
import {
  getOrderDisplayStage,
  isDonationOrder,
  isRecyclingOrder,
} from "@/utils/orderStatus";

export { isDonationOrder, isRecyclingOrder } from "@/utils/orderStatus";
export const getStatusStage = (order) => getOrderDisplayStage(order);
export const STATUS_STAGE = {
  PENDING: "pending",
  PROCESSING: "processing",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
};
export const SERVICE_TYPE_CLASS = {
  DONATION: "donation",
  RECYCLING: "recycling",
  REMAKING: "remaking",
};

export const ORDER_TABS = ["全部记录", "回收预约", "公益捐赠"];
export const ORDER_SERVICE_TYPES = ["所有服务类型", "回收预约", "公益捐赠", "旧物改造"];

export function getServiceTypeClass(order) {
  if (isDonationOrder(order)) return SERVICE_TYPE_CLASS.DONATION;
  if (isRecyclingOrder(order)) return SERVICE_TYPE_CLASS.RECYCLING;
  return SERVICE_TYPE_CLASS.REMAKING;
}

export function useOrdersList() {
  const store = useOrdersStore();

  const keyword = ref("");
  const activeTab = ref(ORDER_TABS[0]);
  const serviceTypeFilter = ref(ORDER_SERVICE_TYPES[0]);

  const filteredOrders = computed(() => {
    const query = keyword.value.trim().toLowerCase();
    return store.list.filter((item) => {
      const passKeyword =
        !query ||
        String(item?.orderNo || "").toLowerCase().includes(query) ||
        String(item?.orderType || "").toLowerCase().includes(query) ||
        String(item?.serviceCenter?.name || "").toLowerCase().includes(query);
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

  return {
    loading: computed(() => store.loading),
    errorText: computed(() => store.errorText),
    allOrders: computed(() => store.list),
    keyword,
    activeTab,
    serviceTypeFilter,
    filteredOrders,
    statusStats: computed(() => store.statusStats),
    loadOrders: () => store.fetchList(),
  };
}