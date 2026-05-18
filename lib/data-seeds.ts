import { randomUUID } from "crypto";
import type {
  AgentType,
  CardDefinition,
  CreateProjectInput,
  GameProject,
  GameVersion,
  ResourceDefinition,
  SimulationBatchResult,
  SimulationConfig,
  SimulationRun,
  WinConditionType,
} from "@/lib/types";

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

type BaseRules = Pick<
  GameVersion,
  | "playerCountMin"
  | "playerCountMax"
  | "winConditionType"
  | "targetScore"
  | "maxTurns"
  | "startingHealth"
  | "startingHandSize"
>;

type CardArchetype = {
  slug: string;
  title: string;
  cost: number;
  power: number;
  quantity: number;
  stats: Record<string, number>;
  notes?: string;
};

type CardFamily = {
  slug: string;
  title: string;
  statBoost?: Record<string, number>;
  costShift?: number;
  powerShift?: number;
  quantityShift?: number;
  notes?: string;
};

type ResourceSeed = {
  slug: string;
  name: string;
  startAmount: number;
  gainPerTurn: number;
};

type CardTweak = {
  costDelta?: number;
  powerDelta?: number;
  quantityDelta?: number;
  statAdjustments?: Record<string, number>;
  notes?: string;
};

type ResourceTweak = {
  name?: string;
  startAmountDelta?: number;
  gainPerTurnDelta?: number;
};

type VersionSeed = {
  slug: string;
  label: string;
  published: boolean;
  createdOffset: number;
  updatedOffset: number;
  overrides?: Partial<BaseRules>;
  resourceTweaks?: Record<string, ResourceTweak>;
  cardTweaks?: Record<string, CardTweak>;
};

type ResultProfile = {
  overallBalanceScore: number;
  averageTurns: number;
  averageWinningScore: number;
  firstPlayerAdvantage: number;
  dominantStrategy: AgentType | null;
  dominantStrategyWinRate: number;
  flaggedIssues: string[];
  recommendation: string;
  favoriteCardKeys?: string[];
};

type RunSeed = {
  slug: string;
  versionSlug: string;
  label: string;
  createdOffset: number;
  config: SimulationConfig;
  profile: ResultProfile;
};

type ProjectSeed = {
  slug: string;
  name: string;
  description: string;
  createdOffset: number;
  families: CardFamily[];
  resources: ResourceSeed[];
  baseRules: BaseRules;
  versions: VersionSeed[];
  runs: RunSeed[];
};

const SEED_START_MS = Date.parse("2025-01-06T09:00:00.000Z");
const ALL_AGENT_TYPES: AgentType[] = ["random", "greedy", "balanced"];

const CARD_ARCHETYPES: CardArchetype[] = [
  { slug: "scout", title: "Scout", cost: 1, power: 1, quantity: 4, stats: { draw: 1, score: 1 }, notes: "Smooths early draws." },
  { slug: "broker", title: "Broker", cost: 1, power: 1, quantity: 4, stats: { economy: 1, score: 1 }, notes: "Accelerates the shared economy." },
  { slug: "duelist", title: "Duelist", cost: 2, power: 2, quantity: 4, stats: { damage: 2 }, notes: "Reliable tempo pressure." },
  { slug: "warden", title: "Warden", cost: 2, power: 2, quantity: 3, stats: { shield: 2 }, notes: "Protects fragile engines." },
  { slug: "seer", title: "Seer", cost: 3, power: 1, quantity: 3, stats: { draw: 2, insight: 1 }, notes: "Filters for combo pieces." },
  { slug: "channeler", title: "Channeler", cost: 3, power: 3, quantity: 3, stats: { combo: 1, score: 1 }, notes: "Turns setup into payoff." },
  { slug: "saboteur", title: "Saboteur", cost: 4, power: 3, quantity: 3, stats: { damage: 2, steal: 1 }, notes: "Punishes greedy leaders." },
  { slug: "titan", title: "Titan", cost: 5, power: 5, quantity: 2, stats: { damage: 3, score: 2 }, notes: "Late-game closer." },
];

function timestamp(offsetHours: number) {
  return new Date(SEED_START_MS + offsetHours * 60 * 60 * 1000).toISOString();
}

function seedId(...parts: string[]) {
  return ["seed", ...parts].join("-");
}

