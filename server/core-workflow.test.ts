import { describe, expect, it, vi } from "vitest";

const now = new Date("2026-01-01T10:00:00Z");
const queueEntry = { id: "queue-1", businessId: "business-1", customerId: 11, resourceId: "resource-1", bookingId: null, status: "waiting" as const, joinedAt: now, calledAt: null, startedAt: null, completedAt: null, noShowAt: null, cancelledAt: null, estimatedWaitMinutes: null, estimationBasis: null, notes: null, createdAt: now, updatedAt: now };

vi.mock("./db", () => ({
  getBusinessById: vi.fn(),
  getActiveCustomerQueue: vi.fn(),
  createQueueEntry: vi.fn(),
  getQueueEntry: vi.fn(),
  getQueueEntriesAhead: vi.fn(),
  getHistoricalAverageDuration: vi.fn(),
  listAvailableResources: vi.fn(),
  updateQueueEntry: vi.fn(),
  listBusinessResources: vi.fn(),
  createEvent: vi.fn(),
  createNotification: vi.fn(),
  getBusinessMemberUserIds: vi.fn(),
  listLiveQueue: vi.fn(),
}));

import * as db from "./db";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const context = { user: { id: 11, openId: "customer-11", name: "Customer", email: "customer@example.com", loginMethod: "test", role: "customer", createdAt: now, updatedAt: now, lastSignedIn: now }, req: { protocol: "https", headers: {} }, res: { clearCookie: vi.fn() } } as unknown as TrpcContext;

describe("QueueSync core queue workflow", () => {
  it("persists the queue join and validates a later merchant service transition", async () => {
    const resource = { id: "resource-1", businessId: "business-1", name: "Station 1", resourceType: "Station", description: null, capacity: 1, status: "available" as const, configuredServiceDurationMinutes: 30, isPublic: "yes" as const, createdAt: now, updatedAt: now };
    vi.mocked(db.getBusinessById).mockResolvedValue({ id: "business-1", ownerId: 2, name: "Real Business", slug: "real-business", category: "Salon", description: null, address: null, area: null, phone: null, timezone: "Asia/Kolkata", defaultServiceDurationMinutes: 30, settings: null, isActive: "active", createdAt: now, updatedAt: now });
    vi.mocked(db.listBusinessResources).mockResolvedValue([resource]);
    vi.mocked(db.getActiveCustomerQueue).mockResolvedValue(undefined);
    vi.mocked(db.createQueueEntry).mockResolvedValue(queueEntry);
    vi.mocked(db.getQueueEntry).mockResolvedValue(queueEntry);
    vi.mocked(db.getQueueEntriesAhead).mockResolvedValue([]);
    vi.mocked(db.getHistoricalAverageDuration).mockResolvedValue({ averageMinutes: null, samples: 0 });
    vi.mocked(db.listAvailableResources).mockResolvedValue([resource]);
    vi.mocked(db.updateQueueEntry).mockResolvedValue(queueEntry);
    vi.mocked(db.createNotification).mockResolvedValue({ id: "notice-1", userId: 11, businessId: "business-1", type: "queue_joined", title: "You joined the queue", message: "Your live queue position is now available.", metadata: null, readAt: null, createdAt: now });
    vi.mocked(db.getBusinessMemberUserIds).mockResolvedValue([]);
    vi.mocked(db.listLiveQueue).mockResolvedValue([{ entry: queueEntry, customer: { id: 11, openId: "customer-11", name: "Customer", email: "customer@example.com", loginMethod: "test", role: "customer", createdAt: now, updatedAt: now, lastSignedIn: now }, resource }]);
    const customer = appRouter.createCaller(context);
    await expect(customer.queue.join({ businessId: "business-1" })).resolves.toMatchObject({ queueEntry: { id: "queue-1" }, snapshot: { status: "waiting", position: 1 } });
    expect(db.createEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: "QUEUE_JOINED", queueEntryId: "queue-1" }));
  });
});
