/**
 * ActivityBuilder.test.tsx — P06-T03
 * Tests for ActivityBuilder (host creates/starts activities).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ActivityBuilder } from "@/components/room/ActivityBuilder";

// ── Mocks ─────────────────────────────────────────────────────────────────

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock("@/lib/api/activities", () => ({
  listActivities: vi.fn(),
  createActivity: vi.fn(),
  updateActivity: vi.fn(),
}));

// Mock ActivityResults to avoid deep nesting
vi.mock("@/components/room/ActivityResults", () => ({
  ActivityResults: () => <div data-testid="activity-results" />,
}));

import * as activitiesApi from "@/lib/api/activities";
const mockList = activitiesApi.listActivities as ReturnType<typeof vi.fn>;
const mockCreate = activitiesApi.createActivity as ReturnType<typeof vi.fn>;
const mockUpdate = activitiesApi.updateActivity as ReturnType<typeof vi.fn>;

function renderBuilder() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ActivityBuilder roomId="room-1" />
    </QueryClientProvider>,
  );
}

describe("ActivityBuilder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue([]);
  });

  it("renders activity header and create button", async () => {
    renderBuilder();
    expect(await screen.findByText("activity.title")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /activity\.createNew/i })).toBeInTheDocument();
  });

  it("shows create form when create button is clicked", async () => {
    renderBuilder();
    await screen.findByText("activity.title");
    fireEvent.click(screen.getByRole("button", { name: /activity\.createNew/i }));
    expect(screen.getByLabelText("activity.titleLabel")).toBeInTheDocument();
  });

  it("lists existing activities from API", async () => {
    mockList.mockResolvedValue([
      {
        id: "a-1", room_id: "room-1", type: "poll", title: "My Poll",
        status: "draft", questions: [], config: null,
        lesson_session_id: null, created_at: "", updated_at: "",
      },
    ]);
    renderBuilder();
    expect(await screen.findByText("My Poll")).toBeInTheDocument();
    expect(screen.getByText("activity.status.draft")).toBeInTheDocument();
  });

  it("start button calls updateActivity with status active", async () => {
    mockList.mockResolvedValue([
      {
        id: "a-2", room_id: "room-1", type: "poll", title: "Active Test",
        status: "draft", questions: [], config: null,
        lesson_session_id: null, created_at: "", updated_at: "",
      },
    ]);
    mockUpdate.mockResolvedValue({ id: "a-2", status: "active" });

    renderBuilder();
    const startBtn = await screen.findByRole("button", { name: /activity\.start.*Active Test/i });
    fireEvent.click(startBtn);

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith("room-1", "a-2", { status: "active" });
    });
  });
});
