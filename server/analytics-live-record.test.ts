import { describe, expect, it } from "vitest";
import { businesses } from "../drizzle/schema";
import { getAnalytics, getDb } from "./db";

describe("analytics against persisted QueueSync records", () => {
  it("returns a safe analytics payload when a real business is available", async () => {
    const db = await getDb();
    if (!db) return;
    const [business] = await db.select({ id: businesses.id }).from(businesses).limit(1);
    if (!business) return;

    const result = await getAnalytics(business.id, new Date("2026-01-01T00:00:00.000Z"), new Date());

    expect(Array.isArray(result.queueByHour)).toBe(true);
    expect(Array.isArray(result.bookingsByDay)).toBe(true);
    expect(typeof result.totalBookings).toBe("number");
  });
});
