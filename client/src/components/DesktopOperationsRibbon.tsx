import React from "react";
import { MonitorCog } from "lucide-react";

export function DesktopOperationsRibbon() {
  if (typeof window === "undefined" || !window.QueueSyncDesktop?.isDesktop) return null;
  return <div data-testid="desktop-operations-ribbon" className="hidden border-b border-primary/20 bg-primary/5 px-8 py-2.5 lg:flex lg:items-center lg:justify-between"><div className="flex items-center gap-2 text-xs font-bold text-primary"><MonitorCog className="h-3.5 w-3.5" />Merchant desktop session <span className="text-muted-foreground">· native queue alerts enabled</span></div><div className="text-[11px] font-semibold text-muted-foreground">Cmd/Ctrl + R refreshes this operations workspace</div></div>;
}
