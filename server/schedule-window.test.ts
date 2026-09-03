import { describe, expect, it } from "vitest";
import { getNextOperatingWindow } from "../client/src/pages/BusinessDetails";

const monday = (hours: number, minutes = 0) => new Date("2026-09-07T00:00:00.000Z");

describe("QueueSync next operating window", () => {
  it("skips a passed same-day opening and returns the next configured day", () => {
    const schedules = [
      { dayOfWeek: 1, opensAt: "09:00", closesAt: "18:00", isOpen: "yes" },
      { dayOfWeek: 2, opensAt: "10:00", closesAt: "16:00", isOpen: "yes" },
    ];
    expect(getNextOperatingWindow(schedules, new Date("2026-09-07T15:00:00.000Z"), "Asia/Kolkata")).toBe("Tuesday 10:00–16:00");
  });

  it("uses the business timezone when the UTC date differs from the local operating date", () => {
    const schedules = [{ dayOfWeek: 1, opensAt: "09:00", closesAt: "18:00", isOpen: "yes" }];
    expect(getNextOperatingWindow(schedules, new Date("2026-09-07T02:00:00.000Z"), "Asia/Kolkata")).toBe("Monday 09:00–18:00");
  });

  it("returns null when no operating schedule is configured", () => {
    expect(getNextOperatingWindow([], new Date("2026-09-07T15:00:00.000Z"), "Asia/Kolkata")).toBeNull();
  });
});
