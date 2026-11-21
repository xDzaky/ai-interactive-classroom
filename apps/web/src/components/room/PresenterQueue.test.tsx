/**
 * PresenterQueue.test.tsx — P05-T03
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n";
import type { PresenterRequest } from "@/lib/api/presenterRequests";

// Inline mock data — vi.mock factory is hoisted so top-level vars are unavailable
vi.mock("@/lib/api/presenterRequests", () => ({
  listPresenterRequests: vi.fn().mockResolvedValue([
    {
      id: "pr-1",
      room_id: "r1",
      participant_id: "p1",
      status: "requested",
      scope: "draw_only",
      expires_at: null,
      created_at: "2026-01-01T00:00:00Z",
      participant: { id: "p1", alias: "Alice", role: "student" },
    },
  ]),
  updatePresenterRequest: vi.fn().mockResolvedValue({
    id: "pr-1",
    room_id: "r1",
    participant_id: "p1",
    status: "approved",
    scope: "draw_only",
    expires_at: null,
    created_at: "2026-01-01T00:00:00Z",
  }),
  deletePresenterRequest: vi.fn().mockResolvedValue(undefined),
  raiseHand: vi.fn(),
}));

import { PresenterQueue } from "@/components/room/PresenterQueue";
import { listPresenterRequests, updatePresenterRequest } from "@/lib/api/presenterRequests";

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
    </QueryClientProvider>
  );
}

beforeEach(() => vi.clearAllMocks());

describe("PresenterQueue", () => {
  it("shows pending requests", async () => {
    render(<PresenterQueue roomId="r1" authToken="tok" />, { wrapper });

    await waitFor(() => {
      expect(screen.getByTestId("presenter-queue")).toBeInTheDocument();
      expect(screen.getByText("Alice")).toBeInTheDocument();
    });
  });

  it("renders nothing when no pending requests", async () => {
    vi.mocked(listPresenterRequests).mockResolvedValueOnce([]);
    const { container } = render(<PresenterQueue roomId="r1" />, { wrapper });

    await waitFor(() => {
      expect(listPresenterRequests).toHaveBeenCalled();
    });
    expect(container.firstChild).toBeNull();
  });

  it("opens ApproveDialog on queue item click", async () => {
    const user = userEvent.setup();
    render(<PresenterQueue roomId="r1" authToken="tok" />, { wrapper });

    await waitFor(() => expect(screen.getByText("Alice")).toBeInTheDocument());

    await user.click(screen.getByTestId("queue-item-pr-1"));

    expect(screen.getByTestId("approve-dialog")).toBeInTheDocument();
  });

  it("calls updatePresenterRequest with approved on approve click", async () => {
    const user = userEvent.setup();
    render(<PresenterQueue roomId="r1" authToken="tok" />, { wrapper });

    await waitFor(() => expect(screen.getByText("Alice")).toBeInTheDocument());
    await user.click(screen.getByTestId("queue-item-pr-1"));
    await user.click(screen.getByTestId("approve-btn"));

    await waitFor(() => {
      expect(updatePresenterRequest).toHaveBeenCalledWith(
        "r1", "pr-1", "approved", "draw_only", "tok",
      );
    });
  });
});
