# Code Quality & Architecture Review — PlaytestAI

> **Reviewer:** Principal Software Engineer (automated)
> **Date:** 2025-07-16
> **Commit scope:** Full codebase snapshot
> **Stack:** Next.js 16 · React 19 · TypeScript 5 · SQLite (better-sqlite3) · Recharts · Tailwind CSS 4 · Vitest

---

## Executive Summary

| Dimension | Rating |
|---|---|
| **Overall Quality Score** | **B+** |
| **Architecture Health** | Good |
| **Maintainability Index** | Medium–High |
| **Technical Debt Estimate** | Low–Medium |

The codebase is well-structured for an MVP: strong type definitions, deterministic simulation engine with tests, clear module boundaries, solid accessibility (ARIA roles, sr-only tables for charts), and a clean Next.js App Router layout. The main improvement vectors are: a duplicated simulation loop, a growing "god component" workbench, missing API input validation, absence of tests for data and API layers, and several dead-code lint warnings.

---

## Critical Findings — P0 (Must Address)

### P0-1 · No server-side validation on API mutation endpoints

**Files:** `app/api/projects/[projectId]/versions/[versionId]/route.ts:9`, `app/api/projects/[projectId]/runs/route.ts:9-14`

The `PUT /versions/:id` route casts `await request.json()` directly to `GameVersion` and passes it to `updateVersion()` without any schema validation. A malformed or malicious payload can write arbitrary JSON into the `data_json` column, silently corrupt state, or crash the simulation engine on next load.

Similarly, the `POST /runs` route trusts `config` and `result` from the client wholesale — meaning a tampered client can inject fabricated simulation results into the database.

**Impact:** Data integrity failure; any client (or HTTP tool) can corrupt the database.

**Fix:**
- Add a validation layer (e.g., Zod schemas) for every mutable API endpoint.
- Validate `GameVersion`, `SimulationConfig`, and `SimulationBatchResult` shapes before persisting.
- Return 400 with specific field errors on validation failure.

```ts
// Example with Zod
import { z } from "zod";
const GameVersionSchema = z.object({
  label: z.string().min(1).max(100),
  playerCountMin: z.number().int().min(2).max(6),
  playerCountMax: z.number().int().min(2).max(6),
  cards: z.array(CardSchema).min(1),
  // ...
});
```

---

### P0-2 · Duplicated simulation loop (`simulateBatch` / `simulateBatchAsync`)

**File:** `lib/simulation/engine.ts:566-616` and `618-679`

These two exported functions contain 60+ identical lines of game-loop and aggregation logic. The only difference is that the async variant yields to the event loop every N games and reports progress.

**Impact:** Any bug fix or feature change (e.g., new stat type, scoring formula) must be applied in two places. Copy-paste divergence is the #1 source of subtle simulation bugs.

**Fix — Extract shared accumulator:**
```ts
function accumulateGame(
  game: SingleGameResult,
  state: BatchAccumulator,
  cardMap: Map<string, CardStats>,
) { /* shared logic */ }

export function simulateBatch(...) {
  for (...) { accumulateGame(simulateSingleGame(...), state, cardMap); }
  return summariseResult(...);
}

export async function simulateBatchAsync(..., onProgress) {
  for (...) {
    accumulateGame(simulateSingleGame(...), state, cardMap);
    if (shouldYield(i)) { onProgress?.(...); await tick(); }
  }
  return summariseResult(...);
}
```

---

### P0-3 · SQLite database file committed to repository

**File:** `data/playtestai.sqlite`, `data/playtestai.sqlite-shm`, `data/playtestai.sqlite-wal`

These binary database files are present in the repo. While `.gitignore` lists `data/*.sqlite*`, the files were already tracked before the ignore rule was added (or were force-added). Binary DB files in git cause repository bloat, merge conflicts, and leak seed data across environments.

**Fix:**
```bash
git rm --cached data/playtestai.sqlite data/playtestai.sqlite-shm data/playtestai.sqlite-wal
```
Confirm `.gitignore` rules are effective, then commit the removal.

---

