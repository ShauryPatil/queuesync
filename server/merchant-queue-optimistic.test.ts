import { describe, expect, it } from "vitest";
import { applyOptimisticQueueTransition } from "../client/src/lib/queueOptimistic";

describe("merchant optimistic queue transitions", () => {
  const entries = [
    { entry: { id: "waiting-entry", status: "waiting", resourceId: null }, resource: null, customer: { name: "Asha" } },
    { entry: { id: "called-entry", status: "called", resourceId: null }, resource: null, customer: { name: "Ravi" } },
  ];

  it("advances the selected entry immediately while retaining other queue rows", () => {
    const result = applyOptimisticQueueTransition(entries, { queueEntryId: "waiting-entry", to: "called" });
    expect(result?.[0]?.entry.status).toBe("called");
    expect(result?.[1]?.entry.status).toBe("called");
  });

  it("removes terminal entries immediately and leaves the prior cache available for rollback", () => {
    const snapshot = entries;
    const result = applyOptimisticQueueTransition(entries, { queueEntryId: "called-entry", to: "no_show" });
    expect(result).toHaveLength(1);
    expect(result?.[0]?.entry.id).toBe("waiting-entry");
    expect(snapshot).toHaveLength(2);
  });

  it("shows the assigned resource immediately when a called customer starts service", () => {
    const result = applyOptimisticQueueTransition(entries, {
      queueEntryId: "called-entry",
      to: "in_service",
      resourceId: "resource-a",
      resource: { id: "resource-a", name: "Service chair A" },
    });
    expect(result?.[1]?.entry).toMatchObject({ status: "in_service", resourceId: "resource-a" });
    expect(result?.[1]?.resource?.name).toBe("Service chair A");
    expect(entries[1]?.resource).toBeNull();
  });
});
