# PlaytestAI — Fourth-Pass UX & DX Audit

> Focused review after three prior passes ([UX_REVIEW.md](./UX_REVIEW.md), [UX_REVIEW_2.md](./UX_REVIEW_2.md), [UX_REVIEW_3.md](./UX_REVIEW_3.md)). This audit verifies previous fixes and **only flags genuinely new P0/P1 issues** not already documented.

---

## 1. Summary

The project has resolved the majority of issues across three review cycles: all API routes now wrap `request.json()` in try/catch, `PRAGMA foreign_keys = ON` is set, the `winner!` non-null assertion is properly guarded, Zod validation covers all mutable endpoints, keyboard shortcuts exist (`Cmd+S`, `Cmd+Enter`, `Escape`, number keys, arrows), and `getProjectsSummary` uses batch queries eliminating the N+1 pattern. However, this pass reveals **three genuinely new issues** not flagged in any prior review: the simulation tab's `useEffect` has no dependency array causing listener churn on every render, the `simulateBatchAsync` function provides no cancellation mechanism meaning a navigated-away component continues running a stale simulation and calling `setProgress` on an unmounted component, and the CSV export function is vulnerable to formula injection in card names (no quoting/escaping). Several previously-flagged items remain unfixed but are not re-raised here — see the tracking table below.

---

## 2. Third-Review Fix Verification

| Third Review Item | Status | Evidence |
|---|---|---|
| **P0-1** API `request.json()` try/catch | ✅ Fixed | All 6 mutable routes wrap in try/catch (e.g. `app/api/projects/[projectId]/route.ts:21-26`) |
| **P0-2** `PRAGMA foreign_keys = ON` | ✅ Fixed | `lib/db/schema.ts:22-25` |
| **P0-3** `winner!` non-null assertion guarded | ✅ Fixed | `lib/simulation/engine.ts:162-164` — explicit null check with descriptive error |
| **P1-1** Version duplication Zod validation | ✅ Fixed | `app/api/projects/[projectId]/versions/route.ts:10-19` |
| **P1-2** PATCH version Zod validation | ✅ Fixed | `app/api/projects/[projectId]/versions/[versionId]/route.ts:34-56` |
| **P1-3** `<nav>` aria-label | ❓ Not verified | Low priority, not re-checked |
| **P1-4** N+1 queries in `getProjectsSummary` | ✅ Fixed | `lib/db/projects.ts:17-40` — batch queries with Maps |
| **P1-5** Keyboard shortcuts | ✅ Fixed | `components/projects/use-keyboard-shortcuts.ts` — full implementation |
| **P1-6** API/component tests | ❌ Still absent | Only 35 library-level tests (utils: 15, csv: 6, engine: 6, validation: 8) |
| **P1-7** Breadcrumbs | ❌ Still absent | No breadcrumb component found |
| **P1-8** `splice(-1)` guard in mechanics.ts | ❌ Still unfixed | `lib/simulation/mechanics.ts:61` — `findIndex` can return -1 |
| **P2-1** Status auto-dismiss | ❌ Still absent | Only Escape key dismissal via keyboard shortcuts |
| **P2-2** Custom `not-found.tsx` pages | ❌ Still absent | No custom 404 pages |
| **P2-3** Confirm dialog danger focus | ❌ Still unfixed | `confirm-dialog.tsx:36` — always focuses confirm button |

**Score: 7 of 13 fixed, 6 still unfixed.** (Unfixed items are tracked but not re-raised below — they are documented in prior reviews.)

---

## 3. New Findings

### P0 — Must fix before any user-facing milestone

#### P0-1: `useEffect` in SimulationTab has no dependency array — listener re-subscribed every render

**File:** `components/projects/workbench/simulation-tab.tsx:82-88`

```typescript
useEffect(() => {
  function onRunShortcut() {
    void handleRunSimulation();
  }
  document.addEventListener("playtestai:run-simulation", onRunShortcut);
  return () => document.removeEventListener("playtestai:run-simulation", onRunShortcut);
}); // ← no dependency array
```

This effect runs on **every render** of the SimulationTab component. Each render:
1. Removes the previous event listener
2. Adds a new event listener with a fresh closure over `handleRunSimulation`

During a simulation (rapid progress updates via `setSimulationProgress`), this means the listener is torn down and re-created dozens of times per second. While it technically works (the closure always captures the latest `handleRunSimulation`), the churn is wasteful and masks a real bug: if `handleRunSimulation` is called during the tear-down window between remove and re-add, the event is dropped.

