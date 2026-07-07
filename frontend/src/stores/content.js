// stores/content.js
// home / faq / profile-demo 三个异步内容块。
// 使用方:HomePage / FaqPage / ProfilePage

import { defineStore } from "pinia";
import * as contentApi from "@/api/content";

export const useContentStore = defineStore("content", {
  state: () => ({
    home: null,
    faq: null,
    profileDemo: null,
    loading: false,
    errorText: "",
  }),

  actions: {
    async fetchHome() {
      this.loading = true;
      this.errorText = "";
      try {
        this.home = await contentApi.fetchHomeContent();
      } catch (e) {
        this.errorText = e.message || "首页内容加载失败";
      } finally {
        this.loading = false;
      }
    },

    async fetchFaq() {
      this.loading = true;
      this.errorText = "";
      try {
        this.faq = await contentApi.fetchFaqContent();
      } catch (e) {
        this.errorText = e.message || "常见问题加载失败";
      } finally {
        this.loading = false;
      }
    },

    async fetchProfileDemo() {
      this.loading = true;
      this.errorText = "";
      try {
        this.profileDemo = await contentApi.fetchProfileDemoContent();
      } catch (e) {
        this.errorText = e.message || "个人中心示例内容加载失败";
      } finally {
        this.loading = false;
      }
    },
  },
});
