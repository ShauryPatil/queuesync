import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({
  getMember: vi.fn(),
  listBusinessResources: vi.fn(),
}));

import * as db from "./db";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function context(userId: number, role: "customer" | "merchant" | "admin" = "merchant") {
  return {
    user: { id: userId, openId: `user-${userId}`, name: "Test User", email: "test@example.com", loginMethod: "test", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} },
    res: { clearCookie: vi.fn() },
  } as unknown as TrpcContext;
}

describe("QueueSync tenant isolation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects a merchant attempting to access another business", async () => {
    vi.mocked(db.getMember).mockResolvedValue(undefined);
    const caller = appRouter.createCaller(context(7));
    await expect(caller.resources.list({ businessId: "business-not-owned" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows access only after business membership is confirmed", async () => {
    vi.mocked(db.getMember).mockResolvedValue({ id: 1, businessId: "owned-business", userId: 7, role: "owner", createdAt: new Date(), updatedAt: new Date() });
    vi.mocked(db.listBusinessResources).mockResolvedValue([]);
    const caller = appRouter.createCaller(context(7));
    await expect(caller.resources.list({ businessId: "owned-business" })).resolves.toEqual([]);
  });
});
