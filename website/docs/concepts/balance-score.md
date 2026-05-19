---
id: balance-score
title: The balance score
sidebar_position: 5
description: How the 0–100 score is computed, and what each band means.
---

# The balance score

Every simulation produces an `overallBalanceScore` between 0 and 100.
It is a deliberately opinionated number — a single value that a designer can
read at a glance and that the team can argue with.

## The formula, in plain English

The composite score is the average of four sub-scores, each normalised to 0–100:

1. **Seat fairness** — how close every seat's win rate is to `1 / playerCount`.
2. **Strategy fairness** — how close every agent's win rate is to its expected share.
3. **Card flatness** — how evenly card `powerScore` is distributed (no single dominant card).
4. **Length sanity** — how concentrated game length is in the healthy middle (not too short, not capped).

Each sub-score penalises distance from a fair baseline. Worst-in-class on any
single sub-score will pull the composite down, but no single sub-score can
make it zero on its own.

## How to read the bands

| Range | Verdict | Typical action |
| --- | --- | --- |
| **85–100** | Tightly balanced. | Ship it. Re-test after any card edit. |
| **70–84** | Healthy. | Look at the lowest sub-score; fine-tune one knob. |
| **55–69** | Noticeable issue. | One clear problem (first-player edge, hot card). Find it in the dashboard. |
| **35–54** | Broken in one direction. | Likely a dominant strategy. Compare strategy win rates. |
| **0–34** | Fundamentally unfair. | Probably a math bug in a card. Inspect the top-ranked card by `powerScore`. |

> The bands are based on observed scores across the seeded example projects.
> Your game may calibrate differently — what matters is the **delta** between
> versions, not the absolute number.

## Supporting metrics

The summary also exposes raw inputs so you can second-guess the composite:

```ts
interface SimulationSummary {
  overallBalanceScore: number;        // 0–100
  averageTurns: number;
  averageWinningScore: number;
  firstPlayerAdvantage: number;       // signed; >0 means seat 1 over-wins
  dominantStrategy: AgentType | null; // "greedy" if greedy wins > threshold
  dominantStrategyWinRate: number;
  recommendation: string;             // plain-English next step
  flaggedIssues: string[];            // any anomalies the analyser caught
}
```

### `firstPlayerAdvantage`

Positive means seat 1 wins more than its fair share; negative means seat 1 is
disadvantaged. Most games show a small positive number (2–5%). Anything
beyond ±10% is worth investigating.

### `dominantStrategy`

If any agent wins above a threshold defined in
[`lib/simulation/constants.ts`](../reference/simulation-constants.md), it's
reported here. A non-null `dominantStrategy` is one of the strongest signals
the analyser can give you.

### `flaggedIssues`

Plain-English warnings — for example:

- `"First-player advantage exceeds 10%."`
- `"Card 'Overload' wins 78% of games it appears in."`
- `"Game length pinned to turn cap in 24% of games."`

These are the same strings the **Flagged Issues** panel renders in the UI.

## Iterating on the score

Treat the score as a **gradient**, not a verdict. Your goal each round of
the design loop is to **move the number up** while keeping the design's
intent intact. If a fix raises balance score from 62 to 79 but flattens the
game into a boring single dominant tempo, that's a regression in fun even if
it's a win in math.

Use the score to find what's broken. Use your judgement to decide what to fix.
