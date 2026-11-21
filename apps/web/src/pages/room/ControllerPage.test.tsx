/**
 * ControllerPage.test.tsx — P05-T05
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

import { ControllerPage } from "@/pages/room/ControllerPage";

function wrapper(initialPath = "/controller?room=r1&token=tok") {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>
      <I18nextProvider i18n={i18n}>
        <MemoryRouter initialEntries={[initialPath]}>
          <Routes>
            <Route path="/controller" element={children} />
          </Routes>
        </MemoryRouter>
      </I18nextProvider>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockResolvedValue({ ok: true, status: 201, json: async () => ({}) });
});

describe("ControllerPage", () => {
  it("renders controller page with navigation buttons", () => {
    const Wrapper = wrapper();
    render(<ControllerPage />, { wrapper: Wrapper });

    expect(screen.getByTestId("controller-page")).toBeInTheDocument();
    expect(screen.getByTestId("btn-prev")).toBeInTheDocument();
    expect(screen.getByTestId("btn-next")).toBeInTheDocument();
    expect(screen.getByTestId("btn-zoom-in")).toBeInTheDocument();
    expect(screen.getByTestId("btn-zoom-out")).toBeInTheDocument();
  });

  it("shows token-required message when no token in URL", () => {
    const Wrapper = wrapper("/controller?room=r1");
    render(<ControllerPage />, { wrapper: Wrapper });

    expect(screen.queryByTestId("controller-page")).not.toBeInTheDocument();
    expect(screen.getByText(/token diperlukan/i)).toBeInTheDocument();
  });

  it("sends device.next_page event on next-page button click", async () => {
    const user = userEvent.setup();
    const Wrapper = wrapper();
    render(<ControllerPage />, { wrapper: Wrapper });

    await user.click(screen.getByTestId("btn-next"));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v1/rooms/r1/events",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("device.next_page"),
        }),
      );
    });
  });

  it("toggles blank state on blank button click", async () => {
    const user = userEvent.setup();
    const Wrapper = wrapper();
    render(<ControllerPage />, { wrapper: Wrapper });

    const btn = screen.getByTestId("btn-blank");
    expect(btn).toHaveAttribute("aria-pressed", "false");
    await user.click(btn);
    expect(btn).toHaveAttribute("aria-pressed", "true");
  });

  it("sends device.prev_page event on prev button click", async () => {
    const user = userEvent.setup();
    const Wrapper = wrapper();
    render(<ControllerPage />, { wrapper: Wrapper });

    await user.click(screen.getByTestId("btn-prev"));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v1/rooms/r1/events",
        expect.objectContaining({
          body: expect.stringContaining("device.prev_page"),
        }),
      );
    });
  });
});
