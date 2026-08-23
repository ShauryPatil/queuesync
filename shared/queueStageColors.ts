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

export const isValidQueueStageColor = (value: unknown): value is string => typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);

export function resolveQueueStageColors(settings: Record<string, unknown> | null | undefined): QueueStageColors {
  const configured = settings?.queueStageColors;
  const source = configured && typeof configured === "object" ? configured as Record<string, unknown> : {};
  return QUEUE_STAGE_KEYS.reduce((colors, stage) => ({ ...colors, [stage]: isValidQueueStageColor(source[stage]) ? source[stage] : DEFAULT_QUEUE_STAGE_COLORS[stage] }), {} as QueueStageColors);
}
