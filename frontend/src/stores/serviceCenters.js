// stores/serviceCenters.js
// 服务站领域 Pinia store:列表 / 详情 / 时段。
// 状态分组:list / current 走详情/列表链路,slots / slotsRange 走时段链路,
// 两个链路 loading / errorText 各自独立,避免详情失败拖累时段展示。

import { defineStore } from "pinia";
import * as serviceCentersApi from "@/api/serviceCenters";

export const useServiceCentersStore = defineStore("serviceCenters", {
  state: () => ({
    list: [],
    current: null,
    loading: false,
    errorText: "",
    slots: [],
    slotsRange: null,
    slotsLoading: false,
    slotsErrorText: "",
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

    async fetchSlots(code, params = {}) {
      this.slotsLoading = true;
      this.slotsErrorText = "";
      this.slots = [];
      this.slotsRange = null;
      try {
        const data = await serviceCentersApi.fetchServiceCenterSlots(code, params);
        this.slots = data.list;
        this.slotsRange = data.range;
      } catch (e) {
        this.slotsErrorText = e.message || "可预约时段加载失败";
      } finally {
        this.slotsLoading = false;
      }
    },
  },
});