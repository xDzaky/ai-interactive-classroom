/**
 * ActivityResponder.test.tsx — P06-T03
 * Tests for ActivityResponder (student answers active activity).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ActivityResponder } from "@/components/room/ActivityResponder";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock("@/lib/api/activities", () => ({
  listActivities: vi.fn(),
  submitAnswer: vi.fn(),
}));

import * as activitiesApi from "@/lib/api/activities";
const mockList = activitiesApi.listActivities as ReturnType<typeof vi.fn>;
const mockSubmit = activitiesApi.submitAnswer as ReturnType<typeof vi.fn>;

const ACTIVE_ACTIVITY = {
  id: "act-1", room_id: "r1", type: "poll", title: "Favourite Color?",
  status: "active", config: null, lesson_session_id: null,
  created_at: "", updated_at: "",
  questions: [
    { id: "q-1", activity_id: "act-1", body: "Pick one", options: ["Red", "Blue"], sort_order: 0 },
  ],
};

function renderResponder() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ActivityResponder roomId="r1" participantToken="tok" />
    </QueryClientProvider>,
  );
}

describe("ActivityResponder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows no-active message when no activity", async () => {
    mockList.mockResolvedValue([]);
    renderResponder();
    expect(await screen.findByText("activity.noActiveActivity")).toBeInTheDocument();
  });

  it("renders active activity with options", async () => {
    mockList.mockResolvedValue([ACTIVE_ACTIVITY]);
    renderResponder();
    expect(await screen.findByText("Favourite Color?")).toBeInTheDocument();
    expect(screen.getByLabelText("Red")).toBeInTheDocument();
    expect(screen.getByLabelText("Blue")).toBeInTheDocument();
  });

  it("submits selected answer", async () => {
    mockList.mockResolvedValue([ACTIVE_ACTIVITY]);
    mockSubmit.mockResolvedValue({
      id: "ans-1", activity_id: "act-1", question_id: "q-1",
      participant_id: "p-1", response: ["Red"], submitted_at: null,
    });
    renderResponder();

    await screen.findByText("Favourite Color?");
    fireEvent.click(screen.getByLabelText("Red"));
    fireEvent.click(screen.getByRole("button", { name: /activity\.submit.*Pick one/i }));

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith("r1", "act-1", "q-1", ["Red"], "tok");
    });
    expect(await screen.findByText(/activity\.answerSubmitted/)).toBeInTheDocument();
  });
});
