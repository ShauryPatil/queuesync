import { and, asc, avg, count, desc, eq, gte, inArray, lt, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { nanoid } from "nanoid";
import {
  bookings,
  businesses,
  businessMembers,
  eventLogs,
  notifications,
  profiles,
  queueEntries,
  resources,
  resourceSchedules,
  serviceSessions,
  slots,
  users,
  type InsertUser,
} from "../drizzle/schema";
import { calculateResourceUtilization, roundedMetric } from "./analytics-metrics";

let database: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!database && process.env.DATABASE_URL) database = drizzle(process.env.DATABASE_URL);
  return database;
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database connection is unavailable.");
  return db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  const db = await requireDb();
  const values: InsertUser = { openId: user.openId, lastSignedIn: user.lastSignedIn ?? new Date() };
  const updates: Record<string, unknown> = { lastSignedIn: values.lastSignedIn };
  for (const field of ["name", "email", "loginMethod"] as const) {
    if (user[field] !== undefined) {
      values[field] = user[field];
      updates[field] = user[field];
    }
  }
  if (user.role !== undefined && user.role !== null) {
    values.role = user.role;
    updates.role = user.role;
  }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updates });
  const stored = (await db.select().from(users).where(eq(users.openId, user.openId)).limit(1))[0];
  if (stored) {
    await db.insert(profiles).values({ userId: stored.id, displayName: stored.name ?? undefined }).onDuplicateKeyUpdate({ set: { displayName: stored.name ?? undefined } });
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await requireDb();
  return (await db.select().from(users).where(eq(users.openId, openId)).limit(1))[0];
}

export async function getProfile(userId: number) {
  const db = await requireDb();
  return (await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1))[0];
}

export async function updateProfile(userId: number, changes: { displayName?: string; phone?: string }) {
  const db = await requireDb();
  await db.update(profiles).set(changes).where(eq(profiles.userId, userId));
  if (changes.displayName !== undefined) await db.update(users).set({ name: changes.displayName }).where(eq(users.id, userId));
  return getProfile(userId);
}

