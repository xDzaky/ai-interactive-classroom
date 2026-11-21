/**
 * ParticipantList.test.tsx — P04-T09
 * Tests for ParticipantList component.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n";

// Mock Echo presence hook — no-op in tests
vi.mock("@laravel/echo-react", () => ({
  useEchoPresence: vi.fn(() => ({
    leaveChannel: vi.fn(),
    leave: vi.fn(),
    stopListening: vi.fn(),
    listen: vi.fn(),
    channel: vi.fn(() => null),
  })),
  configureEcho: vi.fn(),
}));

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

import { ParticipantList } from "@/components/room/ParticipantList";

const PARTICIPANTS = [
  {
    id: "p1",
    alias: "Alice",
    role: "teacher_host" as const,
    user_id: "u1",
    joined_at: new Date().toISOString(),
  },
  {
    id: "p2",
    alias: "Bob",
    role: "guest_student" as const,
    user_id: null,
    joined_at: new Date().toISOString(),
  },
];

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0 } },
  });
  return (
    <QueryClientProvider client={qc}>
      <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ParticipantList", () => {
  it("renders participants from REST data", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: PARTICIPANTS }),
    } as Response);

    render(<ParticipantList roomId="room-1" />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeInTheDocument();
      expect(screen.getByText("Bob")).toBeInTheDocument();
    });
  });

  it("shows role badge for teacher_host", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: PARTICIPANTS }),
    } as Response);

    render(<ParticipantList roomId="room-1" />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText("Host")).toBeInTheDocument();
    });
  });

  it("shows placeholder text when no participants yet", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    } as Response);

    render(<ParticipantList roomId="room-1" />, { wrapper });

    await waitFor(() => {
      expect(
        screen.getByText(/diperbarui secara real-time/i),
      ).toBeInTheDocument();
    });
  });

  it("sends auth token in request header when provided", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    } as Response);

    render(<ParticipantList roomId="room-1" authToken="mytoken" />, { wrapper });

    await waitFor(() => expect(mockFetch).toHaveBeenCalled());

    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect((options.headers as Record<string, string>)["Authorization"]).toBe(
      "Participant mytoken",
    );
  });
});
