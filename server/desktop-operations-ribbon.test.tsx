/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { DesktopOperationsRibbon } from "../client/src/components/DesktopOperationsRibbon";

describe("QueueSync desktop operations ribbon", () => {
  afterEach(() => { delete window.QueueSyncDesktop; });

  it("renders dedicated merchant desktop operational context only when the Electron bridge is present", () => {
    window.QueueSyncDesktop = { isDesktop: true, workspace: "merchant-operations", notify: async () => true };
    render(<DesktopOperationsRibbon />);
    expect(screen.getByTestId("desktop-operations-ribbon").textContent).toContain("Merchant desktop session");
    expect(screen.getByText(/native queue alerts enabled/i)).toBeTruthy();
  });
});
