// stores/orders.js
// 订单列表 + 详情 + 提交
// 使用方: views/client/OrdersPage + useOrdersList + useAppointmentForm + useDonationSubmit

import { defineStore } from "pinia";
import * as ordersApi from "@/api/orders";
import { getOrderDisplayStage, DISPLAY_STAGES } from "@/utils/orderStatus";

export const useOrdersStore = defineStore("orders", {
  state: () => ({
    list: [],
    current: null,
    pagination: { page: 1, pageSize: 10, total: 0 },
    statusFilter: "all",
    loading: false,
    errorText: "",
  }),

  getters: {
    statusStats(state) {
      const stats = { pending: 0, processing: 0, completed: 0, cancelled: 0 };
      for (const o of state.list) {
        const stage = getOrderDisplayStage(o);
        stats[stage] = (stats[stage] || 0) + 1;
      }
      stats.total = state.list.length;
      return stats;
    },
  },

  actions: {
    async fetchList(params = {}) {
      this.loading = true;
      this.errorText = "";
      try {
        const data = await ordersApi.fetchOrders(params);
        this.list = data.list;
        this.pagination = {
          page: data.page,
          pageSize: data.pageSize,
          total: data.total,
        };
        return data;
      } catch (e) {
        this.errorText = e.message || "订单加载失败";
      } finally {
        this.loading = false;
      }
    },

    async fetchDetail(id) {
      this.loading = true;
      this.errorText = "";
      try {
        this.current = await ordersApi.fetchOrderById(id);
      } catch (e) {
        this.errorText = e.message || "订单详情加载失败";
      } finally {
        this.loading = false;
      }
    },

    async submitRecycle(payload) {
      return ordersApi.submitRecycleOrder(payload);
    },

    async submitDonation(payload) {
      return ordersApi.submitDonationOrder(payload);
    },

    setStatusFilter(filter) {
      this.statusFilter = filter;
    },
  },
});