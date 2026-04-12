# PlaytestAI

PlaytestAI is a local-first MVP for AI-powered board game playtesting and balance analysis.

## Stack

- Next.js App Router + TypeScript
- Tailwind CSS
- SQLite via `better-sqlite3`
- Recharts for analytics

## What’s included

- Developer-tool style landing page
- Project list and project creation
- Game rule definition with:
  - player counts
  - win condition type
  - resources
  - cards with custom stats
  - CSV card import
- In-browser simulation engine with Random, Greedy, and Balanced agents
- Analytics dashboard with:
  - win rate by seat
  - card power rankings
  - game length distribution
  - score distribution
  - dominant strategy detection
  - overall balance score
- A/B testing workflow with version duplication and side-by-side comparison
- SQLite-backed version history and simulation history
- Printable/exportable report view
- Seeded example projects and saved benchmark runs

## Simulation model

The MVP uses a simplified card battler loop:

- all defined resources are aggregated into a playable economy pool
- players draw from a shared deck definition built from card quantities
- agents choose affordable legal cards each turn
- cards can add power, score, draw, shields, economy, and damage through custom stats
- the engine records real per-game outcomes and aggregates analytics from those runs

## Getting started

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Useful scripts

```bash
npm run dev
npm run lint
npm run build
```

## Project structure

- `app/` – routes, pages, API endpoints
- `components/` – landing page and workspace UI
- `lib/db.ts` – SQLite schema, seed data, CRUD helpers
- `lib/simulation/engine.ts` – playtesting engine and analytics aggregation
- `data/playtestai.sqlite` – local persistence file created on first run

## Notes

- Seed data is inserted automatically on first launch.
- Simulation runs persist to SQLite so history survives refreshes.
- Use the report page plus browser print dialog to export PDF.
