---
id: your-first-simulation
title: Run your first simulation
sidebar_position: 1
description: Configure and launch a batch simulation, step by step.
---

# Run your first simulation

This guide assumes you already have a project with at least one version. If
not, see [Build your first game](../getting-started/your-first-game.md).

## Open the Simulate tab

From a project workbench, click **Simulate**. You'll see a configuration
panel with five fields.

| Field | What it controls | Recommended |
| --- | --- | --- |
| **Games** | Batch size — how many games to play. | `2000` for iteration, `10000` for final calls. |
| **Players** | Seats per game. Must satisfy the version's player count range. | The mid-point of your range. |
| **Seed** | PRNG seed. Same seed → same result. | Leave at `42` while iterating; vary for sanity checks. |
| **Agents** | Strategy per seat. Wraps if shorter. | `["balanced", "balanced"]` for default; mix to stress-test. |
| **Label** | Free text to remember the run. | `"v1 baseline"`, `"after Finisher nerf"`. |

Hit **Run simulation**.

## How long it takes

| Games | Players | Typical wall time |
| --- | --- | --- |
| 500 | 2 | under 1s |
| 2,000 | 2 | 1–3s |
| 10,000 | 2 | 4–10s |
| 10,000 | 4 | 8–20s |

All work runs in the **browser tab**. The tab will not freeze (the engine
yields to the event loop between games) but a 10k-game run on a slow machine
will warm up the fans.

## What gets saved

When the run completes, the engine:

1. Builds the full `SimulationBatchResult` (rankings, histograms, summary).
2. Persists a `SimulationRun` row to SQLite with the config and result.
3. Routes you to the **Dashboard** tab so you can read it.

The run is now part of the project forever. Delete it with the trash icon
from the runs list if you need to clean up.

## Recommended workflow

1. **Always run a baseline first.** Before any edit, capture v1 at 2k games,
   seed 42, default agents. Label it `"baseline"`.
2. **Change one thing at a time.** Tweak one card, duplicate, re-simulate.
3. **Vary the seed for big decisions.** When you think a fix is final, run
   it at three seeds (42, 1337, 9001). If results agree, you're done. If
   they disagree wildly, you've found genuine variance — raise game count.
4. **Save runs you want to remember.** A `"after Finisher nerf — accepted"`
   run six months from now will save you re-deriving why you made the change.

## Troubleshooting common runs

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| All games end in tie or turn cap. | No card can finish — damage/score too low. | Raise top cards' impact or lower `targetScore`. |
| One agent dominates by 40%+. | Strategy is hard-tuned to the cost curve. | Adjust the dominant card's cost or stats. |
| Highly variable seed-to-seed results. | Sample size too low. | Increase to 10,000 games. |
| Engine flags "card never played". | Cost > maximum economy reachable in `maxTurns`. | Lower cost or raise `gainPerTurn`. |

## Next

- [Reading balance reports](./reading-balance-reports.md) — interpret what the run gives you.
- [A/B testing versions](./ab-testing-versions.md) — turn runs into decisions.
