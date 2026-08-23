import React, { useEffect, useMemo, useState } from "react";
import { Palette, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { DEFAULT_QUEUE_STAGE_COLORS, QUEUE_STAGE_KEYS, resolveQueueStageColors, type QueueStageColors, type QueueStageKey } from "@shared/queueStageColors";
import { toast } from "sonner";

const stageLabels: Record<QueueStageKey, string> = { waiting: "Waiting", called: "Called", in_service: "In service", completed: "Completed", no_show: "No-show", cancelled: "Cancelled" };

export function QueueStageColorSettings({ businessId, businessName, settings }: { businessId: string; businessName: string; settings: Record<string, unknown> | null }) {
  const savedColors = useMemo(() => resolveQueueStageColors(settings), [settings]);
  const [draft, setDraft] = useState<QueueStageColors>(savedColors);
  const utils = trpc.useUtils();
  useEffect(() => setDraft(savedColors), [businessId, savedColors]);
  const save = trpc.businesses.queueStageColors.useMutation({ onSuccess: () => { toast.success("Queue display colors saved."); utils.businesses.mine.invalidate(); }, onError: error => toast.error(error.message) });
  return <section className="surface-card mt-5 rounded-[1.55rem] p-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="flex gap-3"><span className="signal-orb h-10 w-10 shrink-0"><Palette className="h-4 w-4" /></span><div><p className="font-bold">Queue display colors</p><p className="mt-1 max-w-lg text-sm leading-6 text-muted-foreground">Choose the operational colors used for {businessName}’s waiting, called, and in-service states. Saved changes remain scoped to this business.</p></div></div></div><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{QUEUE_STAGE_KEYS.map(stage => <label key={stage} className="flex items-center gap-3 rounded-xl border bg-background/70 p-3 text-sm font-bold"><input aria-label={`${stageLabels[stage]} stage color`} className="h-9 w-9 shrink-0 cursor-pointer rounded-lg border-0 bg-transparent p-0" type="color" value={draft[stage]} onChange={event => setDraft(current => ({ ...current, [stage]: event.target.value.toUpperCase() }))} /><span>{stageLabels[stage]}</span></label>)}</div><div className="mt-5 flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between"><Button type="button" variant="ghost" size="sm" onClick={() => setDraft(DEFAULT_QUEUE_STAGE_COLORS)}><RotateCcw className="h-3.5 w-3.5" />Restore defaults</Button><Button type="button" loading={save.isPending} onClick={() => save.mutate({ businessId, colors: draft })}>{save.isPending ? "Saving colors…" : "Save queue colors"}</Button></div></section>;
}
