---
id: quickstart
title: Quickstart
sidebar_position: 1
description: From zero to your first balance report in under five minutes.
---

# Quickstart

Go from zero to a real balance report in **under five minutes**. You'll clone
the repo, open the dev server, run a 2,000-game simulation against a seeded
example project, and read the results.

## Prerequisites

| Tool | Version |
| --- | --- |
| [Node.js](https://nodejs.org/) | `>= 20` |
| npm | `>= 9` |

> Check with `node -v` and `npm -v`. If you use `nvm`, the repo ships an
> `.nvmrc` — just run `nvm use`.

## 1. Clone and install

```bash
git clone https://github.com/TabletopFoundry/playtestai.git
cd playtestai
npm install
```

## 2. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). On first launch in
development, the app **seeds a demo catalog** automatically:

- 8 example projects (deck builder, TCG, party, strategy)
- 6 active projects, each with 5 versions ready for A/B comparison
- 25 stored simulation runs with pre-computed analytics

You'll see them on the **Projects** page.

## 3. Run your first simulation

1. Pick any seeded project — `Aether Drift` is a good starting point.
2. Click into it to open the **Workbench**.
3. Open the **Simulate** tab.
4. Leave the defaults: `2000 games`, `2 players`, `seed 42`, agents
   `[balanced, greedy]`.
5. Hit **Run simulation**.

The batch runs locally in your browser. For 2,000 games this typically
completes in 1–3 seconds on a modern laptop.

## 4. Read the results

The **Dashboard** tab now shows:

| Panel | What to look at |
| --- | --- |
| **Balance score** | A 0–100 composite. Above 75 is healthy. |
| **Win rate by seat** | Is seat 1 winning too often? That's first-player advantage. |
| **Strategy breakdown** | If one agent wins >65%, your game probably has a dominant line. |
| **Card power rankings** | Cards with `powerScore > 1.5` and high inclusion are over-statted. |
| **Length histogram** | Sharp spikes mean games end on a fixed turn — likely a hard cap, not skill. |
| **Flagged issues** | Plain-English warnings from the analyser. |

## 5. Make a change and compare

1. Go back to the project, open the **Definition** tab.
2. Duplicate the version (top-right of the version sidebar).
3. In the new version, find the card with the highest `powerScore` and
   reduce one of its stats by 1.
4. Run another 2,000-game simulation on the new version.
5. Switch to the **Compare** tab and select both versions.

You now have a side-by-side balance diff. Welcome to PlaytestAI.

## Next steps

- Build your own game from scratch → [Your first game](./your-first-game.md)
- Understand the engine → [Simulation model](../concepts/simulation-model.md)
- Tune cards with confidence → [Tuning card stats](../guides/tuning-card-stats.md)
