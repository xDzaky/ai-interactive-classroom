/**
 * StudentAiTutor.test.tsx — P08-T07
 * Component tests for StudentAiTutor.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

// Mock useAiJob
const mockSubmit = vi.fn();
const mockReset = vi.fn();
let mockAiJobState = {
  status: "idle" as string,
  result: null as null | { status: string; result: Record<string, unknown> | null; tokens_used: number },
  error: null as string | null,
};

vi.mock("../../hooks/useAiJob", () => ({
  useAiJob: () => ({
    ...mockAiJobState,
    submit: mockSubmit,
    reset: mockReset,
  }),
}));

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "id" },
  }),
}));

import StudentAiTutor from "./StudentAiTutor";

describe("StudentAiTutor", () => {
  beforeEach(() => {
    mockSubmit.mockClear();
    mockReset.mockClear();
    mockAiJobState = { status: "idle", result: null, error: null };
  });

  // 1. Renders input and send button
  it("renders chat input and send button", () => {
    render(<StudentAiTutor />);
    expect(screen.getByTestId("tutor-input")).toBeDefined();
    expect(screen.getByTestId("tutor-send")).toBeDefined();
    expect(screen.getByTestId("tutor-empty")).toBeDefined();
  });

  // 2. Send button disabled when input is empty
  it("send button is disabled when input is empty", () => {
    render(<StudentAiTutor />);
    const btn = screen.getByTestId("tutor-send") as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  // 3. Submits with correct payload on form submit
  it("calls submit with hint system prompt when question is entered", () => {
    render(<StudentAiTutor roomId="room-abc" topic="Fotosintesis" />);
    const input = screen.getByTestId("tutor-input");
    fireEvent.change(input, { target: { value: "Apa itu klorofil?" } });
    fireEvent.submit(input.closest("form")!);
    expect(mockSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "completion",
        roomId: "room-abc",
        payload: expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({ role: "system" }),
            expect.objectContaining({ role: "user", content: "Apa itu klorofil?" }),
          ]),
        }),
      })
    );
  });

  // 4. Shows thinking indicator while loading
  it("shows thinking bubble while loading", () => {
    mockAiJobState = { status: "running", result: null, error: null };
    render(<StudentAiTutor />);
    expect(screen.getByTestId("tutor-thinking")).toBeDefined();
  });

  // 5. Shows error state on failure
  it("shows error and retry button on failure", () => {
    mockAiJobState = { status: "failed", result: null, error: "submitFailed" };
    render(<StudentAiTutor />);
    expect(screen.getByTestId("tutor-error")).toBeDefined();
    expect(screen.getByTestId("tutor-retry")).toBeDefined();
  });

  // 6. Topic is rendered in header when provided
  it("shows topic in header when provided", () => {
    render(<StudentAiTutor topic="Fisika Kuantum" />);
    expect(screen.getByText("Fisika Kuantum")).toBeDefined();
  });

  // 7. Input clears after submit
  it("clears input after submit", () => {
    render(<StudentAiTutor />);
    const input = screen.getByTestId("tutor-input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Pertanyaan test" } });
    expect(input.value).toBe("Pertanyaan test");
    fireEvent.submit(input.closest("form")!);
    expect(input.value).toBe("");
  });

  // 8. Renders without roomId (optional prop)
  it("renders correctly without roomId prop", () => {
    render(<StudentAiTutor />);
    expect(screen.getByTestId("student-ai-tutor")).toBeDefined();
  });
});
