/**
 * GroupWorkspace.test.tsx — P06-T04
 * Tests for GroupWorkspace (host panel: create group, list, delete).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GroupWorkspace } from "@/components/room/GroupWorkspace";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock("@/lib/api/groups", () => ({
  listGroups: vi.fn(),
  createGroup: vi.fn(),
  deleteGroup: vi.fn(),
  addGroupMember: vi.fn(),
  removeGroupMember: vi.fn(),
  getGroupSubmissions: vi.fn(),
}));

import * as groupsApi from "@/lib/api/groups";
const mockList = groupsApi.listGroups as ReturnType<typeof vi.fn>;
const mockCreate = groupsApi.createGroup as ReturnType<typeof vi.fn>;
const mockDelete = groupsApi.deleteGroup as ReturnType<typeof vi.fn>;

const SAMPLE_GROUPS = [
  {
    id: "g-1", room_id: "r1", name: "Team Alpha", whiteboard_id: null,
    members: [], created_at: "", updated_at: "",
  },
];

function renderHost(participants: { id: string; alias: string }[] = []) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <GroupWorkspace roomId="r1" participants={participants} />
    </QueryClientProvider>,
  );
}

describe("GroupWorkspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows no-groups message when empty", async () => {
    mockList.mockResolvedValue([]);
    renderHost();
    expect(await screen.findByText("group.noGroups")).toBeInTheDocument();
  });

  it("renders existing groups", async () => {
    mockList.mockResolvedValue(SAMPLE_GROUPS);
    renderHost();
    expect(await screen.findByText(/Team Alpha/)).toBeInTheDocument();
  });

  it("renders create group input and button", async () => {
    mockList.mockResolvedValue([]);
    renderHost();
    // Wait for async data to settle
    await screen.findByText("group.noGroups");
    // Create input and button should be present
    expect(screen.getByLabelText("group.namePlaceholder")).toBeInTheDocument();
    expect(screen.getByLabelText("group.create")).toBeInTheDocument();
  });

  it("deletes a group on ✕ click", async () => {
    mockList.mockResolvedValue(SAMPLE_GROUPS);
    mockDelete.mockResolvedValue(undefined);
    renderHost();

    await screen.findByText(/Team Alpha/);
    fireEvent.click(screen.getByLabelText("group.delete Team Alpha"));

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith("r1", "g-1");
    });
  });
});
