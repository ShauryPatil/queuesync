import type { Server as HttpServer } from "http";
import { Server, type Socket } from "socket.io";
import { getMember } from "./db";
import { sdk } from "./_core/sdk";
import type { RealtimeEvent } from "../shared/types";

let io: Server | null = null;

function merchantRoom(businessId: string) {
  return `merchant:${businessId}`;
}

function businessRoom(businessId: string) {
  return `business:${businessId}`;
}

function userRoom(userId: number) {
  return `user:${userId}`;
}

async function authenticateSocket(socket: Socket) {
  try {
    return await sdk.authenticateRequest(socket.request as never);
  } catch {
    return null;
  }
}

export function registerRealtimeGateway(server: HttpServer) {
  io = new Server(server, { path: "/api/socket.io", cors: { origin: true, credentials: true } });
  io.use(async (socket, next) => {
    const user = await authenticateSocket(socket);
    socket.data.user = user;
    next();
  });
  io.on("connection", socket => {
    const user = socket.data.user as { id: number } | null;
    if (user) socket.join(userRoom(user.id));
    socket.on("subscribe:merchant", async ({ businessId }: { businessId: string }) => {
      if (!user) return;
      const member = await getMember(businessId, user.id);
      if (member) socket.join(merchantRoom(businessId));
    });
    socket.on("subscribe:business", ({ businessId }: { businessId: string }) => socket.join(businessRoom(businessId)));
    socket.on("unsubscribe:merchant", ({ businessId }: { businessId: string }) => socket.leave(merchantRoom(businessId)));
    socket.on("unsubscribe:business", ({ businessId }: { businessId: string }) => socket.leave(businessRoom(businessId)));
  });
  return io;
}

export function emitMerchantEvent(event: RealtimeEvent) {
  io?.to(merchantRoom(event.businessId)).emit(event.event, event);
}

export function emitPublicBusinessEvent(event: RealtimeEvent) {
  io?.to(businessRoom(event.businessId)).emit(event.event, event);
}

export function emitUserEvent(userId: number, event: RealtimeEvent) {
  io?.to(userRoom(userId)).emit(event.event, event);
}
