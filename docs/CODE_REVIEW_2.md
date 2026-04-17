# Code Quality Review #2 — PlaytestAI (Focused Delta)

> **Reviewer:** Principal Software Engineer (automated)
> **Date:** 2025-07-20
> **Baseline:** `docs/CODE_REVIEW.md` (2025-07-16)
> **Scope:** New/changed issues only — items resolved since Review #1 are acknowledged, previously-reported open items are not repeated.

---

## Progress Since Review #1

The codebase has improved substantially. Several P0/P1 items from Review #1 are now resolved:

| Original ID | Status | What changed |
|---|---|---|
| **P0-1** (No API validation) | ✅ **Resolved** | Comprehensive Zod schemas in `lib/validation.ts` now cover every mutable endpoint. All API routes use `safeParse` + `formatZodErrors`. |
| **P0-2** (Duplicated simulation loop) | ✅ **Resolved** | Shared `accumulateGame()` + `createAccumulator()` in `engine.ts:192-241`. Both `simulateBatch` and `simulateBatchAsync` delegate to the same logic. |
| **P1-1** (engine.ts 679-line monolith) | ✅ **Resolved** | Decomposed into `rng.ts`, `agents.ts`, `mechanics.ts`, `analytics.ts`, `constants.ts`. Engine is now 274 lines. |
| **P1-2** (God component workbench) | ✅ **Resolved** | State extracted into `use-workbench-state.ts` custom hook (209 lines). Workbench component is now 99 lines of pure layout. |
| **P1-3** (db.ts mixes everything) | ✅ **Resolved** | Split into `db/schema.ts`, `db/seed.ts`, `db/projects.ts`, `db/versions.ts`, `db/runs.ts` with barrel re-export. |
| **P1-5** (Module-level side effects) | ✅ **Resolved** | Lazy singleton via `getDb()` in `schema.ts`. Seed runs on first import in `lib/db.ts`. |
| **P1-7** (Magic numbers) | ✅ **Resolved** | All tuning parameters centralised in `constants.ts` (178 lines) with JSDoc rationale. |
| **P2-6** (N+1 query) | ✅ **Resolved** | `getProjectsSummary()` now uses batch queries with `Map`-based lookups. |

**Updated metrics:**

| Metric | Review #1 | Now | Status |
|---|---|---|---|
| Max file length | 679 (engine.ts) | 514 (definition-tab.tsx) | ⬇️ Improved |
| engine.ts lines | 679 | 274 | ✅ Under 300 |
| project-workbench.tsx lines | 269 | 99 | ✅ Under 100 |
| ESLint errors | 1 | 10 | ⬆️ **Regressed** |
| Test count | 35 | 46 | ⬆️ Improved |

---

## New Findings — P0

### P0-4 · `require()` circular-dependency hack introduces 6 ESLint errors and fragile coupling

**Files:** `lib/db/versions.ts:45,74,112,128` · `lib/db/runs.ts:11,32`

Both `versions.ts` and `runs.ts` use runtime `require("./projects")` to avoid a circular import with `projects.ts` (which imports from `versions.ts`):

```ts
// versions.ts:45
const { getProjectById } = require("./projects") as { getProjectById: (id: string) => GameProject | null };
```

This pattern is repeated **6 times** and produces 6 ESLint `@typescript-eslint/no-require-imports` errors — constituting the majority of the project's lint failures.

**Why this is P0:**
1. **Runtime fragility** — `require()` in ESM/Next.js can break with bundler changes. The `as` cast throws away type safety.
2. **Circular dependency** — The actual root cause is a design flaw: mutation functions (`updateVersion`, `deleteVersion`, `createSimulationRun`) return a full `GameProject` by re-fetching it via `getProjectById`. This couples every write operation to the read layer.
3. **6 lint errors** — This single issue accounts for 60% of all ESLint errors in the project.

**Fix — Break the cycle by separating concerns:**

Option A (minimal): Move `getProjectById` into a shared `queries.ts` module imported by both `projects.ts` and `versions.ts`.

Option B (recommended): Have mutation functions return only the affected entity (version/run ID or void), and let the API route call `getProjectById` separately:

```ts
// versions.ts — no longer imports from projects
export function updateVersion(projectId: string, versionId: string, data: GameVersion): string {
  // ... perform UPDATE ...
  return versionId;
}

// API route
const versionId = updateVersion(projectId, versionId, parsed.data);
const project = getProjectById(projectId); // single import, no cycle
```

