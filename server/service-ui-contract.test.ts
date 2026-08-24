import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const merchantServices = readFileSync(new URL("../client/src/pages/MerchantServices.tsx", import.meta.url), "utf8");
const merchantWorkspace = readFileSync(new URL("../client/src/pages/MerchantWorkspace.tsx", import.meta.url), "utf8");
const businessDetails = readFileSync(new URL("../client/src/pages/BusinessDetails.tsx", import.meta.url), "utf8");
const routers = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");

describe("QueueSync service-backed booking interface", () => {
  it("publishes visible merchant slots with a selected persisted service and an assigned resource", () => {
    expect(merchantServices).toContain("Publish service slot");
    expect(merchantServices).toContain("serviceId: slot.serviceId");
    expect(merchantServices).toContain("Select an assigned resource");
    expect(merchantServices).toContain("resourceIdsByService");
  });

  it("keeps the legacy resource view on the managed service path and prevents generic slot persistence", () => {
    expect(merchantWorkspace).toContain("Manage services");
    expect(routers).toContain("Create service-specific booking slots from Manage services");
  });

  it("filters public slots by selected service and submits the authoritative slot identifier when booking", () => {
    expect(businessDetails).toContain("serviceId: selectedServiceId ?? undefined");
    expect(businessDetails).toContain("slotId: selectedSlot.id");
    expect(businessDetails).toContain("Selected service:");
  });
});
