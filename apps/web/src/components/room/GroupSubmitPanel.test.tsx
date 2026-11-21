/**
 * GroupSubmitPanel.test.tsx — P06-T04
 * Tests for GroupSubmitPanel (student leader submit form).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GroupSubmitPanel } from "@/components/room/GroupSubmitPanel";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock("@/lib/api/groups", () => ({
  listGroups: vi.fn(),
  submitGroupWork: vi.fn(),
}));

vi.mock("@/lib/api/activities", () => ({
  listActivities: vi.fn(),
}));

import * as groupsApi from "@/lib/api/groups";
import * as activitiesApi from "@/lib/api/activities";
const mockListGroups = groupsApi.listGroups as ReturnType<typeof vi.fn>;
const mockSubmit = groupsApi.submitGroupWork as ReturnType<typeof vi.fn>;
const mockListActivities = activitiesApi.listActivities as ReturnType<typeof vi.fn>;

const PARTICIPANT_ID = "p-1";
const GROUP_WITH_LEADER = {
  id: "g-1", room_id: "r1", name: "Team Alpha", whiteboard_id: null,
  members: [{ id: "m-1", group_id: "g-1", participant_id: PARTICIPANT_ID, is_leader: true }],
  created_at: "", updated_at: "",
};
const ACTIVE_TASK = {
  id: "act-1", room_id: "r1", type: "group_task", title: "Build a poster",
  status: "active", config: null, lesson_session_id: null,
  created_at: "", updated_at: "", questions: [],
};

function renderPanel() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <GroupSubmitPanel roomId="r1" participantId={PARTICIPANT_ID} participantToken="tok" />
    </QueryClientProvider>,
  );
}

describe("GroupSubmitPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows not-assigned message when no group", async () => {
    mockListGroups.mockResolvedValue([]);
    mockListActivities.mockResolvedValue([]);
    renderPanel();
    expect(await screen.findByText("group.notAssigned")).toBeInTheDocument();
  });

  it("shows no-active-task when in group but no task", async () => {
    mockListGroups.mockResolvedValue([GROUP_WITH_LEADER]);
    mockListActivities.mockResolvedValue([]);
    renderPanel();
    expect(await screen.findByText("group.noActiveTask")).toBeInTheDocument();
  });

  it("shows submit form for group leader with active task", async () => {
    mockListGroups.mockResolvedValue([GROUP_WITH_LEADER]);
    mockListActivities.mockResolvedValue([ACTIVE_TASK]);
    renderPanel();
    expect(await screen.findByText("Build a poster")).toBeInTheDocument();
    expect(screen.getByLabelText("group.submitPlaceholder")).toBeInTheDocument();
  });

  it("submits group work and shows success", async () => {
    mockListGroups.mockResolvedValue([GROUP_WITH_LEADER]);
    mockListActivities.mockResolvedValue([ACTIVE_TASK]);
    mockSubmit.mockResolvedValue({
      id: "sub-1", group_id: "g-1", activity_id: "act-1",
      content: { text: "done" }, submitted_by: PARTICIPANT_ID, submitted_at: null,
    });
    renderPanel();

    await screen.findByText("Build a poster");
    fireEvent.change(screen.getByLabelText("group.submitPlaceholder"), {
      target: { value: "Our answer" },
    });
    fireEvent.click(screen.getByText("group.submitButton"));

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith(
        "r1", "g-1", "act-1", { text: "Our answer" }, "tok",
      );
    });
    expect(await screen.findByText(/group\.submitted/)).toBeInTheDocument();
  });
});
