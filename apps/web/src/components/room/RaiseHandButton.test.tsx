/**
 * RaiseHandButton.test.tsx — P05-T03
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n";

// Mock presenterRequests API
vi.mock("@/lib/api/presenterRequests", () => ({
  raiseHand: vi.fn().mockResolvedValue({ id: "pr-1", status: "requested", scope: "draw_only", room_id: "r1", participant_id: "p1", expires_at: null, created_at: new Date().toISOString() }),
  deletePresenterRequest: vi.fn().mockResolvedValue(undefined),
}));

import { RaiseHandButton } from "@/components/room/RaiseHandButton";
import { raiseHand, deletePresenterRequest } from "@/lib/api/presenterRequests";

function wrapper({ children }: { children: React.ReactNode }) {
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}

beforeEach(() => vi.clearAllMocks());

describe("RaiseHandButton", () => {
  it("renders with 'Angkat Tangan' label initially", () => {
    render(<RaiseHandButton roomId="r1" />, { wrapper });
    expect(screen.getByRole("button", { name: /angkat tangan/i })).toBeInTheDocument();
  });

  it("aria-pressed is false initially", () => {
    render(<RaiseHandButton roomId="r1" />, { wrapper });
    expect(screen.getByTestId("raise-hand-btn")).toHaveAttribute("aria-pressed", "false");
  });

  it("calls raiseHand on click and updates to raised state", async () => {
    const user = userEvent.setup();
    render(<RaiseHandButton roomId="r1" participantToken="tok" />, { wrapper });

    await user.click(screen.getByTestId("raise-hand-btn"));

    await waitFor(() => {
      expect(raiseHand).toHaveBeenCalledWith("r1", "draw_only", "tok");
      expect(screen.getByRole("button", { name: /turunkan tangan/i })).toBeInTheDocument();
    });
  });

  it("calls deletePresenterRequest when lowering hand", async () => {
    const user = userEvent.setup();
    render(<RaiseHandButton roomId="r1" participantToken="tok" />, { wrapper });

    // Raise first
    await user.click(screen.getByTestId("raise-hand-btn"));
    await waitFor(() => expect(screen.getByRole("button", { name: /turunkan tangan/i })).toBeInTheDocument());

    // Lower
    await user.click(screen.getByTestId("raise-hand-btn"));
    await waitFor(() => {
      expect(deletePresenterRequest).toHaveBeenCalledWith("r1", "pr-1", "tok");
    });
  });
});
