// stores/serviceCenters.js

import { defineStore } from "pinia";
import * as serviceCentersApi from "@/api/serviceCenters";

export const useServiceCentersStore = defineStore("serviceCenters", {
  state: () => ({
    list: [],
    current: null,
    loading: false,
    errorText: "",
  }),

  actions: {
    async fetchList(params = {}) {
      this.loading = true;
      this.errorText = "";
      try {
        const data = await serviceCentersApi.fetchServiceCenters(params);
        this.list = data.list;
      } catch (e) {
        this.errorText = e.message || "服务站列表加载失败";
      } finally {
        this.loading = false;
      }
    },

    async fetchDetail(code) {
      this.loading = true;
      this.errorText = "";
      this.current = null;
      try {
        this.current = await serviceCentersApi.fetchServiceCenterByCode(code);
      } catch (e) {
        this.errorText = e.message || "服务站详情加载失败";
      } finally {
        this.loading = false;
      }
    },
  },
});