This was **not flagged in any prior review**. The keyboard shortcuts themselves were noted as missing (UX_REVIEW_2 P1-5) and then as implemented (UX_REVIEW_3), but the missing dependency array in the consumer was never caught.

**Fix:** Add a dependency array. Since `handleRunSimulation` is a local function that captures component state, either wrap it in `useCallback` and depend on it, or use a ref pattern:
```typescript
const handleRunRef = useRef(handleRunSimulation);
handleRunRef.current = handleRunSimulation;

useEffect(() => {
  function onRunShortcut() {
    void handleRunRef.current();
  }
  document.addEventListener("playtestai:run-simulation", onRunShortcut);
  return () => document.removeEventListener("playtestai:run-simulation", onRunShortcut);
}, []);
```

---

### P1 — Should fix before beta/launch

#### P1-1: Simulation cannot be cancelled and has no unmount guard

**Files:** `lib/simulation/engine.ts:253-271`, `components/projects/workbench/simulation-tab.tsx:34-78`

`simulateBatchAsync` runs a tight loop of `config.games` iterations (up to 10,000) with `setTimeout(0)` yields. There is no `AbortSignal`, no cancellation token, and no `isMounted` check. If a user:

1. Starts a 10,000-game simulation
2. Navigates away from the project (or switches projects)

…the simulation continues running in the background. Each chunk calls `onProgress(...)` which resolves to `setSimulationProgress` — a state setter on a potentially unmounted component. In React 19 with concurrent features, this may not throw, but it's still wasted CPU, and the final `fetch()` call on line 56-65 sends results to the API for a context the user has already left.

No prior review flagged the cancellation gap specifically. UX_REVIEW.md §2.4/§8 mentioned "no cancel" for run monitoring but only as a UI button concern, not as a cleanup/lifecycle issue.

**Fix:** Accept an `AbortSignal` in `simulateBatchAsync`:
```typescript
export async function simulateBatchAsync(
  version: GameVersion,
  config: SimulationConfig,
  onProgress?: (value: number) => void,
  signal?: AbortSignal,
) {
  // ...
  for (let gameIndex = 0; gameIndex < config.games; gameIndex += 1) {
    if (signal?.aborted) throw new DOMException("Simulation cancelled.", "AbortError");
    // ...
  }
}
```

In SimulationTab, create an `AbortController` in `handleRunSimulation`, store it in a ref, and abort on unmount or when the user presses "Cancel".

#### P1-2: CSV export is vulnerable to formula injection via unescaped card names

**File:** `components/projects/workbench/dashboard-tab.tsx:26-56`

The `generateRunCsv` function concatenates card names directly into CSV output:
```typescript
lines.push(`${card.cardName},${card.powerScore.toFixed(1)},...`);
```

A card named `=CMD("calc")` or `+SUM(A1:A100)` is written verbatim into the CSV. When opened in Excel or Google Sheets, this executes as a formula — a well-known CSV injection / formula injection attack vector. A card named `"Dragon, Ancient"` also breaks column alignment (the comma issue flagged in UX_REVIEW_2 P2-10 for the *parser*, but never for the *exporter*).

