---
id: deterministic-replay
title: Deterministic replay
sidebar_position: 6
description: Reproduce any simulation result, debug regressions, share with teammates.
---

# Deterministic replay

The single most useful guarantee PlaytestAI gives you: **same input, same
output**. Every game is driven by one seed, and the engine never reaches for
`Math.random()` or wall-clock time.

## What "same input" means

A run is fully reproducible when these are identical:

- Version contents — rules, resources, every card stat, every quantity.
- `config.games`
- `config.playerCount`
- `config.seed`
- `config.agentTypes` (order matters — `["balanced","greedy"]` ≠ `["greedy","balanced"]`)
- Engine version — the contents of `lib/simulation/`.

> If you upgrade PlaytestAI and the simulation code changed, old results are
> historically accurate but no longer reproducible against the new engine.
> Re-simulate critical versions after each upgrade.

## Use cases

### 1. Sharing a regression

Found a card that wins 78% of games but suspect it's a one-off? Note the run's
seed, send the version JSON and the seed to a teammate, and they will see
exactly what you saw.

```bash
sqlite3 data/playtestai.sqlite \
  "SELECT json_extract(payload, '$.cards') FROM versions WHERE id = '<version-id>';"
```

### 2. Investigating one bad game

In Node:

```ts
import { runSingleGame } from "@/lib/simulation/engine";
import { loadVersion } from "@/lib/db/versions";

const version = loadVersion("vers_01HJYZ...");
const game = runSingleGame(version, {
  playerCount: 2,
  seed: 42,        // batch seed
  gameIndex: 137,  // the offending game in the batch
  agentTypes: ["balanced", "greedy"],
});

console.log(game.turnLog);
```

Per-game seeds are derived deterministically from `(seed, gameIndex)`, so
you can pull one game out of any batch.

### 3. Locking in a "known good" baseline

Pick a published version + a config you trust. Run it. Note the
`overallBalanceScore`. Add an assertion to your test suite:

```ts
it("baseline v1 holds balance score >= 78", () => {
  const result = runBatchSimulation(BASELINE_V1, {
    games: 2000,
    playerCount: 2,
    seed: 42,
    agentTypes: ["balanced", "balanced"],
  });
  expect(result.summary.overallBalanceScore).toBeGreaterThanOrEqual(78);
});
```

This is a **regression test for game design**. If a future PR drifts the
engine or the version, this test will tell you.

## What's not deterministic

| Thing | Why |
| --- | --- |
| Wall-clock fields in records (`createdAt`) | Recorded from `Date.now()`. They're metadata, not engine inputs. |
| Order of stored runs in the UI | Sorted by `createdAt`. |
| Browser performance | Identical results, different wall-time. |

Nothing that affects the *result payload* is non-deterministic.

## The PRNG

The engine uses a tiny LCG in [`lib/simulation/rng.ts`](https://github.com/TabletopFoundry/playtestai/blob/main/lib/simulation/rng.ts):

```ts
// state = (state * 1664525 + 1013904223) >>> 0
```

It is deliberately not cryptographically secure — it's fast, deterministic,
and trivially portable. If you ever need to reproduce a result in another
language, the recurrence is two lines and the same seeds yield the same
stream.
