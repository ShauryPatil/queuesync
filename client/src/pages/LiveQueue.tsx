import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Clock3, Radio, Sparkles, UsersRound } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import CustomerNav from "@/components/CustomerNav";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useRealtime } from "@/hooks/useRealtime";
import { Link } from "wouter";
import LiveFlow from "@/components/LiveFlow";
import { MotionReveal } from "@/components/MotionReveal";
import { CustomerExperienceSurface } from "@/components/ExperienceSurface";

type QueueSnapshot = {
  status: string;
  position: number | null;
  peopleAhead: number;
  estimatedWait: { minutes: number | null; basis: string; message: string };
};

function LiveQueueContent() {
  const [businessId, setBusinessId] = useState<string | null>(null);
  useEffect(() => setBusinessId(sessionStorage.getItem("queuesync-active-business")), []);
  const queue = trpc.queue.mine.useQuery({ businessId: businessId ?? "" }, { enabled: Boolean(businessId) });
  const invalidate = useCallback(() => { queue.refetch(); }, [queue]);
  useRealtime(businessId ?? undefined, invalidate);
  const snapshot = queue.data;
  return <div className="min-h-screen overflow-x-clip mesh-bg"><CustomerNav /><main className="container max-w-5xl py-8 sm:py-12"><MotionReveal><div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><div className="section-kicker">Your live queue</div><h1 className="display-font mt-4 max-w-2xl text-[clamp(2.5rem,6vw,4.4rem)] font-bold leading-[.96] tracking-[-.07em]">Your place is always clear.</h1><p className="mt-4 max-w-xl leading-7 text-muted-foreground">Position and wait context are recalculated from real queue and resource activity. No page refresh is needed.</p></div><div className="inline-flex w-fit items-center gap-2 rounded-full border bg-card px-3.5 py-2 text-xs font-bold text-muted-foreground shadow-sm"><i className="status-dot status-dot-pulse" />Live updates</div></div></MotionReveal>{!businessId ? <QueueEmpty title="No active queue selected." detail="Join a business queue to place its actual, live status here." href="/explore" action="Explore businesses" /> : queue.isLoading ? <QueueSkeleton /> : snapshot ? <QueueFocus snapshot={snapshot} /> : <QueueEmpty title="No active entry for this business." detail="The queue may have ended, or you can join a new live queue from the business page." href={`/business/${businessId}`} action="Open business" />}</main></div>;
}

export default function LiveQueue() { return <CustomerExperienceSurface page="queue"><LiveQueueContent /></CustomerExperienceSurface>; }

