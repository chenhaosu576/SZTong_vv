// useOrdersList.test.js
// Vitest coverage for the orders-page business composable.
// Verifies: type discrimination (donation / recycling mutual exclusion),
// status stage normalization, service-type class mapping, fetch + error
// state roundtrip, and filteredOrders / statusStats reactive behavior
// across the keyword / tab / service-type dimensions.

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/mock/clientApi", () => ({
  fetchOrders: vi.fn(),
}));

import { fetchOrders } from "@/mock/clientApi";
import {
  ORDER_TABS,
  ORDER_SERVICE_TYPES,
  SERVICE_TYPE_CLASS,
  STATUS_STAGE,
  getServiceTypeClass,
  getStatusStage,
  isDonationOrder,
  isRecyclingOrder,
  useOrdersList,
} from "../useOrdersList";

const SAMPLE_ORDERS = [
  {
    id: "SZT-001",
    type: "纸类回收预约",
    status: "待上门",
    station: "徐汇服务站",
  },
  {
    id: "SZT-002",
    type: "衣物捐赠",
    status: "已完成",
    station: "长宁服务站",
  },
  {
    id: "SZT-003",
    type: "旧物改造",
    status: "处理中",
    station: "静安服务站",
  },
  {
    id: "SZT-004",
    type: "家具回收预约",
    status: "已取消",
    station: "普陀服务站",
  },
  {
    id: "SZT-005",
    type: "小家电回收预约",
    status: "待核验",
    station: "浦东服务站",
  },
];

describe(`ORDER_TABS / ORDER_SERVICE_TYPES / STATUS_STAGE / SERVICE_TYPE_CLASS 常量`, () => {
  it(`ORDER_TABS 以"全部记录"为首项`, () => {
    expect(ORDER_TABS[0]).toBe("全部记录");
    expect(ORDER_TABS).toContain("回收预约");
    expect(ORDER_TABS).toContain("公益捐赠");
  });

  it(`ORDER_SERVICE_TYPES 以"所有服务类型"为首项并包含 4 类`, () => {
    expect(ORDER_SERVICE_TYPES[0]).toBe("所有服务类型");
    expect(ORDER_SERVICE_TYPES).toHaveLength(4);
  });
});

describe(`isDonationOrder / isRecyclingOrder 类型判别`, () => {
  it(`命中"捐赠"返回 true`, () => {
    expect(isDonationOrder({ type: "衣物捐赠" })).toBe(true);
  });

  it(`命中"回收"返回 true`, () => {
    expect(isRecyclingOrder({ type: "纸类回收预约" })).toBe(true);
  });

  it("两类互斥", () => {
    expect(isDonationOrder({ type: "纸类回收预约" })).toBe(false);
    expect(isRecyclingOrder({ type: "衣物捐赠" })).toBe(false);
  });

  it("改造类与两类都互斥", () => {
    expect(isDonationOrder({ type: "旧物改造" })).toBe(false);
    expect(isRecyclingOrder({ type: "旧物改造" })).toBe(false);
  });

  it("缺 type / 空 type / 非字符串都返回 false", () => {
    expect(isDonationOrder(null)).toBe(false);
    expect(isDonationOrder({})).toBe(false);
    expect(isDonationOrder({ type: "" })).toBe(false);
    expect(isDonationOrder({ type: "  " })).toBe(false);
  });
});

describe("getStatusStage 状态归一", () => {
  it("已完成 / 已签收 → completed", () => {
    expect(getStatusStage("已完成")).toBe(STATUS_STAGE.COMPLETED);
    expect(getStatusStage("已签收")).toBe(STATUS_STAGE.COMPLETED);
  });

  it("已取消 → cancelled", () => {
    expect(getStatusStage("已取消")).toBe(STATUS_STAGE.CANCELLED);
  });

  it("待核验 / 待确认 / 待上门 → pending", () => {
    expect(getStatusStage("待核验")).toBe(STATUS_STAGE.PENDING);
    expect(getStatusStage("待确认")).toBe(STATUS_STAGE.PENDING);
    expect(getStatusStage("待上门")).toBe(STATUS_STAGE.PENDING);
  });

  it("处理中 / 派送中 → processing", () => {
    expect(getStatusStage("处理中")).toBe(STATUS_STAGE.PROCESSING);
    expect(getStatusStage("派送中")).toBe(STATUS_STAGE.PROCESSING);
  });

  it("空字符串 / 未知 → pending", () => {
    expect(getStatusStage("")).toBe(STATUS_STAGE.PENDING);
    expect(getStatusStage("xxx")).toBe(STATUS_STAGE.PENDING);
  });
});

