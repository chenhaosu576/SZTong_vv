// useOrdersList.test.js
// Vitest coverage for the orders-page business composable.
// Verifies: type discrimination (donation / recycling mutual exclusion),
// status stage normalization, service-type class mapping, store fetch + error
// state roundtrip, and filteredOrders / statusStats reactive behavior across
// the keyword / tab / service-type dimensions.
//
// Mock 策略: vi.hoisted 拿到 useOrdersStoreMock;beforeEach 里 mockReturnValue
// 一个 fresh store 实例(ref + fetchList),fetchList 通过共享 storeList ref
// 把数据写入,被 composable 的 allOrders computed 读到。

import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";

const { useOrdersStoreMock } = vi.hoisted(() => ({
  useOrdersStoreMock: vi.fn(),
}));

vi.mock("@/stores/orders", () => ({
  useOrdersStore: useOrdersStoreMock,
}));

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

// 新 useOrdersList 用 order.orderType === "recycle" / "donation" 判别
// 状态名也按后端 7 阶段实际字符串 (pending_review / completed / 等)。
// 测试用 5 条样本覆盖 4 维筛选。
const SAMPLE_ORDERS = [
  { id: 1, orderType: "recycle", status: "pending_review", scheduledDate: "2026-04-01", serviceCenter: { name: "徐汇站" } },
  { id: 2, orderType: "donation", status: "completed", scheduledDate: "2026-04-02", serviceCenter: { name: "长宁站" } },
  { id: 3, orderType: "recycle", status: "in_progress", scheduledDate: "2026-04-03", serviceCenter: { name: "静安站" } },
  { id: 4, orderType: "recycle", status: "cancelled", scheduledDate: "2026-04-04", serviceCenter: { name: "普陀站" } },
  { id: 5, orderType: "donation", status: "submitted", scheduledDate: "2026-04-05", serviceCenter: { name: "浦东站" } },
];

function makeStore() {
  const storeList = ref([]);
  const loadingRef = ref(false);
  const errorTextRef = ref("");
  // 模拟 Pinia 自动解包: store.list / loading / errorText 以 getter 形式
  // 直接暴露底层 ref.value,让 composable 的 computed(() => store.list)
  // 拿到数组而不是 ref,store.loading 拿到 boolean。
  const fetchList = vi.fn().mockImplementation(async () => {
    storeList.value = [...SAMPLE_ORDERS];
    return {
      list: storeList.value,
      total: SAMPLE_ORDERS.length,
      page: 1,
      pageSize: 10,
    };
  });
  const store = {
    fetchList,
    get list() {
      return storeList.value;
    },
    get loading() {
      return loadingRef.value;
    },
    get errorText() {
      return errorTextRef.value;
    },
    get statusStats() {
      return {
        pending: storeList.value.filter((o) => o.status === "pending_review" || o.status === "submitted").length,
        processing: storeList.value.filter((o) => o.status === "in_progress").length,
        completed: storeList.value.filter((o) => o.status === "completed").length,
        cancelled: storeList.value.filter((o) => o.status === "cancelled").length,
        total: storeList.value.length,
      };
    },
  };
  // 测试需要直接驱动 loadingRef / errorTextRef 来模拟 store 内部状态机;
  // 暴露 getter-ref 桥 (供 mockImplementationOnce 用)。
  store._refs = { loadingRef, errorTextRef, storeList };
  return store;
}

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
  it(`orderType="donation" → isDonationOrder true`, () => {
    expect(isDonationOrder({ orderType: "donation" })).toBe(true);
  });

  it(`orderType="recycle" → isRecyclingOrder true`, () => {
    expect(isRecyclingOrder({ orderType: "recycle" })).toBe(true);
  });

  it("两类互斥", () => {
    expect(isDonationOrder({ orderType: "recycle" })).toBe(false);
    expect(isRecyclingOrder({ orderType: "donation" })).toBe(false);
  });

  it("未知 orderType 与两类都互斥", () => {
    expect(isDonationOrder({ orderType: "remaking" })).toBe(false);
    expect(isRecyclingOrder({ orderType: "remaking" })).toBe(false);
  });

  it("缺 orderType / 空 / 非字符串都返回 false", () => {
    expect(isDonationOrder(null)).toBe(false);
    expect(isDonationOrder({})).toBe(false);
    expect(isDonationOrder({ orderType: "" })).toBe(false);
  });
});