## Architectural Concerns — P1

### P1-1 · `engine.ts` is a 679-line monolith with 7+ responsibilities

**File:** `lib/simulation/engine.ts`

This single file owns: RNG, deck expansion, card value heuristics, agent decision-making (3 strategies), damage resolution, win-condition evaluation, histogram building, balance scoring, recommendation generation, and batch orchestration.

**Impact:** Difficult to test individual strategies, hard to add new agent types, high cognitive load.

**Fix — Decompose into focused modules:**

| New module | Responsibility |
|---|---|
| `lib/simulation/rng.ts` | `createRng`, `shuffle` |
| `lib/simulation/agents.ts` | `chooseCard`, `chooseTarget` (per-agent strategy) |
| `lib/simulation/mechanics.ts` | `drawCards`, `resolveCardPlay`, `applyDamage`, `determineWinner` |
| `lib/simulation/analytics.ts` | `buildHistogram`, `summariseResult`, validation |
| `lib/simulation/engine.ts` | Orchestrates `simulateSingleGame` + `simulateBatch` only |

---

### P1-2 · `ProjectWorkbench` is a 269-line god component managing 11 state variables

**File:** `components/projects/project-workbench.tsx:31-41`

The component owns: `project`, `activeTab`, `selectedVersionId`, `selectedRunId`, `workingVersion`, `projectDraft`, `cardStatsInput`, `statusMessage`, `errorMessage`, `savingProject`, `savingVersion` — then bundles them into a `WorkbenchState` bag passed to every child.

**Impact:** Any state change re-renders the entire workbench tree. The `WorkbenchState` interface (30+ fields) is a data clump / feature envy smell — every child destructures the entire bag even when it needs 2-3 fields.

**Fix:**
1. Extract a `useWorkbenchState(initialProject)` custom hook.
2. Use React Context with selective subscriptions (`useSyncExternalStore` or separate contexts for version-state, UI-state, API-actions).
3. Pass only the fields each tab actually needs instead of the full `WorkbenchState`.

---

### P1-3 · `db.ts` mixes schema init, seed data, and all CRUD — no repository pattern

**File:** `lib/db.ts` (370 lines)

Schema DDL, seed bootstrapping, and every query for projects, versions, and runs live in one file. There is no abstraction boundary — if you wanted to swap SQLite for Postgres or add caching, you'd rewrite everything.

**Fix:**
- Extract `lib/db/schema.ts` (DDL + migrations).
- Extract `lib/db/seed.ts` (seed logic).
- Create per-entity repositories: `lib/db/projects.ts`, `lib/db/versions.ts`, `lib/db/runs.ts`.
- Export a unified `db` namespace or barrel file.

---

### P1-4 · No test coverage for API routes or database layer

**Current tests:** `engine.test.ts` (6), `validation.test.ts` (8), `utils.test.ts` (15), `csv-parser.test.ts` (6) = **35 total**

The API layer (`app/api/**`) and database layer (`lib/db.ts`) have zero tests. These are the most critical paths for data integrity.

**Fix:**
- Add integration tests for each API endpoint (POST, PUT, DELETE) using a test SQLite database.
- Add unit tests for `db.ts` functions: `createProject`, `updateVersion`, `duplicateVersion`, `deleteProject`, edge cases (deleting last version, double-delete, etc.).

---

### P1-5 · Module-level side effects in `db.ts` make testing and cold-start unpredictable

**File:** `lib/db.ts:10-13, 100`

```ts
const dataDir = path.join(process.cwd(), "data");
fs.mkdirSync(dataDir, { recursive: true });
const sqlite = new Database(dbPath);
// ...
initDb(); // line 100 — runs at import time
```

Importing `db.ts` immediately creates directories, opens a database connection, runs DDL, and seeds data. This makes it impossible to use a test database, creates race conditions in serverless cold starts, and couples every import to filesystem side effects.

**Fix:**
- Wrap initialization in a lazy singleton: `let db: Database | null = null; function getDb() { if (!db) { db = init(); } return db; }`.
- Accept a database path parameter for test injection.

---

