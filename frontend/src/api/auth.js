// api/auth.js
// 注册 / 登录 / 当前用户 三个端点
// 调用方: stores/auth.js

import request from "@/utils/request";

export function register(payload) {
  return request.post("/client/auth/register", payload);
}

export function login(payload) {
  return request.post("/client/auth/login", payload);
}

export function fetchMe() {
  return request.get("/client/auth/me");
}