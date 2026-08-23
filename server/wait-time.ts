import type { WaitEstimate } from "../shared/types";

export function deriveWaitEstimate(input: { peopleAhead: number; activeServiceCount: number; availableResourceCount: number; historicalAverageMinutes: number | null; configuredDurationMinutes: number }) : WaitEstimate {
  const duration = input.historicalAverageMinutes ?? input.configuredDurationMinutes;
  if (input.availableResourceCount < 1) return { minutes: null, basis: "insufficient_data", message: "No eligible resource is currently available for this queue." };
  if (input.peopleAhead === 0 && input.activeServiceCount === 0) return { minutes: 0, basis: input.historicalAverageMinutes ? "historical" : "configured_fallback", message: input.historicalAverageMinutes ? "Your turn is available based on completed-service history." : "Your turn is available. A configured duration is used until history is available." };
  const workloadMinutes = (input.peopleAhead + input.activeServiceCount) * duration;
  const minutes = Math.max(1, Math.ceil(workloadMinutes / input.availableResourceCount));
  if (input.historicalAverageMinutes) return { minutes, basis: "historical", message: "Estimate is based on live queue workload and completed-service history." };
  return { minutes, basis: "configured_fallback", message: "Estimate uses the configured service duration until sufficient completed-service history exists." };
}
