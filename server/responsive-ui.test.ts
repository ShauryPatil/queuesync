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
    expect(home).toContain("text-[clamp(2.45rem,10vw,5.9rem)]");
    expect(home).toContain("No businesses available yet.");
    expect(home).toContain("Awaiting the first live record.");
    expect(styles).toContain("overflow-x: clip");
    expect(styles).toContain("margin-inline: auto");
  });

  it("exposes a controlled theme provider for the light and dark visual systems", () => {
    const app = source("client/src/App.tsx");
    const nav = source("client/src/components/CustomerNav.tsx");
    expect(app).toContain("switchable");
    expect(nav).toContain("Switch to");
  });
});
