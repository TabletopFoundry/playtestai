import { describe, expect, it } from "vitest";
import { expandDeck, aggregateStartingResources, aggregateIncome, applyDamage, resolveCardPlay } from "../mechanics";
import type { CardDefinition, GameVersion } from "@/lib/types";
import type { PlayerState } from "../agents";

function makeCard(overrides: Partial<CardDefinition> = {}): CardDefinition {
  return {
    id: "c1",
    name: "Test Card",
    cost: 2,
    power: 2,
    quantity: 3,
    stats: { damage: 2 },
    ...overrides,
  };
}

function makePlayer(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    position: 1,
    agentType: "random",
    health: 18,
    score: 10,
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

function makeVersion(overrides: Partial<GameVersion> = {}): GameVersion {
  return {
    id: "v1",
    projectId: "p1",
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
      { id: "r2", name: "Focus", startAmount: 1, gainPerTurn: 1 },
    ],
    cards: [makeCard()],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("expandDeck", () => {
  it("expands cards by their quantity", () => {
    const deck = expandDeck([makeCard({ quantity: 3 }), makeCard({ id: "c2", quantity: 2 })]);
    expect(deck).toHaveLength(5);
  });

  it("uses minimum quantity of 1", () => {
    const deck = expandDeck([makeCard({ quantity: 0 })]);
    expect(deck).toHaveLength(1);
  });

  it("creates independent card copies", () => {
    const deck = expandDeck([makeCard({ quantity: 2 })]);
    deck[0]!.stats["custom"] = 99;
    expect(deck[1]!.stats["custom"]).toBeUndefined();
  });
});

describe("aggregateStartingResources", () => {
  it("sums startAmount of all resources", () => {
    const version = makeVersion();
    expect(aggregateStartingResources(version)).toBe(3); // 2 + 1
  });
});

describe("aggregateIncome", () => {
  it("sums gainPerTurn of all resources", () => {
    const version = makeVersion();
    expect(aggregateIncome(version)).toBe(3); // 2 + 1
  });
});

describe("applyDamage", () => {
  it("reduces health when no shield", () => {
    const target = makePlayer({ health: 18, shield: 0 });
    applyDamage(target, 5);
    expect(target.health).toBe(13);
  });

  it("absorbs damage with shield first", () => {
    const target = makePlayer({ health: 18, shield: 3 });
    applyDamage(target, 5);
    expect(target.shield).toBe(0);
    expect(target.health).toBe(16); // 5 - 3 shield = 2 damage
  });

  it("marks player as dead when health reaches 0", () => {
    const target = makePlayer({ health: 3, shield: 0 });
    applyDamage(target, 10);
    expect(target.health).toBe(0);
    expect(target.alive).toBe(false);
  });

  it("reduces score as penalty for unshielded damage", () => {
    const target = makePlayer({ health: 18, shield: 0, score: 10 });
    applyDamage(target, 6);
    expect(target.score).toBeLessThan(10);
  });
});

describe("resolveCardPlay", () => {
  const stubRng = () => 0.5;

  it("removes the played card from hand by id", () => {
    const card = makeCard({ id: "c1", name: "Fireball", cost: 2 });
    const sameNameCard = makeCard({ id: "c2", name: "Fireball", cost: 2, power: 5 });
    const player = makePlayer({
      resources: 10,
      hand: [sameNameCard, card],
    });

    resolveCardPlay(card, player, [player], 1, 10, stubRng);

    expect(player.hand).toHaveLength(1);
    expect(player.hand[0]!.id).toBe("c2");
  });

  it("does not corrupt hand when card id is not found", () => {
    const card = makeCard({ id: "missing", cost: 2 });
    const otherCard = makeCard({ id: "c1", cost: 1 });
    const player = makePlayer({
      resources: 10,
      hand: [otherCard],
    });

    resolveCardPlay(card, player, [player], 1, 10, stubRng);

    // Hand should be unchanged — splice(-1) bug would have removed otherCard
    expect(player.hand).toHaveLength(1);
    expect(player.hand[0]!.id).toBe("c1");
  });
});
