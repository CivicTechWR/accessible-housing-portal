import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, jest } from "@jest/globals";
import { InfoPopover } from "./InfoPopover";

describe("InfoPopover", () => {
  it("keeps clicked help open after leaving the icon without submitting the form", async () => {
    const onSubmit = jest.fn((event: React.FormEvent) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <InfoPopover label="About lease terms" description="Only the initial rental period." />
      </form>,
    );
    const trigger = screen.getByRole("button", { name: "About lease terms" });

    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(trigger);
    fireEvent.pointerLeave(trigger);
    await act(() => new Promise((resolve) => setTimeout(resolve, 200)));

    expect(screen.getByRole("dialog").textContent).toBe("Only the initial rental period.");
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.click(trigger);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows help on keyboard focus and dismisses it with Escape without moving focus", () => {
    render(<InfoPopover label="About lease terms" description="Only the initial rental period." />);
    const trigger = screen.getByRole("button", { name: "About lease terms" });

    act(() => trigger.focus());
    expect(screen.getByRole("dialog").textContent).toBe("Only the initial rental period.");
    fireEvent.keyDown(trigger, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
});
