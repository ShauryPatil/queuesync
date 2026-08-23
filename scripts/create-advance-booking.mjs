import { eq } from "drizzle-orm";
import { businesses, resources, users } from "../drizzle/schema.ts";
import { getDb } from "../server/db.ts";
import { appRouter } from "../server/routers.ts";

const db = await getDb();
if (!db) throw new Error("QueueSync database is unavailable.");

const [business] = await db.select().from(businesses).limit(1);
if (!business) throw new Error("No existing QueueSync business is available for the requested booking.");

const [resource] = await db.select().from(resources).where(eq(resources.businessId, business.id)).limit(1);
if (!resource) throw new Error("The business has no resource available for the requested booking.");

const [user] = await db.select().from(users).where(eq(users.id, business.ownerId)).limit(1);
if (!user) throw new Error("The business owner account is unavailable.");

const start = new Date(Date.now() + 24 * 60 * 60 * 1000);
start.setUTCMinutes(0, 0, 0);
const end = new Date(start.getTime() + resource.configuredServiceDurationMinutes * 60 * 1000);
const caller = appRouter.createCaller({
  user,
  req: { protocol: "https", headers: {} },
  res: { clearCookie: () => undefined },
});

const slot = await caller.slots.create({
  businessId: business.id,
  resourceId: resource.id,
  startsAt: start,
  endsAt: end,
  capacity: 1,
  status: "available",
});

const booking = await caller.bookings.create({
  businessId: business.id,
  resourceId: resource.id,
  slotId: slot.id,
  startsAt: start,
  endsAt: end,
  notes: "Advance booking created at the user’s request to verify booking analytics.",
});

console.log(JSON.stringify({ slotId: slot.id, bookingId: booking.id, startsAt: start.toISOString(), endsAt: end.toISOString() }));
