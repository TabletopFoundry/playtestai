import { describe, expect, it } from "vitest";
import { simulateBatch } from "../engine";
import type { GameVersion, SimulationConfig } from "@/lib/types";

function makeVersion(): GameVersion {
  return {
    id: "test-id",
    projectId: "test-project",
    label: "v1.0",
    published: false,
    playerCountMin: 2,
    playerCountMax: 4,
    winConditionType: "highest_score",
    targetScore: 40,
    maxTurns: 10,
    startingHealth: 18,
    startingHandSize: 5,
    resources: [
      { id: "r1", name: "Mana", startAmount: 2, gainPerTurn: 2 },
    ],
    cards: [
      { id: "c1", name: "Scout", cost: 1, power: 1, quantity: 4, stats: { draw: 1, score: 1 } },
      { id: "c2", name: "Guard", cost: 3, power: 3, quantity: 3, stats: { shield: 2 } },
      { id: "c3", name: "Bolt", cost: 2, power: 2, quantity: 4, stats: { damage: 2 } },
      { id: "c4", name: "Sprite", cost: 2, power: 1, quantity: 3, stats: { economy: 1, score: 1 } },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function makeConfig(overrides: Partial<SimulationConfig> = {}): SimulationConfig {
  return {
    games: 100,
    playerCount: 2,
    seed: 42,
    agentTypes: ["random", "greedy"],
    ...overrides,
  };
}

describe("simulateBatch", () => {
  it("returns a valid result structure", () => {
    const result = simulateBatch(makeVersion(), makeConfig());

    expect(result.config).toBeDefined();
    expect(result.winRatesByPosition).toHaveLength(2);
    expect(result.strategyBreakdown).toBeDefined();
    expect(result.gameLengthHistogram).toBeDefined();
    expect(result.scoreDistribution).toBeDefined();
    expect(result.cardRankings).toBeDefined();
    expect(result.summary).toBeDefined();
    expect(result.summary.overallBalanceScore).toBeGreaterThanOrEqual(0);
    expect(result.generatedAt).toBeDefined();
  });

  it("is deterministic with same seed", () => {
    const version = makeVersion();
    const config = makeConfig({ seed: 1337 });

    const result1 = simulateBatch(version, config);
    const result2 = simulateBatch(version, config);

    expect(result1.summary.overallBalanceScore).toBe(result2.summary.overallBalanceScore);
    expect(result1.summary.averageTurns).toBe(result2.summary.averageTurns);
    expect(result1.summary.firstPlayerAdvantage).toBe(result2.summary.firstPlayerAdvantage);
  });

  it("produces different results with different seeds", () => {
    const version = makeVersion();
    const result1 = simulateBatch(version, makeConfig({ seed: 1 }));
    const result2 = simulateBatch(version, makeConfig({ seed: 9999 }));

    // At least some metrics should differ with different seeds
    const same = result1.summary.averageTurns === result2.summary.averageTurns
      && result1.summary.firstPlayerAdvantage === result2.summary.firstPlayerAdvantage;
    expect(same).toBe(false);
  });

  it("win rates sum to approximately 100%", () => {
    const result = simulateBatch(makeVersion(), makeConfig({ games: 500 }));
    const totalWinRate = result.winRatesByPosition.reduce((sum, entry) => sum + entry.winRate, 0);
    expect(totalWinRate).toBeCloseTo(100, 0);
  });

  it("card rankings include all cards", () => {
    const version = makeVersion();
    const result = simulateBatch(version, makeConfig());
    expect(result.cardRankings.length).toBe(version.cards.length);
  });

  it("handles different agent types", () => {
    const result = simulateBatch(makeVersion(), makeConfig({
      playerCount: 3,
      agentTypes: ["random", "greedy", "balanced"],
    }));
    expect(result.strategyBreakdown.length).toBeGreaterThan(0);
  });

  it("includes the failing game index in simulation errors", () => {
    expect(() => simulateBatch(makeVersion(), makeConfig({ games: 1, playerCount: 0, agentTypes: [] }))).toThrow(
      "Simulation failed during game 1 of 1: Simulation requires at least one player.",
    );
  });
});
