export const USER_ROLES = ["customer", "merchant", "admin"] as const;
export const MEMBER_ROLES = ["owner", "manager", "staff"] as const;
export const RESOURCE_STATUSES = ["available", "busy", "offline", "maintenance"] as const;
export const BOOKING_STATUSES = ["pending", "confirmed", "cancelled", "completed", "no_show"] as const;
export const QUEUE_STATUSES = ["waiting", "called", "in_service", "completed", "no_show", "cancelled"] as const;

export type UserRole = (typeof USER_ROLES)[number];
export type MemberRole = (typeof MEMBER_ROLES)[number];
export type ResourceStatus = (typeof RESOURCE_STATUSES)[number];
export type BookingStatus = (typeof BOOKING_STATUSES)[number];
export type QueueStatus = (typeof QUEUE_STATUSES)[number];

export type QueueTransition = {
  from: QueueStatus;
  to: QueueStatus;
  eventType: string;
};

export const QUEUE_TRANSITIONS: QueueTransition[] = [
  { from: "waiting", to: "called", eventType: "QUEUE_CALLED" },
  { from: "waiting", to: "no_show", eventType: "NO_SHOW" },
  { from: "waiting", to: "cancelled", eventType: "QUEUE_CANCELLED" },
  { from: "called", to: "in_service", eventType: "SERVICE_STARTED" },
  { from: "called", to: "no_show", eventType: "NO_SHOW" },
  { from: "called", to: "cancelled", eventType: "QUEUE_CANCELLED" },
  { from: "in_service", to: "completed", eventType: "SERVICE_COMPLETED" },
];

export type WaitEstimate = {
  minutes: number | null;
  basis: "historical" | "configured_fallback" | "insufficient_data";
  message: string;
};

export type QueueSnapshot = {
  queueEntryId: string;
  businessId: string;
  status: QueueStatus;
  position: number | null;
  peopleAhead: number;
  estimatedWait: WaitEstimate;
};

export type RealtimeEventName =
  | "queue:joined"
  | "queue:updated"
  | "queue:called"
  | "queue:started"
  | "queue:completed"
  | "queue:no-show"
  | "queue:cancelled"
  | "booking:created"
  | "booking:updated"
  | "resource:updated"
  | "wait-time:updated"
  | "notification:created";

export type RealtimeEvent<T = Record<string, unknown>> = {
  event: RealtimeEventName;
  businessId: string;
  payload: T;
  emittedAt: string;
};
