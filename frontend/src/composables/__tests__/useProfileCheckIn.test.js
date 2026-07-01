// useProfileCheckIn.test.js
// Vitest coverage for the check-in composable.
// Verifies: localStorage round-trip, today detection, increment-on-success,
// alert + no-increment on duplicate, debug reset.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { useProfileCheckIn } from "../useProfileCheckIn";

describe("useProfileCheckIn", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 1, 9, 0, 0));
  });

  it("reads guardian days from localStorage", () => {
    localStorage.setItem("guardianDays", "420");

    const checkIn = useProfileCheckIn();

    expect(checkIn.guardianDays.value).toBe(420);
  });

  it("detects today's existing check-in", () => {
    localStorage.setItem("lastCheckInDate", new Date().toDateString());
    const checkIn = useProfileCheckIn();

    checkIn.checkTodayCheckIn();

    expect(checkIn.hasCheckedInToday.value).toBe(true);
  });

  it("increments guardian days once on a successful check-in", () => {
    const checkIn = useProfileCheckIn();

    const result = checkIn.triggerCheckIn();

    expect(result).toEqual({ checkedIn: true });
    expect(checkIn.guardianDays.value).toBe(366);
    expect(localStorage.getItem("guardianDays")).toBe("366");
    expect(checkIn.hasCheckedInToday.value).toBe(true);
  });

  it("shows alert and does not increment on duplicate check-in", async () => {
    const checkIn = useProfileCheckIn();
    checkIn.triggerCheckIn();

    const result = checkIn.triggerCheckIn();

    expect(result).toEqual({ checkedIn: false });
    expect(checkIn.guardianDays.value).toBe(366);
    expect(checkIn.showCheckInAlert.value).toBe(true);
    await vi.advanceTimersByTimeAsync(3000);
    expect(checkIn.showCheckInAlert.value).toBe(false);
  });

  it("resets check-in state for hidden debug controls", () => {
    const checkIn = useProfileCheckIn();
    checkIn.triggerCheckIn();

    checkIn.resetCheckInForTesting();

    expect(localStorage.getItem("lastCheckInDate")).toBeNull();
    expect(checkIn.hasCheckedInToday.value).toBe(false);
  });
});
