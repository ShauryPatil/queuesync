import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workspaceSource = readFileSync(new URL("../client/src/pages/MerchantWorkspace.tsx", import.meta.url), "utf8");

describe("merchant live-queue motion treatment", () => {
  it("uses animated layout, entry and exit transitions with a reduced-motion fallback", () => {
    expect(workspaceSource).toContain("AnimatePresence");
    expect(workspaceSource).toContain("motion.article");
    expect(workspaceSource).toContain("layout=\"position\"");
    expect(workspaceSource).toContain("useReducedMotion");
    expect(workspaceSource).toContain("Queue changes are reflected instantly");
  });
});
