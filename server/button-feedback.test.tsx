/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";
import { Button, buttonVariants } from "../client/src/components/ui/button";

describe("QueueSync primary action feedback", () => {
  it("renders an accessible loading state and disables pending actions", () => {
    render(<Button loading>Saving settings…</Button>);
    const button = screen.getByRole("button", { name: /Saving settings/i });
    expect(button.getAttribute("aria-busy")).toBe("true");
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(button.querySelector("svg")).not.toBeNull();
  });

  it("keeps tactile press and reduced-motion safeguards in the shared action style", () => {
    const styles = buttonVariants();
    expect(styles).toContain("active:scale-[0.97]");
    expect(styles).toContain("motion-reduce:transform-none");
  });
});
