// utils/request.js
// Axios 单例 + 拦截器。
// 职责:
//   - 注入 Authorization Bearer(token 从 authStore 读)
//   - 响应 code !== 0 → 抛 Error(message),由 caller 处理
//   - 响应 401 → 清 authStore + 跳 /auth?redirect=...
// 使用方: api/*.js

import axios from "axios";
import { useAuthStore } from "@/stores/auth";
import router from "@/router";

const isDev = import.meta.env.DEV;

const request = axios.create({
  baseURL: isDev ? "http://localhost:8080/api/v1" : "/api/v1",
  timeout: 15000,
});

request.interceptors.request.use((config) => {
  const authStore = useAuthStore();
  if (authStore.token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${authStore.token}`;
  }
  return config;
});

request.interceptors.response.use(
  (res) => {
    const body = res.data;
    if (body && body.code !== 0) {
      const err = new Error(body.message || "请求失败");
      err.code = body.code;
      err.httpStatus = res.status;
      throw err;
    }
    return body.data;
  },
  (error) => {
    if (error.response?.status === 401) {
      const authStore = useAuthStore();
      authStore.logout(router.currentRoute.value.fullPath);
    }
    const msg =
      error.response?.data?.message || error.message || "网络错误";
    const err = new Error(msg);
    err.code = error.response?.data?.code || -1;
    err.httpStatus = error.response?.status || 0;
    return Promise.reject(err);
  },
);

export default request;