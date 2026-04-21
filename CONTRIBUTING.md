# Contributing to PlaytestAI

Thanks for considering a contribution! This guide covers everything you need to go from
clone to merged PR.

---

## Prerequisites

- [Node.js](https://nodejs.org/) >= 20 (see `.nvmrc`)
- npm >= 9

## Setup

```bash
git clone <repo-url>
cd playtestai
npm install
npm run dev          # Start dev server at http://localhost:3000
```

Seed data is created automatically on first launch.

## Development Workflow

1. **Create a feature branch** from `main`
2. **Make your changes** — the dev server hot-reloads
3. **Run checks before committing:**

```bash
npm run lint         # ESLint
npm run typecheck    # TypeScript compiler
npm test             # Vitest (78 tests)
```

4. **Open a pull request** against `main`

## Code Style

- **TypeScript** — strict mode is enabled; avoid `any` types
- **Formatting** — 2-space indentation, LF line endings (see `.editorconfig`)
- **Imports** — use `@/` path alias for project imports
- **Naming** — camelCase for variables/functions, PascalCase for components/types
- **Components** — functional components with explicit prop types
- **Validation** — all API inputs must be validated with Zod schemas (`lib/validation.ts`)

## Project Layout

| Directory | Purpose |
|---|---|
| `app/` | Next.js App Router pages and API routes |
| `components/` | React components (chrome, projects, ui) |
| `lib/db/` | Database layer — schema, CRUD repos, seeding |
| `lib/simulation/` | Simulation engine, agents, analytics |
| `lib/` | Shared types, validation, utilities |
| `docs/` | Design documents and reviews |

## Testing

Tests live alongside source code in `__tests__/` directories:

```bash
npm test              # Run once
npm run test:watch    # Watch mode
npm run test:coverage # With coverage
```

When adding new features to the simulation engine or utilities, add corresponding tests.
API route tests and component tests are welcome additions.

## Commit Messages

Use clear, imperative commit messages:

```
feat: add shield decay visualization to dashboard
fix: correct first-player advantage calculation
docs: add CSV format specification
```

## Database

- SQLite database is auto-created at `data/playtestai.sqlite`
- Schema is in `lib/db/schema.ts`
- Seed data is in `lib/data-seeds.ts`
- The database file is gitignored — delete it to reset to seed data

## Need Help?

Open an issue describing what you'd like to work on. We're happy to help you find a good
starting point.
