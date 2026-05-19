---
id: agents
title: AI agents
sidebar_position: 4
description: The three built-in strategies, what they do, and when to use each.
---

# AI agents

PlaytestAI ships three deterministic agent archetypes. You assign one agent
per seat (the array wraps if it's shorter than `playerCount`), so you can
pit any combination against any other.

| Agent | One-line strategy | Best for |
| --- | --- | --- |
| **Random** | Play any affordable card uniformly at random. | Establishing a baseline. |
| **Greedy** | Always maximise immediate power + finisher value. | Stress-testing burst lines. |
| **Balanced** | Weigh short- and long-term value with small jitter. | Default. Closest to a skilled human. |

## Random

The Random agent is the simplest sanity check: it picks uniformly at random
from the set of affordable cards in hand, or passes if none are affordable.

**Use it to** measure how much your game depends on skill vs. card draw.
If `Random vs Random` produces a 50/50 win rate over thousands of games,
your game is fair by construction. If `Balanced vs Random` doesn't crush
`Random`, your game has no skill ceiling.

## Greedy

The Greedy agent always picks the card with the highest **immediate value**:

- Heavy weight on `damage`, `score`, and `power`.
- Bonus weight on cards with `damage` or `score` stats once the game enters
  the "finisher" phase (after 70% of `maxTurns` elapsed).
- Cost penalty: each unit of cost reduces value by `0.08` — so expensive
  cards must be clearly stronger to be picked.

Greedy is a useful stress-test agent. If `Greedy` reliably beats `Balanced`,
it usually means your game **rewards aggression too much** and lacks late-game
catch-up mechanics.

## Balanced

The Balanced agent is the default. It uses three weight profiles:

| Phase | When | Emphasises |
| --- | --- | --- |
| **Immediate** | Always (high weight early) | `power`, `damage`, `score`, `shield`, `draw` |
| **Strategic** | High weight in early game | `economy`, `draw`, combo potential |
| **Finisher** | High weight in late game | `damage`, `steal`, `score`, `power` |

Phase weights blend smoothly across the game using cutoffs at 45% and 70% of
`maxTurns`. The agent also applies:

- A modest cost penalty (`0.04` per cost unit).
- **Jitter** — multiplies each card's score by a random factor in `[1, 1+0.9)`.
- **Shortlist** — picks uniformly from the top 3 candidates after jitter.

Jitter is what makes Balanced realistic. A perfectly deterministic agent
overfits to a single "correct" line and hides decision branches that real
players explore.

## Reading mixed lineups

The most useful simulations mix agents.

| Lineup | What it tells you |
| --- | --- |
| `[balanced, balanced]` | Pure balance of the game state itself. |
| `[balanced, greedy]` | Does playing optimally beat playing aggressively? |
| `[balanced, random]` | What is the skill ceiling? |
| `[greedy, greedy]` | Is there a degenerate one-strategy meta? |
| `[random, random]` | Sanity check — should be near 50/50 on a fair game. |

The `strategyBreakdown` panel in the dashboard shows win rate per agent. A
healthy game has `balanced` winning more than `greedy`, which wins more than
`random`. If your game inverts that order, you've found something worth
investigating.

## Tuning the agents

The weights and thresholds live in
[`lib/simulation/constants.ts`](../reference/simulation-constants.md) under
`AGENT_WEIGHTS`, `CARD_VALUE_WEIGHTS`, and `PHASE_WEIGHTS`. They are exported
as `as const` and are pure-functional inputs to the agent — change them, run
the tests, and you have a new agent profile.

If you change agent weights, treat your existing runs as **historically
accurate but no longer comparable** to new runs. Re-simulate the versions
you care about.
