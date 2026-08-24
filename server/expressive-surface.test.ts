import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const homeSource = readFileSync(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8");
const businessSource = readFileSync(new URL("../client/src/pages/BusinessDetails.tsx", import.meta.url), "utf8");
const queueSource = readFileSync(new URL("../client/src/pages/LiveQueue.tsx", import.meta.url), "utf8");
const accountSource = readFileSync(new URL("../client/src/pages/CustomerAccount.tsx", import.meta.url), "utf8");
const merchantSource = readFileSync(new URL("../client/src/pages/MerchantWorkspace.tsx", import.meta.url), "utf8");

describe("expressive QueueSync surfaces", () => {
  it("keeps the public product story anchored in the shared event-thread brand language", () => {
    expect(homeSource).toContain("hero-stage");
    expect(homeSource).toContain("journey-track");
    expect(homeSource).toContain("event-thread-stage");
    expect(homeSource).toContain("discovery-console");
  });

  it("keeps concrete event-record and command-center elements on customer and merchant screens", () => {
    expect(businessSource).toContain('page="business"');
    expect(businessSource).toContain("business-event-record");
    expect(queueSource).toContain('page="queue"');
    expect(queueSource).toContain("customer-queue-empty");
    expect(accountSource).toContain("customer-account-records");
    expect(merchantSource).toContain("merchant-command-frame");
    expect(merchantSource).toContain("merchant-metric-command");
    expect(merchantSource).toContain("merchant-empty-state");
    expect(merchantSource).toContain("merchant-live-queue-row");
  });
});
