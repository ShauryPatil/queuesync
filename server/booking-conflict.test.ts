import { describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({
  getBusinessById: vi.fn(),
  listBusinessResources: vi.fn(),
  hasBookingConflict: vi.fn(),
}));

import * as db from "./db";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const now = new Date();
const context = { user: { id: 9, openId: "booking-customer", name: "Customer", email: "customer@example.com", loginMethod: "test", role: "customer", createdAt: now, updatedAt: now, lastSignedIn: now }, req: { protocol: "https", headers: {} }, res: { clearCookie: vi.fn() } } as unknown as TrpcContext;

describe("QueueSync booking conflict validation", () => {
  it("rejects a conflicting booking before a record is created", async () => {
    vi.mocked(db.getBusinessById).mockResolvedValue({ id: "business-1", ownerId: 2, name: "Real Business", slug: "real-business", category: "Salon", description: null, address: null, area: null, phone: null, timezone: "Asia/Kolkata", defaultServiceDurationMinutes: 30, settings: null, isActive: "active", createdAt: now, updatedAt: now });
    vi.mocked(db.listBusinessResources).mockResolvedValue([{ id: "resource-1", businessId: "business-1", name: "Stylist 1", resourceType: "Stylist", description: null, capacity: 1, status: "available", configuredServiceDurationMinutes: 30, isPublic: "yes", createdAt: now, updatedAt: now }]);
    vi.mocked(db.hasBookingConflict).mockResolvedValue(true);
    const caller = appRouter.createCaller(context);
    await expect(caller.bookings.create({ businessId: "business-1", resourceId: "resource-1", startsAt: new Date(Date.now() + 3600000), endsAt: new Date(Date.now() + 7200000) })).rejects.toMatchObject({ code: "CONFLICT" });
  });
});