## Code Smell Inventory — P1/P2

### P1-6 · ESLint warnings — unused imports and variables (10 issues)

**Files:** `project-workbench.tsx:15`, `definition-tab.tsx:5,44,60`, `types.ts:1`, `version-sidebar.tsx:5,6,9,19`

```
normalizeConfig, ValidationIssue, project, csvFile,
SimulationBatchResult, Upload, GameProject, ActiveTab, setProject
```

**Severity:** P1 — indicates dead code paths and incomplete refactors.

**Fix:** Remove all unused imports/variables. Set ESLint `no-unused-vars` to `error` severity to prevent recurrence.

---

### P1-7 · Magic numbers throughout the simulation engine

**File:** `lib/simulation/engine.ts`

Examples:
- `card.power * 1.4`, `damage * 2`, `score * 1.8` (line 137-138)
- `economy * 2.2`, `draw * 1.5`, `combo * 1.1` (line 138)
- `player.score += 4` (kill bonus, line 253)
- `Math.floor(damage / 3)` (score reduction, line 213)
- `positionalSpread * 0.9`, `dominant.winRate - 45) * 1.2` (line 517-518)
- `firstPlayerAdvantage > 8` (line 525)
- `dominant.winRate > 60` (line 528)

**Impact:** Impossible to understand or tune the balance model without reading the entire function. Changes to one weight may conflict with others.

**Fix:** Extract into a named configuration object:
```ts
const BALANCE_WEIGHTS = {
  cardValue: { power: 1.4, damage: 2, score: 1.8, ... },
  penalties: { positionalSpread: 0.9, dominanceThreshold: 45, ... },
  thresholds: { firstPlayerAdvantageWarning: 8, dominantStrategyWarning: 60, ... },
} as const;
```

---

### P2-1 · Deeply nested inline Tailwind strings reduce readability

**Files:** Most component files, especially `definition-tab.tsx`, `simulation-tab.tsx`

Many input elements repeat the exact same 100+ character className string:
```
className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50"
```

This is duplicated 20+ times across the codebase.

**Fix:** Extract shared Tailwind class constants or utility components:
```tsx
const inputClass = "w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white ...";
// or
function FormInput(props) { return <input {...props} className={cn(inputClass, props.className)} />; }
```

---

### P2-2 · `deepClone` uses `JSON.parse(JSON.stringify())` — loses `undefined`, `Date`, `Map`, `Set`

**File:** `lib/utils.ts:67-69`

This is fine for the current data shapes (plain objects with strings/numbers), but will silently corrupt data if types evolve to include `Date` objects, `undefined` values, or other non-JSON-serializable types.

**Fix:** Use `structuredClone()` (available in Node 17+ and all modern browsers):
```ts
export function deepClone<T>(value: T): T {
  return structuredClone(value);
}
```

---

### P2-3 · `resolveCardPlay` has 6 parameters — long parameter list

**File:** `lib/simulation/engine.ts:220-227`

```ts
function resolveCardPlay(card, player, players, round, maxTurns, rng)
```

**Fix:** Introduce a `GameContext` parameter object:
```ts
interface GameContext {
  players: PlayerState[];
  round: number;
  maxTurns: number;
  rng: () => number;
}
```

---

### P2-4 · `data-seeds.ts` mutates objects after creation

**File:** `lib/data-seeds.ts:43-47`

```ts
const version = createStarterVersion(projectId);
version.playerCountMin = input.playerCountMin;  // mutation
version.playerCountMax = input.playerCountMax;
version.winConditionType = input.winConditionType;
```

**Fix:** Pass parameters to `createStarterVersion()` instead of mutating after the fact:
```ts
function createStarterVersion(projectId: string, overrides?: Partial<GameVersion>): GameVersion
```

---

### P2-5 · No error boundary around simulation execution in browser

**Files:** `simulation-tab.tsx:55`, `compare-tab.tsx:99-100`

`simulateBatchAsync` runs synchronously-heavy code on the main thread. While the `await setTimeout(0)` yield prevents total UI freeze, a stack overflow or OOM from a pathological deck configuration will crash the tab with no recovery.

