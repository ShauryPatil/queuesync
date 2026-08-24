import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { canTransitionQueue, transitionEvent } from "./queue-state";
import { emitMerchantEvent, emitPublicBusinessEvent, emitUserEvent } from "./realtime";
import { deriveWaitEstimate } from "./wait-time";
import type { QueueStatus, RealtimeEventName } from "../shared/types";
import { QUEUE_STAGE_KEYS, resolveQueueStageColors } from "../shared/queueStageColors";

const businessInput = z.object({
  name: z.string().min(2).max(160),
  slug: z.string().min(3).max(180).regex(/^[a-z0-9-]+$/),
  category: z.string().min(2).max(80),
  description: z.string().max(1200).optional(),
  address: z.string().max(500).optional(),
  area: z.string().max(120).optional(),
  phone: z.string().max(40).optional(),
  timezone: z.string().min(3).max(80).default("Asia/Kolkata"),
  defaultServiceDurationMinutes: z.number().int().min(5).max(480).default(30),
});

const resourceInput = z.object({
  name: z.string().min(2).max(160),
  resourceType: z.string().min(2).max(100),
  description: z.string().max(600).optional(),
  capacity: z.number().int().min(1).max(100).default(1),
  configuredServiceDurationMinutes: z.number().int().min(5).max(480).default(30),
  isPublic: z.enum(["yes", "no"]).default("yes"),
});

const serviceInput = z.object({
  name: z.string().min(2).max(160),
  description: z.string().max(600).optional(),
  durationMinutes: z.number().int().min(5).max(480).default(30),
  capacity: z.number().int().min(1).max(100).default(1),
  priceCents: z.number().int().min(0).max(10_000_000).optional(),
});

