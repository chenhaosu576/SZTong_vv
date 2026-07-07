// useProfileCalendar.test.js
// Vitest coverage for the calendar composable.
// Verifies: month state init from realDate, store-driven fetch+rebuild on month change,
// 3-second highlight pulse driven by section ref.

import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchListMock } = vi.hoisted(() => ({
  fetchListMock: vi.fn(),
}));

vi.mock("../../stores/orders", () => ({
  useOrdersStore: () => ({
    fetchList: fetchListMock,
  }),
}));

import { useProfileCalendar } from "../useProfileCalendar";

describe("useProfileCalendar", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 1));
    fetchListMock.mockReset();
    fetchListMock.mockResolvedValue({
      list: [
        { id: "july-1", scheduledDate: "2026-07-01" },
        { id: "aug-8a", scheduledDate: "2026-08-08" },
        { id: "aug-8b", scheduledDate: "2026-08-08" },
      ],
      total: 3,
      page: 1,
      pageSize: 100,
    });
  });

  it("initializes calendar from realDate and store data", async () => {
    const calendar = useProfileCalendar();
    await calendar.initializeCalendar({ year: 2026, month: 6, day: 1 });

    expect(calendar.monthText.value).toBe("2026年 7月");
    const today = calendar.calendarDays.value.find((day) => day.isToday);
    expect(today.day).toBe(1);
    expect(today.intensity).toBe(1);
  });

  it("changes month and fetches orders for the target month", async () => {
    const calendar = useProfileCalendar();
    await calendar.initializeCalendar({ year: 2026, month: 6, day: 1 });

    await calendar.changeMonth(1);

    expect(calendar.monthText.value).toBe("2026年 8月");
    expect(fetchListMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ dateFrom: "2026-08-01", dateTo: "2026-08-31" })
    );
    const day8 = calendar.calendarDays.value.find((day) => day.day === 8);
    expect(day8.intensity).toBe(2);
  });

  it("highlights today and clears the highlight after three seconds", async () => {
    const calendar = useProfileCalendar();
    await calendar.initializeCalendar({ year: 2026, month: 6, day: 1 });
    calendar.setCalendarSectionRef({ scrollIntoView: vi.fn() });

    const promise = calendar.highlightToday();
    await vi.advanceTimersByTimeAsync(1100);
    await promise;

    expect(calendar.highlightedDay.value).not.toBeNull();
    await vi.advanceTimersByTimeAsync(3000);
    expect(calendar.highlightedDay.value).toBeNull();
  });
});
