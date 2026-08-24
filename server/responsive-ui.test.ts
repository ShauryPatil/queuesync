import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");
const source = (path: string) => readFileSync(resolve(projectRoot, path), "utf8");

describe("QueueSync responsive UI contract", () => {
  it("keeps the mobile drawer and desktop navigation in the shared header", () => {
    const nav = source("client/src/components/CustomerNav.tsx");
    expect(nav).toContain("SheetContent side=\"right\"");
    expect(nav).toContain("onOpenChange={setOpen}");
    expect(nav).toContain("aria-label=\"Open navigation menu\"");
    expect(nav).toContain("lg:flex");
  });

  it("uses fluid type, truthful empty states, and overflow protection in the customer experience", () => {
    const home = source("client/src/pages/Home.tsx");
    const styles = source("client/src/index.css");
    expect(home).toContain("text-[clamp(3rem,8.1vw,6.2rem)]");
    expect(home).toContain("No businesses match this view.");
    expect(home).toContain("Waiting for the first live record.");
    expect(home).toContain("MotionReveal");
    expect(styles).toContain("overflow-x: clip");
    expect(styles).toContain("margin-inline: auto");
  });

  it("enforces the dark-only theme without exposing a visual mode switch", () => {
    const app = source("client/src/App.tsx");
    const nav = source("client/src/components/CustomerNav.tsx");
    expect(app).toContain("<ThemeProvider>");
    expect(app).not.toContain("switchable");
    expect(nav).not.toContain("Switch to");
  });
});