---

### P0-5 · Cross-project referential integrity bypass on `POST /runs`

**Files:** `app/api/projects/[projectId]/runs/route.ts:22-30` · `lib/db/runs.ts:9-28`

The `POST /runs` endpoint receives a `versionId` from the client but **never verifies that the version belongs to the URL's `projectId`**. The `createSimulationRun` function inserts the run with whatever `versionId` is provided:

```ts
// runs.ts:23-25
db.prepare("INSERT INTO simulation_runs (id, project_id, version_id, ...) VALUES (?, ?, ?, ...)")
  .run(run.id, run.projectId, run.versionId, ...);
```

A client can create a run under Project A while referencing a version from Project B, corrupting data relationships. While the database has a foreign key on `version_id → versions(id)`, there is no FK ensuring `version_id` belongs to the same `project_id`.

**Impact:** Data integrity violation — runs can reference versions from unrelated projects, leading to incorrect dashboard data and confusing analytics.

**Fix:**

```ts
// runs.ts — add ownership check before insert
const versionOwner = db.prepare(
  "SELECT project_id FROM versions WHERE id = ?"
).get(versionId) as { project_id: string } | undefined;

if (!versionOwner || versionOwner.project_id !== projectId) {
  return null; // or throw — version does not belong to this project
}
```

---

## New Findings — P1

### P1-8 · Ref assignment during render violates React rules (ESLint error)

**File:** `components/projects/workbench/simulation-tab.tsx:92-93`

```ts
const handleRunRef = useRef(handleRunSimulation);
handleRunRef.current = handleRunSimulation;  // ← assigned during render
```

React's compiler/linter flags this as an error: `Cannot access refs during render`. Writing to a ref during render causes the component to not re-render when expected and can produce stale closures.

The same pattern also appears in `use-workbench-state.ts:23-25`:
```ts
const selectedRunIdRef = useRef(selectedRunId);
selectedRunIdRef.current = selectedRunId;    // ← also during render
```

**Impact:** Incorrect behavior under React 19 concurrent features; currently produces 1 ESLint error.

**Fix:** Use `useEffect` to synchronize ref values:

```ts
const handleRunRef = useRef(handleRunSimulation);
useEffect(() => {
  handleRunRef.current = handleRunSimulation;
});
```

Or use `useEffectEvent` (React 19 experimental) for the event-handler pattern.

---

### P1-9 · Autosave inner timeout leaks after unmount

**File:** `components/projects/workbench/definition-tab.tsx:78-83`

```ts
autosaveTimerRef.current = setTimeout(async () => {
  setAutosaveStatus("saving");
  await handleSaveVersion(true);
  setAutosaveStatus("saved");
  setTimeout(() => setAutosaveStatus("idle"), 2000);  // ← never cleared
}, 5000);
```

The outer `setTimeout` is properly cleaned up in the `useEffect` return, but the **inner 2-second timeout** (line 82) is never tracked or cleared. If the component unmounts between the "saved" and "idle" state transition, React will warn about setting state on an unmounted component, and in React 19 strict mode this can cause a memory leak.

**Fix:** Track the inner timeout in a second ref and clear it on unmount:

```ts
const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

// Inside the autosave callback:
resetTimerRef.current = setTimeout(() => setAutosaveStatus("idle"), 2000);

// In the cleanup:
return () => {
  if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
  if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
};
```

---

### P1-10 · `getStat` helper duplicated across two simulation modules

**Files:** `lib/simulation/agents.ts:47-49` · `lib/simulation/mechanics.ts:11-13`

Identical function:
```ts
function getStat(card: CardDefinition, key: string) {
  return Number(card.stats[key] ?? 0);
}
```

This is a private function copy-pasted into both modules during the engine decomposition. If the stat-access logic changes (e.g., to support nested stats or default values), it must be updated in both places.

**Fix:** Export from a shared location — either a `lib/simulation/helpers.ts` utility or from the `CardDefinition` type itself as a method or standalone accessor.

---

### P1-11 · `summariseResult` still accepts 8 positional parameters

**File:** `lib/simulation/analytics.ts:51-59`

```ts
export function summariseResult(
  version: GameVersion,
  config: SimulationConfig,
  turns: number[],
  winnerScores: number[],
  allScores: number[],
  positionWins: number[],
  strategyWins: Record<AgentType, number>,
  cardMap: Map<string, CardStats>,
): SimulationBatchResult {
```

