/**
 * StudentView.test.tsx — P04-T07
 * Tests for StudentView component.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n";

vi.mock("@/pages/whiteboard/WhiteboardCanvas", () => ({
  WhiteboardCanvas: ({ readOnly }: { readOnly?: boolean }) => (
    <div data-testid="whiteboard-canvas" data-readonly={String(!!readOnly)} />
  ),
}));

vi.mock("@ai-classroom/whiteboard-core", () => ({
  applyEvent: (s: unknown, _e: unknown) => s,
  createInitialBoardState: (_id: string) => ({ scenes: { main: { strokes: {}, objects: {}, order: [] } }, activeScene: "main", meta: {} }),
}));

import { StudentView } from "@/pages/room/StudentView";

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>{children}</MemoryRouter>
    </I18nextProvider>
  );
}

describe("StudentView", () => {
  it("renders read-only whiteboard canvas", () => {
    render(
      <StudentView roomId="r1" participantToken="tok" participantId="p1" />,
      { wrapper },
    );
    const canvas = screen.getByTestId("whiteboard-canvas");
    expect(canvas.getAttribute("data-readonly")).toBe("true");
  });

  it("renders raise hand button", () => {
    render(
      <StudentView roomId="r1" participantToken="tok" participantId="p1" />,
      { wrapper },
    );
    expect(screen.getByRole("button", { name: /angkat tangan/i })).toBeInTheDocument();
  });

  it("toggles raise hand state on click", async () => {
    const user = userEvent.setup();
    render(
      <StudentView roomId="r1" participantToken="tok" participantId="p1" />,
      { wrapper },
    );
    const btn = screen.getByRole("button", { name: /angkat tangan/i });
    expect(btn).toHaveAttribute("aria-pressed", "false");
    await user.click(btn);
    expect(btn).toHaveAttribute("aria-pressed", "true");
  });

  it("renders follow teacher button", () => {
    render(
      <StudentView roomId="r1" participantToken="tok" participantId="p1" />,
      { wrapper },
    );
    // button text shows "Ikuti Guru" when followTeacher=true (initial state)
    expect(screen.getByText(/ikuti guru/i)).toBeInTheDocument();
  });
});
