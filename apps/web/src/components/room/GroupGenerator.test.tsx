/**
 * GroupGenerator.test.tsx — P06-T05
 * Tests for GroupGenerator component.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GroupGenerator } from "@/components/room/GroupGenerator";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string, opts?: Record<string, unknown>) => {
    if (opts) return `${k}:${JSON.stringify(opts)}`;
    return k;
  }}),
}));

vi.mock("@/lib/api/groups", () => ({
  createGroup: vi.fn(),
  addGroupMember: vi.fn(),
  listGroups: vi.fn(),
  deleteGroup: vi.fn(),
  removeGroupMember: vi.fn(),
  getGroupSubmissions: vi.fn(),
  submitGroupWork: vi.fn(),
}));

import * as groupsApi from "@/lib/api/groups";
const mockCreate = groupsApi.createGroup as ReturnType<typeof vi.fn>;
const mockAddMember = groupsApi.addGroupMember as ReturnType<typeof vi.fn>;

const PARTICIPANTS = [
  { id: "p-1", alias: "Alice" },
  { id: "p-2", alias: "Bob" },
  { id: "p-3", alias: "Charlie" },
  { id: "p-4", alias: "Diana" },
];

function renderGenerator(participants = PARTICIPANTS) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <GroupGenerator roomId="r1" participants={participants} />
    </QueryClientProvider>,
  );
}

describe("GroupGenerator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows no-participants message when list is empty", () => {
    renderGenerator([]);
    expect(screen.getByText("generator.noParticipants")).toBeInTheDocument();
  });

  it("renders group count input defaulting to 2", () => {
    renderGenerator();
    const input = screen.getByLabelText("generator.groupCount") as HTMLInputElement;
    expect(input.value).toBe("2");
  });

  it("renders generate button", () => {
    renderGenerator();
    expect(screen.getByLabelText("generator.generate")).toBeInTheDocument();
  });

  it("calls createGroup and addGroupMember on generate", async () => {
    mockCreate
      .mockResolvedValueOnce({ id: "g-1", name: "Kelompok 1" })
      .mockResolvedValueOnce({ id: "g-2", name: "Kelompok 2" });
    mockAddMember.mockResolvedValue({});

    renderGenerator();
    fireEvent.click(screen.getByLabelText("generator.generate"));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledTimes(2);
      expect(mockAddMember).toHaveBeenCalledTimes(4); // 4 participants assigned
    });
  });
});
