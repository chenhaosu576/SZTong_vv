// stores/metrics.js
// TopBar 用的运营数字;state 用 0 默认值撑住首屏。
// 使用方:components/common/TopBar.vue

import { defineStore } from "pinia";
import * as metricsApi from "@/api/metrics";

export const useMetricsStore = defineStore("metrics", {
  state: () => ({
    top: {
      processedToday: 0,
      activeSites: 0,
      avgResponseHour: 0,
      carbonReducedKg: 0,
    },
    loading: false,
    errorText: "",
  }),

  actions: {
    async fetchTop() {
      this.loading = true;
      this.errorText = "";
      try {
        const data = await metricsApi.fetchTopMetrics();
        this.top = { ...this.top, ...data };
      } catch (e) {
        this.errorText = e.message || "运营数据加载失败";
      } finally {
        this.loading = false;
      }
    },
  },
});
