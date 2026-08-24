import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DEFAULT_QUEUE_STAGE_COLORS, getRecommendedQueueStagePreset, QUEUE_STAGE_COLOR_PRESETS, queueStageColorsEqual, resolveQueueStageColors } from "../shared/queueStageColors";

const routerSource = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");
const workspaceSource = readFileSync(new URL("../client/src/components/QueueStageColorSettings.tsx", import.meta.url), "utf8");

describe("merchant queue-stage colors", () => {
  it("uses safe defaults and rejects invalid persisted color values", () => {
    expect(resolveQueueStageColors(null)).toEqual(DEFAULT_QUEUE_STAGE_COLORS);
    expect(resolveQueueStageColors({ queueStageColors: { waiting: "#123456", called: "not-a-color", in_service: "#00AA00" } })).toMatchObject({ waiting: "#123456", called: DEFAULT_QUEUE_STAGE_COLORS.called, in_service: "#00AA00", completed: DEFAULT_QUEUE_STAGE_COLORS.completed });
  });

  it("provides named industry palettes with complete, valid stage coverage", () => {
    expect(QUEUE_STAGE_COLOR_PRESETS.length).toBeGreaterThanOrEqual(5);
    expect(QUEUE_STAGE_COLOR_PRESETS.map(preset => preset.name)).toEqual(expect.arrayContaining(["Salon & spa", "Clinic & health", "Food & counter"]));
    for (const preset of QUEUE_STAGE_COLOR_PRESETS) expect(resolveQueueStageColors({ queueStageColors: preset.colors })).toEqual(preset.colors);
    expect(queueStageColorsEqual(QUEUE_STAGE_COLOR_PRESETS[0].colors, DEFAULT_QUEUE_STAGE_COLORS)).toBe(true);
  });

  it("recommends a suitable named palette from the merchant business category", () => {
    expect(getRecommendedQueueStagePreset("Salon").id).toBe("salon-spa");
    expect(getRecommendedQueueStagePreset("Dental clinic").id).toBe("clinic-health");
    expect(getRecommendedQueueStagePreset("Cafe").id).toBe("food-counter");
    expect(getRecommendedQueueStagePreset("Unknown").id).toBe("queuesync");
  });

  it("guards configuration writes by tenant membership and presents color inputs to merchants", () => {
    const procedureStart = routerSource.indexOf("queueStageColors: protectedProcedure");
    const procedureEnd = routerSource.indexOf("  }),\n  resources", procedureStart);
    const procedure = routerSource.slice(procedureStart, procedureEnd);
    expect(procedure).toContain("assertBusinessMember");
    expect(procedure).toContain("updateBusinessQueueStageColors");
    expect(procedure).toContain("QUEUE_STAGE_COLORS_UPDATED");
    expect(workspaceSource).toContain('type="color"');
    expect(workspaceSource).toContain("Queue display");
    expect(workspaceSource).toContain("Quick presets");
    expect(workspaceSource).toContain("QUEUE_STAGE_COLOR_PRESETS");
    expect(workspaceSource).toContain("Recommended for");
    expect(workspaceSource).toContain("Save queue colors");
  });
});
