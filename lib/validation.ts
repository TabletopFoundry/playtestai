/**
 * Zod validation schemas for API input.
 *
 * Every mutable API endpoint must validate incoming payloads against
 * these schemas before persisting to the database (P0-1).
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Shared sub-schemas
// ---------------------------------------------------------------------------

const ResourceDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  startAmount: z.number().int().min(0),
  gainPerTurn: z.number().int(),
});

const CardStatsSchema = z.record(z.string(), z.number());

const CardDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(120),
  cost: z.number().int(),
  power: z.number().int().min(0),
  quantity: z.number().int().min(1).max(100),
  stats: CardStatsSchema,
  notes: z.string().max(500).optional(),
});

const WinConditionTypeSchema = z.enum(["highest_score", "first_to_x", "last_standing"]);
const AgentTypeSchema = z.enum(["random", "greedy", "balanced"]);

// ---------------------------------------------------------------------------
// GameVersion — validated on PUT /versions/:id
// ---------------------------------------------------------------------------

export const GameVersionSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  label: z.string().min(1).max(100),
  published: z.boolean().optional().default(false),
  playerCountMin: z.number().int().min(2).max(10),
  playerCountMax: z.number().int().min(2).max(10),
  winConditionType: WinConditionTypeSchema,
  targetScore: z.number().int().min(1),
  maxTurns: z.number().int().min(1).max(100),
  startingHealth: z.number().int().min(1),
  startingHandSize: z.number().int().min(1).max(20),
  resources: z.array(ResourceDefinitionSchema).min(1),
  cards: z.array(CardDefinitionSchema).min(1),
  createdAt: z.string(),
  updatedAt: z.string(),
}).refine(
  (data) => data.playerCountMin <= data.playerCountMax,
  { message: "playerCountMin must be ≤ playerCountMax", path: ["playerCountMin"] },
);

// ---------------------------------------------------------------------------
// SimulationConfig — validated on POST /runs
// ---------------------------------------------------------------------------

export const SimulationConfigSchema = z.object({
  games: z.number().int().min(1).max(50_000),
  playerCount: z.number().int().min(2).max(10),
  seed: z.number().int(),
  agentTypes: z.array(AgentTypeSchema).min(1),
});

// ---------------------------------------------------------------------------
// Position win rate, strategy breakdown, histogram etc.
// ---------------------------------------------------------------------------

const PositionWinRateSchema = z.object({
  position: z.number().int().min(1),
  wins: z.number().int().min(0),
  winRate: z.number().min(0),
});

const StrategyBreakdownSchema = z.object({
  agent: AgentTypeSchema,
  wins: z.number().int().min(0),
  winRate: z.number().min(0),
});

const HistogramBucketSchema = z.object({
  bucket: z.string(),
  count: z.number().int().min(0),
});

const CardRankingSchema = z.object({
  cardId: z.string(),
  cardName: z.string(),
  totalPlays: z.number().int().min(0),
  winnerPlays: z.number().int().min(0),
  winCorrelation: z.number(),
  averageImpact: z.number(),
  inclusionRate: z.number(),
  powerScore: z.number(),
});

const SimulationSummarySchema = z.object({
  overallBalanceScore: z.number(),
  averageTurns: z.number(),
  averageWinningScore: z.number(),
  firstPlayerAdvantage: z.number(),
  dominantStrategy: AgentTypeSchema.nullable(),
  dominantStrategyWinRate: z.number(),
  recommendation: z.string(),
  flaggedIssues: z.array(z.string()),
});

export const SimulationBatchResultSchema = z.object({
  generatedAt: z.string(),
  config: SimulationConfigSchema,
  winRatesByPosition: z.array(PositionWinRateSchema),
  strategyBreakdown: z.array(StrategyBreakdownSchema),
  gameLengthHistogram: z.array(HistogramBucketSchema),
  scoreDistribution: z.array(HistogramBucketSchema),
  cardRankings: z.array(CardRankingSchema),
  summary: SimulationSummarySchema,
});

// ---------------------------------------------------------------------------
// CreateProjectInput — validated on POST /projects
// ---------------------------------------------------------------------------

export const CreateProjectInputSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional().default(""),
  playerCountMin: z.number().int().min(2).max(10).optional().default(2),
  playerCountMax: z.number().int().min(2).max(10).optional().default(4),
  winConditionType: WinConditionTypeSchema.optional().default("highest_score"),
}).refine(
  (data) => data.playerCountMin <= data.playerCountMax,
  { message: "playerCountMin must be ≤ playerCountMax", path: ["playerCountMin"] },
);

// ---------------------------------------------------------------------------
// UpdateProjectInput — validated on PUT /projects/:id
// ---------------------------------------------------------------------------

export const UpdateProjectInputSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
});

// ---------------------------------------------------------------------------
// CreateRunInput — validated on POST /runs
// ---------------------------------------------------------------------------

export const CreateRunInputSchema = z.object({
  versionId: z.string().min(1),
  label: z.string().max(200).optional(),
  config: SimulationConfigSchema,
  result: SimulationBatchResultSchema,
});

// ---------------------------------------------------------------------------
// DuplicateVersionInput — validated on POST /versions (duplicate)
// ---------------------------------------------------------------------------

export const DuplicateVersionInputSchema = z.object({
  sourceVersionId: z.string().min(1).optional(),
  label: z.string().min(1).max(200).optional(),
});

// ---------------------------------------------------------------------------
// VersionAction — validated on PATCH /versions/:id
// ---------------------------------------------------------------------------

export const VersionActionSchema = z.object({
  action: z.literal("publish"),
});

// ---------------------------------------------------------------------------
// Helper to format Zod errors for API responses
// ---------------------------------------------------------------------------

export function formatZodErrors(error: z.ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");
}
