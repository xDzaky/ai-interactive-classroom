/**
 * ConnectDeviceModal.test.tsx — P05-T06
 * Tests for ConnectDeviceModal component.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ConnectDeviceModal } from "@/components/room/ConnectDeviceModal";

// ── Mocks ─────────────────────────────────────────────────────────────────

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("qrcode.react", () => ({
  QRCodeSVG: ({ value }: { value: string }) => (
    <svg data-testid="qr-svg" data-value={value} />
  ),
}));

vi.mock("@/lib/api/devices", () => ({
  initiateDevice: vi.fn(),
  listDevices: vi.fn(),
  revokeDevice: vi.fn(),
}));

import * as devicesApi from "@/lib/api/devices";

const mockInitiate = devicesApi.initiateDevice as ReturnType<typeof vi.fn>;
const mockList = devicesApi.listDevices as ReturnType<typeof vi.fn>;
const mockRevoke = devicesApi.revokeDevice as ReturnType<typeof vi.fn>;

// ── Helpers ────────────────────────────────────────────────────────────────

function renderModal(open = true) {
  const onClose = vi.fn();
  const utils = render(
    <ConnectDeviceModal roomId="room-1" open={open} onClose={onClose} />,
  );
  return { ...utils, onClose };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("ConnectDeviceModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue([]);
  });

  it("renders nothing when closed", () => {
    renderModal(false);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders modal with generate button when open", async () => {
    renderModal();
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("device.generateQR")).toBeInTheDocument();
    expect(screen.getByText("device.generatePrompt")).toBeInTheDocument();
  });

  it("generates QR and shows it after clicking generate button", async () => {
    mockInitiate.mockResolvedValue({
      id: "dev-1",
      device_id: "d-uuid",
      device_name: "Mobile Controller",
      token: "tok-abc",
      paired_at: null,
      revoked_at: null,
    });
    mockList.mockResolvedValue([
      {
        id: "dev-1",
        device_id: "d-uuid",
        device_name: "Mobile Controller",
        paired_at: null,
        revoked_at: null,
      },
    ]);

    renderModal();

    // Wait for initial list load
    await waitFor(() => expect(mockList).toHaveBeenCalledOnce());

    const btn = screen.getByText("device.generateQR");
    fireEvent.click(btn);

    await waitFor(() => {
      expect(screen.getByTestId("qr-svg")).toBeInTheDocument();
    });

    const qr = screen.getByTestId("qr-svg");
    expect(qr.getAttribute("data-value")).toContain("tok-abc");
    expect(qr.getAttribute("data-value")).toContain("room-1");
  });

  it("shows devices in list and allows revoke", async () => {
    mockList.mockResolvedValue([
      {
        id: "dev-2",
        device_id: "d2-uuid",
        device_name: "iPad Mini",
        paired_at: "2026-01-01T00:00:00Z",
        revoked_at: null,
      },
    ]);
    mockRevoke.mockResolvedValue(undefined);

    renderModal();

    await waitFor(() => {
      expect(screen.getByText("iPad Mini")).toBeInTheDocument();
    });

    const revokeBtn = screen.getByRole("button", {
      name: /device\.revoke.*iPad Mini/i,
    });
    fireEvent.click(revokeBtn);

    await waitFor(() => {
      expect(mockRevoke).toHaveBeenCalledWith("room-1", "dev-2");
    });
  });

  it("calls onClose when close button clicked", async () => {
    const onClose = vi.fn();
    render(
      <ConnectDeviceModal roomId="room-1" open={true} onClose={onClose} />,
    );
    await waitFor(() => expect(mockList).toHaveBeenCalled());
    // Find close button (renders with aria-label="common.close")
    const closeBtn = screen.getByRole("button", { name: "common.close" });
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });
});
