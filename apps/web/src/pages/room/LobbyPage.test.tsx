import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n";
import LobbyPage from "@/pages/room/LobbyPage";

vi.mock("@/lib/api/rooms", () => ({
  fetchRoom: vi.fn(),
  startRoom: vi.fn(),
  regenerateCode: vi.fn(),
}));

// Mock QRCodeSVG to avoid canvas issues in jsdom
vi.mock("qrcode.react", () => ({
  QRCodeSVG: ({ value }: { value: string }) => (
    <div data-testid="qr-code" data-value={value} />
  ),
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

import { fetchRoom, startRoom, regenerateCode } from "@/lib/api/rooms";

const MOCK_ROOM = {
  id: "room-abc",
  code: "ABC123",
  status: "lobby",
  mode: "projector",
  classroom_id: "cls-1",
  host_id: "user-1",
  settings: null,
  starts_at: null,
  ends_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

function wrap(roomId = "room-abc") {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchInterval: false } },
  });
  return render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={[`/room/${roomId}/lobby`]}>
          <Routes>
            <Route path="/room/:roomId/lobby" element={<LobbyPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </I18nextProvider>,
  );
}

describe("LobbyPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fetchRoom as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_ROOM);
  });

  it("displays join code prominently", async () => {
    wrap();
    await waitFor(() => {
      expect(screen.getByText("ABC123")).toBeInTheDocument();
    });
  });

  it("renders QR code with correct join URL", async () => {
    wrap();
    await waitFor(() => {
      const qr = screen.getByTestId("qr-code");
      expect(qr.getAttribute("data-value")).toContain("/join/ABC123");
    });
  });

  it("navigates to room on start", async () => {
    (startRoom as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...MOCK_ROOM,
      status: "live",
    });
    wrap();

    await waitFor(() => screen.getByText("ABC123"));
    fireEvent.click(screen.getByRole("button", { name: /mulai sekarang/i }));

    await waitFor(() => {
      expect(startRoom).toHaveBeenCalledWith("room-abc");
      expect(mockNavigate).toHaveBeenCalledWith("/room/room-abc");
    });
  });

  it("calls regenerateCode when button clicked", async () => {
    (regenerateCode as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...MOCK_ROOM,
      code: "XYZ999",
    });
    wrap();

    await waitFor(() => screen.getByText("ABC123"));
    fireEvent.click(screen.getByRole("button", { name: /perbarui kode/i }));

    await waitFor(() => {
      expect(regenerateCode).toHaveBeenCalledWith("room-abc");
    });
  });

  it("shows not-found message when room fetch fails", async () => {
    (fetchRoom as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    wrap();
    await waitFor(() => {
      expect(screen.getByText(/tidak ditemukan/i)).toBeInTheDocument();
    });
  });
});
