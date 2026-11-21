/**
 * PresentationView.test.tsx — P04-T07
 * Tests for PresentationView component.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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

import { PresentationView } from "@/pages/room/PresentationView";

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>{children}</MemoryRouter>
    </I18nextProvider>
  );
}

describe("PresentationView", () => {
  it("renders read-only canvas", () => {
    render(<PresentationView roomId="r1" />, { wrapper });
    const canvas = screen.getByTestId("whiteboard-canvas");
    expect(canvas.getAttribute("data-readonly")).toBe("true");
  });

  it("renders fullscreen toggle button", () => {
    render(<PresentationView roomId="r1" />, { wrapper });
    expect(screen.getByRole("button", { name: /layar penuh/i })).toBeInTheDocument();
  });

  it("shows room code when provided", () => {
    render(<PresentationView roomId="r1" roomCode="HELLO1" />, { wrapper });
    expect(screen.getByText("HELLO1")).toBeInTheDocument();
  });
});
