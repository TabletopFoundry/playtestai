/**
 * Shared domain types for PlaytestAI.
 *
 * All interfaces shared between the server (API routes, database layer)
 * and the client (components, simulation engine) are defined here so
 * a single import covers the full domain vocabulary.
 *
 * @module types
 */

/** Win condition strategies supported by the simulation engine. */
export type WinConditionType = "highest_score" | "first_to_x" | "last_standing";

/** AI agent archetypes available for simulated players. */
export type AgentType = "random" | "greedy" | "balanced";

/** A named resource that players accumulate and spend during a game. */
export interface ResourceDefinition {
  id: string;
  name: string;
  /** Amount of this resource each player starts with. */
  startAmount: number;
  /** Amount gained per turn from the base economy. */
  gainPerTurn: number;
}

/** A card in the game&rsquo;s shared deck with cost, power, and custom stats. */
export interface CardDefinition {
  id: string;
  name: string;
  /** Resource cost to play this card. */
  cost: number;
  /** Base power value — contributes to board presence and scoring. */
  power: number;
  /** Number of copies in the shared deck. */
  quantity: number;
  /** Arbitrary named stats (e.g. damage, shield, draw, economy). */
  stats: Record<string, number>;
  /** Optional designer notes for this card. */
  notes?: string;
}

/** A versioned snapshot of a game&rsquo;s rules, cards, and parameters. */
export interface GameVersion {
  id: string;
  projectId: string;
  label: string;
  published: boolean;
  playerCountMin: number;
  playerCountMax: number;
  winConditionType: WinConditionType;
  targetScore: number;
  maxTurns: number;
  startingHealth: number;
  startingHandSize: number;
  resources: ResourceDefinition[];
  cards: CardDefinition[];
  createdAt: string;
  updatedAt: string;
}

/** Top-level project containing versions and simulation runs. */
export interface GameProject {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  versions: GameVersion[];
  runs: SimulationRun[];
}

/** Parameters controlling a batch simulation run. */
export interface SimulationConfig {
  /** Number of games to simulate in the batch. */
  games: number;
  /** Number of players per game. */
  playerCount: number;
  /** PRNG seed for deterministic replay. */
  seed: number;
  /** Agent archetype assigned to each seat (wraps if shorter than playerCount). */
  agentTypes: AgentType[];
}

/** Win-rate breakdown for a single seat position. */
export interface PositionWinRate {
  position: number;
  wins: number;
  winRate: number;
}

/** Win-rate breakdown for a single AI agent archetype. */
export interface StrategyBreakdown {
  agent: AgentType;
  wins: number;
  winRate: number;
}

/** A single bucket in a histogram chart. */
export interface HistogramBucket {
  bucket: string;
  count: number;
}

/** Power ranking and usage statistics for a single card across a batch. */
export interface CardRanking {
  cardId: string;
  cardName: string;
  totalPlays: number;
  winnerPlays: number;
  winCorrelation: number;
  averageImpact: number;
  inclusionRate: number;
  powerScore: number;
}

/** High-level balance verdict and flagged issues for a simulation batch. */
export interface SimulationSummary {
  /** Composite balance score from 0 (broken) to 100 (perfectly balanced). */
  overallBalanceScore: number;
  averageTurns: number;
  averageWinningScore: number;
  firstPlayerAdvantage: number;
  dominantStrategy: AgentType | null;
  dominantStrategyWinRate: number;
  recommendation: string;
  flaggedIssues: string[];
}

/** Complete output of a batch simulation run. */
export interface SimulationBatchResult {
  generatedAt: string;
  config: SimulationConfig;
  winRatesByPosition: PositionWinRate[];
  strategyBreakdown: StrategyBreakdown[];
  gameLengthHistogram: HistogramBucket[];
  scoreDistribution: HistogramBucket[];
  cardRankings: CardRanking[];
  summary: SimulationSummary;
}

/** A persisted simulation run tied to a project and version. */
export interface SimulationRun {
  id: string;
  projectId: string;
  versionId: string;
  label: string;
  createdAt: string;
  config: SimulationConfig;
  result: SimulationBatchResult;
}

/** Lightweight project summary for list views (no full version/run payloads). */
export interface ProjectSummary {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  versionCount: number;
  runCount: number;
  latestRun: SimulationRun | null;
}

/** Input payload for creating a new project via the API. */
export interface CreateProjectInput {
  name: string;
  description: string;
  playerCountMin: number;
  playerCountMax: number;
  winConditionType: WinConditionType;
}

/** Validation result entry used by pre-flight checks before simulation. */
export interface ValidationIssue {
  severity: "error" | "warning";
  message: string;
  field?: string;
}
