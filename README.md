# PlaytestAI

[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![Tests](https://img.shields.io/badge/tests-78%20passing-brightgreen)](#testing)

**AI-powered board game playtesting and balance analysis.** Define card-driven games, run
thousands of automated playtests with AI agents, spot broken openers, and compare balance
variants — all in the browser, no server required.

---

## Quick Start

> **Prerequisites:** [Node.js](https://nodejs.org/) >= 20 and npm >= 9

```bash
git clone <repo-url> && cd playtestai
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Seed data loads automatically on first
launch — you'll see example projects ready to simulate.

---

## Features

| Category | Details |
|---|---|
| **Rule modeling** | Player counts, win conditions, resources, cards with custom stats, CSV import |
| **Simulation engine** | 100-10,000 automated playtests per run with Random, Greedy, and Balanced AI agents |
| **Balance analytics** | Win rates by seat, card power rankings, game length distribution, dominant strategy detection, overall balance score (0-100) |
| **A/B testing** | Duplicate versions, edit suspect cards, compare metrics side-by-side |
| **Persistence** | SQLite-backed version history and simulation runs survive refreshes |
| **Reporting** | Printable/exportable balance reports via browser print dialog |

---

## Tech Stack

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router)
- **Language:** [TypeScript 5](https://www.typescriptlang.org/) (strict mode)
- **Styling:** [Tailwind CSS 4](https://tailwindcss.com/)
- **Database:** [SQLite](https://www.sqlite.org/) via [`better-sqlite3`](https://github.com/WiseLibs/better-sqlite3)
- **Charts:** [Recharts](https://recharts.org/)
- **Validation:** [Zod 4](https://zod.dev/)
- **Testing:** [Vitest](https://vitest.dev/)

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Create production build |
| `npm start` | Serve production build |
| `npm run lint` | Run ESLint checks |
| `npm run typecheck` | Run TypeScript compiler checks (no emit) |
| `npm test` | Run all tests once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run validate` | Run typecheck + lint + tests (pre-push) |

---

## Project Structure

```
playtestai/
├── app/                          # Next.js App Router
│   ├── api/projects/             # REST API endpoints (6 routes)
│   ├── projects/                 # Project list and workbench pages
│   ├── layout.tsx                # Root layout with dark theme
│   ├── page.tsx                  # Landing page
│   └── error.tsx                 # Global error boundary
├── components/
│   ├── chrome/                   # App shell (navigation)
│   ├── projects/                 # Project workbench UI
│   │   └── workbench/            # Tab panels (dashboard, definition, simulate, compare, report)
│   └── ui/                       # Shared UI primitives
├── lib/
│   ├── api-helpers.ts            # Shared API response utilities
│   ├── db/                       # Database layer (schema, repos, seed)
│   │   ├── schema.ts             # SQLite schema + connection
│   │   ├── projects.ts           # Project CRUD
│   │   ├── versions.ts           # Version CRUD
│   │   ├── runs.ts               # Simulation run CRUD
│   │   └── seed.ts               # Demo data bootstrap
│   ├── simulation/               # Simulation engine
│   │   ├── engine.ts             # Batch simulation orchestrator
│   │   ├── agents.ts             # AI agent strategies
│   │   ├── mechanics.ts          # Game rules (deck, combat, scoring)
│   │   ├── analytics.ts          # Histograms, balance scoring
│   │   ├── constants.ts          # All tuning parameters
│   │   ├── rng.ts                # Deterministic PRNG
│   │   └── __tests__/            # Engine + validation tests
│   ├── types.ts                  # Shared TypeScript interfaces
│   ├── validation.ts             # Zod schemas for API input
│   └── utils.ts                  # Utility functions
├── data/                         # SQLite database (auto-created)
├── docs/                         # Design docs and reviews
└── public/                       # Static assets
```

---

## Simulation Model

The engine uses a simplified card battler loop designed to surface balance issues:

1. **Economy** — All defined resources aggregate into a playable economy pool
2. **Deck** — Players draw from a shared deck built from card quantities
3. **Decisions** — AI agents choose affordable legal cards each turn using strategy-specific heuristics
4. **Resolution** — Cards apply power, score, draw, shields, economy, and damage through custom stats
5. **Analytics** — The engine records per-game outcomes and aggregates statistics across the full batch

### AI Agent Types

| Agent | Strategy |
|---|---|
| **Random** | Plays any affordable card at random |
| **Greedy** | Maximizes immediate power + finisher value |
| **Balanced** | Weighs short-term and long-term value with slight randomness |

---

## API Endpoints

| Method | Path | Description | Response |
|---|---|---|---|
| `GET` | `/api/health` | Health check (version, timestamp) | `200` with JSON body |
| `GET` | `/api/projects` | List all projects with summaries | `200` with JSON body |
| `POST` | `/api/projects` | Create a new project | `201` with `{ project }` |
| `GET` | `/api/projects/:id` | Get project with versions and runs | `200` with `{ project }` |
| `PUT` | `/api/projects/:id` | Update project name/description | `200` with `{ project }` |
| `DELETE` | `/api/projects/:id` | Delete project and all related data | `204` No Content |
| `POST` | `/api/projects/:id/versions` | Duplicate a version | `201` with `{ project }` |
| `PUT` | `/api/projects/:id/versions/:vid` | Update version definition | `200` with `{ project }` |
| `DELETE` | `/api/projects/:id/versions/:vid` | Delete a version | `200` with `{ project }` |
| `POST` | `/api/projects/:id/runs` | Save a simulation run | `201` with `{ project }` |
| `DELETE` | `/api/projects/:id/runs/:rid` | Delete a simulation run | `200` with `{ project }` |

> **DELETE convention:** Deleting a **project** returns `204 No Content` (the parent resource no longer exists). Deleting a **version** or **run** returns `200` with the updated parent `{ project }` payload so the client can refresh state without an extra round-trip.

---

## Testing

Tests cover the simulation engine, agent strategies, game mechanics, validation logic, utility functions, and CSV parsing:

```bash
npm test              # Run all 78 tests
npm run test:watch    # Watch mode for development
npm run test:coverage # Generate coverage report
```

---

## Notes

- **Seed data** is inserted automatically on first launch
- **Database** file is created at `data/playtestai.sqlite` — gitignored by default
- **Simulations are deterministic** — same seed produces identical results
- **Reports** can be exported as PDF via the browser print dialog
- All API inputs are validated with Zod schemas before database writes
