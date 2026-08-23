import { QUEUE_TRANSITIONS, type QueueStatus } from "../shared/types";

export function transitionEvent(from: QueueStatus, to: QueueStatus) {
  return QUEUE_TRANSITIONS.find(transition => transition.from === from && transition.to === to);
}

export function canTransitionQueue(from: QueueStatus, to: QueueStatus) {
  return Boolean(transitionEvent(from, to));
}