**Fix:** Wrap every field in RFC 4180 quoting and prefix formula-triggering characters:
```typescript
function escapeCsvField(value: string | number): string {
  const str = String(value);
  if (/^[=+\-@\t\r]/.test(str)) return `"'${str.replace(/"/g, '""')}"`;
  if (str.includes(",") || str.includes('"') || str.includes("\n")) return `"${str.replace(/"/g, '""')}"`;
  return str;
}
```

#### P1-3: `updateFromResponse` captures stale `selectedRunId` / `selectedVersionId` in concurrent calls

**File:** `components/projects/use-workbench-state.ts:55-80`

```typescript
const updateFromResponse = useCallback(
  async (response: Response, options?: { versionId?: string; keepStatus?: boolean }) => {
    // ...
    const nextRunId = payload.project.runs.find((run) => run.id === selectedRunId)?.id ?? ...;
    // ...
  },
  [selectedRunId, selectedVersionId, syncVersionSelection],
);
```

This callback closes over `selectedRunId` and `selectedVersionId`. If two API calls overlap (e.g., a save followed by a quick simulation run), the second `updateFromResponse` call uses the `selectedRunId` captured when the callback was created, not the value set by the first call's resolution. This can cause the UI to snap back to a stale run selection.

**Fix:** Use a ref for `selectedRunId` and `selectedVersionId` to always read the latest value:
```typescript
const selectedRunIdRef = useRef(selectedRunId);
selectedRunIdRef.current = selectedRunId;
```
Then read `selectedRunIdRef.current` inside the callback, removing both from the dependency array.

---

## 4. Quick Wins (< 1 day each)

| ID | Fix | Priority | Effort |
|---|---|---|---|
| QW-1 | Add dependency array `[]` (or ref pattern) to SimulationTab's `useEffect` | P0 | 15 min |
| QW-2 | Add `escapeCsvField` to CSV export and wrap all fields | P1 | 30 min |
| QW-3 | Guard `splice(-1)` in `mechanics.ts:61` (unfixed from review 3) | P1 | 5 min |
| QW-4 | Use refs for `selectedRunId`/`selectedVersionId` in `updateFromResponse` | P1 | 20 min |

---

## 5. Medium-Term Improvements

| ID | Improvement | Priority | Effort |
|---|---|---|---|
| MT-1 | Add `AbortSignal` support to `simulateBatchAsync` + cancel button in UI | P1 | half day |
| MT-2 | Add API route integration tests (happy path + error path for all 11 handlers) | P1 | 2-3 days |
| MT-3 | Add breadcrumb navigation (unfixed across 3 reviews) | P1 | half day |
| MT-4 | Add `not-found.tsx` pages with branded 404 styling (unfixed across 2 reviews) | P2 | 30 min |
| MT-5 | Auto-dismiss success status messages after 4-5 seconds (unfixed across 2 reviews) | P2 | 15 min |
| MT-6 | Focus cancel button in danger confirm dialogs (unfixed across 2 reviews) | P2 | 10 min |

---

## 6. Deferred Items Tracker

Items flagged in prior reviews that remain unfixed. Included for tracking continuity — not re-audited in detail.

| Item | First Flagged | Current Status |
|---|---|---|
| `splice(-1)` in mechanics.ts | UX_REVIEW_3 P1-8 | ❌ Unfixed |
| API/component test coverage | UX_REVIEW.md LT-1, UX_REVIEW_3 P1-6 | ❌ 35 library tests only |
| Breadcrumb navigation | UX_REVIEW.md §8.3, UX_REVIEW_2 P1-8, UX_REVIEW_3 P1-7 | ❌ Unfixed |
| Custom `not-found.tsx` pages | UX_REVIEW_2 P2-7, UX_REVIEW_3 P2-2 | ❌ Unfixed |
| Status message auto-dismiss | UX_REVIEW_2 P2-4, UX_REVIEW_3 P2-1 | ❌ Unfixed |
| Confirm dialog danger focus | UX_REVIEW_2 P2-6, UX_REVIEW_3 P2-3 | ❌ Unfixed |
| `DATABASE_PATH` env var | UX_REVIEW_3 P2-5 | ❌ Unfixed |
| CSV quoted field parsing | UX_REVIEW_2 P2-10, UX_REVIEW_3 P2-6 | ❌ Unfixed |
| Mobile sidebar collapsible | UX_REVIEW_2 P2-3, UX_REVIEW_3 P2-4 | ❌ Unfixed |
| Database migration strategy | UX_REVIEW_3 P2-9 | ❌ Unfixed |
| Web Worker for simulation | UX_REVIEW.md LT-4, UX_REVIEW_3 LT-1 | ❌ Unfixed |

---

## 7. Overall Assessment

**Rating: Solid beta — new issues are edge-case robustness, not fundamental architecture gaps.**

The project has resolved the critical structural issues (monolith split, error boundaries, Zod validation, N+1 queries, keyboard shortcuts, PRAGMA foreign_keys). The three new findings are all **runtime robustness issues** — a missing dependency array causing render-churn, an uncancellable async loop, and an unescaped CSV export. None are architectural blockers; all are fixable in under a day combined.

The biggest remaining gap across all four reviews is **test coverage**: 35 library-level tests with zero API or component tests. This is the single highest-risk area for ongoing development and should be the next investment after the P0/P1 quick wins above.

---

*Audit conducted against codebase at current HEAD. All file references are relative to the project root.*
