import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const desktopMain = readFileSync(new URL("../desktop/main.cjs", import.meta.url), "utf8");
const desktopPreload = readFileSync(new URL("../desktop/preload.cjs", import.meta.url), "utf8");

describe("QueueSync merchant desktop shell", () => {
  it("provides a dedicated merchant operations window and native workspace controls", () => {
    expect(desktopMain).toContain("QueueSync — Merchant Operations");
    expect(desktopMain).toContain("autoHideMenuBar: true");
    expect(desktopMain).toContain("installApplicationMenu");
    expect(desktopMain).toContain("Refresh workspace");
    expect(desktopMain).toContain("Open customer view");
    expect(desktopPreload).toContain('workspace: "merchant-operations"');
    expect(desktopPreload).toContain('queuesyncDesktop = "merchant-operations"');
  });
});
