// api/serviceCenters.js
// 服务站 REST 客户端:列表 / 详情 / 可预约时段。
//   - 列表返回 { list, total }
//   - 详情返回 service_centers 行 (按 code 查)
//   - 时段返回 { center, range, list },list 内为 service_slots 行

import request from "@/utils/request";

export function fetchServiceCenters(params = {}) {
  return request.get("/client/service-centers", { params });
}

export function fetchServiceCenterByCode(code) {
  return request.get(`/client/service-centers/${code}`);
}

export function fetchServiceCenterSlots(code, params = {}) {
  return request.get(`/client/service-centers/${code}/slots`, { params });
}