**Fix:**
- Move simulation to a Web Worker for true off-main-thread execution.
- Add a try/catch with a user-friendly "Simulation crashed" error state.
- Consider imposing a hard limit on deck expansion size (`expandDeck` can produce `O(cards * maxQuantity)` copies).

---

### P2-6 · `getProjectsSummary` has an N+1 query pattern

**File:** `lib/db.ts:154-173`

For each project, two additional queries run (`versionCountStmt`, `runsStmt`). With 50 projects this becomes 101 queries.

**Fix:** Use SQL JOINs or subqueries:
```sql
SELECT p.*, COUNT(DISTINCT v.id) as version_count, COUNT(DISTINCT r.id) as run_count
FROM projects p
LEFT JOIN versions v ON v.project_id = p.id
LEFT JOIN simulation_runs r ON r.project_id = p.id
GROUP BY p.id
ORDER BY p.updated_at DESC
```

---

### P2-7 · Dirty check via `JSON.stringify` comparison

**File:** `components/projects/project-workbench.tsx:52-55`

```ts
const dirty = useMemo(() => {
  return JSON.stringify(workingVersion) !== JSON.stringify(selectedVersion);
}, [selectedVersion, workingVersion]);
```

This serializes two full game version objects on every render. For large card sets this is O(n) on each keystroke.

**Fix:** Track dirty state explicitly via a `dirtyFields` set, or use a hash/checksum that only recomputes when the version object reference changes.

---

## SOLID Violations

### SRP Violations
| Location | Issue |
|---|---|
| `engine.ts` | 7+ responsibilities (see P1-1) |
| `db.ts` | Schema + seeds + all CRUD (see P1-3) |
| `ProjectWorkbench` | State management + layout + API calls (see P1-2) |

### OCP Violations
| Location | Issue |
|---|---|
| `chooseCard` / `chooseTarget` (engine.ts:153-206) | Adding a new agent type requires modifying existing if/else chains. Should use a Strategy pattern with an `Agent` interface. |
| `determineWinner` / `fallbackWinner` (engine.ts:277-303) | Win conditions are hardcoded switch cases. New conditions require modifying these functions. |

### DIP Violations
| Location | Issue |
|---|---|
| `db.ts:14` | `const sqlite = new Database(dbPath)` — concrete instantiation at module scope. No way to inject a test database or swap implementations. |
| `data-seeds.ts:2` | `import { simulateBatch }` — seed generation depends directly on the engine. Should accept results as input. |

### ISP Violations
| Location | Issue |
|---|---|
| `WorkbenchState` interface (30 fields) | Every tab component depends on the entire interface even when using 3-5 fields. Should be split into `VersionState`, `UIState`, `APIActions`. |

---

## Refactoring Roadmap

### High Impact, Low Effort
1. **P0-2** — Extract shared simulation accumulator (1-2 hours)
2. **P1-6** — Fix all ESLint warnings, promote to errors (30 min)
3. **P2-2** — Replace `deepClone` with `structuredClone` (5 min)
4. **P0-3** — Remove tracked database files from git (10 min)
5. **P2-4** — Pass overrides to `createStarterVersion` (15 min)

### High Impact, Medium Effort
6. **P0-1** — Add Zod schemas for all API input validation (3-4 hours)
7. **P1-1** — Decompose `engine.ts` into focused modules (4-6 hours)
8. **P1-7** — Extract magic numbers into named config objects (2-3 hours)
9. **P1-5** — Lazy database initialization with injectable path (1-2 hours)
10. **P2-6** — Fix N+1 query with JOIN-based summary query (1 hour)

### High Impact, High Effort
11. **P1-4** — Add API and database integration tests (6-8 hours)
12. **P1-2** — Extract `useWorkbenchState` hook + Context splits (4-6 hours)
13. **P1-3** — Split `db.ts` into repository modules (3-4 hours)
14. **P2-5** — Move simulation to Web Worker (4-6 hours)

