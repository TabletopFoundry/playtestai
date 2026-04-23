# Code Quality Review #3 — PlaytestAI (Focused Delta)

> **Reviewer:** Principal Software Engineer (automated)
> **Date:** 2025-07-23
> **Baseline:** `docs/CODE_REVIEW_2.md` (2025-07-20)
> **Scope:** New/changed issues only — items resolved since Review #2 are acknowledged, previously-reported open items are not repeated.

---

## Progress Since Review #2

Outstanding progress. **All P0 and P1 items from Review #2 are resolved.** The codebase has made a significant quality jump.

| Review #2 ID | Status | What changed |
|---|---|---|
| **P0-4** (require() circular-dependency hack) | ✅ **Resolved** | All `require()` calls eliminated. `versions.ts` and `runs.ts` no longer import from `projects.ts` — mutation functions are self-contained. Zero ESLint `@typescript-eslint/no-require-imports` errors remain. |
| **P0-5** (Cross-project referential integrity bypass) | ✅ **Resolved** | `createSimulationRun` in `lib/db/runs.ts:12-19` now verifies version ownership before insert. API route catches the thrown error and returns 400. |
| **P1-8** (Ref assignment during render) | ✅ **Resolved** | Both `simulation-tab.tsx:93-95` and `use-workbench-state.ts:24-27` now use `useEffect` to synchronize refs, compliant with React 19 concurrent mode. |
| **P1-9** (Autosave inner timeout leak) | ✅ **Resolved** | `definition-tab.tsx:67,83,90-92` tracks the inner reset timer in `resetTimerRef` and clears both timers on cleanup. |
| **P1-10** (getStat duplication) | ✅ **Resolved** | Extracted to `lib/simulation/helpers.ts:8-9`. Both `agents.ts:15` and `mechanics.ts:9` import from the shared module. |
| **P1-11** (summariseResult 8 positional params) | ✅ **Resolved** | `analytics.ts:60-63` now accepts `(version, config, state: BatchAccumulator)` — 3 params. Call sites in `engine.ts:241,264` pass the accumulator directly. |

**Also resolved from Review #1 still-open list:**

| Review #1 ID | Status | What changed |
|---|---|---|
| **P0-3** (SQLite database files committed to repo) | ✅ **Resolved** | Files removed from git tracking (`git ls-files data/` returns empty). `.gitignore` covers `data/*.sqlite*`, `*.sqlite`, `*.sqlite-shm`, `*.sqlite-wal`. Files remain in git history but are no longer shipped to new clones. |

**Updated metrics:**

| Metric | Review #2 | Now | Status |
|---|---|---|---|
| Max file length | 514 (`definition-tab.tsx`) | 518 (`definition-tab.tsx`) | → Stable |
| Max function params | 8 (`summariseResult`) | 6 (`resolveCardPlay`) | ⬇️ Improved |
| ESLint errors | 10 | 0 | ✅ **Clean** |
| Test count | 46 | 80 | ⬆️ **+74%** |
| `require()` calls | 6 | 0 | ✅ **Clean** |
| Circular dependencies | 1 (projects↔versions) | 0 | ✅ **Clean** |

---

## New Findings — P0

**None.**

There are no new P0 issues. All API mutation endpoints are validated with Zod schemas, referential integrity is enforced, ESLint passes cleanly, and there are no security regressions.

---

## New Findings — P1

### P1-12 · Duplicated 7-line stat decomposition block across `agents.ts` and `mechanics.ts`

**Files:** `lib/simulation/agents.ts:58-65` · `lib/simulation/mechanics.ts:64-71`

While the `getStat` helper was correctly extracted to `helpers.ts` (resolving P1-10), both `calculateCardValue` and `resolveCardPlay` still contain a nearly identical 7-line block that decomposes a card into derived combat stats:

```ts
// agents.ts:58-65
const damage = getStat(card, "damage") + getStat(card, "reach");
const shield = getStat(card, "shield") + getStat(card, "sustain");
const score = getStat(card, "score") + getStat(card, "points");
const economy = getStat(card, "economy") + getStat(card, "gold") + getStat(card, "mana");
const draw = getStat(card, "draw");
const combo = getStat(card, "combo");
const steal = getStat(card, "steal");
const custom = extraStatWeight(card);
```

