import { describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({
  getMember: vi.fn(),
  createService: vi.fn(),
  getBusinessService: vi.fn(),
  listBusinessResources: vi.fn(),
  isResourceAssignedToService: vi.fn(),
  createSlot: vi.fn(),
  createEvent: vi.fn(),
  getBusinessById: vi.fn(),
  isBusinessOpenNow: vi.fn(),
  getActiveCustomerQueue: vi.fn(),
  createQueueEntry: vi.fn(),
  getQueueEntry: vi.fn(),
  getQueueEntriesAhead: vi.fn(),
  getHistoricalAverageDuration: vi.fn(),
  listAvailableResources: vi.fn(),
  updateQueueEntry: vi.fn(),
  listLiveQueue: vi.fn(),
  createNotification: vi.fn(),
  getBusinessMemberUserIds: vi.fn(),
}));

import * as db from "./db";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const now = new Date("2026-08-24T10:00:00Z");
const merchantContext = { user: { id: 7, openId: "merchant-7", name: "Merchant", email: "merchant@example.com", loginMethod: "test", role: "merchant", createdAt: now, updatedAt: now, lastSignedIn: now }, req: { protocol: "https", headers: {} }, res: { clearCookie: vi.fn() } } as unknown as TrpcContext;
const customerContext = { user: { id: 11, openId: "customer-11", name: "Customer", email: "customer@example.com", loginMethod: "test", role: "customer", createdAt: now, updatedAt: now, lastSignedIn: now }, req: { protocol: "https", headers: {} }, res: { clearCookie: vi.fn() } } as unknown as TrpcContext;