export async function setUserRole(userId: number, role: "customer" | "merchant" | "admin") {
  const db = await requireDb();
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

export async function getBusinessById(businessId: string) {
  const db = await requireDb();
  return (await db.select().from(businesses).where(eq(businesses.id, businessId)).limit(1))[0];
}

export async function getMember(businessId: string, userId: number) {
  const db = await requireDb();
  return (await db.select().from(businessMembers).where(and(eq(businessMembers.businessId, businessId), eq(businessMembers.userId, userId))).limit(1))[0];
}

export async function getBusinessMemberUserIds(businessId: string) {
  const db = await requireDb();
  return db.select({ userId: businessMembers.userId }).from(businessMembers).where(eq(businessMembers.businessId, businessId));
}

function scheduleIsOpenNow(schedule: { dayOfWeek: number; opensAt: string; closesAt: string; isOpen: "yes" | "no"; timezone: string }) {
  if (schedule.isOpen !== "yes") return false;
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: schedule.timezone, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
  const token = (type: string) => parts.find(part => part.type === type)?.value ?? "";
  const weekday = ({ Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 } as Record<string, number>)[token("weekday")];
  if (weekday !== schedule.dayOfWeek) return false;
  const now = Number(token("hour")) * 60 + Number(token("minute"));
  const [opensHour, opensMinute] = schedule.opensAt.split(":").map(Number);
  const [closesHour, closesMinute] = schedule.closesAt.split(":").map(Number);
  const opens = opensHour * 60 + opensMinute;
  const closes = closesHour * 60 + closesMinute;
  return closes >= opens ? now >= opens && now < closes : now >= opens || now < closes;
}

export async function listBusinesses(filters: { category?: string; query?: string; availableOnly?: boolean; openNow?: boolean }) {
  const db = await requireDb();
  const conditions = [eq(businesses.isActive, "active")];
  if (filters.category) conditions.push(eq(businesses.category, filters.category));
  const rows = await db.select({ business: businesses, resourceCount: count(resources.id) }).from(businesses).leftJoin(resources, eq(resources.businessId, businesses.id)).where(and(...conditions)).groupBy(businesses.id).orderBy(asc(businesses.name));
  const searched = filters.query ? rows.filter(row => `${row.business.name} ${row.business.category} ${row.business.area ?? ""}`.toLowerCase().includes(filters.query!.toLowerCase())) : rows;
  const openRows = filters.openNow ? await db.select({ businessId: resourceSchedules.businessId, dayOfWeek: resourceSchedules.dayOfWeek, opensAt: resourceSchedules.opensAt, closesAt: resourceSchedules.closesAt, isOpen: resourceSchedules.isOpen, timezone: businesses.timezone }).from(resourceSchedules).innerJoin(businesses, eq(businesses.id, resourceSchedules.businessId)) : [];
  const openBusinessIds = new Set(openRows.filter(scheduleIsOpenNow).map(row => row.businessId));
  const timeFiltered = filters.openNow ? searched.filter(row => openBusinessIds.has(row.business.id)) : searched;
  if (!filters.availableOnly) return timeFiltered;
  const availability = await db.select({ businessId: resources.businessId, available: count(resources.id) }).from(resources).where(eq(resources.status, "available")).groupBy(resources.businessId);
  const availableIds = new Set(availability.filter(row => Number(row.available) > 0).map(row => row.businessId));
  return timeFiltered.filter(row => availableIds.has(row.business.id));
}

export async function listBusinessResources(businessId: string, includePrivate = false) {
  const db = await requireDb();
  return db.select().from(resources).where(includePrivate ? eq(resources.businessId, businessId) : and(eq(resources.businessId, businessId), eq(resources.isPublic, "yes"))).orderBy(asc(resources.name));
}

export async function listBusinessSchedules(businessId: string) {
  const db = await requireDb();
  return db.select().from(resourceSchedules).where(eq(resourceSchedules.businessId, businessId)).orderBy(asc(resourceSchedules.dayOfWeek));
}

export async function listSlots(businessId: string, from: Date, to: Date) {
  const db = await requireDb();
  return db.select({ slot: slots, resource: resources }).from(slots).innerJoin(resources, eq(resources.id, slots.resourceId)).where(and(eq(slots.businessId, businessId), gte(slots.startsAt, from), lte(slots.endsAt, to), eq(slots.status, "available"))).orderBy(asc(slots.startsAt));
}

export async function createBusiness(input: { ownerId: number; name: string; slug: string; category: string; description?: string; address?: string; area?: string; phone?: string; timezone: string; defaultServiceDurationMinutes: number }) {
  const db = await requireDb();
  const businessId = nanoid(20);
  await db.insert(businesses).values({ id: businessId, ownerId: input.ownerId, name: input.name, slug: input.slug, category: input.category, description: input.description, address: input.address, area: input.area, phone: input.phone, timezone: input.timezone, defaultServiceDurationMinutes: input.defaultServiceDurationMinutes });
  await db.insert(businessMembers).values({ businessId, userId: input.ownerId, role: "owner" });
  return getBusinessById(businessId);
}

export async function updateBusiness(businessId: string, changes: Partial<{ name: string; category: string; description: string; address: string; area: string; phone: string; timezone: string; defaultServiceDurationMinutes: number; isActive: "active" | "suspended" }>) {
  const db = await requireDb();
  await db.update(businesses).set(changes).where(eq(businesses.id, businessId));
  return getBusinessById(businessId);
}

export async function createResource(input: { businessId: string; name: string; resourceType: string; description?: string; capacity: number; configuredServiceDurationMinutes: number; isPublic: "yes" | "no" }) {
  const db = await requireDb();
  const resourceId = nanoid(20);
  await db.insert(resources).values({ id: resourceId, ...input, status: "available" });
  return (await db.select().from(resources).where(eq(resources.id, resourceId)).limit(1))[0];
}

export async function updateResource(resourceId: string, changes: Partial<{ name: string; resourceType: string; description: string; capacity: number; status: "available" | "busy" | "offline" | "maintenance"; configuredServiceDurationMinutes: number; isPublic: "yes" | "no" }>) {
  const db = await requireDb();
  await db.update(resources).set(changes).where(eq(resources.id, resourceId));
  return (await db.select().from(resources).where(eq(resources.id, resourceId)).limit(1))[0];
}

export async function createSchedule(input: { businessId: string; resourceId?: string; dayOfWeek: number; opensAt: string; closesAt: string; isOpen: "yes" | "no" }) {
  const db = await requireDb();
  await db.insert(resourceSchedules).values(input);
}

export async function createSlot(input: { businessId: string; resourceId: string; startsAt: Date; endsAt: Date; capacity: number; status: "available" | "blocked" | "closed" }) {
  const db = await requireDb();
  const slotId = nanoid(20);
  await db.insert(slots).values({ id: slotId, ...input });
  return (await db.select().from(slots).where(eq(slots.id, slotId)).limit(1))[0];
}

export async function hasBookingConflict(input: { resourceId: string; startsAt: Date; endsAt: Date; excludeBookingId?: string }) {
  const db = await requireDb();
  const conditions = [eq(bookings.resourceId, input.resourceId), inArray(bookings.status, ["pending", "confirmed"]), lt(bookings.startsAt, input.endsAt), sql`${bookings.endsAt} > ${input.startsAt}`];
  if (input.excludeBookingId) conditions.push(sql`${bookings.id} <> ${input.excludeBookingId}`);
  const conflicting = await db.select({ id: bookings.id }).from(bookings).where(and(...conditions)).limit(1);
  return conflicting.length > 0;
}

export async function createBooking(input: { businessId: string; customerId: number; resourceId: string; slotId?: string; startsAt: Date; endsAt: Date; notes?: string }) {
  const db = await requireDb();
  const bookingId = nanoid(20);
  const now = new Date();
  await db.insert(bookings).values({ id: bookingId, ...input, status: "confirmed", bookingConfirmedAt: now });
  return (await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1))[0];
}

