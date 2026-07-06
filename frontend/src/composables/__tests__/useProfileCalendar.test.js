// useProfileCalendar.test.js
// Vitest coverage for the calendar composable.
// Verifies: month state init from realDate, fetch+rebuild on month change,
// 3-second highlight pulse driven by section ref.

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../mock/timeApi", () => ({
  fetchCalendarWithOrders: vi.fn(async () => ({ 8: [{ id: "order-8" }, { id: "order-9" }] })),
}));

import { fetchCalendarWithOrders } from "../../mock/timeApi";
import { useProfileCalendar } from "../useProfileCalendar";

describe("useProfileCalendar", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 1));
    fetchCalendarWithOrders.mockClear();
  });

  it("initializes calendar from realDate and ordersData", () => {
    const calendar = useProfileCalendar();

    calendar.initializeCalendar({ year: 2026, month: 6, day: 1 }, { 1: [{ id: "a" }] });

    expect(calendar.monthText.value).toBe("2026年 7月");
    const today = calendar.calendarDays.value.find((day) => day.isToday);
    expect(today.day).toBe(1);
    expect(today.intensity).toBe(1);
  });

  it("changes month and fetches orders for the target month", async () => {
    const calendar = useProfileCalendar();
    calendar.initializeCalendar({ year: 2026, month: 6, day: 1 }, {});

    await calendar.changeMonth(1);

    expect(fetchCalendarWithOrders).toHaveBeenCalledWith(2026, 7);
    expect(calendar.monthText.value).toBe("2026年 8月");
  });

  it("highlights today and clears the highlight after three seconds", async () => {
    const calendar = useProfileCalendar();
    calendar.initializeCalendar({ year: 2026, month: 6, day: 1 }, {});
    calendar.setCalendarSectionRef({ scrollIntoView: vi.fn() });

    const promise = calendar.highlightToday();
    await vi.advanceTimersByTimeAsync(1100);
    await promise;

    expect(calendar.highlightedDay.value).not.toBeNull();
    await vi.advanceTimersByTimeAsync(3000);
    expect(calendar.highlightedDay.value).toBeNull();
  });
});
