import { describe, expect, it, vi } from "vitest";

const now = new Date("2026-09-01T09:30:00Z");
const resource = { id: "resource-1", businessId: "business-1", name: "Station 1", resourceType: "Station", description: null, capacity: 1, status: "busy" as const, configuredServiceDurationMinutes: 30, isPublic: "yes" as const, createdAt: now, updatedAt: now };
const inService = { id: "queue-1", businessId: "business-1", customerId: 11, resourceId: "resource-1", serviceId: "service-1", bookingId: null, activeKey: "business-1:11", status: "in_service" as const, joinedAt: now, calledAt: now, startedAt: now, completedAt: null, noShowAt: null, cancelledAt: null, estimatedWaitMinutes: null, estimationBasis: null, notes: null, createdAt: now, updatedAt: now };
const completed = { ...inService, status: "completed" as const, activeKey: null, completedAt: now, updatedAt: now };

vi.mock("./db", () => ({
  getQueueEntry: vi.fn(),
  getMember: vi.fn(),
  listBusinessResources: vi.fn(),
  transitionQueueEntry: vi.fn(),
  completeServiceSession: vi.fn(),
  releaseResource: vi.fn(),
  createEvent: vi.fn(),
  getBusinessById: vi.fn(),
  getBusinessService: vi.fn(),
  getQueueEntriesAhead: vi.fn(),
  getHistoricalAverageDuration: vi.fn(),
  listAvailableResources: vi.fn(),
  updateQueueEntry: vi.fn(),
  createNotification: vi.fn(),
  getBusinessMemberUserIds: vi.fn(),
  listLiveQueue: vi.fn(),
}));

import * as db from "./db";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const merchantContext = { user: { id: 7, openId: "merchant-7", name: "Merchant", email: "merchant@example.com", loginMethod: "test", role: "merchant", createdAt: now, updatedAt: now, lastSignedIn: now }, req: { protocol: "https", headers: {} }, res: { clearCookie: vi.fn() } } as unknown as TrpcContext;

describe("QueueSync service-backed completion", () => {
  it("persists completion, releases the resource, records the audit event, and notifies the customer", async () => {
    vi.mocked(db.getQueueEntry).mockResolvedValueOnce(inService).mockResolvedValue(completed);
    vi.mocked(db.getMember).mockResolvedValue({ id: 1, businessId: "business-1", userId: 7, role: "owner", createdAt: now, updatedAt: now });
    vi.mocked(db.listBusinessResources).mockResolvedValue([resource]);
    vi.mocked(db.transitionQueueEntry).mockResolvedValue(completed);
    vi.mocked(db.completeServiceSession).mockResolvedValue({ id: "session-1", businessId: "business-1", queueEntryId: "queue-1", resourceId: "resource-1", serviceId: "service-1", bookingId: null, customerId: 11, startedAt: now, completedAt: now, createdAt: now, updatedAt: now });
    vi.mocked(db.releaseResource).mockResolvedValue({ ...resource, status: "available" });
    vi.mocked(db.getBusinessById).mockResolvedValue({ id: "business-1", ownerId: 7, name: "Real Business", slug: "real-business", category: "Gaming", description: null, address: null, area: null, phone: null, timezone: "Asia/Kolkata", defaultServiceDurationMinutes: 30, settings: null, isActive: "active", createdAt: now, updatedAt: now });
    vi.mocked(db.getBusinessService).mockResolvedValue({ id: "service-1", businessId: "business-1", name: "Gaming session", description: null, durationMinutes: 30, capacity: 1, priceCents: null, status: "active", createdAt: now, updatedAt: now });
    vi.mocked(db.getQueueEntriesAhead).mockResolvedValue([]);
    vi.mocked(db.getHistoricalAverageDuration).mockResolvedValue({ averageMinutes: 30, samples: 1 });
    vi.mocked(db.listAvailableResources).mockResolvedValue([{ ...resource, status: "available" }]);
    vi.mocked(db.updateQueueEntry).mockResolvedValue(completed);
    vi.mocked(db.createNotification).mockResolvedValue({ id: "notice-1", userId: 11, businessId: "business-1", type: "queue_completed", title: "completed", message: "Your service is complete. Thank you for visiting.", metadata: null, readAt: null, createdAt: now });
    vi.mocked(db.getBusinessMemberUserIds).mockResolvedValue([]);
    vi.mocked(db.listLiveQueue).mockResolvedValue([]);
    const caller = appRouter.createCaller(merchantContext);
    await expect(caller.queue.transition({ queueEntryId: "queue-1", to: "completed" })).resolves.toMatchObject({ queueEntry: { status: "completed", serviceId: "service-1" }, snapshot: { status: "completed", service: { name: "Gaming session" } } });
    expect(db.transitionQueueEntry).toHaveBeenCalledWith("queue-1", "in_service", expect.objectContaining({ status: "completed", activeKey: null }));
    expect(db.completeServiceSession).toHaveBeenCalledWith("queue-1", expect.any(Date));
    expect(db.releaseResource).toHaveBeenCalledWith("resource-1");
    expect(db.createEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: "SERVICE_COMPLETED", queueEntryId: "queue-1" }));
    expect(db.createNotification).toHaveBeenCalledWith(expect.objectContaining({ userId: 11, type: "queue_completed" }));
  });
});