export async function listCustomerBookings(customerId: number) {
  const db = await requireDb();
  return db.select({ booking: bookings, business: businesses, resource: resources }).from(bookings).innerJoin(businesses, eq(businesses.id, bookings.businessId)).innerJoin(resources, eq(resources.id, bookings.resourceId)).where(eq(bookings.customerId, customerId)).orderBy(desc(bookings.startsAt));
}

export async function listMerchantBookings(businessId: string, from?: Date, to?: Date) {
  const db = await requireDb();
  const conditions = [eq(bookings.businessId, businessId)];
  if (from) conditions.push(gte(bookings.startsAt, from));
  if (to) conditions.push(lte(bookings.startsAt, to));
  return db.select({ booking: bookings, customer: users, resource: resources }).from(bookings).innerJoin(users, eq(users.id, bookings.customerId)).innerJoin(resources, eq(resources.id, bookings.resourceId)).where(and(...conditions)).orderBy(asc(bookings.startsAt));
}

export async function cancelBooking(bookingId: string, customerId: number, reason?: string) {
  const db = await requireDb();
  await db.update(bookings).set({ status: "cancelled", bookingCancelledAt: new Date(), cancellationReason: reason }).where(and(eq(bookings.id, bookingId), eq(bookings.customerId, customerId), inArray(bookings.status, ["pending", "confirmed"])));
  return (await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1))[0];
}

export async function getQueueEntry(queueEntryId: string) {
  const db = await requireDb();
  return (await db.select().from(queueEntries).where(eq(queueEntries.id, queueEntryId)).limit(1))[0];
}

export async function getActiveCustomerQueue(businessId: string, customerId: number) {
  const db = await requireDb();
  return (await db.select().from(queueEntries).where(and(eq(queueEntries.businessId, businessId), eq(queueEntries.customerId, customerId), inArray(queueEntries.status, ["waiting", "called", "in_service"]))).orderBy(desc(queueEntries.joinedAt)).limit(1))[0];
}

export async function createQueueEntry(input: { businessId: string; customerId: number; resourceId?: string; bookingId?: string; notes?: string }) {
  const db = await requireDb();
  const queueEntryId = nanoid(20);
  await db.insert(queueEntries).values({ id: queueEntryId, ...input, status: "waiting" });
  return getQueueEntry(queueEntryId);
}

export async function listLiveQueue(businessId: string) {
  const db = await requireDb();
  return db.select({ entry: queueEntries, customer: users, resource: resources }).from(queueEntries).innerJoin(users, eq(users.id, queueEntries.customerId)).leftJoin(resources, eq(resources.id, queueEntries.resourceId)).where(and(eq(queueEntries.businessId, businessId), inArray(queueEntries.status, ["waiting", "called", "in_service"]))).orderBy(asc(queueEntries.joinedAt));
}

export async function updateQueueEntry(queueEntryId: string, changes: Partial<{ status: "waiting" | "called" | "in_service" | "completed" | "no_show" | "cancelled"; resourceId: string; calledAt: Date; startedAt: Date; completedAt: Date; noShowAt: Date; cancelledAt: Date; estimatedWaitMinutes: number; estimationBasis: string }>) {
  const db = await requireDb();
  await db.update(queueEntries).set(changes).where(eq(queueEntries.id, queueEntryId));
  return getQueueEntry(queueEntryId);
}

export async function createServiceSession(input: { businessId: string; queueEntryId: string; resourceId: string; customerId: number; startedAt: Date }) {
  const db = await requireDb();
  const sessionId = nanoid(20);
  await db.insert(serviceSessions).values({ id: sessionId, ...input });
  return (await db.select().from(serviceSessions).where(eq(serviceSessions.id, sessionId)).limit(1))[0];
}

