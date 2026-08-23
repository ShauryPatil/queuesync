import React, { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { startLogin } from "@/const";
import { Button } from "@/components/ui/button";
import { Bell, Building2, CalendarDays, Menu, Moon, Route as RouteIcon, ShieldCheck, Sun } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const links = [
  { href: "/explore", label: "Explore" },
  { href: "/my-bookings", label: "My bookings" },
  { href: "/live-queue", label: "Live queue" },
];

export function Brand({ compact = false }: { compact?: boolean }) {
  return <Link href="/" className="flex min-w-0 items-center gap-2.5 font-bold tracking-tight focus-visible:outline-none"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20"><RouteIcon className="h-4 w-4" /></span>{!compact && <span className="display-font truncate text-lg">Queue<span className="text-primary">Sync</span></span>}</Link>;
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return <Button variant="ghost" size="icon" aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`} onClick={toggleTheme}>{theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}</Button>;
}

function DrawerLink({ href, label, onNavigate }: { href: string; label: string; onNavigate: () => void }) {
  return <SheetClose asChild><Link href={href} onClick={onNavigate} className="flex min-h-12 items-center rounded-xl px-4 text-[15px] font-semibold text-foreground transition-colors hover:bg-secondary focus-visible:bg-secondary focus-visible:outline-none">{label}</Link></SheetClose>;
}

export default function CustomerNav() {
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [location] = useLocation();
  const [open, setOpen] = useState(() => new URLSearchParams(window.location.search).get("menu") === "open");
  const close = () => setOpen(false);
  const signIn = () => { close(); startLogin(); };
  const signOut = () => { close(); logout(); };
  return <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur-xl"><div className="container flex h-16 items-center justify-between gap-3 sm:h-[4.5rem]"><Brand /><nav aria-label="Primary navigation" className="hidden items-center gap-1 lg:flex">{links.map(link => <Link key={link.href} href={link.href} className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${location === link.href ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"}`}>{link.label}</Link>)}</nav><div className="hidden items-center gap-1 lg:flex"><ThemeToggle />{isAuthenticated ? <><Link href="/notifications"><Button variant="ghost" size="icon" aria-label="Open notifications"><Bell className="h-4 w-4" /></Button></Link><Link href="/merchant"><Button variant="ghost" className="gap-2"><Building2 className="h-4 w-4" />Merchant workspace</Button></Link><Link href="/profile"><Button variant="outline" className="max-w-32 truncate">{user?.name?.split(" ")[0] ?? "Account"}</Button></Link></> : <><Button variant="ghost" onClick={startLogin}>Sign in</Button><Button onClick={startLogin} className="rounded-xl shadow-lg shadow-primary/20">Get started</Button></>}</div><div className="flex items-center gap-1 lg:hidden"><Button variant="ghost" size="icon" aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`} onClick={toggleTheme}>{theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}</Button><Sheet open={open} onOpenChange={setOpen}><SheetTrigger asChild><Button variant="ghost" size="icon" aria-label="Open navigation menu"><Menu className="h-5 w-5" /></Button></SheetTrigger><SheetContent side="right" className="z-[60] w-[min(88vw,22rem)] border-l border-border !bg-[var(--popover)] !opacity-100 p-0 text-popover-foreground shadow-2xl"><SheetHeader className="border-b p-5 pr-14"><Brand /><SheetTitle className="sr-only">QueueSync navigation</SheetTitle><SheetDescription className="mt-2">Move between your customer and merchant spaces.</SheetDescription></SheetHeader><nav aria-label="Mobile navigation" className="flex flex-1 flex-col p-4">{links.map(link => <DrawerLink key={link.href} {...link} onNavigate={close} />)}<DrawerLink href="/merchant" label="Merchant workspace" onNavigate={close} /><div className="mt-auto space-y-3 border-t pt-5">{isAuthenticated ? <><SheetClose asChild><Link href="/profile"><Button variant="outline" className="w-full" onClick={close}>Profile & settings</Button></Link></SheetClose><Button variant="ghost" className="w-full" onClick={signOut}>Sign out</Button></> : <><Button variant="outline" className="w-full" onClick={signIn}>Sign in</Button><Button className="w-full" onClick={signIn}>Get started</Button></>}</div></nav></SheetContent></Sheet></div></div></header>;
}

export function FeaturePill({ icon: Icon, title, detail }: { icon: typeof CalendarDays; title: string; detail: string }) {
  return <div className="glass flex min-w-0 items-center gap-3 rounded-2xl border p-3 shadow-sm"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground"><Icon className="h-4 w-4" /></span><div className="min-w-0"><p className="text-xs font-bold">{title}</p><p className="truncate text-[11px] text-muted-foreground">{detail}</p></div></div>;
}

export const HomeFeatures = () => <div className="grid gap-3 sm:grid-cols-3"><FeaturePill icon={CalendarDays} title="Plan ahead" detail="Book a verified time slot" /><FeaturePill icon={RouteIcon} title="Stay in sync" detail="Follow a live queue" /><FeaturePill icon={ShieldCheck} title="Always transparent" detail="Clear wait-time context" /></div>;
