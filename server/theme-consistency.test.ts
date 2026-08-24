import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const styles = readFileSync(new URL("../client/src/index.css", import.meta.url), "utf8");
const themeContext = readFileSync(new URL("../client/src/contexts/ThemeContext.tsx", import.meta.url), "utf8");

describe("QueueSync theme consistency", () => {
  it("enforces a dark-only theme with semantic system activation", () => {
    expect(themeContext).toContain('theme: "dark"');
    expect(themeContext).toContain('root.classList.add("dark")');
    expect(themeContext).not.toContain('get("theme")');
  });

  it("defines dark operational materials for public, customer, and merchant custom surfaces", () => {
    expect(styles).toContain(".dark .brand-canvas");
    expect(styles).toContain(".dark .customer-event-surface .customer-event-canvas");
    expect(styles).toContain(".dark .customer-event-account .account-record-shell");
    expect(styles).toContain(".dark .queue-stage-color-scope");
    expect(styles).toContain(".dark .merchant-live-queue-row");
    expect(styles).toContain("--chart-grid");
    expect(styles).toContain("--chart-tooltip");
    expect(styles).toContain(".recharts-cartesian-axis-tick-value");
    expect(styles).toContain(".recharts-default-tooltip");
    expect(styles).toContain(":root:not(.dark) .business-event-record main > div > section > div > div:first-child");
    expect(styles).toContain(":root:not(.dark) .customer-event-business aside > section:last-child");
  });
});