```ts
// mechanics.ts:64-71 — identical except damage adds boardPower
const score = getStat(card, "score") + getStat(card, "points");
const damage = getStat(card, "damage") + getStat(card, "reach") + Math.floor(player.boardPower / COMBAT.boardPowerDivisor);
const shield = getStat(card, "shield") + getStat(card, "sustain");
const economy = getStat(card, "economy") + getStat(card, "gold") + getStat(card, "mana");
const draw = getStat(card, "draw");
const combo = getStat(card, "combo");
const steal = getStat(card, "steal");
const custom = extraStatWeight(card);
```

**Why this is P1 (elevated from P2):**
1. **Divergence risk** — The stat-aliasing logic (e.g., `"reach"` rolls into `damage`, `"sustain"` rolls into `shield`) must stay synchronized between evaluation and resolution. If a new stat alias is added to one but not the other, the agent's card valuation will diverge from actual card effects, producing misleading simulation results — a **silent correctness bug** that would be extremely hard to trace.
2. **Known stat aliases are embedded as string literals** — `"reach"`, `"sustain"`, `"points"`, `"gold"`, `"mana"` are aliased to base stats in both places. There is no single source of truth for these mappings.

**Fix — Extract a `decomposeCardStats` function into `helpers.ts`:**

```ts
// lib/simulation/helpers.ts
export interface DecomposedStats {
  damage: number;
  shield: number;
  score: number;
  economy: number;
  draw: number;
  combo: number;
  steal: number;
  custom: number;
}

export function decomposeCardStats(card: CardDefinition): DecomposedStats {
  return {
    damage: getStat(card, "damage") + getStat(card, "reach"),
    shield: getStat(card, "shield") + getStat(card, "sustain"),
    score: getStat(card, "score") + getStat(card, "points"),
    economy: getStat(card, "economy") + getStat(card, "gold") + getStat(card, "mana"),
    draw: getStat(card, "draw"),
    combo: getStat(card, "combo"),
    steal: getStat(card, "steal"),
    custom: extraStatWeight(card),
  };
}
```

`mechanics.ts` can then use `const stats = decomposeCardStats(card)` and add `boardPower` only to `stats.damage` locally:

```ts
const stats = decomposeCardStats(card);
const damage = stats.damage + Math.floor(player.boardPower / COMBAT.boardPowerDivisor);
```

**Effort:** ~30 minutes including test adjustments.

---

### P1-13 · `definition-tab.tsx` remains at 518 lines — single component with 12 state variables and 6 callbacks

**File:** `components/projects/workbench/definition-tab.tsx` (518 lines)

This file was the largest in the project at Review #2 (514 lines) and has grown slightly to 518. It contains:
- 12 destructured state variables from `WorkbenchState` (lines 43-56)
- 5 local state hooks (lines 58-63)
- 2 refs (lines 66-67)
- 6 `useCallback` handlers (lines 96-189)
- 1 `useEffect` for autosave (lines 70-94)
- ~320 lines of JSX with three visually distinct editor sections (resources, cards, CSV import)

**Why this is P1:**
While the logic is not complex, the file's size makes it hard to locate specific sections during maintenance. The three editor sections (resource editor: lines 316-356, card editor: lines 358-426, CSV import: lines 428-514) are independent features that don't share local state.

**Fix — Extract sub-components for the three editor sections:**

```
definition-tab.tsx          → orchestrator (~120 lines)
resource-editor.tsx         → resource CRUD UI (~60 lines)
card-editor.tsx             → card CRUD + stats input (~100 lines)
csv-import-panel.tsx        → file upload + preview + import (~120 lines)
```

Each section receives only the state it needs via props. The `DefinitionTab` becomes a layout shell similar to `ProjectWorkbench` (99 lines).

**Effort:** ~1-2 hours. No logic changes required.

---

## Previously-Reported Items Still Open

These items from prior reviews were **not addressed** and remain valid at their original severity. They are not re-analysed here — refer to the cited review for details:

