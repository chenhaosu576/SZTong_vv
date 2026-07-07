// api/charity.js
// 公益项目: 列表 / 详情
// 调用方: composables/useCharityProjects.js

import request from "@/utils/request";

export function fetchCharityProjects(params = {}) {
  return request.get("/client/charity/projects", { params });
}

export function fetchCharityProjectById(id) {
  return request.get(`/client/charity/projects/${id}`);
}