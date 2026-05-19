---
id: simulation-constants
title: Simulation constants
sidebar_position: 3
description: Every magic number in the engine, with what it does and how to tune it.
---

# Simulation constants

All engine tuning lives in
[`lib/simulation/constants.ts`](https://github.com/TabletopFoundry/playtestai/blob/main/lib/simulation/constants.ts).
This page is the definitive reference for each constant.

> **Changing a constant changes every future simulation.** Re-baseline your
> reference versions after any edit. Don't compare runs taken before and
> after a constants change.

## `CARD_VALUE_WEIGHTS`

Per-stat weights used by the value function the agents call when deciding
which card to play.

```ts
export const CARD_VALUE_WEIGHTS = {
  immediate: { power: 1.4, damage: 2, score: 1.8, shield: 1, draw: 1.1, custom: 1 },
  strategic: { economy: 2.2, draw: 1.5, combo: 1.1, shield: 0.7, custom: 0.6 },
  finisher:  { damage: 2.4, steal: 1.6, score: 1.4, power: 1 },
} as const;
```

Each block is a **profile**. The Balanced agent blends these profiles by
phase; the Greedy agent uses `immediate` + a finisher tilt.

**Tune when**: agents play "the wrong" card according to your design intent.
For example, if your design treats `economy` as a winning lever but Balanced
ignores it, raise `strategic.economy` from `2.2` to `2.6`.

## `PHASE_WEIGHTS`

Where the boundaries between early/mid/late game sit (as fractions of
`maxTurns`), and how aggressively the profiles blend.

```ts
export const PHASE_WEIGHTS = {
  earlyGameCutoff: 0.45,
  lateGameCutoff: 0.7,
  immediate: { early: 0.55, late: 0.80 },
  strategic: { early: 0.45, late: 0.15 },
  finisher:  { early: 0.05, late: 0.25 },
} as const;
```

**Tune when** your game has a clear "switch-over" point (e.g., the deck-out
turn) that the engine doesn't recognise. Lower `lateGameCutoff` to make the
Balanced agent transition to finisher mode earlier.

## `AGENT_WEIGHTS`

Per-agent decision modifiers.

```ts
export const AGENT_WEIGHTS = {
  greedy:   { finisherBonus: 0.25, costPenalty: 0.08 },
  balanced: { costPenalty: 0.04, jitter: 0.9, shortlistSize: 3 },
} as const;
```

| Key | Meaning |
| --- | --- |
| `greedy.finisherBonus` | Extra value Greedy gives finisher-flavoured cards. |
| `greedy.costPenalty` | Per-cost-unit penalty. Higher = more frugal. |
| `balanced.costPenalty` | Same idea, much smaller. |
| `balanced.jitter` | Max random multiplier added to each candidate. |
| `balanced.shortlistSize` | Picks uniformly among the top N candidates after jitter. |

**Tune when** an agent is *too predictable* (raise `balanced.jitter`) or
*too random* (lower it).

## `CUSTOM_STAT_WEIGHT`

Per-unit value of any stat key not in the engine's known set.

```ts
export const CUSTOM_STAT_WEIGHT = 0.35;
```

**Tune when** custom stats dominate or get ignored. The default is
deliberately modest because the engine cannot semantically understand a
stat called `taunt`.

## `COMBAT`

Combat resolution constants.

```ts
export const COMBAT = {
  boardPowerDivisor: 6,           // damage += boardPower / 6
  damageScorePenaltyDivisor: 3,   // score -= damage / 3
  killBonus: 4,                   // bonus score for eliminating a player
  shieldHealDivisor: 2,           // health += shield / 2
} as const;
```

**Tune when** your design wants combat to feel swingier (lower divisors) or
more grindy (higher divisors). Doubling `boardPowerDivisor` from 6 to 12
roughly halves how much board power contributes to damage.

## Balance score sub-weights

The composite `overallBalanceScore` averages four sub-scores
(seat fairness, strategy fairness, card flatness, length sanity). The
weighting is uniform by default; the calculation lives in
[`lib/simulation/analytics.ts`](https://github.com/TabletopFoundry/playtestai/blob/main/lib/simulation/analytics.ts).
If you want a non-uniform composite (e.g., weighting seat fairness 2x), edit
the `computeBalanceScore` function there directly.

## Discovering the rest

Constants not covered above:

- **Issue thresholds** — what triggers each `flaggedIssue` string. Defined
  inline in `analytics.ts`.
- **Dominant-strategy threshold** — the win-rate above which an agent is
  reported as dominant.
- **First-player-advantage threshold** — the percentage above which the
  issue is flagged.

These are intentionally short, well-commented, and live near the code that
reads them. Search `constants.ts` and `analytics.ts` — both files are under
200 lines.