| ID | Summary | Severity | Source |
|---|---|---|---|
| P2-1 | Duplicated Tailwind className strings across form inputs | P2 | Review #1 |
| P2-2 | `deepClone` uses `JSON.parse(JSON.stringify())` | P2 | Review #1 |
| P2-3 | `resolveCardPlay` takes 6 parameters | P2 | Review #1 |
| P2-4 | `data-seeds.ts` mutates objects after creation | P2 | Review #1 |
| P2-5 | No error boundary / Web Worker for simulation | P2 | Review #1 |
| P2-7 | `JSON.stringify` dirty check in `useWorkbenchState` | P2 | Review #1 |

---

## Updated Metrics Summary

| Metric | Target | Actual | Status |
|---|---|---|---|
| Max file length | <300 lines | 518 (`definition-tab.tsx`) | ⚠️ Over |
| Max function length | <50 lines | ~90 (`simulateSingleGame`) | ⚠️ Over |
| Max parameters | ≤3 | 6 (`resolveCardPlay`) | ⚠️ Over (down from 8) |
| Max nesting depth | ≤3 | 3 (engine game loop) | ✅ OK |
| Test count | — | 80 | ✅ **Strong growth** |
| Test coverage areas | All layers | Engine + utils + csv | ⚠️ Missing API/DB |
| ESLint errors | 0 | 0 | ✅ **Clean** |
| TypeScript strict | enabled | ✅ Yes | ✅ |
| Circular dependencies | 0 | 0 | ✅ **Clean** |
| Security headers | present | 6 headers in `next.config.ts` | ✅ |

---

## Refactoring Roadmap (New Items Only)

### High Impact, Low Effort
1. **P1-12** — Extract `decomposeCardStats` into `helpers.ts` (30 min). Eliminates divergence risk between agent valuation and card resolution.

### High Impact, Medium Effort
2. **P1-13** — Split `definition-tab.tsx` into three sub-components (1-2 hours). Brings every file under 300 lines.

---

## Positive Observations (New)

1. **Complete P0/P1 resolution** — Every P0 and P1 from Reviews #1 and #2 has been addressed. This is rare and demonstrates strong engineering discipline.

2. **ESLint zero** — From 10 errors in Review #2 to zero. The `require()` circular-dependency hack was replaced with a clean architectural fix rather than suppression comments.

3. **Test count nearly doubled** — 46 → 80 tests (+74%). The new tests cover CSV parsing, CSV export, and expanded utility edge cases. All 80 tests pass.

4. **Clean module decomposition** — The `lib/simulation/helpers.ts` extraction follows the established pattern of small, focused modules. The simulation package now has 7 files averaging ~100 lines each.

5. **Ref synchronization pattern** — The `useEffect` ref-sync in `use-workbench-state.ts:24-27` and `simulation-tab.tsx:93-95` is the correct React 19 pattern for avoiding stale closures in callbacks while remaining concurrent-safe.

6. **Referential integrity at two levels** — The DB schema enforces FK constraints (`schema.ts:58-59`) and the application layer validates ownership (`runs.ts:13-19`). Defense-in-depth is the right approach for data integrity.

7. **API error handling consistency** — All 7 API routes use the same `parseJsonBody` → `safeParse` → `validationError`/`badRequest`/`notFound` pattern from `api-helpers.ts`. Adding a new endpoint has a clear template to follow.

8. **Security headers** — `next.config.ts` applies HSTS, X-Frame-Options DENY, nosniff, referrer policy, and permissions policy. `poweredByHeader` is disabled.

---

## Overall Assessment

| Dimension | Review #1 | Review #2 | Review #3 |
|---|---|---|---|
| **Overall Quality Score** | B+ | A- | **A** |
| **Architecture Health** | Good | Good | **Excellent** |
| **Maintainability Index** | Medium-High | Medium-High | **High** |
| **Technical Debt Estimate** | Low-Medium | Low-Medium | **Low** |

The codebase has matured from a solid MVP to a well-engineered application. The remaining P1 items are structural refinements (duplication and file size) rather than correctness or safety issues. The P2 backlog is stable and acceptable for the project's stage.
