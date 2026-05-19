---
id: your-first-game
title: Build your first game
sidebar_position: 3
description: Model a tiny card game end-to-end and see it balanced.
---

# Build your first game

This walkthrough builds **"Spark Duel"** — a minimal 2-player card battler —
from an empty project to a finished balance report. It takes about ten
minutes.

## 1. Create the project

From the **Projects** page, click **New project**, fill in:

| Field | Value |
| --- | --- |
| Name | Spark Duel |
| Description | A tiny 2-player resource battler |
| Player count | 2 – 2 |
| Win condition | `first_to_x` |

This creates a project with an initial empty version.

## 2. Configure the rules

Open the **Definition** tab.

| Field | Value | Why |
| --- | --- | --- |
| Target score | `15` | Short games — you'll iterate fast. |
| Max turns | `12` | Caps runaway games. |
| Starting health | `20` | Buffer for damage cards. |
| Starting hand size | `4` | Enough choice on turn 1. |

## 3. Define one resource

In the **Resources** section, add:

| name | startAmount | gainPerTurn |
| --- | --- | --- |
| Energy | `1` | `2` |

Energy is what cards cost to play.

## 4. Add six cards

In the **Cards** section, add the following. Custom stats (`damage`, `draw`,
`economy`) are free-form — name them whatever you like and the engine will
weight them automatically.

| name | cost | power | qty | stats |
| --- | --- | --- | --- | --- |
| Spark | 1 | 1 | 6 | `{ damage: 1 }` |
| Surge | 2 | 2 | 5 | `{ damage: 2 }` |
| Charge | 1 | 0 | 4 | `{ economy: 1 }` |
| Scry | 1 | 0 | 4 | `{ draw: 1 }` |
| Overload | 4 | 3 | 3 | `{ damage: 3, score: 2 }` |
| Finisher | 5 | 4 | 2 | `{ damage: 4, score: 4 }` |

> Tip: you can also paste this from a CSV. See [CSV import](../guides/csv-import.md).

Save the version.

## 5. Run a simulation

Open the **Simulate** tab and run with the defaults
(`2000 games`, `seed 42`, agents `["balanced", "greedy"]`).

## 6. Read and react

You'll likely see something like:

- **Balance score**: 60–70 (decent for a first pass).
- **First-player advantage**: positive, maybe 5–10%.
- **Card power rankings**: `Finisher` and `Overload` near the top. That's
  expected — they're meant to be strong.
- **Flagged issue**: possibly `"Game length spikes at turn cap"` if many
  games hit turn 12 without a winner.

### A typical fix

If `Finisher` shows `powerScore > 1.8` and 95% inclusion in winning games:

1. Duplicate the version.
2. Edit `Finisher`: drop `score: 4` → `score: 2`.
3. Re-simulate.
4. Open the **Compare** tab.

If the balance score climbed and the strategy breakdown evened out, ship it.
If first-player advantage got worse, the fix was over-corrected — try
reducing `damage: 4` → `damage: 3` instead.

## 7. Export the report

Open the **Report** tab and use your browser's print dialog
(<kbd>⌘</kbd>/<kbd>Ctrl</kbd>+<kbd>P</kbd>) → *Save as PDF*. You now have a
shareable artifact for your publisher, co-designer, or future self.

## Where to go next

- [Reading balance reports](../guides/reading-balance-reports.md) — what every panel means.
- [A/B testing versions](../guides/ab-testing-versions.md) — compare with discipline.
- [Tuning card stats](../guides/tuning-card-stats.md) — fix what the report flags.
