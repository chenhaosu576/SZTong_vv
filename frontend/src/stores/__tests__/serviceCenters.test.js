// serviceCenters.test.js
// Vitest coverage for the serviceCenters Pinia store's fetchSlots action.
// 覆盖:
//   1) 成功: store.slots / store.slotsRange 写入响应里的 list / range
//   2) 失败: store.slotsErrorText 写入 e.message,slots/slotsRange 保持空
//   3) loading: 请求期间 slotsLoading=true,完成后 slotsLoading=false
//   4) 切换服务站 (不同 code) 时清掉旧 slots/slotsRange
//
// Mock 策略: vi.hoisted 拿到 fetchServiceCenterSlotsMock;
//            vi.mock("@/api/serviceCenters") 用该 mock 替换 fetchServiceCenterSlots。

import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

const { fetchServiceCenterSlotsMock } = vi.hoisted(() => ({
  fetchServiceCenterSlotsMock: vi.fn(),
}));

vi.mock("@/api/serviceCenters", () => ({
  fetchServiceCenterSlots: fetchServiceCenterSlotsMock,
}));

import { useServiceCentersStore } from "../serviceCenters";

describe("useServiceCentersStore.fetchSlots", () => {
  beforeEach(() => {
    fetchServiceCenterSlotsMock.mockReset();
    setActivePinia(createPinia());
  });

  it("成功: slots / slotsRange 写入响应里的 list / range, slotsErrorText 空", async () => {
    fetchServiceCenterSlotsMock.mockResolvedValueOnce({
      center: { id: 1, code: "sh-xuhui-001", name: "徐汇示范站" },
      range: { dateFrom: "2026-07-14", dateTo: "2026-07-27" },
      list: [
        { id: 101, date: "2026-07-14", period: "09:00-12:00", capacity: 3, reservedCount: 0, available: true, status: 1 },
        { id: 102, date: "2026-07-14", period: "13:00-16:00", capacity: 3, reservedCount: 3, available: false, status: 1 },
      ],
    });

    const store = useServiceCentersStore();

    expect(store.slots).toEqual([]);
    expect(store.slotsRange).toBeNull();
    expect(store.slotsLoading).toBe(false);
    expect(store.slotsErrorText).toBe("");

    await store.fetchSlots("sh-xuhui-001", { dateFrom: "2026-07-14", dateTo: "2026-07-27" });

    expect(fetchServiceCenterSlotsMock).toHaveBeenCalledWith("sh-xuhui-001", { dateFrom: "2026-07-14", dateTo: "2026-07-27" });
    expect(store.slots).toHaveLength(2);
    expect(store.slots[0].id).toBe(101);
    expect(store.slotsRange).toEqual({ dateFrom: "2026-07-14", dateTo: "2026-07-27" });
    expect(store.slotsErrorText).toBe("");
    expect(store.slotsLoading).toBe(false);
  });

  it("失败: slotsErrorText 写 e.message, slots/slotsRange 保持空, loading 仍回归 false", async () => {
    fetchServiceCenterSlotsMock.mockRejectedValueOnce(new Error("网络异常"));

    const store = useServiceCentersStore();

    await store.fetchSlots("sh-xuhui-001");

    expect(store.slotsErrorText).toBe("网络异常");
    expect(store.slots).toEqual([]);
    expect(store.slotsRange).toBeNull();
    expect(store.slotsLoading).toBe(false);
  });

  it("loading: 进入时 slotsLoading=true, await 后 slotsLoading=false", async () => {
    let resolveFetch;
    fetchServiceCenterSlotsMock.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveFetch = resolve;
      }),
    );

    const store = useServiceCentersStore();

    expect(store.slotsLoading).toBe(false);

    const pending = store.fetchSlots("sh-xuhui-001");

    // 进入 action 后、await 之前 slotsLoading 已为 true
    expect(store.slotsLoading).toBe(true);
    expect(store.slotsErrorText).toBe("");

    resolveFetch({
      center: { id: 1, code: "sh-xuhui-001", name: "徐汇示范站" },
      range: { dateFrom: "2026-07-14", dateTo: "2026-07-27" },
      list: [],
    });

    await pending;

    expect(store.slotsLoading).toBe(false);
    expect(store.slots).toEqual([]);
    expect(store.slotsRange).toEqual({ dateFrom: "2026-07-14", dateTo: "2026-07-27" });
  });

  it("切换服务站: 第二次 fetchSlots 入口处先清掉旧 slots/slotsRange", async () => {
    fetchServiceCenterSlotsMock
      .mockResolvedValueOnce({
        center: { id: 1, code: "sh-xuhui-001", name: "徐汇示范站" },
        range: { dateFrom: "2026-07-14", dateTo: "2026-07-27" },
        list: [{ id: 201, date: "2026-07-14", period: "09:00-12:00", capacity: 3, reservedCount: 0, available: true, status: 1 }],
      })
      .mockResolvedValueOnce({
        center: { id: 2, code: "sh-changning-002", name: "长宁示范站" },
        range: { dateFrom: "2026-07-14", dateTo: "2026-07-27" },
        list: [
          { id: 301, date: "2026-07-14", period: "09:00-12:00", capacity: 3, reservedCount: 0, available: true, status: 1 },
          { id: 302, date: "2026-07-15", period: "13:00-16:00", capacity: 3, reservedCount: 1, available: true, status: 1 },
        ],
      });

    const store = useServiceCentersStore();

    await store.fetchSlots("sh-xuhui-001");
    expect(store.slots).toHaveLength(1);
    expect(store.slots[0].id).toBe(201);
    expect(store.slotsRange).toEqual({ dateFrom: "2026-07-14", dateTo: "2026-07-27" });

    // 切到新服务站:第二次调用前 store 已主动清空,期间不应返回旧数据
    const pending = store.fetchSlots("sh-changning-002");

    expect(store.slots).toEqual([]);
    expect(store.slotsRange).toBeNull();

    await pending;

    expect(store.slots).toHaveLength(2);
    expect(store.slots.map((s) => s.id)).toEqual([301, 302]);
    expect(fetchServiceCenterSlotsMock).toHaveBeenNthCalledWith(1, "sh-xuhui-001", {});
    expect(fetchServiceCenterSlotsMock).toHaveBeenNthCalledWith(2, "sh-changning-002", {});
  });
});