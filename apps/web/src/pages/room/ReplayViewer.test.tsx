/**
 * ReplayViewer.test.tsx — P07-T03
 * Component tests for the board replay viewer.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ReplayViewer from "./ReplayViewer";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock replayEngine
const mockSeek = vi.fn();
const mockStep = vi.fn();
const mockSetSpeed = vi.fn();
const mockGetDuration = vi.fn();
const mockGetCursor = vi.fn();
let mockMsPerStep = 100;

vi.mock("@/lib/replayEngine", () => ({
  createReplayEngine: vi.fn(() => ({
    seek: mockSeek,
    step: mockStep,
    setSpeed: mockSetSpeed,
    getDuration: mockGetDuration,
    getCursor: mockGetCursor,
    get msPerStep() {
      return mockMsPerStep;
    },
  })),
}));

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "id" },
  }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderViewer(roomId = "room-123") {
  return render(
    <MemoryRouter initialEntries={[`/room/${roomId}/replay`]}>
      <Routes>
        <Route path="/room/:roomId/replay" element={<ReplayViewer />} />
      </Routes>
    </MemoryRouter>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ReplayViewer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSeek.mockResolvedValue({ roomId: "room-123", objects: [], seq: 0 });
    mockGetDuration.mockReturnValue(10);
    mockGetCursor.mockReturnValue(0);
    mockMsPerStep = 100;
  });

  it("renders timeline controls", async () => {
    renderViewer();

    // Should show the replay controls
    await waitFor(() => {
      expect(screen.getByTestId("replay-controls")).toBeInTheDocument();
    });

    expect(screen.getByTestId("replay-scrubber")).toBeInTheDocument();
    expect(screen.getByTestId("replay-play-pause")).toBeInTheDocument();
    expect(screen.getByTestId("replay-speed-selector")).toBeInTheDocument();
  });

  it("renders all speed buttons (1x, 2x, 4x)", async () => {
    renderViewer();

    await waitFor(() => {
      expect(screen.getByTestId("speed-btn-1")).toBeInTheDocument();
    });

    expect(screen.getByTestId("speed-btn-2")).toBeInTheDocument();
    expect(screen.getByTestId("speed-btn-4")).toBeInTheDocument();
  });

  it("calls seek(0) on mount to initialise replay", async () => {
    renderViewer();

    await waitFor(() => {
      expect(mockSeek).toHaveBeenCalledWith(0);
    });
  });

  it("toggles play/pause on button click", async () => {
    renderViewer();

    await waitFor(() => {
      expect(screen.getByTestId("replay-play-pause")).toBeInTheDocument();
    });

    const btn = screen.getByTestId("replay-play-pause");
    // Initially shows "play"
    expect(btn.textContent).toContain("replay.play");

    fireEvent.click(btn);
    // After click shows "pause"
    expect(btn.textContent).toContain("replay.pause");

    fireEvent.click(btn);
    // After second click shows "play" again
    expect(btn.textContent).toContain("replay.play");
  });

  it("calls setSpeed on speed button click", async () => {
    renderViewer();

    await waitFor(() => {
      expect(screen.getByTestId("speed-btn-2")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("speed-btn-2"));
    expect(mockSetSpeed).toHaveBeenCalledWith(2);

    fireEvent.click(screen.getByTestId("speed-btn-4"));
    expect(mockSetSpeed).toHaveBeenCalledWith(4);
  });

  it("renders key-event highlights bar", async () => {
    renderViewer();

    await waitFor(() => {
      expect(screen.getByTestId("replay-highlights")).toBeInTheDocument();
    });
  });
});