This was flagged as P2-3 in Review #1 (for `resolveCardPlay`'s 6 params). The `BatchAccumulator` interface already exists in `engine.ts:183-190` and holds exactly these fields. `summariseResult` should accept the accumulator directly.

**Impact:** The call sites in `engine.ts:250,273` pass all 6 fields individually from the accumulator, which is verbose and error-prone if the accumulator gains new fields.

**Fix:**

```ts
export function summariseResult(
  version: GameVersion,
  config: SimulationConfig,
  state: BatchAccumulator,
): SimulationBatchResult {
  const { turns, winnerScores, allScores, positionWins, strategyWins, cardMap } = state;
  // ... rest unchanged
}
```

Move the `BatchAccumulator` interface to `analytics.ts` (or a shared types file) so both modules can import it.

---

## Previously-Reported Items Still Open

These items from Review #1 were **not addressed** and remain valid. They are not re-analysed here — refer to `CODE_REVIEW.md` for details:

| ID | Summary | Severity |
|---|---|---|
| P0-3 | SQLite database files committed to repo | P0 |
| P2-1 | Duplicated Tailwind className strings | P2 |
| P2-2 | `deepClone` uses `JSON.parse(JSON.stringify())` | P2 |
| P2-3 | `resolveCardPlay` 6 parameters | P2 |
| P2-4 | `data-seeds.ts` mutates objects after creation | P2 |
| P2-5 | No error boundary / Web Worker for simulation | P2 |
| P2-7 | `JSON.stringify` dirty check in `useWorkbenchState` | P2 |

---

## Updated Metrics Summary

| Metric | Target | Actual | Status |
|---|---|---|---|
| Max file length | <300 lines | 514 (`definition-tab.tsx`) | ⚠️ Over |
| Max function length | <50 lines | ~90 (`simulateSingleGame`) | ⚠️ Over |
| Max parameters | ≤3 | 8 (`summariseResult`) | ⚠️ Over |
| Max nesting depth | ≤3 | 3 (engine game loop) | ✅ OK |
| Test count | — | 46 | ✅ Growing |
| Test coverage areas | All layers | Engine + utils + csv | ⚠️ Missing API/DB |
| ESLint errors | 0 | 10 errors, 1 warning | ⚠️ **Regressed** |
| TypeScript strict | enabled | ✅ Yes | ✅ |

---

## Refactoring Roadmap (New Items Only)

### High Impact, Low Effort
1. **P0-4** — Break `require()` circular dependency (2-3 hours). Move `getProjectById` to a shared `queries.ts`, or have mutations return only the entity ID.
2. **P1-10** — Extract shared `getStat` helper (15 min)
3. **P1-11** — Pass `BatchAccumulator` to `summariseResult` (30 min)
4. **P1-8** — Fix ref-during-render with `useEffect` sync (20 min)
5. **P1-9** — Track and clear inner autosave timeout (15 min)

### High Impact, Medium Effort
6. **P0-5** — Add version-ownership check in `createSimulationRun` (30 min, but needs integration test)

---

## Positive Observations (New)

1. **Clean engine decomposition** — The split into `rng.ts`, `agents.ts`, `mechanics.ts`, `analytics.ts`, `constants.ts` is well-partitioned. Each module has a single clear responsibility and the dependency flow is unidirectional.

2. **Custom hook extraction** — `useWorkbenchState` cleanly separates state logic from UI. The workbench component is now essentially a layout shell, which is the ideal pattern for complex stateful pages.

3. **AbortController usage** — `simulateBatchAsync` now accepts an `AbortSignal`, and `SimulationTab` properly aborts on unmount and before re-runs. This is good concurrent-request hygiene.

4. **Constants documentation** — `constants.ts` includes JSDoc comments explaining the game-design rationale for each tuning parameter. This makes the balance model legible to non-engineers.

5. **CSV injection protection** — `csv-export.ts` implements OWASP-compliant formula injection prevention with proper quoting. This was not present in Review #1.

6. **Test growth** — 11 new tests (35 → 46), including a new `csv-export.test.ts` suite. Tests remain behavior-focused with clean AAA structure.

7. **Zod validation thoroughness** — The validation schemas are comprehensive, including `.refine()` cross-field checks (e.g., `playerCountMin ≤ playerCountMax`) and sensible bounds (max 50,000 games, max 10 players). This is above-average for an MVP.
