import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n";
import CreateRoomPage from "@/pages/room/CreateRoomPage";

// Mock API calls
vi.mock("@/lib/api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

vi.mock("@/lib/api/rooms", () => ({
  createRoom: vi.fn(),
  openLobby: vi.fn(),
}));

import api from "@/lib/api";
import { createRoom, openLobby } from "@/lib/api/rooms";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

function wrap(ui: React.ReactNode) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={["/rooms/create"]}>
          <Routes>
            <Route path="/rooms/create" element={ui} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </I18nextProvider>,
  );
}

describe("CreateRoomPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { data: [] },
    });
  });

  it("renders classroom select and mode select", async () => {
    wrap(<CreateRoomPage />);
    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: /kelas/i })).toBeInTheDocument();
      expect(screen.getByRole("combobox", { name: /mode/i })).toBeInTheDocument();
    });
  });

  it("start button is disabled when no classroom selected", async () => {
    wrap(<CreateRoomPage />);
    await waitFor(() => {
      const btn = screen.getByRole("button", { name: /mulai room/i });
      expect(btn).toBeDisabled();
    });
  });

  it("calls createRoom + openLobby and navigates to lobby on submit", async () => {
    (api.get as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ data: { data: [{ id: "school-1" }] } })
      .mockResolvedValueOnce({
        data: { data: [{ id: "cls-1", name: "Kelas X-A" }] },
      });
    (createRoom as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "room-1" });
    (openLobby as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "room-1",
      status: "lobby",
    });

    wrap(<CreateRoomPage />);

    await waitFor(() =>
      expect(screen.getByText("Kelas X-A")).toBeInTheDocument(),
    );

    fireEvent.change(screen.getByRole("combobox", { name: /kelas/i }), {
      target: { value: "cls-1" },
    });

    fireEvent.click(screen.getByRole("button", { name: /mulai room/i }));

    await waitFor(() => {
      expect(createRoom).toHaveBeenCalledWith({
        classroom_id: "cls-1",
        mode: "projector",
      });
      expect(openLobby).toHaveBeenCalledWith("room-1");
      expect(mockNavigate).toHaveBeenCalledWith("/room/room-1/lobby");
    });
  });

  it("shows error message when createRoom fails", async () => {
    (api.get as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ data: { data: [{ id: "school-1" }] } })
      .mockResolvedValueOnce({
        data: { data: [{ id: "cls-1", name: "Kelas X-A" }] },
      });
    (createRoom as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Server error"),
    );

    wrap(<CreateRoomPage />);

    await waitFor(() =>
      expect(screen.getByText("Kelas X-A")).toBeInTheDocument(),
    );
    fireEvent.change(screen.getByRole("combobox", { name: /kelas/i }), {
      target: { value: "cls-1" },
    });
    fireEvent.click(screen.getByRole("button", { name: /mulai room/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Server error");
    });
  });
});
