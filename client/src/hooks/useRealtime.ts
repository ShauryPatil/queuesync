import { useEffect, useState } from "react";
import { io } from "socket.io-client";

type QueueSyncRealtimeEvent = {
  event?: string;
  payload?: { notification?: { title?: string; message?: string } };
};

export type RealtimeStatus = "idle" | "connecting" | "connected" | "disconnected";

export function useRealtime(businessId: string | undefined, onEvent: (event?: QueueSyncRealtimeEvent) => void, merchant = false) {
  const [status, setStatus] = useState<RealtimeStatus>("idle");
  useEffect(() => {
    if (!businessId) { setStatus("idle"); return; }
    setStatus("connecting");
    const socket = io(window.location.origin, { path: "/api/socket.io", withCredentials: true });
    const events = ["queue:joined", "queue:updated", "queue:called", "queue:started", "queue:completed", "queue:no-show", "queue:cancelled", "booking:created", "booking:updated", "resource:updated", "wait-time:updated", "notification:created"];
    socket.emit("subscribe:business", { businessId });
    if (merchant) socket.emit("subscribe:merchant", { businessId });
    const handleEvent = (payload: QueueSyncRealtimeEvent) => {
      const notification = payload.payload?.notification;
      if (payload.event === "notification:created" && notification && window.QueueSyncDesktop) window.QueueSyncDesktop.notify(notification.title || "QueueSync", notification.message || "A live operation was updated.");
      onEvent(payload);
    };
    socket.on("connect", () => setStatus("connected"));
    socket.on("disconnect", () => setStatus("disconnected"));
    socket.on("connect_error", () => setStatus("disconnected"));
    events.forEach(event => socket.on(event, handleEvent));
    return () => { socket.emit("unsubscribe:business", { businessId }); if (merchant) socket.emit("unsubscribe:merchant", { businessId }); socket.off("connect"); socket.off("disconnect"); socket.off("connect_error"); events.forEach(event => socket.off(event, handleEvent)); socket.close(); };
  }, [businessId, merchant, onEvent]);
  return status;
}
