import { describe, expect, it } from "vitest";
import { calculateResourceUtilization, roundedMetric } from "./analytics-metrics";

describe("QueueSync analytics metrics", () => {
  it("returns an honest empty result when utilization cannot be calculated", () => {
    expect(calculateResourceUtilization(0, 3, new Date("2026-01-01T09:00:00Z"), new Date("2026-01-01T10:00:00Z"))).toBeNull();
    expect(calculateResourceUtilization(30, 0, new Date("2026-01-01T09:00:00Z"), new Date("2026-01-01T10:00:00Z"))).toBeNull();
  });

  it("calculates utilization from recorded service duration and resource capacity", () => {
    expect(calculateResourceUtilization(90, 2, new Date("2026-01-01T09:00:00Z"), new Date("2026-01-01T10:00:00Z"))).toBe(75);
    expect(roundedMetric("17.6")).toBe(18);
  });
});
