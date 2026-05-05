import { randomUUID } from "crypto";
import { simulateBatch } from "@/lib/simulation/engine";
import type { CreateProjectInput, GameProject, GameVersion, SimulationConfig, SimulationRun } from "@/lib/types";
import { deepClone } from "@/lib/utils";

function now() {
  return new Date().toISOString();
}

export function createStarterVersion(projectId: string, label = "v1.0"): GameVersion {
  const timestamp = now();
  return {
    id: randomUUID(),
    projectId,
    label,
    published: false,
    playerCountMin: 2,
    playerCountMax: 4,
    winConditionType: "highest_score",
    targetScore: 40,
    maxTurns: 10,
    startingHealth: 18,
    startingHandSize: 5,
    resources: [
      { id: randomUUID(), name: "Mana", startAmount: 2, gainPerTurn: 2 },
      { id: randomUUID(), name: "Focus", startAmount: 0, gainPerTurn: 1 },
    ],
    cards: [
      { id: randomUUID(), name: "Scout Familiar", cost: 1, power: 1, quantity: 4, stats: { draw: 1, score: 1 } },
      { id: randomUUID(), name: "Rune Guard", cost: 3, power: 3, quantity: 3, stats: { shield: 2 } },
      { id: randomUUID(), name: "Arc Bolt", cost: 2, power: 2, quantity: 4, stats: { damage: 2 } },
      { id: randomUUID(), name: "Vault Sprite", cost: 2, power: 1, quantity: 3, stats: { economy: 1, score: 1 } },
      { id: randomUUID(), name: "Skybreaker", cost: 5, power: 5, quantity: 2, stats: { damage: 3, score: 2 } },
    ],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function createProjectFromInput(input: CreateProjectInput): GameProject {
  const timestamp = now();
  const projectId = randomUUID();
  const version = createStarterVersion(projectId);
  version.playerCountMin = input.playerCountMin;
  version.playerCountMax = input.playerCountMax;
  version.winConditionType = input.winConditionType;
  version.updatedAt = timestamp;

  return {
    id: projectId,
    name: input.name,
    description: input.description,
    createdAt: timestamp,
    updatedAt: timestamp,
    versions: [version],
    runs: [],
  };
}

function createRun(projectId: string, version: GameVersion, config: SimulationConfig, label: string): SimulationRun {
  return {
    id: randomUUID(),
    projectId,
    versionId: version.id,
    label,
    createdAt: now(),
    config,
    result: simulateBatch(version, config),
  };
}

export function getSeedProjects(): GameProject[] {
  const createdAt = now();

  const spellforgeProjectId = randomUUID();
  const spellforgeBase: GameVersion = {
    id: randomUUID(),
    projectId: spellforgeProjectId,
    label: "v1.0-baseline",
    published: false,
    playerCountMin: 2,
    playerCountMax: 4,
    winConditionType: "highest_score",
    targetScore: 48,
    maxTurns: 10,
    startingHealth: 18,
    startingHandSize: 5,
    resources: [
      { id: randomUUID(), name: "Mana", startAmount: 2, gainPerTurn: 2 },
      { id: randomUUID(), name: "Focus", startAmount: 1, gainPerTurn: 1 },
    ],
    cards: [
      { id: randomUUID(), name: "Mana Sprite", cost: 1, power: 1, quantity: 4, stats: { economy: 1, draw: 1 } },
      { id: randomUUID(), name: "Ember Mage", cost: 3, power: 3, quantity: 3, stats: { damage: 3, score: 1 } },
      { id: randomUUID(), name: "Aegis Golem", cost: 4, power: 4, quantity: 3, stats: { shield: 3 } },
      { id: randomUUID(), name: "Archive Sage", cost: 2, power: 1, quantity: 3, stats: { draw: 2, score: 1 } },
      { id: randomUUID(), name: "Crystal Dragon", cost: 6, power: 6, quantity: 2, stats: { damage: 4, score: 3, combo: 1 } },
      { id: randomUUID(), name: "Duelist", cost: 2, power: 2, quantity: 4, stats: { damage: 1, score: 1 } },
      { id: randomUUID(), name: "Leyline Engine", cost: 4, power: 2, quantity: 2, stats: { economy: 2, shield: 1 } },
      { id: randomUUID(), name: "Crowned Phoenix", cost: 5, power: 4, quantity: 2, stats: { score: 3, draw: 1 } },
    ],
    createdAt,
    updatedAt: createdAt,
  };

  const spellforgeVariant = deepClone(spellforgeBase);
  spellforgeVariant.id = randomUUID();
  spellforgeVariant.label = "v1.1-variant-b";
  spellforgeVariant.updatedAt = now();
  spellforgeVariant.cards = spellforgeVariant.cards.map((card) => {
    if (card.name === "Crystal Dragon") {
      return { ...card, cost: 7, stats: { ...card.stats, damage: 3, score: 2 } };
    }
    if (card.name === "Leyline Engine") {
      return { ...card, cost: 5, stats: { economy: 1, shield: 2 } };
    }
    if (card.name === "Duelist") {
      return { ...card, power: 3, stats: { ...card.stats, damage: 2 } };
    }
    return card;
  });

  const relicProjectId = randomUUID();
  const relicBase: GameVersion = {
    id: randomUUID(),
    projectId: relicProjectId,
    label: "v1.0-core-loop",
    published: false,
    playerCountMin: 2,
    playerCountMax: 4,
    winConditionType: "first_to_x",
    targetScore: 55,
    maxTurns: 12,
    startingHealth: 20,
    startingHandSize: 5,
    resources: [{ id: randomUUID(), name: "Gold", startAmount: 1, gainPerTurn: 2 }],
    cards: [
      { id: randomUUID(), name: "Treasure Map", cost: 1, power: 1, quantity: 4, stats: { economy: 1, score: 1 } },
      { id: randomUUID(), name: "Trap Runner", cost: 2, power: 2, quantity: 4, stats: { damage: 2, score: 1 } },
      { id: randomUUID(), name: "Relic Keeper", cost: 3, power: 3, quantity: 3, stats: { shield: 2, score: 1 } },
      { id: randomUUID(), name: "Lucky Find", cost: 2, power: 1, quantity: 3, stats: { draw: 1, score: 2 } },
      { id: randomUUID(), name: "Mercenary Captain", cost: 4, power: 4, quantity: 3, stats: { damage: 3 } },
      { id: randomUUID(), name: "Vaultbreaker", cost: 5, power: 5, quantity: 2, stats: { damage: 2, score: 3 } },
      { id: randomUUID(), name: "Shrine Archivist", cost: 3, power: 2, quantity: 3, stats: { draw: 2, score: 1 } },
      { id: randomUUID(), name: "Royal Banner", cost: 4, power: 2, quantity: 2, stats: { shield: 2, score: 3 } },
    ],
    createdAt,
    updatedAt: createdAt,
  };

  const spellforgeConfig: SimulationConfig = {
    games: 320,
    playerCount: 4,
    seed: 2024,
    agentTypes: ["greedy", "balanced", "random", "balanced"],
  };

  const relicConfig: SimulationConfig = {
    games: 280,
    playerCount: 3,
    seed: 5050,
    agentTypes: ["balanced", "greedy", "random"],
  };

  return [
    {
      id: spellforgeProjectId,
      name: "Spellforge Arena",
      description: "High-tempo spell duel with a known opener issue. Seeded with baseline + variant B for quick A/B tests.",
      createdAt,
      updatedAt: now(),
      versions: [spellforgeBase, spellforgeVariant],
      runs: [
        createRun(spellforgeProjectId, spellforgeBase, spellforgeConfig, "Seed · baseline sweep"),
        createRun(spellforgeProjectId, spellforgeVariant, { ...spellforgeConfig, seed: 2025 }, "Seed · variant B sweep"),
      ],
    },
    {
      id: relicProjectId,
      name: "Relic Rush",
      description: "Race-to-score treasure crawler used as the default example for balanced economy pacing.",
      createdAt,
      updatedAt: now(),
      versions: [relicBase],
      runs: [createRun(relicProjectId, relicBase, relicConfig, "Seed · sprint benchmark")],
    },
  ];
}
