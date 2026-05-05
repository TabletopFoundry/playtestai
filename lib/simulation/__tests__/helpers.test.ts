import { describe, expect, it } from "vitest";
import { getStat, decomposeCardStats } from "../helpers";
import { extraStatWeight } from "../agents";
import type { CardDefinition } from "@/lib/types";

function makeCard(overrides: Partial<CardDefinition> = {}): CardDefinition {
  return {
    id: "c1",
    name: "Test Card",
    cost: 2,
    power: 2,
    quantity: 4,
    stats: {},
    ...overrides,
  };
}

describe("getStat", () => {
  it("returns the stat value when present", () => {
    expect(getStat(makeCard({ stats: { damage: 5 } }), "damage")).toBe(5);
  });

  it("returns 0 for missing stats", () => {
    expect(getStat(makeCard({ stats: {} }), "damage")).toBe(0);
  });
});

describe("decomposeCardStats", () => {
  it("maps base stats directly", () => {
    const card = makeCard({ stats: { damage: 3, shield: 2, score: 5, economy: 1, draw: 1, combo: 2, steal: 1 } });
    const stats = decomposeCardStats(card, extraStatWeight);

    expect(stats.damage).toBe(3);
    expect(stats.shield).toBe(2);
    expect(stats.score).toBe(5);
    expect(stats.economy).toBe(1);
    expect(stats.draw).toBe(1);
    expect(stats.combo).toBe(2);
    expect(stats.steal).toBe(1);
  });

  it("rolls alias stats into base categories", () => {
    const card = makeCard({ stats: { damage: 2, reach: 3, shield: 1, sustain: 4, score: 1, points: 2, economy: 1, gold: 2, mana: 3 } });
    const stats = decomposeCardStats(card, extraStatWeight);

    expect(stats.damage).toBe(5);  // 2 + 3 (reach)
    expect(stats.shield).toBe(5);  // 1 + 4 (sustain)
    expect(stats.score).toBe(3);   // 1 + 2 (points)
    expect(stats.economy).toBe(6); // 1 + 2 (gold) + 3 (mana)
  });

  it("returns zeros for a card with no stats", () => {
    const stats = decomposeCardStats(makeCard(), extraStatWeight);

    expect(stats.damage).toBe(0);
    expect(stats.shield).toBe(0);
    expect(stats.score).toBe(0);
    expect(stats.economy).toBe(0);
    expect(stats.draw).toBe(0);
    expect(stats.combo).toBe(0);
    expect(stats.steal).toBe(0);
    expect(stats.custom).toBe(0);
  });

  it("passes custom stats through the extraStatWeight function", () => {
    const card = makeCard({ stats: { mystic: 5 } });
    const stats = decomposeCardStats(card, extraStatWeight);

    expect(stats.custom).toBeGreaterThan(0);
  });

  it("produces same damage as agents.ts calculateCardValue used to compute", () => {
    const card = makeCard({ stats: { damage: 4, reach: 2 } });
    const stats = decomposeCardStats(card, extraStatWeight);
    expect(stats.damage).toBe(6); // 4 + 2
  });
});
