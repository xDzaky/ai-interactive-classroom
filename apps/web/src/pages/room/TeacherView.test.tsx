/**
 * TeacherView.test.tsx — P04-T07
 * Tests for TeacherView component.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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
  createInitialBoardState: (_id: string) => ({ scenes: { main: { strokes: {}, objects: {}, order: [] } }, active_scene_id: "main", meta: {} }),
  getActiveScene: (s: any) => s?.scenes?.[s?.active_scene_id || "main"] || { strokes: {}, objects: {}, order: [] },
}));

vi.mock("@/components/whiteboard/ToolBar", () => ({
  ToolBar: () => <div data-testid="toolbar" />,
}));

vi.mock("@/hooks/useWhiteboardTool", () => ({
  useWhiteboardTool: (_onEvent: unknown, _seq: unknown) => ({
    toolState: { activeTool: "pen", color: "#111", strokeWidth: 3 },
    setTool: vi.fn(),
    setColor: vi.fn(),
    setStrokeWidth: vi.fn(),
    onPointerDown: vi.fn(),
    onPointerMove: vi.fn(() => null),
    onPointerUp: vi.fn(() => null),
  }),
}));

vi.mock("@/lib/api/rooms", () => ({
  endRoom: vi.fn().mockResolvedValue({}),
}));

// Mock ParticipantList so TeacherView tests don't need Echo configured
vi.mock("@/components/room/ParticipantList", () => ({
  ParticipantList: ({ roomId }: { roomId: string }) => (
    <div data-testid="participant-list" data-room={roomId} />
  ),
}));

// Mock PresenterQueue — no React Query / API in TeacherView tests
vi.mock("@/components/room/PresenterQueue", () => ({
  PresenterQueue: ({ roomId }: { roomId: string }) => (
    <div data-testid="presenter-queue" data-room={roomId} />
  ),
}));

// Mock ConnectDeviceModal — no fetch in TeacherView tests
vi.mock("@/components/room/ConnectDeviceModal", () => ({
  ConnectDeviceModal: ({ open, onClose }: { open: boolean; onClose: () => void }) =>
    open ? <div data-testid="connect-device-modal" onClick={onClose} /> : null,
}));

// Mock ActivityBuilder — no React Query / API in TeacherView tests
vi.mock("@/components/room/ActivityBuilder", () => ({
  ActivityBuilder: ({ roomId }: { roomId: string }) => (
    <div data-testid="activity-builder" data-room={roomId} />
  ),
}));

// Mock GroupWorkspace — no React Query / API in TeacherView tests
vi.mock("@/components/room/GroupWorkspace", () => ({
  GroupWorkspace: ({ roomId }: { roomId: string }) => (
    <div data-testid="group-workspace" data-room={roomId} />
  ),
}));

// Mock ClassroomTimer — no timers in TeacherView tests
vi.mock("@/components/room/ClassroomTimer", () => ({
  ClassroomTimer: () => <div data-testid="classroom-timer" />,
}));

// Mock RandomPicker — pure UI, no deps
vi.mock("@/components/room/RandomPicker", () => ({
  RandomPicker: () => <div data-testid="random-picker" />,
}));

// Mock GroupGenerator — no React Query in TeacherView tests
vi.mock("@/components/room/GroupGenerator", () => ({
  GroupGenerator: ({ roomId }: { roomId: string }) => (
    <div data-testid="group-generator" data-room={roomId} />
  ),
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

import { TeacherView } from "@/pages/room/TeacherView";

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

describe("TeacherView", () => {
  it("renders toolbar", () => {
    render(
      <TeacherView roomId="r1" participantToken="tok" participantId="p1" roomCode="ABC123" />,
      { wrapper },
    );
    expect(screen.getByTestId("toolbar")).toBeInTheDocument();
  });

  it("renders whiteboard canvas (writable)", () => {
    render(
      <TeacherView roomId="r1" participantToken="tok" participantId="p1" />,
      { wrapper },
    );
    const canvas = screen.getByTestId("whiteboard-canvas");
    expect(canvas.getAttribute("data-readonly")).toBe("false");
  });

  it("shows end room button", () => {
    render(
      <TeacherView roomId="r1" participantToken="tok" participantId="p1" />,
      { wrapper },
    );
    expect(screen.getByRole("button", { name: /akhiri room/i })).toBeInTheDocument();
  });

  it("shows room code when provided", () => {
    render(
      <TeacherView roomId="r1" participantToken="tok" participantId="p1" roomCode="XY9999" />,
      { wrapper },
    );
    expect(screen.getByText("XY9999")).toBeInTheDocument();
  });
});
