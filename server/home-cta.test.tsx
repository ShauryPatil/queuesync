/** @vitest-environment jsdom */
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ isAuthenticated: false }) }));
vi.mock("@/components/CustomerNav", () => ({ default: () => <div />, HomeFeatures: () => <div /> }));
vi.mock("@/components/LiveFlow", () => ({ default: () => <div /> }));
vi.mock("@/lib/trpc", () => ({ trpc: { businesses: { list: { useQuery: () => ({ data: [], isLoading: false }) }, mine: { useQuery: () => ({ data: [], isLoading: false }) } }, queue: { listLive: { useQuery: () => ({ data: [], isLoading: false }) } } } }));
vi.mock("wouter", () => ({ Link: ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => <a href={href} className={className}>{children}</a> }));

import Home from "../client/src/pages/Home";

describe("QueueSync homepage calls to action", () => {
  afterEach(() => cleanup());

  it("scrolls to discovery from the Explore action and provides a merchant workspace route", async () => {
    const user = userEvent.setup();
    const scrollIntoView = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { configurable: true, value: scrollIntoView });
    render(<Home />);
    await user.click(screen.getByRole("button", { name: /Explore businesses/i }));
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
    expect(screen.getByRole("button", { name: /Run your operations/i })).toBeTruthy();
    expect(readFileSync(resolve(import.meta.dirname, "../client/src/pages/Home.tsx"), "utf8")).toContain('window.location.assign("/merchant")');
  });
});
