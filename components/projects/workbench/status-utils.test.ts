import { describe, expect, it } from "vitest";
import type { GameProject, GameVersion, ValidationIssue } from "@/lib/types";
import { countValidationIssues, getVersionStateLabel, getWorkspaceStatusSummary } from "./status-utils";

const baseVersion: GameVersion = {
  id: "version-a",
  projectId: "project-1",
  label: "v1.0",
  published: false,
  playerCountMin: 2,
  playerCountMax: 4,
  winConditionType: "highest_score",
  targetScore: 20,
  maxTurns: 12,
  startingHealth: 15,
  startingHandSize: 5,
  resources: [{ id: "r1", name: "Mana", startAmount: 2, gainPerTurn: 1 }],
  cards: [{ id: "c1", name: "Scout", cost: 1, power: 1, quantity: 4, stats: { score: 1 } }],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const issues: ValidationIssue[] = [
  { severity: "error", message: "Need at least one card." },
  { severity: "warning", message: "Only one resource defined." },
];

const run: GameProject["runs"][number] = {
  id: "run-1",
  projectId: "project-1",
  versionId: "version-a",
  label: "v1.0 · 750 games",
  createdAt: "2026-01-02T00:00:00.000Z",
  config: { games: 750, playerCount: 2, seed: 42, agentTypes: ["random", "greedy"] },
  result: {
    generatedAt: "2026-01-02T00:00:00.000Z",
    config: { games: 750, playerCount: 2, seed: 42, agentTypes: ["random", "greedy"] },
    winRatesByPosition: [],
    strategyBreakdown: [],
    gameLengthHistogram: [],
    scoreDistribution: [],
    cardRankings: [],
    summary: {
      overallBalanceScore: 76,
      averageTurns: 8,
      averageWinningScore: 21,
      firstPlayerAdvantage: 5,
      dominantStrategy: null,
      dominantStrategyWinRate: 0,
      recommendation: "Looks solid.",
      flaggedIssues: [],
    },
  },
};

describe("countValidationIssues", () => {
  it("returns separate error and warning counts", () => {
    expect(countValidationIssues(issues)).toEqual({ errors: 1, warnings: 1 });
  });
});

describe("getVersionStateLabel", () => {
  it("maps version lifecycle labels", () => {
    expect(getVersionStateLabel(baseVersion)).toBe("Draft");
    expect(getVersionStateLabel({ published: true })).toBe("Published");
  });
});

describe("getWorkspaceStatusSummary", () => {
  it("prioritizes blocking validation issues", () => {
    expect(getWorkspaceStatusSummary({ version: baseVersion, issues, selectedRun: null, dirty: false })).toMatchObject({
      tone: "danger",
      title: "1 blocker stopping simulations",
    });
  });

  it("surfaces unsaved work when there are no blockers", () => {
    expect(getWorkspaceStatusSummary({ version: baseVersion, issues: [], selectedRun: null, dirty: true })).toMatchObject({
      tone: "warn",
      title: "v1.0 has unsaved changes",
    });
  });

  it("recognizes when the selected version already has a current run", () => {
    expect(getWorkspaceStatusSummary({ version: baseVersion, issues: [], selectedRun: run, dirty: false })).toMatchObject({
      tone: "accent",
      title: "v1.0 has a current benchmark",
    });
  });
});

