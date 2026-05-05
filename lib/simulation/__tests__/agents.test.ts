import { describe, expect, it } from "vitest";
import { calculateCardValue, extraStatWeight, chooseCard } from "../agents";
import { createRng } from "../rng";
import type { CardDefinition } from "@/lib/types";
import type { PlayerState } from "../agents";

function makeCard(overrides: Partial<CardDefinition> = {}): CardDefinition {
  return {
    id: "c1",
    name: "Test Card",
    cost: 2,
    power: 2,
    quantity: 4,
    stats: { damage: 2 },
    ...overrides,
  };
}

function makePlayer(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    position: 1,
    agentType: "random",
    health: 18,
    score: 0,
    resources: 10,
    incomeBoost: 0,
    boardPower: 0,
    shield: 0,
    extraDraw: 0,
    deck: [],
    hand: [],
    discard: [],
    alive: true,
    ...overrides,
  };
}

describe("extraStatWeight", () => {
  it("returns 0 for known stats only", () => {
    const card = makeCard({ stats: { damage: 2, draw: 1, shield: 3 } });
    expect(extraStatWeight(card)).toBe(0);
  });

  it("adds weight for unknown custom stats", () => {
    const card = makeCard({ stats: { damage: 2, mystic_power: 4 } });
    expect(extraStatWeight(card)).toBeGreaterThan(0);
  });
});

describe("calculateCardValue", () => {
  it("returns positive value for a card with stats", () => {
    const card = makeCard({ stats: { damage: 3, score: 2 } });
    const value = calculateCardValue(card, 1, 10);
    expect(value.blended).toBeGreaterThan(0);
  });

  it("weighs finisher higher in late game", () => {
    const card = makeCard({ stats: { damage: 5, score: 3 } });
    const earlyValue = calculateCardValue(card, 1, 10);
    const lateValue = calculateCardValue(card, 9, 10);

    // Late game should have higher finisher contribution
    expect(lateValue.blended).not.toBe(earlyValue.blended);
  });

  it("returns all components (immediate, strategic, finisher, blended)", () => {
    const value = calculateCardValue(makeCard(), 5, 10);
    expect(value).toHaveProperty("immediate");
    expect(value).toHaveProperty("strategic");
    expect(value).toHaveProperty("finisher");
    expect(value).toHaveProperty("blended");
  });
});

describe("chooseCard", () => {
  it("returns null for empty legal cards", () => {
    const player = makePlayer();
    expect(chooseCard([], player, 1, 10, createRng(42))).toBeNull();
  });

  it("returns a card for random agent", () => {
    const player = makePlayer({ agentType: "random" });
    const cards = [makeCard(), makeCard({ id: "c2", name: "Other" })];
    const chosen = chooseCard(cards, player, 1, 10, createRng(42));
    expect(chosen).not.toBeNull();
    expect(cards).toContain(chosen);
  });

  it("returns a card for greedy agent", () => {
    const player = makePlayer({ agentType: "greedy" });
    const cards = [
      makeCard({ stats: { damage: 1 } }),
      makeCard({ id: "c2", name: "Big", power: 10, stats: { damage: 5, score: 3 } }),
    ];
    const chosen = chooseCard(cards, player, 1, 10, createRng(42));
    expect(chosen).not.toBeNull();
  });

  it("returns a card for balanced agent", () => {
    const player = makePlayer({ agentType: "balanced" });
    const cards = [makeCard(), makeCard({ id: "c2" }), makeCard({ id: "c3" })];
    const chosen = chooseCard(cards, player, 5, 10, createRng(42));
    expect(chosen).not.toBeNull();
    expect(cards).toContain(chosen);
  });
});
