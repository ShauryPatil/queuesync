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
    expect(merchantWorkspace).toContain("Configure service & publish slot");
    expect(merchantWorkspace).toContain('window.location.assign("/merchant/services")');
    expect(merchantWorkspace).not.toContain("<select required value={slot.resourceId}");
    expect(merchantWorkspace).not.toContain('type="date" value={slot.date}');
    expect(routers).toContain("Create service-specific booking slots from Manage services");
  });

  it("filters public slots by selected service and submits the authoritative slot identifier when booking", () => {
    expect(businessDetails).toContain("serviceId: selectedServiceId ?? undefined");
    expect(businessDetails).toContain("slotId: selectedSlot.id");
    expect(businessDetails).toContain("Selected service:");
  });

  it("only shows the next persisted opening after a closed-queue response and skips passed same-day windows", () => {
    expect(businessDetails).toContain('join.error?.message.toLowerCase().includes("closed")');
    expect(businessDetails).toContain("queueClosed && nextOperatingWindow");
    expect(businessDetails).toContain("toMinutes(schedule.opensAt) > currentMinutes");
    expect(businessDetails).toContain("export function getNextOperatingWindow(schedules");
  });

  it("keeps the no-schedule state truthful", () => {
    expect(businessDetails).toContain("if (!openSchedules.length) return null");
    expect(businessDetails).toContain("Operating schedule not yet published");
  });
});
