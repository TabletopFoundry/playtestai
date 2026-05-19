---
id: data-model
title: Data model
sidebar_position: 4
description: The TypeScript interfaces that underlie every API and database row.
---

# Data model

Every type used by the server, database, simulation engine, and UI lives in
[`lib/types.ts`](https://github.com/TabletopFoundry/playtestai/blob/main/lib/types.ts).
This page reproduces the important ones with annotations.

## `WinConditionType`

```ts
type WinConditionType = "highest_score" | "first_to_x" | "last_standing";
```

| Value | When the game ends |
| --- | --- |
| `highest_score` | At `maxTurns`. Highest score wins. |
| `first_to_x` | When any player reaches `targetScore`. |
| `last_standing` | When only one player has `health > 0`. |

## `AgentType`

```ts
type AgentType = "random" | "greedy" | "balanced";
```

See [Agents](../concepts/agents.md) for the behavioural contract of each.

## `ResourceDefinition`

```ts
interface ResourceDefinition {
  id: string;
  name: string;
  startAmount: number;   // each player starts with this much
  gainPerTurn: number;   // gained at the top of each turn
}
```

Multiple resources are summed into one economy pool at decision time.
Naming them separately is for designer documentation, not for the engine.

## `CardDefinition`

```ts
interface CardDefinition {
  id: string;
  name: string;
  cost: number;          // resource cost
  power: number;         // base board power
  quantity: number;      // copies in the shared deck
  stats: Record<string, number>;
  notes?: string;
}
```

The `stats` map is where every card effect lives. Known keys
(`damage`, `shield`, `draw`, `economy`, `score`, `steal`, `combo`) are
recognised by the engine; anything else is treated as a custom stat.

## `GameVersion`

```ts
interface GameVersion {
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
```

A complete, self-contained snapshot of one game's rules. See
[Projects and versions](../concepts/projects-and-versions.md).

## `GameProject`

```ts
interface GameProject {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  versions: GameVersion[];
  runs: SimulationRun[];
}
```

The top-level entity. Owns versions and runs.

## `SimulationConfig`

```ts
interface SimulationConfig {
  games: number;
  playerCount: number;
  seed: number;
  agentTypes: AgentType[];
}
```

The input to a batch simulation. Two configs are equivalent if every field
matches — `agentTypes` is order-sensitive.

## `SimulationBatchResult`

```ts
interface SimulationBatchResult {
  generatedAt: string;
  config: SimulationConfig;
  winRatesByPosition: PositionWinRate[];
  strategyBreakdown: StrategyBreakdown[];
  gameLengthHistogram: HistogramBucket[];
  scoreDistribution: HistogramBucket[];
  cardRankings: CardRanking[];
  summary: SimulationSummary;
}
```

Everything the analytics pass produces. This payload is what the dashboard
renders.

### `PositionWinRate`

```ts
interface PositionWinRate {
  position: number;     // 1-indexed seat
  wins: number;
  winRate: number;      // 0..1
}
```

### `StrategyBreakdown`

```ts
interface StrategyBreakdown {
  agent: AgentType;
  wins: number;
  winRate: number;      // 0..1
}
```

### `CardRanking`

```ts
interface CardRanking {
  cardId: string;
  cardName: string;
  totalPlays: number;
  winnerPlays: number;        // plays by the eventual winner
  winCorrelation: number;     // how predictive of winning this card is
  averageImpact: number;      // mean score/health swing on resolve
  inclusionRate: number;      // fraction of games it appeared in
  powerScore: number;         // composite ranking (>1.5 = strong)
}
```

### `SimulationSummary`

```ts
interface SimulationSummary {
  overallBalanceScore: number;      // 0..100
  averageTurns: number;
  averageWinningScore: number;
  firstPlayerAdvantage: number;
  dominantStrategy: AgentType | null;
  dominantStrategyWinRate: number;
  recommendation: string;
  flaggedIssues: string[];
}
```

See [The balance score](../concepts/balance-score.md) for the meaning of
each field.

## `SimulationRun`

```ts
interface SimulationRun {
  id: string;
  projectId: string;
  versionId: string;
  label: string;
  createdAt: string;
  config: SimulationConfig;
  result: SimulationBatchResult;
}
```

A persisted run. Immutable once stored.

## IDs

All IDs are ULIDs (e.g., `proj_01HJYZ...`, `vers_01HJYZ...`,
`run_01HJYZ...`). They are lexicographically sortable by creation time,
which the UI relies on.
