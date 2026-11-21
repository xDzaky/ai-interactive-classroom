/**
 * RoomPage.test.tsx — P04-T07
 * Tests that RoomPage routes to the correct sub-view based on role.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n";

// Mock heavy whiteboard canvas so tests don't need konva/canvas
vi.mock("@/pages/whiteboard/WhiteboardCanvas", () => ({
  WhiteboardCanvas: ({ readOnly }: { readOnly?: boolean }) => (
    <div data-testid="whiteboard-canvas" data-readonly={String(!!readOnly)} />
  ),
}));

vi.mock("@ai-classroom/whiteboard-core", () => ({
  applyEvent: (s: unknown, _e: unknown) => s,
  createInitialBoardState: (_id: string) => ({ scenes: { main: { strokes: {}, objects: {}, order: [] } }, activeScene: "main", meta: {} }),
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
  fetchRoom: vi.fn(),
  fetchMe: vi.fn(),
  endRoom: vi.fn(),
}));

// Mock ParticipantList so RoomPage tests don't need Echo configured
vi.mock("@/components/room/ParticipantList", () => ({
  ParticipantList: ({ roomId }: { roomId: string }) => (
    <div data-testid="participant-list" data-room={roomId} />
  ),
}));

// Mock PresenterQueue — no React Query / API in RoomPage tests
vi.mock("@/components/room/PresenterQueue", () => ({
  PresenterQueue: ({ roomId }: { roomId: string }) => (
    <div data-testid="presenter-queue" data-room={roomId} />
  ),
}));

// Mock ConnectDeviceModal — no fetch in RoomPage tests
vi.mock("@/components/room/ConnectDeviceModal", () => ({
  ConnectDeviceModal: ({ open, onClose }: { open: boolean; onClose: () => void }) =>
    open ? <div data-testid="connect-device-modal" onClick={onClose} /> : null,
}));

// Mock ActivityBuilder — no React Query in RoomPage tests
vi.mock("@/components/room/ActivityBuilder", () => ({
  ActivityBuilder: ({ roomId }: { roomId: string }) => (
    <div data-testid="activity-builder" data-room={roomId} />
  ),
}));

// Mock ActivityResponder — no React Query in RoomPage tests
vi.mock("@/components/room/ActivityResponder", () => ({
  ActivityResponder: ({ roomId }: { roomId: string }) => (
    <div data-testid="activity-responder" data-room={roomId} />
  ),
}));

// Mock GroupWorkspace — no React Query in RoomPage tests
vi.mock("@/components/room/GroupWorkspace", () => ({
  GroupWorkspace: ({ roomId }: { roomId: string }) => (
    <div data-testid="group-workspace" data-room={roomId} />
  ),
}));

// Mock GroupSubmitPanel — no React Query in RoomPage tests
vi.mock("@/components/room/GroupSubmitPanel", () => ({
  GroupSubmitPanel: ({ roomId }: { roomId: string }) => (
    <div data-testid="group-submit-panel" data-room={roomId} />
  ),
}));

// Mock ClassroomTimer — no timers in RoomPage tests
vi.mock("@/components/room/ClassroomTimer", () => ({
  ClassroomTimer: () => <div data-testid="classroom-timer" />,
}));

// Mock RandomPicker — no deps in RoomPage tests
vi.mock("@/components/room/RandomPicker", () => ({
  RandomPicker: () => <div data-testid="random-picker" />,
}));

// Mock GroupGenerator — no React Query in RoomPage tests
vi.mock("@/components/room/GroupGenerator", () => ({
  GroupGenerator: ({ roomId }: { roomId: string }) => (
    <div data-testid="group-generator" data-room={roomId} />
  ),
}));

// Mock RaiseHandButton — no fetch in RoomPage tests
vi.mock("@/components/room/RaiseHandButton", () => ({
  RaiseHandButton: () => <button aria-label="Angkat Tangan">✋</button>,
}));

import { fetchRoom, fetchMe } from "@/lib/api/rooms";
import RoomPage from "@/pages/room/RoomPage";

const MOCK_ROOM = {
  id: "room-1",
  code: "ABCD12",
  status: "live",
  mode: "projector",
  classroom_id: "cls-1",
  host_id: "user-1",
  settings: null,
  starts_at: null,
  ends_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

function makeWrapper(initialPath = "/room/room-1") {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>
      <I18nextProvider i18n={i18n}>
        <MemoryRouter initialEntries={[initialPath]}>
          <Routes>
            <Route path="/room/:roomId" element={children} />
            <Route path="/join" element={<div>join page</div>} />
          </Routes>
        </MemoryRouter>
      </I18nextProvider>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  // Guard: localStorage may not be available in all jsdom configurations
  if (typeof localStorage !== "undefined" && localStorage.clear) {
    localStorage.clear();
  }
  vi.mocked(fetchRoom).mockResolvedValue(MOCK_ROOM as never);
});

describe("RoomPage", () => {
  it("shows teacher view for teacher_host role", async () => {
    vi.mocked(fetchMe).mockResolvedValue({
      id: "p1",
      room_id: "room-1",
      user_id: "u1",
      alias: "Teacher",
      role: "teacher_host",
      joined_at: new Date().toISOString(),
      left_at: null,
    } as never);

    const Wrapper = makeWrapper();
    render(<RoomPage />, { wrapper: Wrapper });

    // TeacherView renders toolbar + writable whiteboard
    await waitFor(() => expect(screen.getByTestId("toolbar")).toBeInTheDocument());
    const canvas = screen.getByTestId("whiteboard-canvas");
    expect(canvas.getAttribute("data-readonly")).toBe("false");
  });

  it("shows student view for guest_student role", async () => {
    vi.mocked(fetchMe).mockResolvedValue({
      id: "p2",
      room_id: "room-1",
      user_id: null,
      alias: "Student",
      role: "guest_student",
      joined_at: new Date().toISOString(),
      left_at: null,
    } as never);

    const Wrapper = makeWrapper();
    render(<RoomPage />, { wrapper: Wrapper });

    // StudentView renders raise hand button
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /angkat tangan/i })).toBeInTheDocument(),
    );
    const canvas = screen.getByTestId("whiteboard-canvas");
    expect(canvas.getAttribute("data-readonly")).toBe("true");
  });

  it("shows presentation view when ?mode=presentation", async () => {
    const Wrapper = makeWrapper("/room/room-1?mode=presentation");
    render(<RoomPage />, { wrapper: Wrapper });

    // PresentationView renders fullscreen button
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /layar penuh/i })).toBeInTheDocument(),
    );
  });

  it("redirects to /join when no token and fetchMe fails", async () => {
    vi.mocked(fetchMe).mockRejectedValue(new Error("401"));

    const Wrapper = makeWrapper();
    render(<RoomPage />, { wrapper: Wrapper });

    await waitFor(() => expect(screen.getByText("join page")).toBeInTheDocument());
  });
});