describe("getServiceTypeClass service 类别映射", () => {
  it(`含"回收" → recycling`, () => {
    expect(getServiceTypeClass("纸类回收预约")).toBe(SERVICE_TYPE_CLASS.RECYCLING);
  });

  it(`含"捐赠" → donation`, () => {
    expect(getServiceTypeClass("衣物捐赠")).toBe(SERVICE_TYPE_CLASS.DONATION);
  });

  it("其它 → remaking", () => {
    expect(getServiceTypeClass("旧物改造")).toBe(SERVICE_TYPE_CLASS.REMAKING);
    expect(getServiceTypeClass("")).toBe(SERVICE_TYPE_CLASS.REMAKING);
  });
});

describe("useOrdersList() fetch + 状态机", () => {
  beforeEach(() => {
    fetchOrders.mockReset();
  });

  it("loadOrders 成功: 填充 allOrders, loading=false, errorText 清空", async () => {
    fetchOrders.mockResolvedValueOnce(SAMPLE_ORDERS);
    const { loading, errorText, allOrders, loadOrders } = useOrdersList();

    expect(loading.value).toBe(true);
    expect(allOrders.value).toEqual([]);

    await loadOrders();

    expect(allOrders.value).toEqual(SAMPLE_ORDERS);
    expect(loading.value).toBe(false);
    expect(errorText.value).toBe("");
  });

  it("loadOrders 失败: errorText 写中文提示, loading 仍回归 false", async () => {
    fetchOrders.mockRejectedValueOnce(new Error("network down"));
    const { loading, errorText, allOrders, loadOrders } = useOrdersList();

    await loadOrders();

    expect(loading.value).toBe(false);
    expect(errorText.value).toBe("订单数据加载失败，请稍后重试。");
    expect(allOrders.value).toEqual([]);
  });
});

describe("useOrdersList() filteredOrders 筛选", () => {
  beforeEach(() => {
    fetchOrders.mockReset();
  });

  it("keyword 命中订单 id", async () => {
    fetchOrders.mockResolvedValueOnce(SAMPLE_ORDERS);
    const { keyword, filteredOrders, loadOrders } = useOrdersList();
    await loadOrders();

    keyword.value = "002";
    expect(filteredOrders.value).toHaveLength(1);
    expect(filteredOrders.value[0].id).toBe("SZT-002");
  });

  it("keyword 命中 type / station", async () => {
    fetchOrders.mockResolvedValueOnce(SAMPLE_ORDERS);
    const { keyword, filteredOrders, loadOrders } = useOrdersList();
    await loadOrders();

    keyword.value = "旧物";
    expect(filteredOrders.value).toHaveLength(1);
    expect(filteredOrders.value[0].id).toBe("SZT-003");

    keyword.value = "长宁";
    expect(filteredOrders.value).toHaveLength(1);
    expect(filteredOrders.value[0].id).toBe("SZT-002");
  });

  it(`activeTab 切到"公益捐赠"过滤非捐赠`, async () => {
    fetchOrders.mockResolvedValueOnce(SAMPLE_ORDERS);
    const { activeTab, filteredOrders, loadOrders } = useOrdersList();
    await loadOrders();

    activeTab.value = "公益捐赠";
    expect(filteredOrders.value.map((item) => item.id)).toEqual(["SZT-002"]);
  });

  it(`serviceTypeFilter 切到"旧物改造"过滤掉前两类`, async () => {
    fetchOrders.mockResolvedValueOnce(SAMPLE_ORDERS);
    const { serviceTypeFilter, filteredOrders, loadOrders } = useOrdersList();
    await loadOrders();

    serviceTypeFilter.value = "旧物改造";
    expect(filteredOrders.value.map((item) => item.id)).toEqual(["SZT-003"]);
  });

  it("三条件同时生效", async () => {
    fetchOrders.mockResolvedValueOnce(SAMPLE_ORDERS);
    const { keyword, activeTab, serviceTypeFilter, filteredOrders, loadOrders } = useOrdersList();
    await loadOrders();

    keyword.value = "SZT";
    activeTab.value = "回收预约";
    serviceTypeFilter.value = "回收预约";
    expect(filteredOrders.value.map((item) => item.id).sort()).toEqual(["SZT-001", "SZT-004", "SZT-005"]);
  });
});

describe("useOrdersList() statusStats 状态统计", () => {
  beforeEach(() => {
    fetchOrders.mockReset();
  });

  it("按 status 分组计数, 4 类状态覆盖正确", async () => {
    fetchOrders.mockResolvedValueOnce(SAMPLE_ORDERS);
    const { statusStats, loadOrders } = useOrdersList();
    await loadOrders();

    expect(statusStats.value).toEqual({
      total: 5,
      pending: 2,
      processing: 1,
      completed: 1,
      cancelled: 1,
    });
  });
});
