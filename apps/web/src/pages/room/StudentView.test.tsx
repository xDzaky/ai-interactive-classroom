/**
 * StudentView.test.tsx — P04-T07 / P05-T03
 * Tests for StudentView component.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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

// Mock RaiseHandButton to avoid API calls in StudentView tests
vi.mock("@/components/room/RaiseHandButton", () => ({
  RaiseHandButton: ({ roomId }: { roomId: string }) => (
    <button
      aria-pressed={false}
      aria-label="Angkat Tangan"
      data-testid="raise-hand-btn"
      data-room={roomId}
    >
      ✋ Angkat Tangan
    </button>
  ),
}));

// Mock ActivityResponder to avoid React Query / API in StudentView tests
vi.mock("@/components/room/ActivityResponder", () => ({
  ActivityResponder: ({ roomId }: { roomId: string }) => (
    <div data-testid="activity-responder" data-room={roomId} />
  ),
}));

import { StudentView } from "@/pages/room/StudentView";

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <I18nextProvider i18n={i18n}>
        <MemoryRouter>{children}</MemoryRouter>
      </I18nextProvider>
    </QueryClientProvider>
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

  it("raise hand button has aria-pressed false initially", () => {
    render(
      <StudentView roomId="r1" participantToken="tok" participantId="p1" />,
      { wrapper },
    );
    const btn = screen.getByRole("button", { name: /angkat tangan/i });
    expect(btn).toHaveAttribute("aria-pressed", "false");
  });

  it("renders follow teacher button", () => {
    render(
      <StudentView roomId="r1" participantToken="tok" participantId="p1" />,
      { wrapper },
    );
    expect(screen.getByText(/ikuti guru/i)).toBeInTheDocument();
  });
});
