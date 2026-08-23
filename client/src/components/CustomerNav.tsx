import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Button } from "@/components/ui/button";
import { Bell, Building2, CalendarDays, Menu, Route as RouteIcon, ShieldCheck } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const links = [
  { href: "/explore", label: "Explore" },
  { href: "/my-bookings", label: "My bookings" },
  { href: "/live-queue", label: "Live queue" },
];

export function Brand() {
  return <Link href="/" className="flex items-center gap-2.5 font-bold tracking-tight"><span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20"><RouteIcon className="h-4 w-4" /></span><span className="display-font text-lg">Queue<span className="text-primary">Sync</span></span></Link>;
}

export default function CustomerNav() {
  const { user, isAuthenticated, logout } = useAuth();
  const [location] = useLocation();
  return <header className="sticky top-0 z-50 border-b border-border/70 glass"><div className="container flex h-16 items-center justify-between gap-5"><Brand /><nav className="hidden items-center gap-1 md:flex">{links.map(link => <Link key={link.href} href={link.href} className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${location === link.href ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{link.label}</Link>)}</nav><div className="hidden items-center gap-2 md:flex">{isAuthenticated ? <><Link href="/notifications"><Button variant="ghost" size="icon" aria-label="Open notifications"><Bell className="h-4 w-4" /></Button></Link><Link href="/merchant"><Button variant="ghost" className="gap-2"><Building2 className="h-4 w-4" />Merchant</Button></Link><Button variant="outline" onClick={logout}>{user?.name?.split(" ")[0] ?? "Account"}</Button></> : <><Button variant="ghost" onClick={() => startLogin()}>Sign in</Button><Button onClick={() => startLogin()} className="rounded-xl shadow-lg shadow-primary/20">Get started</Button></>}</div><div className="md:hidden"><Sheet><SheetTrigger asChild><Button variant="ghost" size="icon" aria-label="Open navigation"><Menu className="h-5 w-5" /></Button></SheetTrigger><SheetContent side="right" className="w-[300px]"><div className="mt-5 flex flex-col gap-2"><Brand /><div className="my-4 h-px bg-border" />{links.map(link => <Link key={link.href} href={link.href} className="rounded-xl px-3 py-3 text-sm font-semibold hover:bg-secondary">{link.label}</Link>)}<Link href="/merchant" className="rounded-xl px-3 py-3 text-sm font-semibold hover:bg-secondary">Merchant workspace</Link><div className="mt-4">{isAuthenticated ? <Button onClick={logout} className="w-full" variant="outline">Sign out</Button> : <Button onClick={() => startLogin()} className="w-full">Sign in to QueueSync</Button>}</div></div></SheetContent></Sheet></div></div></header>;
}

export function FeaturePill({ icon: Icon, title, detail }: { icon: typeof CalendarDays; title: string; detail: string }) {
  return <div className="glass flex items-center gap-3 rounded-2xl border p-3 shadow-sm"><span className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-accent-foreground"><Icon className="h-4 w-4" /></span><div><p className="text-xs font-bold">{title}</p><p className="text-[11px] text-muted-foreground">{detail}</p></div></div>;
}

export const HomeFeatures = () => <div className="grid gap-3 sm:grid-cols-3"><FeaturePill icon={CalendarDays} title="Plan ahead" detail="Book a verified time slot" /><FeaturePill icon={RouteIcon} title="Stay in sync" detail="Follow a live queue" /><FeaturePill icon={ShieldCheck} title="Always transparent" detail="Clear wait-time context" /></div>;