### Medium Impact, Low Effort
15. **P2-1** — Extract shared Tailwind input class / `FormInput` component (1-2 hours)
16. **P2-3** — Introduce `GameContext` parameter object (30 min)
17. **P2-7** — Replace `JSON.stringify` dirty check (1 hour)

---

## Positive Observations

These patterns are well-executed and should be preserved:

1. **Strong type system** — `lib/types.ts` provides exhaustive, well-named interfaces for every domain concept. Union types (`WinConditionType`, `AgentType`) prevent stringly-typed errors.

2. **Deterministic simulation with seeded RNG** — The custom `createRng` function enables reproducible test runs, which is critical for a playtesting tool. Tests verify determinism explicitly.

3. **Accessibility** — ARIA tablist/tabpanel roles, `aria-label` on charts, `sr-only` data tables behind every Recharts visualization, `focus-visible` ring styles on all interactive elements. This is above-average for an MVP.

4. **Published version immutability** — The `published` flag with copy-on-write semantics in `updateVersion` is a smart domain design that prevents accidental mutation of baseline data.

5. **Validation before simulation** — `validateVersionPlayable()` catches deck-too-small, missing resources, and player count mismatches before wasting compute. Warnings vs. errors are properly separated.

6. **Error boundaries** — Both global (`app/error.tsx`) and route-level (`app/projects/[projectId]/error.tsx`) error boundaries with recovery actions.

7. **Loading states** — Skeleton components match the actual layout structure, providing a polished perceived-performance experience.

8. **Existing test quality** — Tests are behavior-focused (not implementation-coupled), use proper Arrange-Act-Assert structure, and cover edge cases (empty stats, zero-cost cards, deck-too-small).

9. **WAL journal mode** — `sqlite.pragma("journal_mode = WAL")` is the correct choice for a web server with concurrent reads.

10. **Proper transaction usage** — Seed insertion and cascade deletes use `sqlite.transaction()` to maintain consistency.

11. **Print-friendly report page** — `print:` Tailwind variants on the report page enable clean PDF export via browser print.

---

## Detailed File-Level Findings

### `lib/simulation/engine.ts` (679 lines)

| Line(s) | Severity | Finding |
|---|---|---|
| 44-57 | P2 | `KNOWN_STATS` set is unused for validation — stats not in the set get a 0.35 weight via `extraStatWeight` but there's no feedback to the user about unrecognized stat names |
| 59-69 | P2 | `createRng` uses a custom PRNG (splitmix32 variant). Adequate for simulation but undocumented. Add a comment citing the algorithm. |
| 127-151 | P1 | `calculateCardValue` returns 4 scores via an object with magic weights — 14 multiplier constants with no documentation on the game-design rationale |
| 220-275 | P2 | `resolveCardPlay` — 6 parameters, 55 lines, mixes resource deduction, combat, economy, and scoring. Should be split into `payCost`, `applyEffects`, `resolveAttack`. |
| 346-438 | P1 | `simulateSingleGame` — 92 lines with a nested loop. Acceptable complexity but would benefit from extracting `executeTurn`. |
| 459-465 | P2 | `summariseResult` has 8 parameters. Use a `BatchAccumulator` object. |
| 566-679 | P0 | Full duplication with `simulateBatchAsync` (see P0-2) |

### `lib/db.ts` (370 lines)

| Line(s) | Severity | Finding |
|---|---|---|
| 10-16 | P1 | Module-level side effects (see P1-5) |
| 50 | P2 | `as { count: number }` — type assertion on query result. Use `better-sqlite3` generic `.get<T>()` or add runtime checks. |
| 155-161 | P2 | N+1 query pattern (see P2-6) |
| 252-290 | P2 | `updateVersion` — 38 lines handling both draft-creation and in-place update. The published-version branch could be extracted to `createDraftFromPublished`. |

### `components/projects/workbench/definition-tab.tsx` (515 lines)

