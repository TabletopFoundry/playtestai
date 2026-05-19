---
id: tuning-card-stats
title: Tuning card stats
sidebar_position: 5
description: A disciplined approach to fixing the cards the analyser flags.
---

# Tuning card stats

The card rankings table tells you **which card is broken**. This guide
covers what to actually do about it.

## The diagnosis-to-fix table

| Diagnosis | Fix to try first |
| --- | --- |
| `powerScore > 2.0` with high inclusion | Reduce the most impactful stat by 1. |
| `powerScore > 1.5` and won 70%+ of games it appeared in | Raise `cost` by 1. |
| `powerScore < 0.5` and `inclusionRate < 0.1` | Lower `cost` by 1 or raise an impact stat by 1. |
| `winCorrelation` near 0 despite high `totalPlays` | Card is filler — buff it or cut it. |
| `averageImpact` is high but `winCorrelation` is low | Card looks splashy but doesn't actually close games. Consider redesign. |

## The smallest possible change rule

Always make the **smallest possible change** that addresses the flagged
issue. `score: 4 → 3` first; only if that didn't move the needle, try
`score: 4 → 2`. Big swings make it impossible to know which knob was the
right one.

> The engine is sensitive enough that one-point changes routinely move the
> balance score by 5–10 points. Trust it.

## Cost vs. effect

Two ways to nerf a strong card:

1. **Reduce effect** — lowers the card's value in *every* game state.
2. **Raise cost** — keeps the card's ceiling, but delays when it comes online.

Choose by reading the **length histogram**:

- If games end too fast, raise cost (delays the finisher, lengthens games).
- If games drag, reduce effect (keeps cards in play earlier but less punishing).

## Buffing weak cards

A card with `inclusionRate < 5%` is being passed over by the AI. Before
buffing, ask **why** the AI ignores it:

| Reason | Symptom | Fix |
| --- | --- | --- |
| Too expensive | The card is in the affordable set rarely. | Lower `cost`. |
| Outclassed | A similar-cost card has higher `powerScore`. | Add a differentiating stat (e.g., `draw: 1`). |
| Wrong phase | Effect is finisher-flavoured but cost is early-game. | Move effect into the right phase. |

## Tuning custom stats

Custom (non-engine) stats get weighted at `CUSTOM_STAT_WEIGHT = 0.35` per
unit. That's intentionally modest — the engine can't know what your custom
stat *does*. If a card with a custom stat is under-played:

1. Replace the custom stat with a known stat that approximates its effect
   (e.g., a "haste" effect → `power: 1` on the turn it's played).
2. Or accept the agent will undervalue it. Custom stats are best for
   flavour, not for being the cornerstone of a card.

## When to redesign, not tune

If you've cycled three versions and the balance score is still under 60,
**stop tuning numbers** and redesign the offending card. Possible signs:

- A card whose `powerScore` is high *and* whose `inclusionRate` is high *and*
  is also the prime culprit in `flaggedIssues`.
- A category of cards (e.g., all your draw spells) that consistently rank
  too low or too high together.

Tuning fixes a card. Redesign fixes a category.

## Validation checklist

Before promoting your tuned version:

- [ ] Balance score climbed by ≥ 5 points vs. the baseline.
- [ ] No new flagged issues appeared.
- [ ] First-player advantage didn't worsen.
- [ ] The previously-dominant card is no longer #1 by `powerScore`.
- [ ] Length distribution didn't gain a new spike.
- [ ] Re-running at a second seed (1337) agrees with seed 42.

If all six pass, promote. If any one fails, you've traded one problem for
another — go back.
