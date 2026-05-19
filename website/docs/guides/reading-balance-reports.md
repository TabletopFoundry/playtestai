---
id: reading-balance-reports
title: Reading balance reports
sidebar_position: 4
description: A panel-by-panel guide to interpreting a simulation dashboard.
---

# Reading balance reports

A simulation dashboard has six panels. Read them top to bottom — they're
ordered from "is the game fair at all?" to "which card is causing this?"

## 1. Balance score and recommendation

The composite **balance score** (0–100) and a one-sentence
**recommendation** sit at the top.

- **80+** — green band. Move on or polish.
- **60–79** — yellow band. Read every panel below carefully.
- **Below 60** — red band. Something specific is broken.

The recommendation is generated from the worst sub-score. If it says
*"Reduce Finisher's damage or score"*, the analyser found a single card
dominating winning games.

## 2. Win rate by seat

Bars per seat. In a perfectly fair game, every bar is at `1 / playerCount`
(0.5 for 2P, 0.33 for 3P, 0.25 for 4P).

| What you see | What it means |
| --- | --- |
| Seat 1 is 3–5% higher | Normal first-player edge. |
| Seat 1 is 10%+ higher | Game rewards tempo; consider a "going second" handicap. |
| Last seat is highest | Late-seat advantage — usually means draw-heavy or kingmaker mechanics. |
| Bars wildly different from each other | Variance — your sample size is too low. |

## 3. Strategy breakdown

Bars per agent (`random`, `greedy`, `balanced`).

A healthy game shows: **balanced ≥ greedy > random**, with balanced winning
50–60% in mixed lineups.

| Pattern | Meaning |
| --- | --- |
| `random` wins ≥ 30% | Low skill ceiling — game is luck-driven. |
| `greedy` ≥ `balanced` | Aggression dominates strategy. Game is too "tempo". |
| `balanced` ≫ everything | Healthy skill curve. |

## 4. Game length distribution

A histogram of turns until win.

- **Bell-shaped, peak between 6 and 10** — healthy.
- **Heavily skewed left (3–5 turn games)** — turbo finishers.
- **Spike at the turn cap** — many games never finish under the win
  condition; the cap is doing the heavy lifting.
- **Bimodal (two peaks)** — likely two distinct strategies finishing at
  different rates.

## 5. Card rankings

Per-card metrics, sorted by `powerScore`:

| Field | Meaning |
| --- | --- |
| `totalPlays` | How often this card was played across the batch. |
| `winnerPlays` | How often it was played by the eventual winner. |
| `winCorrelation` | Likelihood-ratio of winning when this card was played. |
| `averageImpact` | Average swing in score/health when this card resolved. |
| `inclusionRate` | Fraction of games this card appeared in someone's hand. |
| `powerScore` | Composite ranking (`> 1.5` means "strong"; `> 2.0` means "broken"). |

The top-ranked card by `powerScore` is the **prime suspect** for any balance
problem. The bottom-ranked is the prime suspect for "this card never gets
played" issues.

## 6. Flagged issues

Plain-English warnings from the analyser. Each one points to a specific panel
above. Use them as a checklist — fix the issues, re-simulate, the list shrinks.

Common flags and their fixes:

| Flag | Fix |
| --- | --- |
| `"First-player advantage exceeds 10%."` | Give later seats extra starting resource or hand size. |
| `"Greedy strategy dominates."` | Add late-game catch-up; reduce burst damage. |
| `"Card X wins 78% of games it appears in."` | Nerf the card. Lower a stat by 1. |
| `"Card Y played in less than 5% of games."` | Buff or replace the card. |
| `"24% of games hit turn cap."` | Lower `targetScore` or `maxTurns`. |

## The report tab

The **Report** tab shows the same dashboard formatted for printing. Use your
browser's print dialog to export it as PDF — handy for sharing with
co-designers, publishers, or your future self.