const queueStageColorsInput = z.object(Object.fromEntries(QUEUE_STAGE_KEYS.map(stage => [stage, z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a six-digit hexadecimal color.")])) as Record<(typeof QUEUE_STAGE_KEYS)[number], z.ZodString>);

function event<T extends Record<string, unknown>>(name: RealtimeEventName, businessId: string, payload: T) {
  return { event: name, businessId, payload, emittedAt: new Date().toISOString() };
}

async function assertBusinessMember(userId: number, role: string, businessId: string) {
  if (role === "admin") return;
  const member = await db.getMember(businessId, userId);
  if (!member) throw new TRPCError({ code: "FORBIDDEN", message: "You are not authorized to access this business." });
}

async function getOwnedResource(businessId: string, resourceId: string) {
  const resources = await db.listBusinessResources(businessId, true);
  const resource = resources.find(candidate => candidate.id === resourceId);
  if (!resource) throw new TRPCError({ code: "NOT_FOUND", message: "Resource not found in this business." });
  return resource;
}

async function getOwnedService(businessId: string, serviceId: string, includeInactive = false) {
  const service = await db.getBusinessService(businessId, serviceId, includeInactive);
  if (!service) throw new TRPCError({ code: "NOT_FOUND", message: "Service not found in this business." });
  return service;
}

async function publishNotification(input: { userId: number; businessId: string; type: string; title: string; message: string; metadata?: Record<string, unknown> }) {
  const notification = await db.createNotification(input);
  emitUserEvent(input.userId, event("notification:created", input.businessId, { notification }));
  return notification;
}

async function publishBusinessNotification(input: { businessId: string; type: string; title: string; message: string; metadata?: Record<string, unknown> }) {
  const members = await db.getBusinessMemberUserIds(input.businessId);
  return Promise.all(members.map(member => publishNotification({ userId: member.userId, ...input })));
}

async function getQueueSnapshot(queueEntryId: string) {
  const entry = await db.getQueueEntry(queueEntryId);
  if (!entry) throw new TRPCError({ code: "NOT_FOUND", message: "Queue entry not found." });
  const business = await db.getBusinessById(entry.businessId);
  if (!business) throw new TRPCError({ code: "NOT_FOUND", message: "Business not found." });
  const service = entry.serviceId ? await db.getBusinessService(entry.businessId, entry.serviceId, true) : undefined;
  const peopleAhead = await db.getQueueEntriesAhead(entry.businessId, entry.joinedAt, entry.id, entry.resourceId ?? undefined);
  const historical = await db.getHistoricalAverageDuration(entry.businessId, entry.resourceId ?? undefined);
  const eligibleResources = await db.listAvailableResources(entry.businessId, entry.resourceId ?? undefined);
  const activeServiceCount = peopleAhead.filter(item => item.status === "called" || item.status === "in_service").length;
  const estimatedWait = deriveWaitEstimate({ peopleAhead: peopleAhead.length, activeServiceCount, availableResourceCount: eligibleResources.length, historicalAverageMinutes: historical.averageMinutes, configuredDurationMinutes: eligibleResources[0]?.configuredServiceDurationMinutes ?? business.defaultServiceDurationMinutes });
  if (entry.status === "waiting" || entry.status === "called") await db.updateQueueEntry(entry.id, { estimatedWaitMinutes: estimatedWait.minutes ?? undefined, estimationBasis: estimatedWait.basis });
  const position = entry.status === "waiting" ? peopleAhead.filter(item => item.status === "waiting" || item.status === "called").length + 1 : null;
  return { queueEntryId: entry.id, businessId: entry.businessId, status: entry.status, position, peopleAhead: peopleAhead.length, estimatedWait, resourceId: entry.resourceId, service: service ? { id: service.id, name: service.name } : null, joinedAt: entry.joinedAt, updatedAt: entry.updatedAt };
}

async function publishWaitTimeUpdates(businessId: string) {
  const entries = await db.listLiveQueue(businessId);
  await Promise.all(entries.map(async ({ entry }) => {
    const snapshot = await getQueueSnapshot(entry.id);
    emitMerchantEvent(event("wait-time:updated", businessId, { snapshot }));
    emitUserEvent(entry.customerId, event("wait-time:updated", businessId, { snapshot }));
  }));
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(ctx.req), maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  businesses: router({
    list: publicProcedure.input(z.object({ category: z.string().optional(), query: z.string().max(160).optional(), availableOnly: z.boolean().optional(), openNow: z.boolean().optional() }).default({})).query(({ input }) => db.listBusinesses(input)),
    mine: protectedProcedure.query(async ({ ctx }) => {
      const all = await db.listBusinesses({});
      const memberships = await Promise.all(all.map(async item => ({ item, member: await db.getMember(item.business.id, ctx.user.id) })));
      return memberships.filter(record => ctx.user.role === "admin" || Boolean(record.member)).map(record => record.item);
    }),
    get: publicProcedure.input(z.object({ businessId: z.string() })).query(async ({ input }) => {
      const business = await db.getBusinessById(input.businessId);
      if (!business || business.isActive !== "active") throw new TRPCError({ code: "NOT_FOUND", message: "Business not found." });
      const [resources, schedules, services, assignments] = await Promise.all([db.listBusinessResources(input.businessId), db.listBusinessSchedules(input.businessId), db.listBusinessServices(input.businessId), db.listResourceServiceLinks(input.businessId)]);
      return { business, resources, schedules, services, assignments };
    }),
    create: protectedProcedure.input(businessInput).mutation(async ({ ctx, input }) => {
      const business = await db.createBusiness({ ownerId: ctx.user.id, ...input });
      await db.setUserRole(ctx.user.id, "merchant");
      await db.createEvent({ businessId: business?.id, actorId: ctx.user.id, eventType: "BUSINESS_CREATED" });
      return business;
    }),
    update: protectedProcedure.input(z.object({ businessId: z.string(), changes: businessInput.partial().omit({ slug: true }) })).mutation(async ({ ctx, input }) => {
      await assertBusinessMember(ctx.user.id, ctx.user.role, input.businessId);
      const business = await db.updateBusiness(input.businessId, input.changes);
      await db.createEvent({ businessId: input.businessId, actorId: ctx.user.id, eventType: "BUSINESS_UPDATED" });
      return business;
    }),
    queueStageColors: protectedProcedure.input(z.object({ businessId: z.string(), colors: queueStageColorsInput })).mutation(async ({ ctx, input }) => {
      await assertBusinessMember(ctx.user.id, ctx.user.role, input.businessId);
      const business = await db.updateBusinessQueueStageColors(input.businessId, resolveQueueStageColors({ queueStageColors: input.colors }));
      await db.createEvent({ businessId: input.businessId, actorId: ctx.user.id, eventType: "QUEUE_STAGE_COLORS_UPDATED", metadata: { queueStageColors: input.colors } });
      return business;
    }),
  }),
  resources: router({
    list: protectedProcedure.input(z.object({ businessId: z.string() })).query(async ({ ctx, input }) => {
      await assertBusinessMember(ctx.user.id, ctx.user.role, input.businessId);
      return db.listBusinessResources(input.businessId, true);
    }),
    create: protectedProcedure.input(z.object({ businessId: z.string(), resource: resourceInput })).mutation(async ({ ctx, input }) => {
      await assertBusinessMember(ctx.user.id, ctx.user.role, input.businessId);
      const resource = await db.createResource({ businessId: input.businessId, ...input.resource });
      await db.createEvent({ businessId: input.businessId, actorId: ctx.user.id, resourceId: resource.id, eventType: "RESOURCE_CREATED" });
      emitMerchantEvent(event("resource:updated", input.businessId, { resource }));
      return resource;
    }),
    update: protectedProcedure.input(z.object({ businessId: z.string(), resourceId: z.string(), changes: resourceInput.partial().extend({ status: z.enum(["available", "busy", "offline", "maintenance"]).optional() }) })).mutation(async ({ ctx, input }) => {
      await assertBusinessMember(ctx.user.id, ctx.user.role, input.businessId);
      await getOwnedResource(input.businessId, input.resourceId);
      const resource = await db.updateResource(input.resourceId, input.changes);
      await db.createEvent({ businessId: input.businessId, actorId: ctx.user.id, resourceId: input.resourceId, eventType: "RESOURCE_STATUS_CHANGED", metadata: { status: resource?.status } });
      emitMerchantEvent(event("resource:updated", input.businessId, { resource }));
      emitPublicBusinessEvent(event("resource:updated", input.businessId, { resource }));
      await publishWaitTimeUpdates(input.businessId);
      return resource;
    }),
  }),
  services: router({
    list: protectedProcedure.input(z.object({ businessId: z.string() })).query(async ({ ctx, input }) => {
      await assertBusinessMember(ctx.user.id, ctx.user.role, input.businessId);
      const [serviceRows, assignments] = await Promise.all([db.listBusinessServices(input.businessId, true), db.listResourceServiceLinks(input.businessId)]);
      return { services: serviceRows, assignments };
    }),
    create: protectedProcedure.input(z.object({ businessId: z.string(), service: serviceInput })).mutation(async ({ ctx, input }) => {
      await assertBusinessMember(ctx.user.id, ctx.user.role, input.businessId);
      const service = await db.createService({ businessId: input.businessId, ...input.service });
      await db.createEvent({ businessId: input.businessId, actorId: ctx.user.id, eventType: "SERVICE_CREATED", metadata: { serviceId: service.id } });
      emitMerchantEvent(event("resource:updated", input.businessId, { service }));
      emitPublicBusinessEvent(event("resource:updated", input.businessId, { service }));
      return service;
    }),
    update: protectedProcedure.input(z.object({ businessId: z.string(), serviceId: z.string(), changes: serviceInput.partial().extend({ status: z.enum(["active", "inactive"]).optional(), priceCents: z.number().int().min(0).max(10_000_000).nullable().optional() }) })).mutation(async ({ ctx, input }) => {
      await assertBusinessMember(ctx.user.id, ctx.user.role, input.businessId);
      await getOwnedService(input.businessId, input.serviceId, true);
      const service = await db.updateService(input.serviceId, input.changes);
      await db.createEvent({ businessId: input.businessId, actorId: ctx.user.id, eventType: "SERVICE_UPDATED", metadata: { serviceId: input.serviceId, status: service?.status } });
      emitMerchantEvent(event("resource:updated", input.businessId, { service }));
      emitPublicBusinessEvent(event("resource:updated", input.businessId, { service }));
      return service;
    }),
    assignResource: protectedProcedure.input(z.object({ businessId: z.string(), serviceId: z.string(), resourceId: z.string() })).mutation(async ({ ctx, input }) => {
      await assertBusinessMember(ctx.user.id, ctx.user.role, input.businessId);
      await Promise.all([getOwnedService(input.businessId, input.serviceId, true), getOwnedResource(input.businessId, input.resourceId)]);
      const assignment = await db.assignServiceToResource(input.resourceId, input.serviceId);
      await db.createEvent({ businessId: input.businessId, actorId: ctx.user.id, resourceId: input.resourceId, eventType: "SERVICE_ASSIGNED_TO_RESOURCE", metadata: { serviceId: input.serviceId } });
      return assignment;
    }),
  }),
  schedules: router({
    list: protectedProcedure.input(z.object({ businessId: z.string() })).query(async ({ ctx, input }) => {
      await assertBusinessMember(ctx.user.id, ctx.user.role, input.businessId);
      return db.listBusinessSchedules(input.businessId);
    }),
    create: protectedProcedure.input(z.object({ businessId: z.string(), resourceId: z.string().optional(), dayOfWeek: z.number().int().min(0).max(6), opensAt: z.string().regex(/^\d{2}:\d{2}$/), closesAt: z.string().regex(/^\d{2}:\d{2}$/), isOpen: z.enum(["yes", "no"]).default("yes") })).mutation(async ({ ctx, input }) => {
      await assertBusinessMember(ctx.user.id, ctx.user.role, input.businessId);
      if (input.resourceId) {
        const resource = await getOwnedResource(input.businessId, input.resourceId);
        if (resource.status !== "available") throw new TRPCError({ code: "CONFLICT", message: "The selected resource is not currently available for the live queue." });
      }
      await db.createSchedule(input);
      await db.createEvent({ businessId: input.businessId, actorId: ctx.user.id, resourceId: input.resourceId, eventType: "SCHEDULE_CREATED" });
      return { success: true };
    }),
  }),
  slots: router({
    listPublic: publicProcedure.input(z.object({ businessId: z.string(), from: z.coerce.date(), to: z.coerce.date(), serviceId: z.string().optional() })).query(({ input }) => db.listSlots(input.businessId, input.from, input.to, input.serviceId)),
    create: protectedProcedure.input(z.object({ businessId: z.string(), resourceId: z.string(), serviceId: z.string().optional(), startsAt: z.coerce.date(), endsAt: z.coerce.date(), capacity: z.number().int().min(1).max(100).default(1), status: z.enum(["available", "blocked", "closed"]).default("available") })).mutation(async ({ ctx, input }) => {
      await assertBusinessMember(ctx.user.id, ctx.user.role, input.businessId);
      if (!input.serviceId) throw new TRPCError({ code: "BAD_REQUEST", message: "Create service-specific booking slots from Manage services so customer bookings retain their service context." });
      await getOwnedResource(input.businessId, input.resourceId);
      await getOwnedService(input.businessId, input.serviceId);
      if (!await db.isResourceAssignedToService(input.resourceId, input.serviceId)) throw new TRPCError({ code: "CONFLICT", message: "Assign this service to the selected resource before publishing a slot." });
      if (input.endsAt <= input.startsAt) throw new TRPCError({ code: "BAD_REQUEST", message: "Slot end time must be after its start time." });
      const slot = await db.createSlot(input);
      await db.createEvent({ businessId: input.businessId, actorId: ctx.user.id, resourceId: input.resourceId, eventType: "SLOT_CREATED", metadata: { slotId: slot.id } });
      return slot;
    }),
  }),
  bookings: router({
    create: protectedProcedure.input(z.object({ businessId: z.string(), resourceId: z.string(), serviceId: z.string().optional(), slotId: z.string(), startsAt: z.coerce.date(), endsAt: z.coerce.date(), notes: z.string().max(800).optional() })).mutation(async ({ ctx, input }) => {
      const business = await db.getBusinessById(input.businessId);
      if (!business || business.isActive !== "active") throw new TRPCError({ code: "NOT_FOUND", message: "Business is not available for booking." });
      const resource = await getOwnedResource(input.businessId, input.resourceId);
      if (resource.status === "offline" || resource.status === "maintenance") throw new TRPCError({ code: "CONFLICT", message: "This resource is not currently bookable." });
      if (input.endsAt <= input.startsAt || input.startsAt <= new Date()) throw new TRPCError({ code: "BAD_REQUEST", message: "Choose a valid future time range." });
      if (input.serviceId) {
        await getOwnedService(input.businessId, input.serviceId);
        if (!await db.isResourceAssignedToService(input.resourceId, input.serviceId)) throw new TRPCError({ code: "CONFLICT", message: "The selected resource cannot provide this service." });
      }
      const slot = await db.getSlot(input.slotId);
      if (!slot || slot.businessId !== input.businessId || slot.resourceId !== input.resourceId || slot.status !== "available" || slot.startsAt.getTime() !== input.startsAt.getTime() || slot.endsAt.getTime() !== input.endsAt.getTime()) throw new TRPCError({ code: "CONFLICT", message: "This booking slot is no longer available. Please choose another time." });
      if (slot.serviceId && slot.serviceId !== input.serviceId) throw new TRPCError({ code: "CONFLICT", message: "Choose a booking slot published for the selected service." });
      if (await db.hasBookingConflict(input)) throw new TRPCError({ code: "CONFLICT", message: "This time slot has just been booked. Please choose another available time." });
      const booking = await db.createBooking({ ...input, customerId: ctx.user.id });
      await db.createEvent({ businessId: input.businessId, actorId: ctx.user.id, resourceId: input.resourceId, bookingId: booking.id, eventType: "BOOKING_CREATED" });
      await publishNotification({ userId: ctx.user.id, businessId: input.businessId, type: "booking_confirmed", title: "Booking confirmed", message: `Your booking with ${business.name} is confirmed.`, metadata: { bookingId: booking.id } });
      await publishBusinessNotification({ businessId: input.businessId, type: "booking_received", title: "New booking received", message: "A customer created a confirmed booking.", metadata: { bookingId: booking.id } });
      emitMerchantEvent(event("booking:created", input.businessId, { booking }));
      return booking;
    }),
    mine: protectedProcedure.query(({ ctx }) => db.listCustomerBookings(ctx.user.id)),
    merchantList: protectedProcedure.input(z.object({ businessId: z.string(), from: z.coerce.date().optional(), to: z.coerce.date().optional() })).query(async ({ ctx, input }) => {
      await assertBusinessMember(ctx.user.id, ctx.user.role, input.businessId);
      return db.listMerchantBookings(input.businessId, input.from, input.to);
    }),
    cancel: protectedProcedure.input(z.object({ bookingId: z.string(), reason: z.string().max(500).optional() })).mutation(async ({ ctx, input }) => {
      const existing = (await db.listCustomerBookings(ctx.user.id)).find(record => record.booking.id === input.bookingId);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found." });
      if (!["pending", "confirmed"].includes(existing.booking.status)) throw new TRPCError({ code: "CONFLICT", message: "This booking can no longer be cancelled." });
      const booking = await db.cancelBooking(input.bookingId, ctx.user.id, input.reason);
      await db.createEvent({ businessId: existing.booking.businessId, actorId: ctx.user.id, resourceId: existing.booking.resourceId, bookingId: input.bookingId, eventType: "BOOKING_CANCELLED" });
      emitMerchantEvent(event("booking:updated", existing.booking.businessId, { booking }));
      return booking;
    }),
  }),
  queue: router({
    join: protectedProcedure.input(z.object({ businessId: z.string(), resourceId: z.string().optional(), serviceId: z.string().optional(), bookingId: z.string().optional(), notes: z.string().max(800).optional() })).mutation(async ({ ctx, input }) => {
      const business = await db.getBusinessById(input.businessId);
      if (!business || business.isActive !== "active") throw new TRPCError({ code: "NOT_FOUND", message: "Business is unavailable." });
      if (!await db.isBusinessOpenNow(input.businessId)) throw new TRPCError({ code: "CONFLICT", message: "This business is currently closed to new queue entries." });
      const booking = input.bookingId ? await db.getCustomerBooking(input.bookingId, ctx.user.id) : undefined;
      if (input.bookingId && (!booking || booking.businessId !== input.businessId || booking.status !== "confirmed")) throw new TRPCError({ code: "NOT_FOUND", message: "A confirmed booking for this business is required." });
      const resourceId = input.resourceId ?? booking?.resourceId ?? undefined;
      const serviceId = input.serviceId ?? booking?.serviceId ?? undefined;
      if (input.resourceId && booking && booking.resourceId !== input.resourceId) throw new TRPCError({ code: "CONFLICT", message: "The selected resource does not match this booking." });
      if (input.serviceId && booking?.serviceId && booking.serviceId !== input.serviceId) throw new TRPCError({ code: "CONFLICT", message: "The selected service does not match this booking." });
      if (resourceId) await getOwnedResource(input.businessId, resourceId);
      if (serviceId) {
        await getOwnedService(input.businessId, serviceId);
        if (!resourceId || !await db.isResourceAssignedToService(resourceId, serviceId)) throw new TRPCError({ code: "CONFLICT", message: "Choose a resource that is configured for this service." });
      }
      const existing = await db.getActiveCustomerQueue(input.businessId, ctx.user.id);
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "You already have an active queue entry for this business." });
      let queueEntry;
      try {
        queueEntry = await db.createQueueEntry({ businessId: input.businessId, resourceId, serviceId, bookingId: input.bookingId, notes: input.notes, customerId: ctx.user.id });
      } catch (error) {
        if ((error as { code?: string }).code === "ER_DUP_ENTRY") throw new TRPCError({ code: "CONFLICT", message: "You already have an active queue entry for this business." });
        throw error;
      }
      const snapshot = await getQueueSnapshot(queueEntry.id);
      await db.createEvent({ businessId: input.businessId, actorId: ctx.user.id, resourceId: input.resourceId, bookingId: input.bookingId, queueEntryId: queueEntry.id, eventType: "QUEUE_JOINED" });
      await publishNotification({ userId: ctx.user.id, businessId: input.businessId, type: "queue_joined", title: "You joined the queue", message: "Your live queue position is now available.", metadata: { queueEntryId: queueEntry.id } });
      await publishBusinessNotification({ businessId: input.businessId, type: "queue_joined", title: "Customer joined the live queue", message: "A customer is waiting for service.", metadata: { queueEntryId: queueEntry.id } });
      emitMerchantEvent(event("queue:joined", input.businessId, { queueEntry, snapshot }));
      emitUserEvent(ctx.user.id, event("queue:updated", input.businessId, { queueEntry, snapshot }));
      await publishWaitTimeUpdates(input.businessId);
      return { queueEntry, snapshot };
    }),
    mine: protectedProcedure.input(z.object({ businessId: z.string() })).query(async ({ ctx, input }) => {
      const entry = await db.getActiveCustomerQueue(input.businessId, ctx.user.id) ?? await db.getLatestCustomerQueue(input.businessId, ctx.user.id);
      return entry ? getQueueSnapshot(entry.id) : null;
    }),
    listLive: protectedProcedure.input(z.object({ businessId: z.string() })).query(async ({ ctx, input }) => {
      await assertBusinessMember(ctx.user.id, ctx.user.role, input.businessId);
      return db.listLiveQueue(input.businessId);
    }),
    transition: protectedProcedure.input(z.object({ queueEntryId: z.string(), to: z.enum(["called", "in_service", "completed", "no_show", "cancelled"]), resourceId: z.string().optional() })).mutation(async ({ ctx, input }) => {
      const entry = await db.getQueueEntry(input.queueEntryId);
      if (!entry) throw new TRPCError({ code: "NOT_FOUND", message: "Queue entry not found." });
      await assertBusinessMember(ctx.user.id, ctx.user.role, entry.businessId);
      const destination = input.to;
      if (!canTransitionQueue(entry.status, destination)) throw new TRPCError({ code: "CONFLICT", message: `Cannot transition from ${entry.status} to ${destination}.` });
      const transition = transitionEvent(entry.status, destination)!;
      const assignedResourceId = input.resourceId ?? entry.resourceId;
      if (destination === "in_service" && !assignedResourceId) throw new TRPCError({ code: "BAD_REQUEST", message: "A resource must be assigned before starting service." });
      if (assignedResourceId) await getOwnedResource(entry.businessId, assignedResourceId);
      const now = new Date();
      const timestampChanges = destination === "called" ? { calledAt: now } : destination === "in_service" ? { startedAt: now } : destination === "completed" ? { completedAt: now } : destination === "no_show" ? { noShowAt: now } : { cancelledAt: now };
      if (destination === "in_service" && assignedResourceId) {
        const reservedResource = await db.reserveAvailableResource(assignedResourceId);
        if (!reservedResource) throw new TRPCError({ code: "CONFLICT", message: "This resource was just assigned elsewhere. Choose another available resource." });
      }
      const queueEntry = await db.transitionQueueEntry(entry.id, entry.status as "waiting" | "called" | "in_service", { status: destination, ...(assignedResourceId ? { resourceId: assignedResourceId } : {}), ...(["completed", "no_show", "cancelled"].includes(destination) ? { activeKey: null } : {}), ...timestampChanges });
      if (!queueEntry) {
        if (destination === "in_service" && assignedResourceId) await db.releaseResource(assignedResourceId);
        throw new TRPCError({ code: "CONFLICT", message: "This queue entry changed before the action could be completed. Refresh the live queue and try again." });
      }
      if (destination === "in_service" && assignedResourceId) {
        await db.createServiceSession({ businessId: entry.businessId, queueEntryId: entry.id, resourceId: assignedResourceId, serviceId: entry.serviceId ?? undefined, customerId: entry.customerId, startedAt: now });
      }
      if (destination === "completed") {
        await db.completeServiceSession(entry.id, now);
        if (assignedResourceId) await db.releaseResource(assignedResourceId);
      }
      await db.createEvent({ businessId: entry.businessId, actorId: ctx.user.id, resourceId: assignedResourceId ?? undefined, bookingId: entry.bookingId ?? undefined, queueEntryId: entry.id, eventType: transition.eventType });
      const snapshot = await getQueueSnapshot(entry.id);
      const notificationText = destination === "called" ? "It is your turn. Please proceed to the service area." : destination === "in_service" ? "Your service has started." : destination === "completed" ? "Your service is complete. Thank you for visiting." : destination === "no_show" ? "Your queue entry was marked as no-show." : "Your queue entry was cancelled.";
      await publishNotification({ userId: entry.customerId, businessId: entry.businessId, type: `queue_${destination}`, title: destination.replace("_", " "), message: notificationText, metadata: { queueEntryId: entry.id } });
      const eventName: RealtimeEventName = destination === "called" ? "queue:called" : destination === "in_service" ? "queue:started" : destination === "completed" ? "queue:completed" : destination === "no_show" ? "queue:no-show" : "queue:cancelled";
      emitMerchantEvent(event(eventName, entry.businessId, { queueEntry, snapshot }));
      emitUserEvent(entry.customerId, event(eventName, entry.businessId, { queueEntry, snapshot }));
      await publishWaitTimeUpdates(entry.businessId);
      return { queueEntry, snapshot };
    }),
    cancelMine: protectedProcedure.input(z.object({ businessId: z.string() })).mutation(async ({ ctx, input }) => {
      const entry = await db.getActiveCustomerQueue(input.businessId, ctx.user.id);
      if (!entry) throw new TRPCError({ code: "NOT_FOUND", message: "You do not have an active queue entry for this business." });
      if (entry.status !== "waiting" && entry.status !== "called") throw new TRPCError({ code: "CONFLICT", message: "A queue entry cannot be cancelled after service has started." });
      const queueEntry = await db.transitionQueueEntry(entry.id, entry.status, { status: "cancelled", activeKey: null, cancelledAt: new Date() });
      if (!queueEntry) throw new TRPCError({ code: "CONFLICT", message: "This queue entry changed before it could be cancelled. Please refresh and try again." });
      await db.createEvent({ businessId: entry.businessId, actorId: ctx.user.id, resourceId: entry.resourceId ?? undefined, bookingId: entry.bookingId ?? undefined, queueEntryId: entry.id, eventType: "QUEUE_CANCELLED" });
      await publishBusinessNotification({ businessId: entry.businessId, type: "queue_cancelled", title: "Customer left the live queue", message: "A customer cancelled their active queue entry.", metadata: { queueEntryId: entry.id } });
      emitMerchantEvent(event("queue:cancelled", entry.businessId, { queueEntry, snapshot: null }));
      emitUserEvent(ctx.user.id, event("queue:cancelled", entry.businessId, { queueEntry, snapshot: null }));
      await publishWaitTimeUpdates(entry.businessId);
      return { queueEntry };
    }),
  }),
  notifications: router({
    list: protectedProcedure.query(({ ctx }) => db.listNotifications(ctx.user.id)),
    markRead: protectedProcedure.input(z.object({ notificationId: z.string() })).mutation(async ({ ctx, input }) => {
      await db.markNotificationRead(input.notificationId, ctx.user.id);
      return { success: true };
    }),
  }),
  profile: router({
    get: protectedProcedure.query(({ ctx }) => db.getProfile(ctx.user.id)),
    update: protectedProcedure.input(z.object({ displayName: z.string().min(2).max(160).optional(), phone: z.string().max(40).optional() })).mutation(({ ctx, input }) => db.updateProfile(ctx.user.id, input)),
  }),
  history: router({
    list: protectedProcedure.input(z.object({ businessId: z.string() })).query(async ({ ctx, input }) => {
      await assertBusinessMember(ctx.user.id, ctx.user.role, input.businessId);
      return db.listEventLogs(input.businessId);
    }),
  }),
  analytics: router({
    get: protectedProcedure.input(z.object({ businessId: z.string(), from: z.coerce.date(), to: z.coerce.date() })).query(async ({ ctx, input }) => {
      await assertBusinessMember(ctx.user.id, ctx.user.role, input.businessId);
      return db.getAnalytics(input.businessId, input.from, input.to);
    }),
  }),
  admin: router({
    platformStatistics: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Administrator access is required." });
      return db.getPlatformStatistics();
    }),
    records: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Administrator access is required." });
      return db.getAdminRecords();
    }),
  }),
});

export type AppRouter = typeof appRouter;