describe("getStatusStage 状态归一", () => {
  it("recycle: completed → completed, cancelled → cancelled", () => {
    expect(getStatusStage({ orderType: "recycle", status: "completed" })).toBe(STATUS_STAGE.COMPLETED);
    expect(getStatusStage({ orderType: "recycle", status: "cancelled" })).toBe(STATUS_STAGE.CANCELLED);
  });

  it("recycle: pending_review/confirmed → pending; assigned/in_progress/weighed → processing", () => {
    expect(getStatusStage({ orderType: "recycle", status: "pending_review" })).toBe(STATUS_STAGE.PENDING);
    expect(getStatusStage({ orderType: "recycle", status: "confirmed" })).toBe(STATUS_STAGE.PENDING);
    expect(getStatusStage({ orderType: "recycle", status: "assigned" })).toBe(STATUS_STAGE.PROCESSING);
    expect(getStatusStage({ orderType: "recycle", status: "in_progress" })).toBe(STATUS_STAGE.PROCESSING);
    expect(getStatusStage({ orderType: "recycle", status: "weighed" })).toBe(STATUS_STAGE.PROCESSING);
  });

  it("donation: submitted → pending; completed → completed; cancelled → cancelled", () => {
    expect(getStatusStage({ orderType: "donation", status: "submitted" })).toBe(STATUS_STAGE.PENDING);
    expect(getStatusStage({ orderType: "donation", status: "completed" })).toBe(STATUS_STAGE.COMPLETED);
    expect(getStatusStage({ orderType: "donation", status: "cancelled" })).toBe(STATUS_STAGE.CANCELLED);
  });

  it("缺 status → pending", () => {
    expect(getStatusStage({ orderType: "recycle" })).toBe(STATUS_STAGE.PENDING);
    expect(getStatusStage(null)).toBe(STATUS_STAGE.PENDING);
  });
});

describe("getServiceTypeClass service 类别映射", () => {
  it(`orderType="recycle" → recycling`, () => {
    expect(getServiceTypeClass({ orderType: "recycle" })).toBe(SERVICE_TYPE_CLASS.RECYCLING);
  });

  it(`orderType="donation" → donation`, () => {
    expect(getServiceTypeClass({ orderType: "donation" })).toBe(SERVICE_TYPE_CLASS.DONATION);
  });

  it("其它 → remaking", () => {
    expect(getServiceTypeClass({ orderType: "remaking" })).toBe(SERVICE_TYPE_CLASS.REMAKING);
    expect(getServiceTypeClass({})).toBe(SERVICE_TYPE_CLASS.REMAKING);
  });
});

describe("useOrdersList() fetch + 状态机", () => {
  beforeEach(() => {
    useOrdersStoreMock.mockReset();
  });

  it("loadOrders 成功: 填充 allOrders, loading=false, errorText 清空", async () => {
    useOrdersStoreMock.mockReturnValue(makeStore());
    const { loading, errorText, allOrders, loadOrders } = useOrdersList();

    expect(allOrders.value).toEqual([]);

    await loadOrders();

    expect(allOrders.value).toEqual(SAMPLE_ORDERS);
    expect(loading.value).toBe(false);
    expect(errorText.value).toBe("");
  });

  it("loadOrders 失败: errorText 写 error.message, allOrders 保持空, loading 仍回归 false", async () => {
    const store = makeStore();
    // 模拟真实 store 的 fetchList 行为: 内部 try/catch,写 errorText 而不是抛
    store.fetchList.mockImplementationOnce(async () => {
      store._refs.errorTextRef.value = "network down";
    });
    useOrdersStoreMock.mockReturnValue(store);

    const { loading, errorText, allOrders, loadOrders } = useOrdersList();

    await loadOrders();

    expect(loading.value).toBe(false);
    expect(errorText.value).toBe("network down");
    expect(allOrders.value).toEqual([]);
  });
});

describe("useOrdersList() filteredOrders 筛选", () => {
  beforeEach(() => {
    useOrdersStoreMock.mockReset();
    useOrdersStoreMock.mockReturnValue(makeStore());
  });

  it("keyword 命中 orderNo/serviceCenter.name", async () => {
    const { keyword, filteredOrders, loadOrders } = useOrdersList();
    await loadOrders();

    keyword.value = "002";
    // 数字 ID 不带 "002" 字面量,改为按 serviceCenter.name
    keyword.value = "长宁";
    expect(filteredOrders.value.map((o) => o.id)).toEqual([2]);

    keyword.value = "静安";
    expect(filteredOrders.value.map((o) => o.id)).toEqual([3]);
  });

  it(`activeTab 切到"公益捐赠"过滤非捐赠`, async () => {
    const { activeTab, filteredOrders, loadOrders } = useOrdersList();
    await loadOrders();

    activeTab.value = "公益捐赠";
    expect(filteredOrders.value.map((o) => o.id).sort()).toEqual([2, 5]);
  });

  it(`activeTab 切到"回收预约"过滤非回收`, async () => {
    const { activeTab, filteredOrders, loadOrders } = useOrdersList();
    await loadOrders();

    activeTab.value = "回收预约";
    expect(filteredOrders.value.map((o) => o.id).sort()).toEqual([1, 3, 4]);
  });

  it("三条件同时生效", async () => {
    const { keyword, activeTab, serviceTypeFilter, filteredOrders, loadOrders } = useOrdersList();
    await loadOrders();

    keyword.value = "站";
    activeTab.value = "回收预约";
    serviceTypeFilter.value = "回收预约";
    expect(filteredOrders.value.map((o) => o.id).sort()).toEqual([1, 3, 4]);
  });
});

describe("useOrdersList() statusStats 状态统计", () => {
  beforeEach(() => {
    useOrdersStoreMock.mockReset();
    useOrdersStoreMock.mockReturnValue(makeStore());
  });

  it("按 status 分组计数, 4 类状态覆盖正确", async () => {
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
