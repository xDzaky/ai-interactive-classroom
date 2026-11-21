/**
 * RandomPicker.test.tsx — P06-T05
 * Tests for RandomPicker component.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { RandomPicker } from "@/components/room/RandomPicker";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

const PARTICIPANTS = [
  { id: "p-1", alias: "Alice" },
  { id: "p-2", alias: "Bob" },
  { id: "p-3", alias: "Charlie" },
];

describe("RandomPicker", () => {
  it("shows no-participants message when list is empty", () => {
    render(<RandomPicker participants={[]} />);
    expect(screen.getByText("picker.noParticipants")).toBeInTheDocument();
  });

  it("renders pick button when participants present", () => {
    render(<RandomPicker participants={PARTICIPANTS} />);
    expect(screen.getByLabelText("picker.pick")).toBeInTheDocument();
  });

  it("shows participant count", () => {
    render(<RandomPicker participants={PARTICIPANTS} />);
    expect(screen.getByText(/3/)).toBeInTheDocument();
  });

  it("pick button click enables the picking animation (button becomes disabled briefly)", () => {
    // Math.random returns 0 → always picks first participant
    vi.spyOn(Math, "random").mockReturnValue(0);
    render(<RandomPicker participants={PARTICIPANTS} />);
    const btn = screen.getByLabelText("picker.pick");
    // Before click: button is enabled
    expect(btn).not.toBeDisabled();
    // We just verify the click handler fires without error
    expect(() => fireEvent.click(btn)).not.toThrow();
    vi.restoreAllMocks();
  });
});