export async function completeServiceSession(queueEntryId: string, completedAt: Date) {
  const db = await requireDb();
  const current = (await db.select().from(serviceSessions).where(eq(serviceSessions.queueEntryId, queueEntryId)).limit(1))[0];
  if (!current) return undefined;
  const durationMinutes = Math.max(1, Math.ceil((completedAt.getTime() - current.startedAt.getTime()) / 60000));
  await db.update(serviceSessions).set({ completedAt, durationMinutes }).where(eq(serviceSessions.id, current.id));
  return (await db.select().from(serviceSessions).where(eq(serviceSessions.id, current.id)).limit(1))[0];
}

export async function getHistoricalAverageDuration(businessId: string, resourceId?: string) {
  const db = await requireDb();
  const conditions = [eq(serviceSessions.businessId, businessId), sql`${serviceSessions.durationMinutes} IS NOT NULL`];
  if (resourceId) conditions.push(eq(serviceSessions.resourceId, resourceId));
  const row = (await db.select({ average: avg(serviceSessions.durationMinutes), samples: count(serviceSessions.id) }).from(serviceSessions).where(and(...conditions)))[0];
  return { averageMinutes: row?.average ? Math.round(Number(row.average)) : null, samples: Number(row?.samples ?? 0) };
}

export async function getQueueEntriesAhead(businessId: string, joinedAt: Date, resourceId?: string) {
  const db = await requireDb();
  const conditions = [eq(queueEntries.businessId, businessId), lt(queueEntries.joinedAt, joinedAt), inArray(queueEntries.status, ["waiting", "called", "in_service"])];
  if (resourceId) conditions.push(sql`(${queueEntries.resourceId} = ${resourceId} OR ${queueEntries.resourceId} IS NULL)`);
  return db.select().from(queueEntries).where(and(...conditions)).orderBy(asc(queueEntries.joinedAt));
}

export async function listAvailableResources(businessId: string, resourceId?: string) {
  const db = await requireDb();
  return db.select().from(resources).where(resourceId ? and(eq(resources.businessId, businessId), eq(resources.id, resourceId), inArray(resources.status, ["available", "busy"])) : and(eq(resources.businessId, businessId), inArray(resources.status, ["available", "busy"])));
}

export async function createEvent(input: { businessId?: string; actorId?: number; resourceId?: string; bookingId?: string; queueEntryId?: string; eventType: string; metadata?: Record<string, unknown> }) {
  const db = await requireDb();
  await db.insert(eventLogs).values({ id: nanoid(20), ...input });
}

export async function createNotification(input: { userId: number; businessId?: string; type: string; title: string; message: string; metadata?: Record<string, unknown> }) {
  const db = await requireDb();
  const notificationId = nanoid(20);
  await db.insert(notifications).values({ id: notificationId, ...input });
  return (await db.select().from(notifications).where(eq(notifications.id, notificationId)).limit(1))[0];
}

export async function listNotifications(userId: number) {
  const db = await requireDb();
  return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
}

export async function markNotificationRead(notificationId: string, userId: number) {
  const db = await requireDb();
  await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
}

export async function listEventLogs(businessId: string, limit = 80) {
  const db = await requireDb();
  return db.select({ event: eventLogs, actor: users }).from(eventLogs).leftJoin(users, eq(users.id, eventLogs.actorId)).where(eq(eventLogs.businessId, businessId)).orderBy(desc(eventLogs.occurredAt)).limit(limit);
}

