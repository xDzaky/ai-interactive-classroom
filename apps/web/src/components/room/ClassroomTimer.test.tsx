/**
 * ClassroomTimer.test.tsx — P06-T05
 * Tests for ClassroomTimer component.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ClassroomTimer } from "@/components/room/ClassroomTimer";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

describe("ClassroomTimer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders initial display 01:00 for 60s duration", () => {
    render(<ClassroomTimer canControl />);
    expect(screen.getByText("01:00")).toBeInTheDocument();
  });

  it("shows start button for host", () => {
    render(<ClassroomTimer canControl />);
    expect(screen.getByLabelText("timer.start")).toBeInTheDocument();
  });

  it("does not show controls when canControl=false", () => {
    render(<ClassroomTimer canControl={false} />);
    expect(screen.queryByLabelText("timer.start")).not.toBeInTheDocument();
  });

  it("shows pause button after clicking start", () => {
    render(<ClassroomTimer canControl />);
    fireEvent.click(screen.getByLabelText("timer.start"));
    expect(screen.getByLabelText("timer.pause")).toBeInTheDocument();
  });

  it("resets to full duration on reset click", () => {
    render(<ClassroomTimer canControl />);
    // Switch to 30s preset first
    fireEvent.click(screen.getByLabelText("timer.set 30s"));
    expect(screen.getByText("00:30")).toBeInTheDocument();
    // Start, then reset
    fireEvent.click(screen.getByLabelText("timer.start"));
    fireEvent.click(screen.getByLabelText("timer.reset"));
    expect(screen.getByText("00:30")).toBeInTheDocument();
  });
});
