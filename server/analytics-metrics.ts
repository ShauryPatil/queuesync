export function calculateResourceUtilization(totalDurationMinutes: number, resourceCount: number, from: Date, to: Date) {
  const periodMinutes = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / 60000));
  if (resourceCount < 1 || totalDurationMinutes < 1) return null;
  return Math.min(100, Math.round((totalDurationMinutes / (periodMinutes * resourceCount)) * 100));
}

export function roundedMetric(value: number | string | null | undefined) {
  return value === null || value === undefined ? null : Math.round(Number(value));
}