export async function getAnalytics(businessId: string, from: Date, to: Date) {
  const db = await requireDb();
  const bookingSummary = (await db.select({ total: count(bookings.id), confirmed: sql<number>`SUM(CASE WHEN ${bookings.status} = 'confirmed' THEN 1 ELSE 0 END)`, completed: sql<number>`SUM(CASE WHEN ${bookings.status} = 'completed' THEN 1 ELSE 0 END)`, cancelled: sql<number>`SUM(CASE WHEN ${bookings.status} = 'cancelled' THEN 1 ELSE 0 END)`, noShows: sql<number>`SUM(CASE WHEN ${bookings.status} = 'no_show' THEN 1 ELSE 0 END)` }).from(bookings).where(and(eq(bookings.businessId, businessId), gte(bookings.createdAt, from), lte(bookings.createdAt, to))))[0];
  const queueSummary = (await db.select({ averageWait: sql<number | null>`AVG(CASE WHEN ${queueEntries.calledAt} IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, ${queueEntries.joinedAt}, ${queueEntries.calledAt}) END)`, volume: count(queueEntries.id), noShows: sql<number>`SUM(CASE WHEN ${queueEntries.status} = 'no_show' THEN 1 ELSE 0 END)` }).from(queueEntries).where(and(eq(queueEntries.businessId, businessId), gte(queueEntries.joinedAt, from), lte(queueEntries.joinedAt, to))))[0];
  const serviceSummary = (await db.select({ averageDuration: avg(serviceSessions.durationMinutes), completed: count(serviceSessions.id), totalDuration: sql<number>`COALESCE(SUM(${serviceSessions.durationMinutes}), 0)` }).from(serviceSessions).where(and(eq(serviceSessions.businessId, businessId), gte(serviceSessions.startedAt, from), lte(serviceSessions.startedAt, to), sql`${serviceSessions.completedAt} IS NOT NULL`)))[0];
  const resourceCount = (await db.select({ total: count(resources.id) }).from(resources).where(eq(resources.businessId, businessId)))[0];
  const totalResources = Number(resourceCount?.total ?? 0);
  const utilization = calculateResourceUtilization(Number(serviceSummary?.totalDuration ?? 0), totalResources, from, to);
  const queueRows = await db.select({ joinedAt: queueEntries.joinedAt }).from(queueEntries).where(and(eq(queueEntries.businessId, businessId), gte(queueEntries.joinedAt, from), lte(queueEntries.joinedAt, to)));
  const bookingRows = await db.select({ createdAt: bookings.createdAt }).from(bookings).where(and(eq(bookings.businessId, businessId), gte(bookings.createdAt, from), lte(bookings.createdAt, to)));
  const queueByHour = Array.from(queueRows.reduce((volumes, row) => { const hour = row.joinedAt.getUTCHours(); volumes.set(hour, (volumes.get(hour) ?? 0) + 1); return volumes; }, new Map<number, number>()).entries()).sort(([left], [right]) => left - right).map(([hour, volume]) => ({ hour, volume }));
  const bookingsByDay = Array.from(bookingRows.reduce((volumes, row) => { const day = row.createdAt.toISOString().slice(0, 10); volumes.set(day, (volumes.get(day) ?? 0) + 1); return volumes; }, new Map<string, number>()).entries()).sort(([left], [right]) => left.localeCompare(right)).map(([day, volume]) => ({ day, volume }));
  return { totalBookings: Number(bookingSummary?.total ?? 0), confirmedBookings: Number(bookingSummary?.confirmed ?? 0), completedServices: Number(serviceSummary?.completed ?? 0), cancelledBookings: Number(bookingSummary?.cancelled ?? 0), noShows: Number(queueSummary?.noShows ?? bookingSummary?.noShows ?? 0), averageWaitMinutes: roundedMetric(queueSummary?.averageWait), averageServiceDurationMinutes: roundedMetric(serviceSummary?.averageDuration), currentQueueLength: (await db.select({ total: count(queueEntries.id) }).from(queueEntries).where(and(eq(queueEntries.businessId, businessId), inArray(queueEntries.status, ["waiting", "called", "in_service"]))))[0]?.total ?? 0, resourceUtilizationPercent: utilization, queueByHour, bookingsByDay };
}

export async function getPlatformStatistics() {
  const db = await requireDb();
  const [userCount, businessCount, liveQueueCount, bookingCount] = await Promise.all([
    db.select({ total: count(users.id) }).from(users),
    db.select({ total: count(businesses.id) }).from(businesses),
    db.select({ total: count(queueEntries.id) }).from(queueEntries).where(inArray(queueEntries.status, ["waiting", "called", "in_service"])),
    db.select({ total: count(bookings.id) }).from(bookings),
  ]);
  return { users: Number(userCount[0]?.total ?? 0), businesses: Number(businessCount[0]?.total ?? 0), liveQueueEntries: Number(liveQueueCount[0]?.total ?? 0), bookings: Number(bookingCount[0]?.total ?? 0) };
}

export async function getAdminRecords() {
  const db = await requireDb();
  const [accountRows, businessRows] = await Promise.all([
    db.select({ id: users.id, name: users.name, email: users.email, role: users.role, createdAt: users.createdAt, lastSignedIn: users.lastSignedIn }).from(users).orderBy(desc(users.createdAt)).limit(100),
    db.select({ business: businesses, owner: users }).from(businesses).innerJoin(users, eq(users.id, businesses.ownerId)).orderBy(desc(businesses.createdAt)).limit(100),
  ]);
  return { accounts: accountRows, businesses: businessRows };
}