function round(value: number, decimals = 1) {
  const scale = 10 ** decimals;
  return Math.round(value * scale) / scale;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function sumStats(stats: Record<string, number>) {
  return Object.values(stats).reduce((total, value) => total + value, 0);
}

function normalizePercentages(values: number[]) {
  const total = values.reduce((sum, value) => sum + value, 0) || 1;
  const percentages = values.map((value) => round((value / total) * 100, 1));
  const lastIndex = percentages.length - 1;
  if (lastIndex >= 0) {
    const difference = round(100 - percentages.reduce((sum, value) => sum + value, 0), 1);
    percentages[lastIndex] = round(percentages[lastIndex]! + difference, 1);
  }
  return percentages;
}

function distributeCounts(percentages: number[], total: number) {
  const counts = percentages.map((percentage) => Math.round((percentage / 100) * total));
  const lastIndex = counts.length - 1;
  if (lastIndex >= 0) {
    const difference = total - counts.reduce((sum, value) => sum + value, 0);
    counts[lastIndex] = counts[lastIndex]! + difference;
  }
  return counts;
}

function mergeStats(baseStats: Record<string, number>, adjustments?: Record<string, number>) {
  const merged = { ...baseStats };
  for (const [key, value] of Object.entries(adjustments ?? {})) {
    const nextValue = (merged[key] ?? 0) + value;
    if (nextValue === 0) {
      delete merged[key];
      continue;
    }
    merged[key] = nextValue;
  }
  return merged;
}

function cardIdFor(projectSlug: string, versionSlug: string, cardKey: string) {
  const [familySlug, archetypeSlug] = cardKey.split(".");
  return seedId("card", projectSlug, versionSlug, familySlug ?? "unknown", archetypeSlug ?? "unknown");
}

function buildResources(projectSlug: string, versionSlug: string, resources: ResourceSeed[], tweaks?: Record<string, ResourceTweak>): ResourceDefinition[] {
  return resources.map((resource) => {
    const tweak = tweaks?.[resource.slug];
    return {
      id: seedId("resource", projectSlug, versionSlug, resource.slug),
      name: tweak?.name ?? resource.name,
      startAmount: Math.max(0, resource.startAmount + (tweak?.startAmountDelta ?? 0)),
      gainPerTurn: resource.gainPerTurn + (tweak?.gainPerTurnDelta ?? 0),
    };
  });
}

function buildCards(projectSlug: string, versionSlug: string, families: CardFamily[], tweaks?: Record<string, CardTweak>): CardDefinition[] {
  return families.flatMap((family) => CARD_ARCHETYPES.map((archetype) => {
    const key = `${family.slug}.${archetype.slug}`;
    const tweak = tweaks?.[key];
    const baseStats = mergeStats(archetype.stats, family.statBoost);
    const stats = mergeStats(baseStats, tweak?.statAdjustments);
    return {
      id: seedId("card", projectSlug, versionSlug, family.slug, archetype.slug),
      name: `${family.title} ${archetype.title}`,
      cost: Math.max(0, archetype.cost + (family.costShift ?? 0) + (tweak?.costDelta ?? 0)),
      power: Math.max(0, archetype.power + (family.powerShift ?? 0) + (tweak?.powerDelta ?? 0)),
      quantity: Math.max(1, archetype.quantity + (family.quantityShift ?? 0) + (tweak?.quantityDelta ?? 0)),
      stats,
      notes: tweak?.notes ?? family.notes ?? archetype.notes,
    };
  }));
}

function createPositionWinRates(config: SimulationConfig, firstPlayerAdvantage: number) {
  const playerCount = config.playerCount;
  const base = 100 / playerCount;
  const trailingPenalty = playerCount > 1 ? firstPlayerAdvantage / (playerCount - 1) : 0;
  const raw = Array.from({ length: playerCount }, (_, index) => {
    const laneBias = index === 0 ? firstPlayerAdvantage : -trailingPenalty;
    const seatGradient = (playerCount - index - 1) * 0.6;
    return Math.max(1, base + laneBias + seatGradient);
  });
  const winRates = normalizePercentages(raw);
  const wins = distributeCounts(winRates, config.games);
  return winRates.map((winRate, index) => ({
    position: index + 1,
    wins: wins[index] ?? 0,
    winRate,
  }));
}

function createStrategyBreakdown(config: SimulationConfig, profile: ResultProfile) {
  const dominantRate = profile.dominantStrategy ? clamp(profile.dominantStrategyWinRate, 0, 95) : 0;
  const remainder = profile.dominantStrategy ? 100 - dominantRate : 100;
  const activeAgents = new Set(config.agentTypes);
  const baseWeights = ALL_AGENT_TYPES.map((agent, index) => {
    if (profile.dominantStrategy === agent) {
      return dominantRate;
    }
    const weight = activeAgents.has(agent) ? 1.15 - index * 0.1 : 0.75 - index * 0.05;
    return Math.max(0.2, weight * (remainder / (profile.dominantStrategy ? 2 : 3)));
  });
  const winRates = normalizePercentages(baseWeights);
  const wins = distributeCounts(winRates, config.games);
  return ALL_AGENT_TYPES.map((agent, index) => ({
    agent,
    wins: wins[index] ?? 0,
    winRate: winRates[index] ?? 0,
  }));
}

function createHistogram(total: number, buckets: string[], emphasis: number[]) {
  const counts = distributeCounts(normalizePercentages(emphasis), total);
  return buckets.map((bucket, index) => ({ bucket, count: counts[index] ?? 0 }));
}

function createCardRankings(
  version: GameVersion,
  config: SimulationConfig,
  profile: ResultProfile,
  favoriteCardIds: string[] = [],
) {
  const favoriteIds = new Set(favoriteCardIds);
  return [...version.cards]
    .map((card, index) => {
      const statWeight = Object.entries(card.stats).reduce((total, [key, value]) => {
        switch (key) {
          case "damage":
            return total + value * 1.7;
          case "score":
          case "points":
            return total + value * 1.5;
          case "shield":
            return total + value * 1.1;
          case "draw":
            return total + value * 1.3;
          case "economy":
          case "mana":
          case "gold":
            return total + value * 1.4;
          case "combo":
            return total + value * 1.25;
          case "steal":
            return total + value * 1.6;
          default:
            return total + value * 0.9;
        }
      }, 0);
      const spotlightBonus = favoriteIds.has(card.id) ? 6 : 0;
      const averageImpact = round(card.power * 1.5 + statWeight + spotlightBonus / 2 + Math.max(0, 5 - index * 0.2), 1);
      const inclusionRate = clamp(round(18 + card.quantity * 10 + card.cost * 4 + spotlightBonus * 1.5 - index * 0.6, 1), 14, 98);
      const winCorrelation = clamp(round((averageImpact * 1.45 - 10) + (profile.overallBalanceScore - 70) * 0.06 + spotlightBonus * 0.8, 1), -16, 42);
      const powerScore = clamp(round(averageImpact * 4.8 + inclusionRate * 0.35 + winCorrelation * 1.6, 1), 20, 99);
      const totalPlays = Math.max(12, Math.round(config.games * (0.18 + card.quantity * 0.08 + (spotlightBonus ? 0.1 : 0))));
      const winnerPlays = Math.min(totalPlays, Math.max(0, Math.round(totalPlays * clamp((48 + winCorrelation) / 100, 0.05, 0.95))));
      return {
        cardId: card.id,
        cardName: card.name,
        totalPlays,
        winnerPlays,
        winCorrelation,
        averageImpact,
        inclusionRate,
        powerScore,
      };
    })
    .sort((left, right) => right.powerScore - left.powerScore);
}

function createSyntheticResult(
  version: GameVersion,
  config: SimulationConfig,
  profile: ResultProfile,
  favoriteCardIds: string[] = [],
): SimulationBatchResult {
  const clampedTurns = clamp(profile.averageTurns, 1, version.maxTurns);
  const lengthCenter = Math.max(2, Math.round(clampedTurns));
  const gameLengthBuckets = Array.from({ length: 6 }, (_, index) => String(clamp(lengthCenter - 2 + index, 1, version.maxTurns)));
  const scoreCenter = Math.max(8, Math.round(profile.averageWinningScore));
  const scoreBuckets = Array.from({ length: 6 }, (_, index) => `${Math.max(0, scoreCenter - 10 + index * 4)}-${Math.max(4, scoreCenter - 7 + index * 4)}`);

  return {
    generatedAt: timestamp((Date.parse(version.updatedAt) - SEED_START_MS) / (60 * 60 * 1000) + 1),
    config,
    winRatesByPosition: createPositionWinRates(config, profile.firstPlayerAdvantage),
    strategyBreakdown: createStrategyBreakdown(config, profile),
    gameLengthHistogram: createHistogram(config.games, gameLengthBuckets, [0.6, 1.1, 1.6, 1.4, 0.9, 0.5]),
    scoreDistribution: createHistogram(config.games * config.playerCount, scoreBuckets, [0.7, 1, 1.4, 1.6, 1.1, 0.8]),
    cardRankings: createCardRankings(version, config, profile, favoriteCardIds),
    summary: {
      overallBalanceScore: profile.overallBalanceScore,
      averageTurns: round(clampedTurns, 1),
      averageWinningScore: round(profile.averageWinningScore, 1),
      firstPlayerAdvantage: round(profile.firstPlayerAdvantage, 1),
      dominantStrategy: profile.dominantStrategy,
      dominantStrategyWinRate: round(profile.dominantStrategyWinRate, 1),
      recommendation: profile.recommendation,
      flaggedIssues: profile.flaggedIssues,
    },
  };
}

function buildProject(spec: ProjectSeed): GameProject {
  const projectId = seedId("project", spec.slug);
  const versions = spec.versions.map((versionSeed) => {
    const versionId = seedId("version", spec.slug, versionSeed.slug);
    const rules = { ...spec.baseRules, ...versionSeed.overrides };
    const createdAt = timestamp(spec.createdOffset + versionSeed.createdOffset);
    const updatedAt = timestamp(spec.createdOffset + versionSeed.updatedOffset);
    return {
      id: versionId,
      projectId,
      label: versionSeed.label,
      published: versionSeed.published,
      playerCountMin: rules.playerCountMin,
      playerCountMax: rules.playerCountMax,
      winConditionType: rules.winConditionType,
      targetScore: rules.targetScore,
      maxTurns: rules.maxTurns,
      startingHealth: rules.startingHealth,
      startingHandSize: rules.startingHandSize,
      resources: buildResources(spec.slug, versionSeed.slug, spec.resources, versionSeed.resourceTweaks),
      cards: buildCards(spec.slug, versionSeed.slug, spec.families, versionSeed.cardTweaks),
      createdAt,
      updatedAt,
    } satisfies GameVersion;
  });

  const versionBySlug = new Map(spec.versions.map((versionSeed, index) => [versionSeed.slug, versions[index]!])) as Map<string, GameVersion>;
  const runs = spec.runs.map((runSeed) => {
    const version = versionBySlug.get(runSeed.versionSlug);
    if (!version) {
      throw new Error(`Missing version ${runSeed.versionSlug} for seed project ${spec.slug}.`);
    }
    return {
      id: seedId("run", spec.slug, runSeed.slug),
      projectId,
      versionId: version.id,
      label: runSeed.label,
      createdAt: timestamp(spec.createdOffset + runSeed.createdOffset),
      config: runSeed.config,
      result: createSyntheticResult(
        version,
        runSeed.config,
        runSeed.profile,
        (runSeed.profile.favoriteCardKeys ?? []).map((key) => cardIdFor(spec.slug, runSeed.versionSlug, key)),
      ),
    } satisfies SimulationRun;
  });

  const projectCreatedAt = timestamp(spec.createdOffset);
  const updatedAt = [
    projectCreatedAt,
    ...versions.map((version) => version.updatedAt),
    ...runs.map((run) => run.createdAt),
  ].sort().at(-1) ?? projectCreatedAt;

  return {
    id: projectId,
    name: spec.name,
    description: spec.description,
    createdAt: projectCreatedAt,
    updatedAt,
    versions,
    runs,
  };
}

function buildArchiveProject(): GameProject {
  const projectId = seedId("project", "blank-canvas-lab");
  const createdAt = timestamp(720);
  return {
    id: projectId,
    name: "Blank Canvas Lab",
    description: "Archive shell used to validate empty-state handling. It intentionally starts with zero versions and zero simulations.",
    createdAt,
    updatedAt: createdAt,
    versions: [],
    runs: [],
  };
}

function buildSingleCardProject(): GameProject {
  const projectId = seedId("project", "lone-colossus-testbed");
  const version: GameVersion = {
    id: seedId("version", "lone-colossus-testbed", "v0-1-single-card"),
    projectId,
    label: "v0.1-single-card",
    published: false,
    playerCountMin: 2,
    playerCountMax: 2,
    winConditionType: "highest_score",
    targetScore: 18,
    maxTurns: 6,
    startingHealth: 12,
    startingHandSize: 2,
    resources: [
      {
        id: seedId("resource", "lone-colossus-testbed", "v0-1-single-card", "energy"),
        name: "Energy",
        startAmount: 3,
        gainPerTurn: 1,
      },
    ],
    cards: [
      {
        id: seedId("card", "lone-colossus-testbed", "v0-1-single-card", "colossus", "solo"),
        name: "Lone Colossus",
        cost: 2,
        power: 9,
        quantity: 1,
        stats: { damage: 7, score: 6, combo: 3 },
        notes: "Single-card edge case for deterministic stress testing.",
      },
    ],
    createdAt: timestamp(760),
    updatedAt: timestamp(766),
  };

  const config: SimulationConfig = {
    games: 240,
    playerCount: 2,
    seed: 9090,
    agentTypes: ["greedy", "greedy"],
  };

  const run: SimulationRun = {
    id: seedId("run", "lone-colossus-testbed", "extreme-degeneracy"),
    projectId,
    versionId: version.id,
    label: "Extreme degeneracy audit · 240 games",
    createdAt: timestamp(767),
    config,
    result: createSyntheticResult(version, config, {
      overallBalanceScore: 9,
      averageTurns: 2.8,
      averageWinningScore: 24.4,
      firstPlayerAdvantage: 58.2,
      dominantStrategy: "greedy",
      dominantStrategyWinRate: 96.7,
      flaggedIssues: [
        "Single-card deck collapses all variance and gives the opening player a near-forced win.",
        "Balance score is intentionally extreme to exercise warning states and reporting copy.",
      ],
      recommendation: "Keep this project as a regression fixture only. It should never be used as a playable baseline.",
      favoriteCardKeys: [],
    }),
  };

  return {
    id: projectId,
    name: "Lone Colossus Testbed",
    description: "Minimal one-card project that intentionally produces absurd analytics so UI warning states can be verified.",
    createdAt: timestamp(759),
    updatedAt: run.createdAt,
    versions: [version],
    runs: [run],
  };
}

const PROJECT_SEEDS: ProjectSeed[] = [
  {
    slug: "spellforge-arena",
    name: "Spellforge Arena",
    description: "Deck builder with explosive spell chains. The latest two versions are staged as an A/B comparison between safer combo pacing and a greedier finisher package.",
    createdOffset: 0,
    families: [
      { slug: "ember", title: "Ember", statBoost: { tempo: 1 } },
      { slug: "rune", title: "Rune", statBoost: { reach: 1 }, powerShift: 1 },
      { slug: "prism", title: "Prism", statBoost: { sustain: 1 } },
      { slug: "storm", title: "Storm", statBoost: { influence: 1 }, costShift: 1 },
    ],
    resources: [
      { slug: "mana", name: "Mana", startAmount: 2, gainPerTurn: 2 },
      { slug: "focus", name: "Focus", startAmount: 1, gainPerTurn: 1 },
    ],
    baseRules: {
      playerCountMin: 2,
      playerCountMax: 4,
      winConditionType: "highest_score",
      targetScore: 48,
      maxTurns: 10,
      startingHealth: 18,
      startingHandSize: 5,
    },
    versions: [
      {
        slug: "v1-0-baseline",
        label: "v1.0-baseline",
        published: true,
        createdOffset: 0,
        updatedOffset: 4,
        cardTweaks: {
          "ember.titan": { statAdjustments: { damage: 1 } },
          "storm.channeler": { statAdjustments: { combo: 1 } },
        },
      },
      {
        slug: "v1-1-economy-pass",
        label: "v1.1-economy-pass",
        published: true,
        createdOffset: 36,
        updatedOffset: 40,
        resourceTweaks: { focus: { gainPerTurnDelta: -1 } },
        cardTweaks: {
          "ember.broker": { statAdjustments: { economy: -1, score: 1 } },
          "prism.seer": { statAdjustments: { draw: 1 } },
          "storm.channeler": { costDelta: 1, statAdjustments: { combo: -1 } },
        },
      },
      {
        slug: "v1-2-combo-nerf",
        label: "v1.2-combo-nerf",
        published: true,
        createdOffset: 72,
        updatedOffset: 76,
        overrides: { targetScore: 50 },
        cardTweaks: {
          "ember.titan": { costDelta: 1, statAdjustments: { damage: -1, score: 1 } },
          "rune.duelist": { powerDelta: -1, statAdjustments: { damage: -1 } },
          "prism.warden": { statAdjustments: { shield: 1 } },
        },
      },
      {
        slug: "v1-3-ab-candidate-a",
        label: "v1.3-ab-candidate-a",
        published: true,
        createdOffset: 108,
        updatedOffset: 112,
        cardTweaks: {
          "ember.broker": { statAdjustments: { economy: -1, draw: 1 } },
          "storm.titan": { costDelta: 1, statAdjustments: { score: -1 } },
          "prism.channeler": { statAdjustments: { combo: -1, sustain: 1 } },
        },
      },
      {
        slug: "v1-4-ab-candidate-b",
        label: "v1.4-ab-candidate-b",
        published: false,
        createdOffset: 144,
        updatedOffset: 148,
        cardTweaks: {
          "ember.duelist": { statAdjustments: { damage: -1, score: 1 } },
          "rune.seer": { statAdjustments: { draw: 1, reach: 1 } },
          "storm.titan": { costDelta: 1, statAdjustments: { damage: -1, influence: 1 } },
        },
      },
    ],
    runs: [
      {
        slug: "baseline-audit",
        versionSlug: "v1-0-baseline",
        label: "Baseline audit · 600 games",
        createdOffset: 6,
        config: { games: 600, playerCount: 4, seed: 2024, agentTypes: ["greedy", "balanced", "random", "balanced"] },
        profile: {
          overallBalanceScore: 58.4,
          averageTurns: 7.8,
          averageWinningScore: 52.1,
          firstPlayerAdvantage: 14.8,
          dominantStrategy: "greedy",
          dominantStrategyWinRate: 63.2,
          flaggedIssues: [
            "Storm finishers close games too quickly when the opening player curves Broker into Channeler.",
            "Greedy agents over-index on Ember Titan, suggesting a burst package that is too rewarding.",
          ],
          recommendation: "Reduce combo density before wider playtests. This baseline still rewards seat one too heavily.",
          favoriteCardKeys: ["ember.titan", "storm.channeler"],
        },
      },
      {
        slug: "economy-pass",
        versionSlug: "v1-1-economy-pass",
        label: "Economy pass regression · 700 games",
        createdOffset: 42,
        config: { games: 700, playerCount: 4, seed: 2025, agentTypes: ["balanced", "greedy", "random", "balanced"] },
        profile: {
          overallBalanceScore: 67.1,
          averageTurns: 8.4,
          averageWinningScore: 50.3,
          firstPlayerAdvantage: 9.6,
          dominantStrategy: null,
          dominantStrategyWinRate: 37.8,
          flaggedIssues: ["Prism draw engines are healthier, but Rune Duelist still spikes too often in mirrored openings."],
          recommendation: "The economy pass helped. Focus the next pass on individual early attackers rather than systemic resource gains.",
          favoriteCardKeys: ["prism.seer", "rune.duelist"],
        },
      },
      {
        slug: "candidate-a",
        versionSlug: "v1-3-ab-candidate-a",
        label: "A/B candidate A · 900 games",
        createdOffset: 114,
        config: { games: 900, playerCount: 4, seed: 3031, agentTypes: ["balanced", "balanced", "greedy", "random"] },
        profile: {
          overallBalanceScore: 74.6,
          averageTurns: 8.9,
          averageWinningScore: 49.8,
          firstPlayerAdvantage: 6.8,
          dominantStrategy: null,
          dominantStrategyWinRate: 35.5,
          flaggedIssues: ["Late-game Storm Titans remain polarizing despite better pacing elsewhere."],
          recommendation: "Candidate A is close, but the finisher package still feels swingy enough to justify a second branch.",
          favoriteCardKeys: ["storm.titan", "rune.seer"],
        },
      },
      {
        slug: "candidate-b",
        versionSlug: "v1-4-ab-candidate-b",
        label: "A/B candidate B · 900 games",
        createdOffset: 150,
        config: { games: 900, playerCount: 4, seed: 3032, agentTypes: ["balanced", "balanced", "greedy", "random"] },
        profile: {
          overallBalanceScore: 82.3,
          averageTurns: 9.1,
          averageWinningScore: 48.7,
          firstPlayerAdvantage: 4.2,
          dominantStrategy: null,
          dominantStrategyWinRate: 34.1,
          flaggedIssues: [],
          recommendation: "Candidate B wins the A/B pass. Keep it as the draft branch for tabletop validation.",
          favoriteCardKeys: ["rune.seer", "ember.duelist"],
        },
      },
    ],
  },
  {
    slug: "neon-circuit",
    name: "Neon Circuit",
    description: "Trading-card style duel about bandwidth denial and burst combos. Seeded with shared-config candidate runs so the compare tab immediately has meaningful branches.",
    createdOffset: 180,
    families: [
      { slug: "pulse", title: "Pulse", statBoost: { tempo: 1 } },
      { slug: "glitch", title: "Glitch", statBoost: { hack: 1 } },
      { slug: "chrome", title: "Chrome", statBoost: { shield: 1 } },
      { slug: "ghost", title: "Ghost", statBoost: { reach: 1 }, powerShift: -1 },
    ],
    resources: [
      { slug: "energy", name: "Energy", startAmount: 1, gainPerTurn: 2 },
      { slug: "bandwidth", name: "Bandwidth", startAmount: 0, gainPerTurn: 1 },
    ],
    baseRules: {
      playerCountMin: 2,
      playerCountMax: 4,
      winConditionType: "first_to_x",
      targetScore: 60,
      maxTurns: 11,
      startingHealth: 20,
      startingHandSize: 5,
    },
    versions: [
      {
        slug: "v2-0-launch-meta",
        label: "v2.0-launch-meta",
        published: true,
        createdOffset: 0,
        updatedOffset: 4,
        cardTweaks: {
          "pulse.duelist": { statAdjustments: { damage: 1 } },
          "glitch.saboteur": { statAdjustments: { steal: 1, hack: 1 } },
        },
      },
      {
        slug: "v2-1-bandwidth-pass",
        label: "v2.1-bandwidth-pass",
        published: true,
        createdOffset: 32,
        updatedOffset: 36,
        resourceTweaks: { bandwidth: { gainPerTurnDelta: -1 } },
        cardTweaks: {
          "glitch.broker": { statAdjustments: { economy: -1, hack: 1 } },
          "chrome.warden": { powerDelta: 1 },
        },
      },
      {
        slug: "v2-2-counterplay-pass",
        label: "v2.2-counterplay-pass",
        published: true,
        createdOffset: 64,
        updatedOffset: 68,
        cardTweaks: {
          "pulse.titan": { costDelta: 1, statAdjustments: { damage: -1 } },
          "ghost.seer": { statAdjustments: { draw: 1, reach: 1 } },
          "chrome.channeler": { statAdjustments: { shield: 1 } },
        },
      },
      {
        slug: "v2-3-ab-candidate-a",
        label: "v2.3-ab-candidate-a",
        published: false,
        createdOffset: 96,
        updatedOffset: 100,
        overrides: { targetScore: 58 },
        cardTweaks: {
          "glitch.saboteur": { costDelta: 1, statAdjustments: { hack: -1 } },
          "pulse.duelist": { powerDelta: -1, statAdjustments: { score: 1 } },
        },
      },
      {
        slug: "v2-4-ab-candidate-b",
        label: "v2.4-ab-candidate-b",
        published: false,
        createdOffset: 128,
        updatedOffset: 132,
        overrides: { targetScore: 58 },
        cardTweaks: {
          "chrome.warden": { statAdjustments: { shield: 1, sustain: 1 } },
          "ghost.seer": { statAdjustments: { draw: 1 } },
          "pulse.titan": { costDelta: 1, statAdjustments: { damage: -1, score: 1 } },
        },
      },
    ],
    runs: [
      {
        slug: "launch-meta",
        versionSlug: "v2-0-launch-meta",
        label: "Launch meta sweep · 640 games",
        createdOffset: 7,
        config: { games: 640, playerCount: 4, seed: 4110, agentTypes: ["greedy", "balanced", "random", "balanced"] },
        profile: {
          overallBalanceScore: 54.9,
          averageTurns: 6.9,
          averageWinningScore: 61.8,
          firstPlayerAdvantage: 17.1,
          dominantStrategy: "greedy",
          dominantStrategyWinRate: 66.4,
          flaggedIssues: [
            "Glitch sabotage loops deny too much bandwidth and shorten decision windows.",
            "Seat one snowballs hard when Pulse Duelist appears on curve.",
          ],
          recommendation: "Add counterplay or tax the denial package. The launch meta is too volatile for balanced testing.",
          favoriteCardKeys: ["glitch.saboteur", "pulse.duelist"],
        },
      },
      {
        slug: "bandwidth-pass",
        versionSlug: "v2-1-bandwidth-pass",
        label: "Bandwidth pass · 760 games",
        createdOffset: 39,
        config: { games: 760, playerCount: 4, seed: 4111, agentTypes: ["balanced", "greedy", "random", "balanced"] },
        profile: {
          overallBalanceScore: 65.7,
          averageTurns: 7.5,
          averageWinningScore: 59.4,
          firstPlayerAdvantage: 11.3,
          dominantStrategy: null,
          dominantStrategyWinRate: 38.5,
          flaggedIssues: ["Bandwidth starvation is improved, but Pulse finishers still overperform in short matches."],
          recommendation: "The systemic fix landed. Focus on trimming top-end burst and keep candidate branches for A/B work.",
          favoriteCardKeys: ["pulse.titan", "chrome.warden"],
        },
      },
      {
        slug: "candidate-a",
        versionSlug: "v2-3-ab-candidate-a",
        label: "A/B candidate A · 880 games",
        createdOffset: 102,
        config: { games: 880, playerCount: 4, seed: 5201, agentTypes: ["balanced", "balanced", "greedy", "random"] },
        profile: {
          overallBalanceScore: 73.2,
          averageTurns: 8,
          averageWinningScore: 57.1,
          firstPlayerAdvantage: 7.6,
          dominantStrategy: null,
          dominantStrategyWinRate: 36.4,
          flaggedIssues: ["Ghost draw package is smoother, but candidate A still leans toward fast openers."],
          recommendation: "Candidate A is serviceable, yet it leaves too much pressure concentrated in Pulse cards.",
          favoriteCardKeys: ["ghost.seer", "pulse.duelist"],
        },
      },
      {
        slug: "candidate-b",
        versionSlug: "v2-4-ab-candidate-b",
        label: "A/B candidate B · 880 games",
        createdOffset: 134,
        config: { games: 880, playerCount: 4, seed: 5202, agentTypes: ["balanced", "balanced", "greedy", "random"] },
        profile: {
          overallBalanceScore: 79.8,
          averageTurns: 8.2,
          averageWinningScore: 56.3,
          firstPlayerAdvantage: 5.1,
          dominantStrategy: null,
          dominantStrategyWinRate: 35.1,
          flaggedIssues: [],
          recommendation: "Candidate B is the healthier branch and should be the default draft for future tuning.",
          favoriteCardKeys: ["chrome.warden", "ghost.seer"],
        },
      },
    ],
  },
  {
    slug: "mythic-mixer",
    name: "Mythic Mixer",
    description: "Party game prototype built around table drama, bluffing, and score swings. Versions trace how much chaos is healthy before analytics stop being useful.",
    createdOffset: 360,
    families: [
      { slug: "toast", title: "Toast", statBoost: { points: 1 } },
      { slug: "heckle", title: "Heckle", statBoost: { mischief: 1 } },
      { slug: "rumor", title: "Rumor", statBoost: { steal: 1 } },
      { slug: "spotlight", title: "Spotlight", statBoost: { draw: 1 } },
    ],
    resources: [
      { slug: "hype", name: "Hype", startAmount: 1, gainPerTurn: 2 },
      { slug: "gossip", name: "Gossip", startAmount: 0, gainPerTurn: 1 },
    ],
    baseRules: {
      playerCountMin: 3,
      playerCountMax: 4,
      winConditionType: "highest_score",
      targetScore: 42,
      maxTurns: 9,
      startingHealth: 16,
      startingHandSize: 5,
    },
    versions: [
      {
        slug: "v0-9-chaos-baseline",
        label: "v0.9-chaos-baseline",
        published: true,
        createdOffset: 0,
        updatedOffset: 4,
        cardTweaks: {
          "heckle.saboteur": { statAdjustments: { steal: 1, mischief: 1 } },
          "toast.channeler": { statAdjustments: { points: 1 } },
        },
      },
      {
        slug: "v1-0-score-guardrails",
        label: "v1.0-score-guardrails",
        published: true,
        createdOffset: 28,
        updatedOffset: 32,
        overrides: { targetScore: 44 },
        cardTweaks: {
          "heckle.saboteur": { costDelta: 1, statAdjustments: { steal: -1 } },
          "rumor.broker": { statAdjustments: { economy: -1, points: 1 } },
        },
      },
      {
        slug: "v1-1-party-flow-pass",
        label: "v1.1-party-flow-pass",
        published: true,
        createdOffset: 56,
        updatedOffset: 60,
        cardTweaks: {
          "spotlight.seer": { statAdjustments: { draw: 1 } },
          "toast.warden": { statAdjustments: { shield: 1, points: 1 } },
        },
      },
      {
        slug: "v1-2-ab-candidate-a",
        label: "v1.2-ab-candidate-a",
        published: false,
        createdOffset: 84,
        updatedOffset: 88,
        overrides: { targetScore: 45 },
        cardTweaks: {
          "heckle.duelist": { powerDelta: -1, statAdjustments: { score: 1 } },
          "rumor.saboteur": { costDelta: 1, statAdjustments: { steal: -1, mischief: 1 } },
        },
      },
      {
        slug: "v1-3-ab-candidate-b",
        label: "v1.3-ab-candidate-b",
        published: false,
        createdOffset: 112,
        updatedOffset: 116,
        overrides: { targetScore: 45 },
        cardTweaks: {
          "spotlight.channeler": { statAdjustments: { combo: -1, draw: 1, points: 1 } },
          "toast.titan": { costDelta: 1, statAdjustments: { score: -1, points: 1 } },
        },
      },
    ],
    runs: [
      {
        slug: "chaos-baseline",
        versionSlug: "v0-9-chaos-baseline",
        label: "Chaos baseline · 520 games",
        createdOffset: 6,
        config: { games: 520, playerCount: 4, seed: 6110, agentTypes: ["random", "balanced", "random", "balanced"] },
        profile: {
          overallBalanceScore: 49.5,
          averageTurns: 5.9,
          averageWinningScore: 45.6,
          firstPlayerAdvantage: 12.2,
          dominantStrategy: "random",
          dominantStrategyWinRate: 61.3,
          flaggedIssues: ["Random agents exploit the high-chaos package better than intended, making bluff windows too swingy."],
          recommendation: "Introduce score guardrails before using this ruleset with external playtesters.",
          favoriteCardKeys: ["heckle.saboteur", "toast.channeler"],
        },
      },
      {
        slug: "score-guardrails",
        versionSlug: "v1-0-score-guardrails",
        label: "Score guardrails · 640 games",
        createdOffset: 34,
        config: { games: 640, playerCount: 4, seed: 6111, agentTypes: ["balanced", "random", "balanced", "random"] },
        profile: {
          overallBalanceScore: 61.2,
          averageTurns: 6.7,
          averageWinningScore: 43.1,
          firstPlayerAdvantage: 8.4,
          dominantStrategy: null,
          dominantStrategyWinRate: 36.8,
          flaggedIssues: ["Rumor economy cards are now the clearest path to consistent scoring."],
          recommendation: "Better pacing overall. Keep dialing back repeatable steal effects while preserving table drama.",
          favoriteCardKeys: ["rumor.broker", "spotlight.seer"],
        },
      },
      {
        slug: "candidate-a",
        versionSlug: "v1-2-ab-candidate-a",
        label: "A/B candidate A · 720 games",
        createdOffset: 90,
        config: { games: 720, playerCount: 4, seed: 6201, agentTypes: ["balanced", "balanced", "random", "random"] },
        profile: {
          overallBalanceScore: 69.4,
          averageTurns: 7.2,
          averageWinningScore: 42.4,
          firstPlayerAdvantage: 6,
          dominantStrategy: null,
          dominantStrategyWinRate: 35.2,
          flaggedIssues: ["Candidate A is readable, but it slightly overcorrects and dampens the party-game highs."],
          recommendation: "Use candidate A when you want clearer analytics, but expect less table energy.",
          favoriteCardKeys: ["spotlight.seer", "toast.warden"],
        },
      },
      {
        slug: "candidate-b",
        versionSlug: "v1-3-ab-candidate-b",
        label: "A/B candidate B · 720 games",
        createdOffset: 118,
        config: { games: 720, playerCount: 4, seed: 6202, agentTypes: ["balanced", "balanced", "random", "random"] },
        profile: {
          overallBalanceScore: 76.8,
          averageTurns: 7.4,
          averageWinningScore: 42,
          firstPlayerAdvantage: 4.8,
          dominantStrategy: null,
          dominantStrategyWinRate: 34.4,
          flaggedIssues: [],
          recommendation: "Candidate B keeps the party feel while staying analytically readable. Promote it after human confirmation.",
          favoriteCardKeys: ["toast.titan", "spotlight.channeler"],
        },
      },
    ],
  },
  {
    slug: "ironwood-front",
    name: "Ironwood Front",
    description: "Strategy skirmish about supply lines and positional attrition. Versions emphasize how much hidden information and morale economy should influence a last-standing game.",
    createdOffset: 540,
    families: [
      { slug: "vanguard", title: "Vanguard", statBoost: { reach: 1 }, powerShift: 1 },
      { slug: "siege", title: "Siege", statBoost: { damage: 1 }, costShift: 1 },
      { slug: "scout", title: "Scout", statBoost: { intel: 1 } },
      { slug: "logistic", title: "Logistic", statBoost: { sustain: 1 }, powerShift: -1 },
    ],
    resources: [
      { slug: "supply", name: "Supply", startAmount: 2, gainPerTurn: 2 },
      { slug: "intel", name: "Intel", startAmount: 1, gainPerTurn: 1 },
      { slug: "morale", name: "Morale", startAmount: 1, gainPerTurn: 1 },
    ],
    baseRules: {
      playerCountMin: 2,
      playerCountMax: 4,
      winConditionType: "last_standing",
      targetScore: 35,
      maxTurns: 12,
      startingHealth: 24,
      startingHandSize: 5,
    },
    versions: [
      {
        slug: "v1-0-open-front",
        label: "v1.0-open-front",
        published: true,
        createdOffset: 0,
        updatedOffset: 4,
        cardTweaks: {
          "siege.titan": { statAdjustments: { damage: 2 } },
          "vanguard.duelist": { powerDelta: 1 },
        },
      },
      {
        slug: "v1-1-morale-pass",
        label: "v1.1-morale-pass",
        published: true,
        createdOffset: 30,
        updatedOffset: 34,
        resourceTweaks: { morale: { gainPerTurnDelta: -1 } },
        cardTweaks: {
          "logistic.broker": { statAdjustments: { economy: 1, sustain: 1 } },
          "siege.titan": { costDelta: 1, statAdjustments: { damage: -1 } },
        },
      },
      {
        slug: "v1-2-counterbattery",
        label: "v1.2-counterbattery",
        published: true,
        createdOffset: 60,
        updatedOffset: 64,
        cardTweaks: {
          "scout.seer": { statAdjustments: { draw: 1, intel: 1 } },
          "vanguard.warden": { statAdjustments: { shield: 1 } },
        },
      },
      {
        slug: "v1-3-ab-candidate-a",
        label: "v1.3-ab-candidate-a",
        published: true,
        createdOffset: 90,
        updatedOffset: 94,
        overrides: { maxTurns: 11 },
        cardTweaks: {
          "siege.saboteur": { costDelta: 1, statAdjustments: { damage: -1, reach: 1 } },
          "logistic.channeler": { statAdjustments: { combo: -1, sustain: 1 } },
        },
      },
      {
        slug: "v1-4-ab-candidate-b",
        label: "v1.4-ab-candidate-b",
        published: false,
        createdOffset: 120,
        updatedOffset: 124,
        overrides: { maxTurns: 11 },
        cardTweaks: {
          "vanguard.duelist": { powerDelta: -1, statAdjustments: { score: 1, reach: 1 } },
          "scout.seer": { statAdjustments: { draw: 1 } },
          "siege.titan": { costDelta: 1, statAdjustments: { damage: -1, score: 1 } },
        },
      },
    ],
    runs: [
      {
        slug: "open-front",
        versionSlug: "v1-0-open-front",
        label: "Open front audit · 580 games",
        createdOffset: 5,
        config: { games: 580, playerCount: 4, seed: 7100, agentTypes: ["greedy", "balanced", "balanced", "random"] },
        profile: {
          overallBalanceScore: 52.6,
          averageTurns: 9.4,
          averageWinningScore: 31.2,
          firstPlayerAdvantage: 13.5,
          dominantStrategy: "greedy",
          dominantStrategyWinRate: 62.1,
          flaggedIssues: ["Siege artillery decides too many games before logistics tools can matter."],
          recommendation: "Tone down the artillery line and let information or morale systems carry more of the strategy load.",
          favoriteCardKeys: ["siege.titan", "vanguard.duelist"],
        },
      },
      {
        slug: "morale-pass",
        versionSlug: "v1-1-morale-pass",
        label: "Morale pass · 700 games",
        createdOffset: 36,
        config: { games: 700, playerCount: 4, seed: 7101, agentTypes: ["balanced", "greedy", "balanced", "random"] },
        profile: {
          overallBalanceScore: 64.5,
          averageTurns: 10,
          averageWinningScore: 29.7,
          firstPlayerAdvantage: 8.7,
          dominantStrategy: null,
          dominantStrategyWinRate: 38.3,
          flaggedIssues: ["Logistics cards are now viable, but scouting tools still lag in impact."],
          recommendation: "The morale economy is under control. Improve information cards before locking the published branch.",
          favoriteCardKeys: ["logistic.broker", "scout.seer"],
        },
      },
      {
        slug: "candidate-a",
        versionSlug: "v1-3-ab-candidate-a",
        label: "A/B candidate A · 840 games",
        createdOffset: 96,
        config: { games: 840, playerCount: 4, seed: 7201, agentTypes: ["balanced", "balanced", "greedy", "random"] },
        profile: {
          overallBalanceScore: 72.4,
          averageTurns: 10.3,
          averageWinningScore: 28.8,
          firstPlayerAdvantage: 6.5,
          dominantStrategy: null,
          dominantStrategyWinRate: 35.9,
          flaggedIssues: ["Candidate A is strategically rich, but still a little too punishing when Siege cards line up early."],
          recommendation: "Candidate A is publishable if you want sharper conflict, though it still edges toward artillery dominance.",
          favoriteCardKeys: ["siege.saboteur", "logistic.channeler"],
        },
      },
      {
        slug: "candidate-b",
        versionSlug: "v1-4-ab-candidate-b",
        label: "A/B candidate B · 840 games",
        createdOffset: 126,
        config: { games: 840, playerCount: 4, seed: 7202, agentTypes: ["balanced", "balanced", "greedy", "random"] },
        profile: {
          overallBalanceScore: 80.5,
          averageTurns: 10.6,
          averageWinningScore: 28.1,
          firstPlayerAdvantage: 4.4,
          dominantStrategy: null,
          dominantStrategyWinRate: 34.8,
          flaggedIssues: [],
          recommendation: "Candidate B is the best strategy branch so far. Keep it as the active draft and validate with human teams.",
          favoriteCardKeys: ["scout.seer", "vanguard.duelist"],
        },
      },
    ],
  },
  {
    slug: "celestial-bazaar",
    name: "Celestial Bazaar",
    description: "Market-driven deck builder where players chase rotating prestige windows. The seeded versions illustrate economy tuning and a later A/B split on score pacing.",
    createdOffset: 900,
    families: [
      { slug: "sun", title: "Sun", statBoost: { score: 1 } },
      { slug: "moon", title: "Moon", statBoost: { draw: 1 } },
      { slug: "star", title: "Star", statBoost: { combo: 1 } },
      { slug: "comet", title: "Comet", statBoost: { reach: 1 }, costShift: 1 },
    ],
    resources: [
      { slug: "coin", name: "Coin", startAmount: 2, gainPerTurn: 2 },
      { slug: "favor", name: "Favor", startAmount: 0, gainPerTurn: 1 },
    ],
    baseRules: {
      playerCountMin: 2,
      playerCountMax: 4,
      winConditionType: "first_to_x",
      targetScore: 52,
      maxTurns: 10,
      startingHealth: 18,
      startingHandSize: 5,
    },
    versions: [
      {
        slug: "v1-0-night-market",
        label: "v1.0-night-market",
        published: true,
        createdOffset: 0,
        updatedOffset: 4,
        cardTweaks: {
          "star.channeler": { statAdjustments: { combo: 1 } },
          "comet.titan": { statAdjustments: { score: 1 } },
        },
      },
      {
        slug: "v1-1-favor-pass",
        label: "v1.1-favor-pass",
        published: true,
        createdOffset: 24,
        updatedOffset: 28,
        resourceTweaks: { favor: { gainPerTurnDelta: -1 } },
        cardTweaks: {
          "moon.seer": { statAdjustments: { draw: 1 } },
          "star.channeler": { costDelta: 1, statAdjustments: { combo: -1 } },
        },
      },
      {
        slug: "v1-2-prestige-pass",
        label: "v1.2-prestige-pass",
        published: true,
        createdOffset: 48,
        updatedOffset: 52,
        overrides: { targetScore: 54 },
        cardTweaks: {
          "sun.broker": { statAdjustments: { economy: -1, score: 1 } },
          "comet.titan": { costDelta: 1, statAdjustments: { score: -1, reach: 1 } },
        },
      },
      {
        slug: "v1-3-ab-candidate-a",
        label: "v1.3-ab-candidate-a",
        published: false,
        createdOffset: 72,
        updatedOffset: 76,
        overrides: { targetScore: 55 },
        cardTweaks: {
          "sun.duelist": { powerDelta: -1, statAdjustments: { score: 1 } },
          "moon.seer": { statAdjustments: { draw: 1, sustain: 1 } },
        },
      },
      {
        slug: "v1-4-ab-candidate-b",
        label: "v1.4-ab-candidate-b",
        published: false,
        createdOffset: 96,
        updatedOffset: 100,
        overrides: { targetScore: 55 },
        cardTweaks: {
          "star.channeler": { statAdjustments: { combo: -1, draw: 1 } },
          "comet.titan": { costDelta: 1, statAdjustments: { score: -1, reach: 1 } },
          "sun.broker": { statAdjustments: { economy: -1, score: 1 } },
        },
      },
    ],
    runs: [
      {
        slug: "night-market",
        versionSlug: "v1-0-night-market",
        label: "Night market benchmark · 600 games",
        createdOffset: 5,
        config: { games: 600, playerCount: 4, seed: 8100, agentTypes: ["greedy", "balanced", "balanced", "random"] },
        profile: {
          overallBalanceScore: 57.3,
          averageTurns: 7.1,
          averageWinningScore: 54.7,
          firstPlayerAdvantage: 12.9,
          dominantStrategy: "greedy",
          dominantStrategyWinRate: 61.6,
          flaggedIssues: ["Prestige spikes arrive too early when Star combo cards line up behind Sun brokers."],
          recommendation: "Reduce the frequency of explosive prestige turns before using this branch as the default demo.",
          favoriteCardKeys: ["star.channeler", "sun.broker"],
        },
      },
      {
        slug: "favor-pass",
        versionSlug: "v1-1-favor-pass",
        label: "Favor pass · 720 games",
        createdOffset: 30,
        config: { games: 720, playerCount: 4, seed: 8101, agentTypes: ["balanced", "greedy", "balanced", "random"] },
        profile: {
          overallBalanceScore: 66.8,
          averageTurns: 7.9,
          averageWinningScore: 53.2,
          firstPlayerAdvantage: 8.8,
          dominantStrategy: null,
          dominantStrategyWinRate: 37.2,
          flaggedIssues: ["Star combo packages remain stronger than Moon value decks."],
          recommendation: "The economy fix landed. Use the next branch to decide whether combo should stay flashy or move toward consistency.",
          favoriteCardKeys: ["moon.seer", "star.channeler"],
        },
      },
      {
        slug: "candidate-a",
        versionSlug: "v1-3-ab-candidate-a",
        label: "A/B candidate A · 840 games",
        createdOffset: 78,
        config: { games: 840, playerCount: 4, seed: 8201, agentTypes: ["balanced", "balanced", "greedy", "random"] },
        profile: {
          overallBalanceScore: 74.1,
          averageTurns: 8.3,
          averageWinningScore: 52.8,
          firstPlayerAdvantage: 6.2,
          dominantStrategy: null,
          dominantStrategyWinRate: 35.6,
          flaggedIssues: ["Candidate A increases readability but still rewards opening Coin hands slightly too much."],
          recommendation: "Candidate A is solid, though the later branch may have cleaner seat equity.",
          favoriteCardKeys: ["moon.seer", "sun.duelist"],
        },
      },
      {
        slug: "candidate-b",
        versionSlug: "v1-4-ab-candidate-b",
        label: "A/B candidate B · 840 games",
        createdOffset: 102,
        config: { games: 840, playerCount: 4, seed: 8202, agentTypes: ["balanced", "balanced", "greedy", "random"] },
        profile: {
          overallBalanceScore: 81.1,
          averageTurns: 8.5,
          averageWinningScore: 52.1,
          firstPlayerAdvantage: 4.5,
          dominantStrategy: null,
          dominantStrategyWinRate: 34.7,
          flaggedIssues: [],
          recommendation: "Candidate B wins the seeded A/B comparison and is the recommended draft for ongoing iteration.",
          favoriteCardKeys: ["moon.seer", "comet.titan"],
        },
      },
    ],
  },
  {
    slug: "gravebloom-siege",
    name: "Gravebloom Siege",
    description: "Dark strategy card game mixing attrition, spores, and resurrection loops. This dataset tracks how the design moves from oppressive recursion to healthier counterplay.",
    createdOffset: 1080,
    families: [
      { slug: "rot", title: "Rot", statBoost: { decay: 1 } },
      { slug: "bone", title: "Bone", statBoost: { shield: 1 } },
      { slug: "mycel", title: "Mycel", statBoost: { sustain: 1 } },
      { slug: "wraith", title: "Wraith", statBoost: { steal: 1 }, powerShift: -1 },
    ],
    resources: [
      { slug: "essence", name: "Essence", startAmount: 1, gainPerTurn: 2 },
      { slug: "spores", name: "Spores", startAmount: 1, gainPerTurn: 1 },
      { slug: "bone-shards", name: "Bone Shards", startAmount: 0, gainPerTurn: 1 },
    ],
    baseRules: {
      playerCountMin: 2,
      playerCountMax: 4,
      winConditionType: "last_standing",
      targetScore: 30,
      maxTurns: 12,
      startingHealth: 22,
      startingHandSize: 5,
    },
    versions: [
      {
        slug: "v0-8-recursion-baseline",
        label: "v0.8-recursion-baseline",
        published: true,
        createdOffset: 0,
        updatedOffset: 4,
        cardTweaks: {
          "rot.channeler": { statAdjustments: { combo: 1, decay: 1 } },
          "wraith.saboteur": { statAdjustments: { steal: 1 } },
        },
      },
      {
        slug: "v0-9-spore-pass",
        label: "v0.9-spore-pass",
        published: true,
        createdOffset: 26,
        updatedOffset: 30,
        resourceTweaks: { spores: { gainPerTurnDelta: -1 } },
        cardTweaks: {
          "rot.channeler": { costDelta: 1, statAdjustments: { combo: -1 } },
          "mycel.broker": { statAdjustments: { economy: 1, sustain: 1 } },
        },
      },
      {
        slug: "v1-0-counterplay-pass",
        label: "v1.0-counterplay-pass",
        published: true,
        createdOffset: 52,
        updatedOffset: 56,
        cardTweaks: {
          "bone.warden": { statAdjustments: { shield: 1 } },
          "wraith.seer": { statAdjustments: { draw: 1, steal: -1 } },
        },
      },
      {
        slug: "v1-1-ab-candidate-a",
        label: "v1.1-ab-candidate-a",
        published: false,
        createdOffset: 78,
        updatedOffset: 82,
        overrides: { maxTurns: 11 },
        cardTweaks: {
          "rot.titan": { costDelta: 1, statAdjustments: { damage: -1, decay: 1 } },
          "mycel.broker": { statAdjustments: { economy: -1, sustain: 1, score: 1 } },
        },
      },
      {
        slug: "v1-2-ab-candidate-b",
        label: "v1.2-ab-candidate-b",
        published: false,
        createdOffset: 104,
        updatedOffset: 108,
        overrides: { maxTurns: 11 },
        cardTweaks: {
          "bone.warden": { statAdjustments: { shield: 1, sustain: 1 } },
          "wraith.seer": { statAdjustments: { draw: 1 } },
          "rot.titan": { costDelta: 1, statAdjustments: { damage: -1, score: 1 } },
        },
      },
    ],
    runs: [
      {
        slug: "recursion-baseline",
        versionSlug: "v0-8-recursion-baseline",
        label: "Recursion baseline · 560 games",
        createdOffset: 6,
        config: { games: 560, playerCount: 4, seed: 9100, agentTypes: ["greedy", "balanced", "random", "balanced"] },
        profile: {
          overallBalanceScore: 46.7,
          averageTurns: 10.8,
          averageWinningScore: 27.9,
          firstPlayerAdvantage: 15.4,
          dominantStrategy: "greedy",
          dominantStrategyWinRate: 64.1,
          flaggedIssues: [
            "Recursion loops keep the same few cards on top of the rankings and suppress counterplay.",
            "Wraith steal package compounds seat-one pressure in long games.",
          ],
          recommendation: "Break the recursion loop before expanding this project. It is a great stress test but a poor default demo.",
          favoriteCardKeys: ["rot.channeler", "wraith.saboteur"],
        },
      },
      {
        slug: "spore-pass",
        versionSlug: "v0-9-spore-pass",
        label: "Spore pass · 700 games",
        createdOffset: 32,
        config: { games: 700, playerCount: 4, seed: 9101, agentTypes: ["balanced", "greedy", "random", "balanced"] },
        profile: {
          overallBalanceScore: 60.9,
          averageTurns: 10.2,
          averageWinningScore: 27.1,
          firstPlayerAdvantage: 9.1,
          dominantStrategy: null,
          dominantStrategyWinRate: 37.4,
          flaggedIssues: ["Counterplay exists now, but Bone defense still trails behind the recursion engines."],
          recommendation: "The spore pass worked. Focus the next release on clearer defensive payoffs and gentler steal effects.",
          favoriteCardKeys: ["mycel.broker", "bone.warden"],
        },
      },
      {
        slug: "candidate-a",
        versionSlug: "v1-1-ab-candidate-a",
        label: "A/B candidate A · 820 games",
        createdOffset: 84,
        config: { games: 820, playerCount: 4, seed: 9201, agentTypes: ["balanced", "balanced", "greedy", "random"] },
        profile: {
          overallBalanceScore: 71.5,
          averageTurns: 9.9,
          averageWinningScore: 26.5,
          firstPlayerAdvantage: 6.7,
          dominantStrategy: null,
          dominantStrategyWinRate: 35.8,
          flaggedIssues: ["Candidate A is viable, but it still leaves recursion as the cleanest path for Greedy agents."],
          recommendation: "Candidate A is a solid benchmark, though not yet the healthiest live draft.",
          favoriteCardKeys: ["rot.titan", "mycel.broker"],
        },
      },
      {
        slug: "candidate-b",
        versionSlug: "v1-2-ab-candidate-b",
        label: "A/B candidate B · 820 games",
        createdOffset: 110,
        config: { games: 820, playerCount: 4, seed: 9202, agentTypes: ["balanced", "balanced", "greedy", "random"] },
        profile: {
          overallBalanceScore: 78.7,
          averageTurns: 10,
          averageWinningScore: 26,
          firstPlayerAdvantage: 4.9,
          dominantStrategy: null,
          dominantStrategyWinRate: 34.9,
          flaggedIssues: [],
          recommendation: "Candidate B best balances recursion flavor with fairer defensive tools. Use it as the active Gravebloom draft.",
          favoriteCardKeys: ["bone.warden", "wraith.seer"],
        },
      },
    ],
  },
];

export function getSeedProjects(): GameProject[] {
  return [...PROJECT_SEEDS.map(buildProject), buildArchiveProject(), buildSingleCardProject()];
}
