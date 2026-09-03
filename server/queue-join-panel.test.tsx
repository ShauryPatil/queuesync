/** @vitest-environment jsdom */
import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { QueueJoinPanel } from "../client/src/pages/BusinessDetails";

vi.mock("../client/src/components/LiveFlow", () => ({ default: () => <div data-testid="live-flow" /> }));

const schedules = [{ dayOfWeek: 1, opensAt: "09:00", closesAt: "18:00", isOpen: "yes" }];
const baseJoin = { isPending: false, mutate: vi.fn(), error: undefined };

function renderPanel(error?: Error) {
  render(<QueueJoinPanel isAuthenticated businessId="business" serviceId="service" resourceId="resource" serviceName="Hair dry" schedules={schedules} timeZone="Asia/Kolkata" join={{ ...baseJoin, error } as never} />);
}

describe("QueueJoinPanel closed-state messaging", () => {
  it("shows the next configured opening only after a closed-queue error", () => {
    renderPanel();
    expect(screen.queryByText(/Next configured opening/i)).toBeNull();

    cleanup();
    renderPanel(new Error("This business is currently closed to new queue entries."));
    expect(screen.getByText("Monday 09:00–18:00")).toBeTruthy();
  });

  it("does not fabricate an opening when there is no schedule", () => {
    cleanup();
    render(<QueueJoinPanel isAuthenticated businessId="business" serviceId="service" resourceId="resource" schedules={[]} timeZone="Asia/Kolkata" join={{ ...baseJoin, error: new Error("This business is currently closed to new queue entries.") } as never} />);
    expect(screen.queryByText(/Next configured opening/i)).toBeNull();
  });
});
