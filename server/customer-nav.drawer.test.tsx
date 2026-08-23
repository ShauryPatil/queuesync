/** @vitest-environment jsdom */
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import type { MouseEventHandler, PropsWithChildren } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: null, isAuthenticated: false, logout: vi.fn() }) }));
vi.mock("@/contexts/ThemeContext", () => ({ useTheme: () => ({ theme: "light", toggleTheme: vi.fn(), switchable: true }) }));
vi.mock("@/const", () => ({ startLogin: vi.fn() }));
vi.mock("wouter", () => ({
  Link: ({ children, href, className, onClick }: PropsWithChildren<{ href: string; className?: string; onClick?: MouseEventHandler<HTMLAnchorElement> }>) => <a href={href} className={className} onClick={onClick}>{children}</a>,
  useLocation: () => ["/", vi.fn()],
}));

import CustomerNav from "../client/src/components/CustomerNav";

function renderNav() {
  return render(<CustomerNav />);
}

describe("QueueSync mobile navigation drawer", () => {
  afterEach(() => cleanup());

  it("opens above the page with an overlay and closes from its close control", async () => {
    const user = userEvent.setup();
    renderNav();
    await user.click(screen.getByRole("button", { name: "Open navigation menu" }));
    expect(screen.getByText("Move between your customer and merchant spaces.")).toBeTruthy();
    expect(document.querySelector('[data-slot="sheet-overlay"]')).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByText("Move between your customer and merchant spaces.")).toBeNull();
  });

  it("closes on Escape so it does not leave an obstructing mobile layer behind", async () => {
    const user = userEvent.setup();
    renderNav();
    await user.click(screen.getByRole("button", { name: "Open navigation menu" }));
    await user.keyboard("{Escape}");
    expect(screen.queryByText("Move between your customer and merchant spaces.")).toBeNull();
  });

  it("closes when the backdrop is clicked", async () => {
    const user = userEvent.setup();
    renderNav();
    await user.click(screen.getByRole("button", { name: "Open navigation menu" }));
    const overlay = document.querySelector('[data-slot="sheet-overlay"]');
    expect(overlay).toBeTruthy();
    await user.click(overlay as Element);
    expect(screen.queryByText("Move between your customer and merchant spaces.")).toBeNull();
  });
});