describe("QueueSync durable service and queue safety workflow", () => {
  it("persists a merchant-created service within an authorized business", async () => {
    vi.mocked(db.getMember).mockResolvedValue({ id: 1, businessId: "business-1", userId: 7, role: "owner", createdAt: now, updatedAt: now });
    vi.mocked(db.createService).mockResolvedValue({ id: "service-1", businessId: "business-1", name: "Gaming session", description: "A real thirty-minute booking", durationMinutes: 30, capacity: 1, priceCents: 50000, status: "active", createdAt: now, updatedAt: now });
    const caller = appRouter.createCaller(merchantContext);
    await expect(caller.services.create({ businessId: "business-1", service: { name: "Gaming session", description: "A real thirty-minute booking", durationMinutes: 30, capacity: 1, priceCents: 50000 } })).resolves.toMatchObject({ id: "service-1", status: "active" });
    expect(db.createService).toHaveBeenCalledWith(expect.objectContaining({ businessId: "business-1", name: "Gaming session", durationMinutes: 30 }));
    expect(db.createEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: "SERVICE_CREATED", actorId: 7 }));
  });

  it("returns a clear conflict when concurrent persistence detects an existing active queue entry", async () => {
    vi.mocked(db.getBusinessById).mockResolvedValue({ id: "business-1", ownerId: 7, name: "Real Business", slug: "real-business", category: "Gaming", description: null, address: null, area: null, phone: null, timezone: "Asia/Kolkata", defaultServiceDurationMinutes: 30, settings: null, isActive: "active", createdAt: now, updatedAt: now });
    vi.mocked(db.isBusinessOpenNow).mockResolvedValue(true);
    vi.mocked(db.getActiveCustomerQueue).mockResolvedValue(undefined);
    vi.mocked(db.createQueueEntry).mockRejectedValue({ code: "ER_DUP_ENTRY" });
    const caller = appRouter.createCaller(customerContext);
    await expect(caller.queue.join({ businessId: "business-1" })).rejects.toMatchObject({ code: "CONFLICT", message: "You already have an active queue entry for this business." });
  });

  it("persists a service-specific slot only after resource coverage is verified", async () => {
    const startsAt = new Date("2026-09-01T09:00:00Z");
    const endsAt = new Date("2026-09-01T09:30:00Z");
    vi.mocked(db.getMember).mockResolvedValue({ id: 1, businessId: "business-1", userId: 7, role: "owner", createdAt: now, updatedAt: now });
    vi.mocked(db.getBusinessService).mockResolvedValue({ id: "service-1", businessId: "business-1", name: "Gaming session", description: null, durationMinutes: 30, capacity: 1, priceCents: null, status: "active", createdAt: now, updatedAt: now });
    vi.mocked(db.listBusinessResources).mockResolvedValue([{ id: "resource-1", businessId: "business-1", name: "PC-01", resourceType: "Station", description: null, capacity: 1, status: "available", configuredServiceDurationMinutes: 30, isPublic: "yes", createdAt: now, updatedAt: now }]);
    vi.mocked(db.isResourceAssignedToService).mockResolvedValue(true);
    vi.mocked(db.createSlot).mockResolvedValue({ id: "slot-1", businessId: "business-1", resourceId: "resource-1", serviceId: "service-1", startsAt, endsAt, capacity: 1, status: "available", createdAt: now, updatedAt: now });
    const caller = appRouter.createCaller(merchantContext);
    await expect(caller.slots.create({ businessId: "business-1", resourceId: "resource-1", serviceId: "service-1", startsAt, endsAt, capacity: 1, status: "available" })).resolves.toMatchObject({ id: "slot-1", serviceId: "service-1" });
    expect(db.createSlot).toHaveBeenCalledWith(expect.objectContaining({ businessId: "business-1", resourceId: "resource-1", serviceId: "service-1" }));
  });

  it("rejects a generic slot request that omits service context", async () => {
    vi.mocked(db.getMember).mockResolvedValue({ id: 1, businessId: "business-1", userId: 7, role: "owner", createdAt: now, updatedAt: now });
    const caller = appRouter.createCaller(merchantContext);
    await expect(caller.slots.create({ businessId: "business-1", resourceId: "resource-1", startsAt: new Date("2026-09-02T09:00:00Z"), endsAt: new Date("2026-09-02T09:30:00Z"), capacity: 1, status: "available" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("preserves an assigned service through the persisted customer queue join and live snapshot", async () => {
    const resource = { id: "resource-1", businessId: "business-1", name: "Station 1", resourceType: "Station", description: null, capacity: 1, status: "available" as const, configuredServiceDurationMinutes: 30, isPublic: "yes" as const, createdAt: now, updatedAt: now };
    const service = { id: "service-1", businessId: "business-1", name: "Gaming session", description: null, durationMinutes: 30, capacity: 1, priceCents: null, status: "active" as const, createdAt: now, updatedAt: now };
    const entry = { id: "queue-1", businessId: "business-1", customerId: 11, resourceId: "resource-1", serviceId: "service-1", bookingId: null, activeKey: "business-1:11", status: "waiting" as const, joinedAt: now, calledAt: null, startedAt: null, completedAt: null, noShowAt: null, cancelledAt: null, estimatedWaitMinutes: null, estimationBasis: null, notes: null, createdAt: now, updatedAt: now };
    vi.mocked(db.getBusinessById).mockResolvedValue({ id: "business-1", ownerId: 7, name: "Real Business", slug: "real-business", category: "Gaming", description: null, address: null, area: null, phone: null, timezone: "Asia/Kolkata", defaultServiceDurationMinutes: 30, settings: null, isActive: "active", createdAt: now, updatedAt: now });
    vi.mocked(db.isBusinessOpenNow).mockResolvedValue(true);
    vi.mocked(db.getActiveCustomerQueue).mockResolvedValue(undefined);
    vi.mocked(db.getBusinessService).mockResolvedValue(service);
    vi.mocked(db.listBusinessResources).mockResolvedValue([resource]);
    vi.mocked(db.isResourceAssignedToService).mockResolvedValue(true);
    vi.mocked(db.createQueueEntry).mockResolvedValue(entry);
    vi.mocked(db.getQueueEntry).mockResolvedValue(entry);
    vi.mocked(db.getQueueEntriesAhead).mockResolvedValue([]);
    vi.mocked(db.getHistoricalAverageDuration).mockResolvedValue({ averageMinutes: null, samples: 0 });
    vi.mocked(db.listAvailableResources).mockResolvedValue([resource]);
    vi.mocked(db.updateQueueEntry).mockResolvedValue(entry);
    vi.mocked(db.listLiveQueue).mockResolvedValue([{ entry, customer: customerContext.user, resource }]);
    vi.mocked(db.createNotification).mockResolvedValue({ id: "notice-1", userId: 11, businessId: "business-1", type: "queue_joined", title: "You joined the queue", message: "Your live queue position is now available.", metadata: null, readAt: null, createdAt: now });
    vi.mocked(db.getBusinessMemberUserIds).mockResolvedValue([]);
    const caller = appRouter.createCaller(customerContext);
    await expect(caller.queue.join({ businessId: "business-1", serviceId: "service-1", resourceId: "resource-1" })).resolves.toMatchObject({ queueEntry: { serviceId: "service-1" }, snapshot: { service: { id: "service-1", name: "Gaming session" } } });
    expect(db.createQueueEntry).toHaveBeenCalledWith(expect.objectContaining({ serviceId: "service-1", resourceId: "resource-1" }));
  });
});
