import { EventEmitter } from "node:events";

// In-process pub/sub for live notification fan-out.
//
// SSE handlers subscribe per userId; the worker / notification service
// publishes when a new notification is created. This works as long as the
// backend runs as a single process. When/if we scale to multiple instances,
// swap this for Redis pub/sub or Postgres LISTEN/NOTIFY without touching
// callers.

const bus = new EventEmitter();
bus.setMaxListeners(0);

function channel(userId: string) {
  return `user:${userId}`;
}

export function publishNotification(userId: string, payload: unknown) {
  bus.emit(channel(userId), payload);
}

export function subscribeNotifications(
  userId: string,
  handler: (payload: unknown) => void,
): () => void {
  const ch = channel(userId);
  bus.on(ch, handler);
  return () => bus.off(ch, handler);
}