| Line(s) | Severity | Finding |
|---|---|---|
| 1-515 | P1 | Largest component file. Consider extracting `ResourceEditor`, `CardEditor`, `CsvImporter` as sub-components. |
| 44 | P1 | `project` is destructured from state but never used (ESLint warns) |
| 60 | P1 | `csvFile` state is set but never read (ESLint warns) |
| 66-91 | P2 | Autosave timer with `useEffect` and `useRef` — this is a good candidate for a `useAutosave(dirty, save)` custom hook to encapsulate the debounce logic |

### `components/projects/project-workbench.tsx` (269 lines)

| Line(s) | Severity | Finding |
|---|---|---|
| 15 | P1 | `normalizeConfig` imported but unused |
| 31-41 | P1 | 11 `useState` calls — extract to custom hook (see P1-2) |
| 52-55 | P2 | `JSON.stringify` dirty check (see P2-7) |
| 170-195 | P2 | `WorkbenchState` object literal with 25 fields assembled inline — unwieldy |

### `app/api/**` (API routes)

| File | Severity | Finding |
|---|---|---|
| `versions/[versionId]/route.ts:9` | P0 | Unvalidated `GameVersion` from request body (see P0-1) |
| `runs/route.ts:9-14` | P0 | Unvalidated `SimulationConfig` and `SimulationBatchResult` from request body |
| `projects/route.ts:12` | P2 | `as Partial<CreateProjectInput>` — only validates `name`; `playerCountMin/Max` accept any value including NaN |
| All routes | P2 | No rate limiting, no CORS configuration, no request size limits |

### `components/projects/workbench/types.ts` (107 lines)

| Line(s) | Severity | Finding |
|---|---|---|
| 1 | P1 | `SimulationBatchResult` imported but unused |
| 33-42 | P2 | `emptyCard()` uses `crypto.randomUUID()` — fine in browser but will break in Node < 19 test environments without polyfill |
| 68-107 | P2 | `parseCsvCards` does not handle quoted CSV fields containing commas. A card named `"Dragon, Fire"` will break parsing. Consider a proper CSV parser library for robustness. |

---

## Metrics Summary

| Metric | Target | Actual | Status |
|---|---|---|---|
| Max file length | <300 lines | 679 (`engine.ts`) | ⚠️ Over |
| Max function length | <50 lines | 92 (`simulateSingleGame`) | ⚠️ Over |
| Max parameters | ≤3 | 8 (`summariseResult`) | ⚠️ Over |
| Max nesting depth | ≤3 | 4 (engine game loop) | ⚠️ Borderline |
| Test count | — | 35 | ✅ Good base |
| Test coverage areas | All layers | Engine + utils only | ⚠️ Missing API/DB |
| ESLint errors | 0 | 1 error, 9 warnings | ⚠️ Needs cleanup |
| TypeScript strict | enabled | ✅ Yes | ✅ |
| Type assertions (`as`) | Minimize | 12 instances in db.ts | ⚠️ Could use generics |

---

## Appendix: File Inventory

| Path | Lines | Role |
|---|---|---|
| `lib/simulation/engine.ts` | 679 | Simulation engine (P0/P1 focus) |
| `components/projects/workbench/definition-tab.tsx` | 515 | Card/resource editor UI |
| `lib/db.ts` | 370 | Database layer |
| `components/projects/workbench/dashboard-tab.tsx` | 275 | Analytics dashboard |
| `components/projects/project-workbench.tsx` | 269 | Main workbench orchestrator |
| `components/projects/workbench/compare-tab.tsx` | 245 | A/B comparison UI |
| `components/projects/workbench/version-sidebar.tsx` | 216 | Version/run management |
| `lib/data-seeds.ts` | 188 | Seed data generation |
| `app/page.tsx` | 184 | Landing page |
| `lib/types.ts` | 139 | Domain type definitions |
| `components/projects/create-project-form.tsx` | 130 | Project creation form |
| `app/projects/[projectId]/report/page.tsx` | 112 | Printable report |
| `components/projects/workbench/types.ts` | 107 | Workbench type definitions |
| `components/ui/confirm-dialog.tsx` | 100 | Reusable confirm dialog |
| **Total source (excl. tests)** | **~3,500** | |
| **Total tests** | **~280** | 4 test files, 35 cases |
