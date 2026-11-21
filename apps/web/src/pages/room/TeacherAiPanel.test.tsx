/**
 * TeacherAiPanel.test.tsx — P08-T06
 * Component tests for TeacherAiPanel.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";

// Mock useAiJob hook
const mockSubmit = vi.fn();
const mockReset = vi.fn();
let mockAiJobState: {
  status: string;
  result: null | { status: string; result: Record<string, unknown> | null; tokens_used: number };
  error: string | null;
} = {
  status: "idle",
  result: null,
  error: null,
};

vi.mock("../../hooks/useAiJob", () => ({
  useAiJob: () => ({
    ...mockAiJobState,
    submit: mockSubmit,
    reset: mockReset,
  }),
}));

// Mock useSyncStatus
vi.mock("../../lib/useSyncStatus", () => ({
  useSyncStatus: () => ({
    syncState: "synced",
    status: "synced",
  }),
}));

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "id" },
  }),
}));

import TeacherAiPanel from "./TeacherAiPanel";

describe("TeacherAiPanel", () => {
  beforeEach(() => {
    mockSubmit.mockClear();
    mockReset.mockClear();
    mockAiJobState = { status: "idle", result: null, error: null };
  });

  // 1. Renders mode buttons and textarea
  it("renders outline and quiz mode buttons", () => {
    render(<TeacherAiPanel />);
    expect(screen.getByTestId("mode-outline")).toBeDefined();
    expect(screen.getByTestId("mode-quiz")).toBeDefined();
    expect(screen.getByTestId("ai-topic")).toBeDefined();
    expect(screen.getByTestId("ai-submit")).toBeDefined();
  });

  // 2. Submit button disabled when topic is empty
  it("submit button is disabled when topic is empty", () => {
    render(<TeacherAiPanel />);
    const submitBtn = screen.getByTestId("ai-submit") as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);
  });

  // 3. Calls submit with correct payload on form submission
  it("calls submit with correct payload when topic is entered and form submitted", async () => {
    render(<TeacherAiPanel roomId="room-123" />);
    const textarea = screen.getByTestId("ai-topic");
    fireEvent.change(textarea, { target: { value: "Fotosintesis" } });
    const submitBtn = screen.getByTestId("ai-submit");
    fireEvent.click(submitBtn);
    expect(mockSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "completion",
        roomId: "room-123",
        payload: expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({ role: "user", content: "Fotosintesis" }),
          ]),
        }),
      })
    );
  });

  // 4. Shows loading state while running
  it("shows thinking indicator when status is running", () => {
    mockAiJobState = { status: "running", result: null, error: null };
    render(<TeacherAiPanel />);
    expect(screen.getByRole("status")).toBeDefined();
  });

  // 5. Shows error state on failure
  it("shows error message and retry button on failure", () => {
    mockAiJobState = { status: "failed", result: null, error: "submitFailed" };
    render(<TeacherAiPanel />);
    expect(screen.getByTestId("ai-error")).toBeDefined();
    expect(screen.getByTestId("ai-retry")).toBeDefined();
  });

  // 6. Shows result with approve/edit buttons when done
  it("shows result and approve/edit buttons when done", () => {
    mockAiJobState = {
      status: "done",
      result: { status: "done", result: { content: "Hasil outline..." }, tokens_used: 100 },
      error: null,
    };
    render(<TeacherAiPanel />);
    expect(screen.getByTestId("ai-result")).toBeDefined();
    expect(screen.getByTestId("ai-approve")).toBeDefined();
    expect(screen.getByTestId("ai-edit")).toBeDefined();
  });

  // 7. onApprove callback is called when approve is clicked
  it("calls onApprove callback when approve button is clicked", async () => {
    const onApprove = vi.fn();
    mockAiJobState = {
      status: "done",
      result: { status: "done", result: { content: "Outline test" }, tokens_used: 50 },
      error: null,
    };
    render(<TeacherAiPanel onApprove={onApprove} />);

    // Wait for effect to populate editedContent
    await waitFor(() => {
      expect(screen.getByTestId("ai-result-content")).toBeDefined();
    });

    fireEvent.click(screen.getByTestId("ai-approve"));
    expect(onApprove).toHaveBeenCalledWith("Outline test", "outline");
    expect(mockReset).toHaveBeenCalled();
  });

  // 8. Mode switch resets job state
  it("resets AI job when mode is switched", () => {
    render(<TeacherAiPanel />);
    fireEvent.click(screen.getByTestId("mode-quiz"));
    expect(mockReset).toHaveBeenCalled();
  });
});
