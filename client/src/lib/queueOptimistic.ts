export type QueueTransitionTarget = "called" | "in_service" | "completed" | "no_show" | "cancelled";

type QueueRow = {
  entry: {
    id: string;
    status: string;
    resourceId: string | null;
  };
  resource?: {
    id: string;
    name: string;
  } | null;
};

export function applyOptimisticQueueTransition<T extends QueueRow>(
  entries: T[] | undefined,
  input: { queueEntryId: string; to: QueueTransitionTarget; resourceId?: string; resource?: { id: string; name: string } },
): T[] | undefined {
  if (!entries) return entries;
  if (input.to === "completed" || input.to === "no_show" || input.to === "cancelled") {
    return entries.filter(item => item.entry.id !== input.queueEntryId);
  }
  return entries.map(item => item.entry.id === input.queueEntryId
    ? { ...item, entry: { ...item.entry, status: input.to, resourceId: input.resourceId ?? item.entry.resourceId }, resource: input.resource ?? item.resource }
    : item,
  ) as T[];
}
