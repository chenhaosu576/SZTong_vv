// stores/auth.js
// 用户登录状态: token + user profile
// 持久化: localStorage.szt_token + localStorage.szt_user
// 使用方: router/index.js 守卫;views/*/* 调用 login/register/logout

import { defineStore } from "pinia";
import router from "@/router";
import * as authApi from "@/api/auth";

const TOKEN_KEY = "szt_token";
const USER_KEY = "szt_user";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    token: "",
    user: null,
  }),

  getters: {
    isAuthed: (state) => !!state.token,
    displayName: (state) => state.user?.displayName || "",
    pointsBalance: (state) => state.user?.pointsBalance || 0,
  },

  actions: {
    async login(payload) {
      const data = await authApi.login(payload);
      this.token = data.token;
      this.user = data.user;
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    },

    async register(payload) {
      const data = await authApi.register(payload);
      this.token = data.token;
      this.user = data.user;
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    },

    logout(redirectPath) {
      this.token = "";
      this.user = null;
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      if (redirectPath) {
        router.push(`/auth?redirect=${encodeURIComponent(redirectPath)}`);
      }
    },

    restoreFromStorage() {
      this.token = localStorage.getItem(TOKEN_KEY) || "";
      const raw = localStorage.getItem(USER_KEY);
      if (raw) {
        try {
          this.user = JSON.parse(raw);
        } catch {
          this.user = null;
        }
      }
    },
  },
});