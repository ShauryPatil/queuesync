import { describe, expect, it } from "vitest";
import { canTransitionQueue, transitionEvent } from "./queue-state";

describe("QueueSync queue state machine", () => {
  it("allows the authoritative service lifecycle", () => {
    expect(canTransitionQueue("waiting", "called")).toBe(true);
    expect(canTransitionQueue("called", "in_service")).toBe(true);
    expect(canTransitionQueue("in_service", "completed")).toBe(true);
    expect(transitionEvent("called", "in_service")?.eventType).toBe("SERVICE_STARTED");
  });

  it("prevents invalid and terminal-state transitions", () => {
    expect(canTransitionQueue("completed", "waiting")).toBe(false);
    expect(canTransitionQueue("no_show", "in_service")).toBe(false);
    expect(canTransitionQueue("waiting", "completed")).toBe(false);
  });
});
