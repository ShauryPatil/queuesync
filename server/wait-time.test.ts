import { describe, expect, it } from "vitest";
import { deriveWaitEstimate } from "./wait-time";

describe("QueueSync wait-time engine", () => {
  it("uses completed-service history when it exists", () => {
    expect(deriveWaitEstimate({ peopleAhead: 3, activeServiceCount: 1, availableResourceCount: 2, historicalAverageMinutes: 20, configuredDurationMinutes: 30 })).toMatchObject({ minutes: 40, basis: "historical" });
  });

  it("states that a configured fallback is in use when history is insufficient", () => {
    expect(deriveWaitEstimate({ peopleAhead: 2, activeServiceCount: 0, availableResourceCount: 1, historicalAverageMinutes: null, configuredDurationMinutes: 25 })).toMatchObject({ minutes: 50, basis: "configured_fallback" });
  });

  it("does not manufacture an estimate if no eligible resource exists", () => {
    expect(deriveWaitEstimate({ peopleAhead: 1, activeServiceCount: 1, availableResourceCount: 0, historicalAverageMinutes: 15, configuredDurationMinutes: 30 })).toMatchObject({ minutes: null, basis: "insufficient_data" });
  });
});
