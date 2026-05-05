import { describe, expect, it } from "vitest";
import { validateVersionPlayable } from "../engine";
import type { GameVersion } from "@/lib/types";

function makeVersion(overrides: Partial<GameVersion> = {}): GameVersion {
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
    resources: [{ id: "r1", name: "Mana", startAmount: 2, gainPerTurn: 2 }],
    cards: [
      { id: "c1", name: "Scout", cost: 1, power: 1, quantity: 4, stats: { draw: 1 } },
      { id: "c2", name: "Guard", cost: 3, power: 3, quantity: 3, stats: { shield: 2 } },
      { id: "c3", name: "Bolt", cost: 2, power: 2, quantity: 4, stats: { damage: 2 } },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("validateVersionPlayable", () => {
  it("returns no errors for a valid version", () => {
    const issues = validateVersionPlayable(makeVersion());
    const errors = issues.filter((i) => i.severity === "error");
    expect(errors).toHaveLength(0);
  });

  it("returns error when no cards", () => {
    const issues = validateVersionPlayable(makeVersion({ cards: [] }));
    expect(issues.some((i) => i.severity === "error" && i.field === "cards")).toBe(true);
  });

  it("returns error when no resources", () => {
    const issues = validateVersionPlayable(makeVersion({ resources: [] }));
    expect(issues.some((i) => i.severity === "error" && i.field === "resources")).toBe(true);
  });

  it("returns error when min players exceeds max", () => {
    const issues = validateVersionPlayable(makeVersion({ playerCountMin: 5, playerCountMax: 2 }));
    expect(issues.some((i) => i.severity === "error" && i.field === "playerCountMin")).toBe(true);
  });

  it("returns error when deck is too small", () => {
    const issues = validateVersionPlayable(
      makeVersion({
        startingHandSize: 5,
        cards: [{ id: "c1", name: "Only", cost: 1, power: 1, quantity: 2, stats: {} }],
      }),
    );
    expect(issues.some((i) => i.severity === "error" && i.message.includes("Deck is too small"))).toBe(true);
  });

  it("returns warning for zero-cost cards", () => {
    const issues = validateVersionPlayable(
      makeVersion({
        cards: [
          { id: "c1", name: "Free", cost: 0, power: 1, quantity: 4, stats: { score: 1 } },
          { id: "c2", name: "Normal", cost: 2, power: 2, quantity: 8, stats: { score: 1 } },
        ],
      }),
    );
    expect(issues.some((i) => i.severity === "warning" && i.message.includes("zero or negative cost"))).toBe(true);
  });

  it("returns warning for very short max turns", () => {
    const issues = validateVersionPlayable(makeVersion({ maxTurns: 4 }));
    expect(issues.some((i) => i.severity === "warning" && i.field === "maxTurns")).toBe(true);
  });

  it("returns issues with correct structure", () => {
    const issues = validateVersionPlayable(makeVersion({ cards: [], resources: [] }));
    for (const issue of issues) {
      expect(issue).toHaveProperty("severity");
      expect(issue).toHaveProperty("message");
      expect(["error", "warning"]).toContain(issue.severity);
    }
  });
});
