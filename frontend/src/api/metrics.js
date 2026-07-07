// api/metrics.js
// TopBar 用的运营统计
// 调用方: stores/metrics.js

import request from "@/utils/request";

export function fetchTopMetrics() {
  return request.get("/client/metrics/top");
}