function QueueFocus({ snapshot }: { snapshot: QueueSnapshot }) {
  const reducedMotion = useReducedMotion();
  const position = snapshot.position;
  const ahead = snapshot.peopleAhead;
  const estimate = snapshot.estimatedWait.minutes;
  return <MotionReveal className="mt-7"><section className="surface-card overflow-hidden rounded-[1.85rem]"><div className="relative overflow-hidden bg-primary px-6 py-7 text-primary-foreground sm:px-8 sm:py-9"><div className="absolute -right-10 -top-12 h-48 w-48 rounded-full border-[22px] border-primary-foreground/10" /><div className="relative flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-extrabold uppercase tracking-[.16em] text-primary-foreground/70">Current queue state</p><p className="mt-2 text-2xl font-bold capitalize sm:text-3xl">{snapshot.status.replace("_", " ")}</p><p className="mt-3 max-w-md text-sm leading-6 text-primary-foreground/80">This view updates from the same operational event a merchant sees in their workspace.</p></div><span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/15"><span className="absolute inset-0 rounded-2xl border border-white/20 motion-safe:animate-ping" /><Radio className="relative h-5 w-5" /></span></div><div className="relative mt-7 w-fit rounded-xl border border-white/15 bg-slate-950/10 px-3 py-2"><LiveFlow compact /></div></div><div className="grid gap-px bg-border lg:grid-cols-[minmax(0,1.12fr)_minmax(16rem,.88fr)]"><div className="bg-card p-6 sm:p-8"><p className="text-xs font-extrabold uppercase tracking-[.14em] text-muted-foreground">Your position</p><div className="mt-3 flex items-end gap-4"><AnimatePresence mode="wait" initial={false}><motion.p key={position ?? "unknown"} initial={reducedMotion ? false : { opacity: 0, y: 16, scale: .88 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -16, scale: 1.08 }} transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 360, damping: 26 }} className="metric-value text-[clamp(5rem,17vw,9rem)] font-bold leading-[.76] text-primary">{position === null ? "—" : `#${position}`}</motion.p></AnimatePresence><p className="mb-1 max-w-[12rem] text-sm leading-6 text-muted-foreground">{ahead === 1 ? "1 person is ahead of you." : `${ahead} people are ahead of you.`}</p></div><QueueRail position={position} peopleAhead={ahead} /><p className="mt-5 text-xs font-semibold text-muted-foreground">Position changes only when live operations update the verified queue.</p></div><div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-1"><QueueMetric icon={Clock3} label="Estimated wait" value={estimate === null ? "—" : `${estimate} min`} detail="Derived from active operations" /><QueueMetric icon={Sparkles} label="Estimate basis" value={snapshot.estimatedWait.basis.replaceAll("_", " ")} detail="Shown transparently" compact /></div></div><div className="border-t bg-secondary/35 p-5 sm:px-8"><p className="rounded-xl border bg-card/85 p-4 text-sm leading-6 text-secondary-foreground">{snapshot.estimatedWait.message}</p></div></section></MotionReveal>;
}

function QueueRail({ position, peopleAhead }: { position: number | null; peopleAhead: number }) { const visibleStops = Math.min(Math.max((position ?? 1), 3), 6); return <div className="mt-7 flex items-center gap-2" aria-label={`${peopleAhead} people ahead`}><span className="status-dot status-dot-pulse" />{Array.from({ length: visibleStops }).map((_, index) => <span key={index} className={`h-2.5 flex-1 rounded-full ${index === visibleStops - 1 ? "bg-primary" : "bg-secondary"}`} />)}<ArrowRight className="h-4 w-4 text-primary" /></div>; }
function QueueMetric({ icon: Icon, label, value, detail, compact = false }: { icon: typeof UsersRound; label: string; value: string; detail: string; compact?: boolean }) { return <div className="bg-card p-5 sm:p-6"><Icon className="h-4 w-4 text-primary" /><p className="mt-4 text-xs font-extrabold uppercase tracking-[.13em] text-muted-foreground">{label}</p><p className={`metric-value mt-2 font-bold capitalize ${compact ? "text-xl" : "text-3xl"}`}>{value}</p><p className="mt-2 text-xs leading-5 text-muted-foreground">{detail}</p></div>; }
function QueueSkeleton() { return <div className="mt-7 overflow-hidden rounded-[1.85rem] border bg-card"><div className="h-40 animate-pulse bg-muted" /><div className="grid gap-px bg-border sm:grid-cols-3">{Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-44 animate-pulse bg-card" />)}</div></div>; }
function QueueEmpty({ title, detail, href, action }: { title: string; detail: string; href: string; action: string }) { return <MotionReveal className="mt-7"><section className="customer-queue-empty empty-illustration relative overflow-hidden rounded-[1.85rem] p-8 text-center sm:p-12"><span className="signal-orb mx-auto h-16 w-16"><Radio className="h-6 w-6" /></span><p className="mt-6 text-xl font-bold">{title}</p><p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted-foreground">{detail}</p><div className="mx-auto mt-6 max-w-xs"><QueueRail position={3} peopleAhead={0} /></div><Button asChild className="mt-7"><Link href={href}>{action}<ArrowRight className="h-4 w-4" /></Link></Button></section></MotionReveal>; }
