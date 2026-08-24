import { index, int, json, mysqlEnum, mysqlTable, timestamp, unique, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 160 }),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "customer", "merchant", "admin"]).default("customer").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const profiles = mysqlTable("profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique().references(() => users.id),
  displayName: varchar("displayName", { length: 160 }),
  phone: varchar("phone", { length: 40 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const businesses = mysqlTable("businesses", {
  id: varchar("id", { length: 36 }).primaryKey(),
  ownerId: int("ownerId").notNull().references(() => users.id),
  name: varchar("name", { length: 160 }).notNull(),
  slug: varchar("slug", { length: 180 }).notNull().unique(),
  category: varchar("category", { length: 80 }).notNull(),
  description: varchar("description", { length: 1200 }),
  address: varchar("address", { length: 500 }),
  area: varchar("area", { length: 120 }),
  phone: varchar("phone", { length: 40 }),
  timezone: varchar("timezone", { length: 80 }).default("Asia/Kolkata").notNull(),
  defaultServiceDurationMinutes: int("defaultServiceDurationMinutes").default(30).notNull(),
  settings: json("settings").$type<Record<string, unknown> | null>(),
  isActive: mysqlEnum("isActive", ["active", "suspended"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("business_owner_idx").on(table.ownerId), index("business_category_idx").on(table.category)]);

export const businessMembers = mysqlTable("businessMembers", {
  id: int("id").autoincrement().primaryKey(),
  businessId: varchar("businessId", { length: 36 }).notNull().references(() => businesses.id),
  userId: int("userId").notNull().references(() => users.id),
  role: mysqlEnum("role", ["owner", "manager", "staff"]).default("staff").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [unique("business_member_unique").on(table.businessId, table.userId), index("member_user_idx").on(table.userId)]);

export const services = mysqlTable("services", {
  id: varchar("id", { length: 36 }).primaryKey(),
  businessId: varchar("businessId", { length: 36 }).notNull().references(() => businesses.id),
  name: varchar("name", { length: 160 }).notNull(),
  description: varchar("description", { length: 600 }),
  durationMinutes: int("durationMinutes").default(30).notNull(),
  capacity: int("capacity").default(1).notNull(),
  priceCents: int("priceCents"),
  status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("service_business_status_idx").on(table.businessId, table.status), unique("service_business_name_unique").on(table.businessId, table.name)]);

export const resources = mysqlTable("resources", {
  id: varchar("id", { length: 36 }).primaryKey(),
  businessId: varchar("businessId", { length: 36 }).notNull().references(() => businesses.id),
  name: varchar("name", { length: 160 }).notNull(),
  resourceType: varchar("resourceType", { length: 100 }).notNull(),
  description: varchar("description", { length: 600 }),
  capacity: int("capacity").default(1).notNull(),
  status: mysqlEnum("status", ["available", "busy", "offline", "maintenance"]).default("available").notNull(),
  configuredServiceDurationMinutes: int("configuredServiceDurationMinutes").default(30).notNull(),
  isPublic: mysqlEnum("isPublic", ["yes", "no"]).default("yes").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("resource_business_idx").on(table.businessId), unique("resource_business_name_unique").on(table.businessId, table.name)]);

export const resourceServices = mysqlTable("resourceServices", {
  id: int("id").autoincrement().primaryKey(),
  resourceId: varchar("resourceId", { length: 36 }).notNull().references(() => resources.id),
  serviceId: varchar("serviceId", { length: 36 }).notNull().references(() => services.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [unique("resource_service_unique").on(table.resourceId, table.serviceId), index("resource_service_service_idx").on(table.serviceId)]);

export const resourceSchedules = mysqlTable("resourceSchedules", {
  id: int("id").autoincrement().primaryKey(),
  businessId: varchar("businessId", { length: 36 }).notNull().references(() => businesses.id),
  resourceId: varchar("resourceId", { length: 36 }).references(() => resources.id),
  dayOfWeek: int("dayOfWeek").notNull(),
  opensAt: varchar("opensAt", { length: 5 }).notNull(),
  closesAt: varchar("closesAt", { length: 5 }).notNull(),
  isOpen: mysqlEnum("isOpen", ["yes", "no"]).default("yes").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("schedule_business_idx").on(table.businessId), index("schedule_resource_idx").on(table.resourceId)]);

export const slots = mysqlTable("slots", {
  id: varchar("id", { length: 36 }).primaryKey(),
  businessId: varchar("businessId", { length: 36 }).notNull().references(() => businesses.id),
  resourceId: varchar("resourceId", { length: 36 }).notNull().references(() => resources.id),
  serviceId: varchar("serviceId", { length: 36 }).references(() => services.id),
  startsAt: timestamp("startsAt").notNull(),
  endsAt: timestamp("endsAt").notNull(),
  capacity: int("capacity").default(1).notNull(),
  status: mysqlEnum("status", ["available", "blocked", "closed"]).default("available").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [unique("slot_resource_window_unique").on(table.resourceId, table.startsAt, table.endsAt), index("slot_business_time_idx").on(table.businessId, table.startsAt), index("slot_service_idx").on(table.serviceId)]);

export const bookings = mysqlTable("bookings", {
  id: varchar("id", { length: 36 }).primaryKey(),
  businessId: varchar("businessId", { length: 36 }).notNull().references(() => businesses.id),
  customerId: int("customerId").notNull().references(() => users.id),
  resourceId: varchar("resourceId", { length: 36 }).notNull().references(() => resources.id),
  serviceId: varchar("serviceId", { length: 36 }).references(() => services.id),
  slotId: varchar("slotId", { length: 36 }).references(() => slots.id),
  status: mysqlEnum("status", ["pending", "confirmed", "cancelled", "completed", "no_show"]).default("confirmed").notNull(),
  startsAt: timestamp("startsAt").notNull(),
  endsAt: timestamp("endsAt").notNull(),
  bookingCreatedAt: timestamp("bookingCreatedAt").defaultNow().notNull(),
  bookingConfirmedAt: timestamp("bookingConfirmedAt"),
  bookingCancelledAt: timestamp("bookingCancelledAt"),
  bookingRescheduledAt: timestamp("bookingRescheduledAt"),
  bookingCompletedAt: timestamp("bookingCompletedAt"),
  cancellationReason: varchar("cancellationReason", { length: 500 }),
  notes: varchar("notes", { length: 800 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("booking_business_time_idx").on(table.businessId, table.startsAt), index("booking_customer_idx").on(table.customerId, table.startsAt), index("booking_resource_time_idx").on(table.resourceId, table.startsAt), index("booking_service_idx").on(table.serviceId)]);

export const queueEntries = mysqlTable("queueEntries", {
  id: varchar("id", { length: 36 }).primaryKey(),
  businessId: varchar("businessId", { length: 36 }).notNull().references(() => businesses.id),
  customerId: int("customerId").notNull().references(() => users.id),
  resourceId: varchar("resourceId", { length: 36 }).references(() => resources.id),
  serviceId: varchar("serviceId", { length: 36 }).references(() => services.id),
  bookingId: varchar("bookingId", { length: 36 }).references(() => bookings.id),
  activeKey: varchar("activeKey", { length: 80 }),
  status: mysqlEnum("status", ["waiting", "called", "in_service", "completed", "no_show", "cancelled"]).default("waiting").notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
  calledAt: timestamp("calledAt"),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  noShowAt: timestamp("noShowAt"),
  cancelledAt: timestamp("cancelledAt"),
  estimatedWaitMinutes: int("estimatedWaitMinutes"),
  estimationBasis: varchar("estimationBasis", { length: 120 }),
  notes: varchar("notes", { length: 800 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("queue_business_status_idx").on(table.businessId, table.status, table.joinedAt), index("queue_customer_idx").on(table.customerId, table.joinedAt), index("queue_resource_idx").on(table.resourceId, table.status), index("queue_service_idx").on(table.serviceId, table.status), unique("queue_active_customer_unique").on(table.activeKey)]);

export const serviceSessions = mysqlTable("serviceSessions", {
  id: varchar("id", { length: 36 }).primaryKey(),
  businessId: varchar("businessId", { length: 36 }).notNull().references(() => businesses.id),
  queueEntryId: varchar("queueEntryId", { length: 36 }).notNull().unique().references(() => queueEntries.id),
  resourceId: varchar("resourceId", { length: 36 }).notNull().references(() => resources.id),
  serviceId: varchar("serviceId", { length: 36 }).references(() => services.id),
  customerId: int("customerId").notNull().references(() => users.id),
  startedAt: timestamp("startedAt").notNull(),
  completedAt: timestamp("completedAt"),
  durationMinutes: int("durationMinutes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("session_business_time_idx").on(table.businessId, table.startedAt), index("session_resource_idx").on(table.resourceId, table.startedAt), index("session_service_idx").on(table.serviceId, table.startedAt)]);

export const eventLogs = mysqlTable("eventLogs", {
  id: varchar("id", { length: 36 }).primaryKey(),
  businessId: varchar("businessId", { length: 36 }).references(() => businesses.id),
  actorId: int("actorId").references(() => users.id),
  resourceId: varchar("resourceId", { length: 36 }).references(() => resources.id),
  bookingId: varchar("bookingId", { length: 36 }).references(() => bookings.id),
  queueEntryId: varchar("queueEntryId", { length: 36 }).references(() => queueEntries.id),
  eventType: varchar("eventType", { length: 100 }).notNull(),
  metadata: json("metadata").$type<Record<string, unknown> | null>(),
  occurredAt: timestamp("occurredAt").defaultNow().notNull(),
}, table => [index("event_business_time_idx").on(table.businessId, table.occurredAt), index("event_entity_idx").on(table.queueEntryId, table.bookingId)]);

export const notifications = mysqlTable("notifications", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  businessId: varchar("businessId", { length: 36 }).references(() => businesses.id),
  type: varchar("type", { length: 80 }).notNull(),
  title: varchar("title", { length: 160 }).notNull(),
  message: varchar("message", { length: 800 }).notNull(),
  metadata: json("metadata").$type<Record<string, unknown> | null>(),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("notification_user_read_idx").on(table.userId, table.readAt, table.createdAt), index("notification_business_idx").on(table.businessId, table.createdAt)]);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Profile = typeof profiles.$inferSelect;
export type Business = typeof businesses.$inferSelect;
export type BusinessMember = typeof businessMembers.$inferSelect;
export type Service = typeof services.$inferSelect;
export type Resource = typeof resources.$inferSelect;
export type ResourceService = typeof resourceServices.$inferSelect;
export type ResourceSchedule = typeof resourceSchedules.$inferSelect;
export type Slot = typeof slots.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type QueueEntry = typeof queueEntries.$inferSelect;
export type ServiceSession = typeof serviceSessions.$inferSelect;
export type EventLog = typeof eventLogs.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
