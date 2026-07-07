// api/content.js
// 公开 + 需登录(后端挂载 authMiddleware)
// 调用方: stores/content.js

import request from "@/utils/request";

export function fetchHomeContent() {
  return request.get("/client/content/home");
}

export function fetchFaqContent() {
  return request.get("/client/content/faq");
}

export function fetchProfileDemoContent() {
  return request.get("/client/content/profile-demo");
}
