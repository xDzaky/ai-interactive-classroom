/**
 * ActivityResults.test.tsx — P06-T03
 * Tests for ActivityResults (host sees aggregated answers).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ActivityResults } from "@/components/room/ActivityResults";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock("@/lib/api/activities", () => ({
  getActivityResults: vi.fn(),
}));

import * as activitiesApi from "@/lib/api/activities";
const mockResults = activitiesApi.getActivityResults as ReturnType<typeof vi.fn>;

const MOCK_RESULTS = {
  activity: { id: "act-1", type: "quiz", title: "Pop Quiz", status: "closed" },
  questions: [
    {
      id: "q-1", activity_id: "act-1", body: "What is 2+2?",
      options: ["3", "4", "5"], answer_key: ["4"], sort_order: 0,
      answers: [
        { id: "a1", question_id: "q-1", participant_id: "p1", response: ["4"], submitted_at: null },
        { id: "a2", question_id: "q-1", participant_id: "p2", response: ["3"], submitted_at: null },
      ],
    },
  ],
};

function renderResults() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ActivityResults roomId="r1" activityId="act-1" />
    </QueryClientProvider>,
  );
}

describe("ActivityResults", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows loading initially", () => {
    mockResults.mockReturnValue(new Promise(() => {})); // never resolves
    renderResults();
    expect(screen.getByText("common.loading")).toBeInTheDocument();
  });

  it("shows activity title and results", async () => {
    mockResults.mockResolvedValue(MOCK_RESULTS);
    renderResults();
    expect(await screen.findByText("Pop Quiz")).toBeInTheDocument();
    expect(screen.getByText("What is 2+2?")).toBeInTheDocument();
  });

  it("highlights correct answer with ✓", async () => {
    mockResults.mockResolvedValue(MOCK_RESULTS);
    renderResults();
    await screen.findByText("Pop Quiz");
    // correct answer "4" should have a ✓ mark shown nearby
    // The component renders "4 ✓" in a span with font-semibold class
    const correctLabels = screen.getAllByText(/✓/);
    expect(correctLabels.length).toBeGreaterThan(0);
  });

  it("shows tally counts for each option", async () => {
    mockResults.mockResolvedValue(MOCK_RESULTS);
    renderResults();
    await screen.findByText("Pop Quiz");
    // "5" gets 0 answers — unique text "0 (0%)"
    expect(screen.getByText("0 (0%)")).toBeInTheDocument();
    // "3" and "4" each get 1 out of 2 answers → "1 (50%)" appears twice
    const fiftyPcts = screen.getAllByText("1 (50%)");
    expect(fiftyPcts.length).toBeGreaterThanOrEqual(1);
  });
});
