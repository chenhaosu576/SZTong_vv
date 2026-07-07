// api/serviceCenters.js

import request from "@/utils/request";

export function fetchServiceCenters(params = {}) {
  return request.get("/client/service-centers", { params });
}

export function fetchServiceCenterByCode(code) {
  return request.get(`/client/service-centers/${code}`);
}