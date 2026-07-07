// api/orders.js

import request from "@/utils/request";

export function fetchOrders(params = {}) {
  return request.get("/client/orders", { params });
}

export function fetchOrderById(id) {
  return request.get(`/client/orders/${id}`);
}

export function submitRecycleOrder(payload) {
  return request.post("/client/orders/recycle", payload);
}

export function submitDonationOrder(payload) {
  return request.post("/client/orders/donation", payload);
}