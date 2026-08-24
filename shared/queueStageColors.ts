export const QUEUE_STAGE_KEYS = ["waiting", "called", "in_service", "completed", "no_show", "cancelled"] as const;

export type QueueStageKey = (typeof QUEUE_STAGE_KEYS)[number];
export type QueueStageColors = Record<QueueStageKey, string>;

export const DEFAULT_QUEUE_STAGE_COLORS: QueueStageColors = {
  waiting: "#d97706",
  called: "#2563eb",
  in_service: "#0f766e",
  completed: "#16a34a",
  no_show: "#dc2626",
  cancelled: "#64748b",
};

export type QueueStageColorPreset = {
  id: string;
  name: string;
  description: string;
  colors: QueueStageColors;
};

export const QUEUE_STAGE_COLOR_PRESETS: QueueStageColorPreset[] = [
  { id: "queuesync", name: "QueueSync", description: "Balanced for everyday service operations", colors: DEFAULT_QUEUE_STAGE_COLORS },
  { id: "salon-spa", name: "Salon & spa", description: "Warm arrivals and calm treatment moments", colors: { waiting: "#C2410C", called: "#BE185D", in_service: "#9D174D", completed: "#15803D", no_show: "#BE123C", cancelled: "#6B7280" } },
  { id: "clinic-health", name: "Clinic & health", description: "Clear, reassuring clinical states", colors: { waiting: "#A16207", called: "#1D4ED8", in_service: "#0369A1", completed: "#15803D", no_show: "#B91C1C", cancelled: "#64748B" } },
  { id: "food-counter", name: "Food & counter", description: "High-pace service with strong calls", colors: { waiting: "#B45309", called: "#EA580C", in_service: "#C2410C", completed: "#16A34A", no_show: "#DC2626", cancelled: "#6B7280" } },
  { id: "fitness-studio", name: "Fitness & studio", description: "Energetic arrivals and active sessions", colors: { waiting: "#A16207", called: "#7C3AED", in_service: "#0F766E", completed: "#15803D", no_show: "#BE123C", cancelled: "#64748B" } },
  { id: "professional-services", name: "Professional services", description: "Quiet confidence for appointments", colors: { waiting: "#A16207", called: "#4338CA", in_service: "#334155", completed: "#15803D", no_show: "#B91C1C", cancelled: "#64748B" } },
];

export const isValidQueueStageColor = (value: unknown): value is string => typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);

export const queueStageColorsEqual = (left: QueueStageColors, right: QueueStageColors) => QUEUE_STAGE_KEYS.every(stage => left[stage].toUpperCase() === right[stage].toUpperCase());

export function resolveQueueStageColors(settings: Record<string, unknown> | null | undefined): QueueStageColors {
  const configured = settings?.queueStageColors;
  const source = configured && typeof configured === "object" ? configured as Record<string, unknown> : {};
  return QUEUE_STAGE_KEYS.reduce((colors, stage) => ({ ...colors, [stage]: isValidQueueStageColor(source[stage]) ? source[stage] : DEFAULT_QUEUE_STAGE_COLORS[stage] }), {} as QueueStageColors);
}
