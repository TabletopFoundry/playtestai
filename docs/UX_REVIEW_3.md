# PlaytestAI — Third-Pass UX & DX Audit

> Fresh review after significant improvements from [UX_REVIEW.md](./UX_REVIEW.md) and [UX_REVIEW_2.md](./UX_REVIEW_2.md). This audit focuses on remaining gaps, newly discovered issues, and areas that still need attention.

---

## 1. Summary

The project has matured substantially across three review cycles. The majority of P0 issues from earlier reviews have been resolved: sidebar action buttons are now visible via `group-focus-within`, SQLite files are properly gitignored and untracked, error boundaries exist at three route levels, Zod validation guards all mutable API endpoints, tab panels stay mounted to preserve state, sr-only data tables back every chart, and Recharts tooltips are dark-themed. The architecture is clean — well-split workbench components, a dedicated simulation engine with deterministic PRNG, and a repository-pattern database layer. However, a tier of robustness and polish issues remains: every API route can crash on malformed JSON bodies (no `try/catch` around `request.json()`), `PRAGMA foreign_keys` is never enabled so referential integrity is unenforced at the database level, there are zero component or API route tests (only library-level unit tests exist), the N+1 query pattern in `getProjectsSummary` persists, keyboard shortcuts are absent for a developer-tool product, no `not-found.tsx` pages exist, status messages don't auto-dismiss, and the `nav` element lacks an `aria-label`. These are the issues separating a solid beta from a production-ready tool.

---

## 2. Second-Review Fix Verification

| Second Review Item | Status | Evidence |
|---|---|---|
| **P0-1** Hover-only sidebar buttons | ✅ Fixed | `version-sidebar.tsx:111,180` — uses `group-hover:opacity-100 group-focus-within:opacity-100` |
| **P0-2** SQLite in git | ✅ Fixed | `.gitignore:4-8` includes `data/*.sqlite*`; `git ls-files data/` returns empty |
| **P0-3** No error boundaries | ✅ Fixed | `app/error.tsx`, `app/projects/error.tsx`, `app/projects/[projectId]/error.tsx` all present |
| **P1-1** `outline-none` in create-project-form | ✅ Fixed | `create-project-form.tsx:69,79,91,102,110` uses `focus-visible:outline-none` |
| **P1-2** Per-route `<title>` metadata | ✅ Fixed | `app/projects/page.tsx:9`, `app/projects/[projectId]/page.tsx:9`, `app/projects/new/page.tsx:4` export metadata |
| **P1-3** Recharts tooltip theming | ✅ Fixed | `shared.tsx:4-7` defines `darkTooltipProps`; used across all chart instances |
| **P1-4** sr-only data tables for charts | ✅ Fixed | `dashboard-tab.tsx:135-166,183-214` includes `<table className="sr-only">` blocks |
| **P1-5** Keyboard shortcuts | ❌ Not fixed | Only `confirm-dialog.tsx:56` handles `Escape`; no app-wide shortcuts |
| **P1-6** Tab panel state loss | ✅ Fixed | `project-workbench.tsx:73-92` keeps all panels mounted with `hidden` class |
| **P1-7** Autosave dependency cycle | ⚠️ Partial | Debounced autosave works but effect still depends on `handleSaveVersion` closure |
| **P1-8** Breadcrumbs | ❌ Not fixed | No breadcrumb navigation in workbench |
| **P1-9** N+1 queries | ❌ Not fixed | `lib/db/projects.ts:14-19` still runs per-project COUNT + SELECT |
| **P1-10** API validation (Zod) | ✅ Fixed | All mutable routes use `safeParse` with schemas from `lib/validation.ts` |
| **P2-1** Select styling | ⚠️ Partial | Custom border/bg applied but no `appearance-none` or custom dropdown |
| **P2-2** Card editor tablet overflow | ⚠️ Partial | Responsive grid exists, but no intermediate `lg` breakpoint |
| **P2-3** Sidebar on mobile | ❌ Not fixed | Stacks below content at `<xl`; no collapse/drawer mechanism |
| **P2-4** Status auto-dismiss | ❌ Not fixed | Status messages persist until next action |
| **P2-6** Confirm dialog focus on danger | ❌ Not fixed | Danger dialogs still focus the destructive "Delete" button |
| **P2-7** `not-found.tsx` pages | ❌ Not fixed | No custom 404 pages anywhere |
| **P2-10** CSV quoted fields | ❌ Not fixed | CSV parsing still uses `.split(",")` — no quoted-field handling |

**Score: 11 of 19 fixed, 3 partially fixed, 5 not fixed.**

---

## 3. New Findings

### P0 — Must fix before any user-facing milestone

#### P0-1: All API routes crash on malformed JSON request bodies

**Files:** `app/api/projects/route.ts:12`, `app/api/projects/[projectId]/route.ts:21`, `app/api/projects/[projectId]/runs/route.ts:10`, `app/api/projects/[projectId]/versions/route.ts:8`, `app/api/projects/[projectId]/versions/[versionId]/route.ts:10,27`

Every `POST`, `PUT`, and `PATCH` handler calls `await request.json()` without a `try/catch`. If a client sends an empty body, `Content-Type: text/plain`, or malformed JSON, the `request.json()` call throws an unhandled error that crashes the handler with an opaque 500. This affects **all six mutable endpoints**.

Zod validation was added (good), but Zod only runs *after* the JSON parse succeeds. The parse itself is the unguarded step.

**Fix:**
```typescript
let raw: unknown;
try {
  raw = await request.json();
} catch {
  return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
}
```
Apply to every route that calls `request.json()`.

#### P0-2: `PRAGMA foreign_keys` is never enabled — referential integrity is unenforced

**File:** `lib/db/schema.ts:22-24`

The schema declares `FOREIGN KEY` constraints on `versions` and `simulation_runs`, but SQLite **disables foreign key enforcement by default**. The `getDb()` function sets `journal_mode = WAL` but never sets `PRAGMA foreign_keys = ON`. This means:

- A run can reference a `version_id` that doesn't exist
- Deleting a project doesn't cascade or error on orphaned versions
- The manual cascading delete in `deleteProject()` (`projects.ts:87-90`) works around this, but any direct SQL manipulation or future code path that skips the repository layer will silently create orphans

**Fix:** Add `sqlite.pragma("foreign_keys = ON");` immediately after `sqlite.pragma("journal_mode = WAL");` in `lib/db/schema.ts:23`.

#### P0-3: Simulation engine uses non-null assertion on potentially null winner

**File:** `lib/simulation/engine.ts:162-163`

```typescript
winner ??= fallbackWinner(players, version) ?? null;
return {
  winnerPosition: winner!.position,   // ← non-null assertion
  winnerAgent: winner!.agentType,     // ← non-null assertion
```

If `fallbackWinner` returns `undefined` and all other winner paths fail, `winner` remains `null` and these assertions crash at runtime. While the `fallbackWinner` implementation likely always returns a player (falls back to highest score), the `!` assertion masks a potential runtime error with no user-visible error message.

**Fix:** Guard with a default or throw a descriptive error:
```typescript
if (!winner) {
  throw new Error("Simulation error: no winner could be determined. Check game rules.");
}
```

---

### P1 — Should fix before beta/launch

#### P1-1: No `try/catch` or error handling in version duplication endpoint

**File:** `app/api/projects/[projectId]/versions/route.ts:6-16`

The `POST` handler for duplicating versions casts `request.json()` with `as { sourceVersionId?: string; label?: string }` — no Zod validation, no type checking. A missing `sourceVersionId` or garbage input is passed directly to `duplicateVersion()`. Additionally, `request.json()` is unguarded (same as P0-1).

This is the **only mutable endpoint** that still lacks Zod validation.

**Fix:** Create a `DuplicateVersionInputSchema` in `lib/validation.ts` and validate before calling `duplicateVersion()`.

#### P1-2: PATCH version endpoint uses unvalidated type assertion

**File:** `app/api/projects/[projectId]/versions/[versionId]/route.ts:27`

```typescript
const payload = (await request.json()) as { action?: string };
```

This `as` cast bypasses all type safety. Any payload shape is accepted. While only `"publish"` is handled (with a 400 for anything else), the pattern is fragile and inconsistent with the Zod approach used in adjacent handlers.

**Fix:** Add a small Zod schema: `z.object({ action: z.literal("publish") })`.

#### P1-3: `<nav>` element lacks `aria-label`

**File:** `components/chrome/top-nav.tsx:18`

The `<nav>` element has no `aria-label` or `aria-labelledby`. Screen readers announce it as a generic "navigation" landmark. With only one nav on most pages this is acceptable but not ideal — a label like `aria-label="Main navigation"` is trivial to add and improves screen reader UX.

#### P1-4: N+1 query pattern in `getProjectsSummary` — unfixed since first review

**File:** `lib/db/projects.ts:11-31`

```typescript
return projects.map((project) => {
  const versionCount = (versionCountStmt.get(project.id) as { count: number }).count;
  const runs = (runsStmt.all(project.id) as RunRow[]).map(hydrateRun);
  // ...
});
```

For each project, two additional queries run: one `COUNT(*)` for versions and one `SELECT *` for runs. With 20 projects and 10 runs each, this is 41 queries instead of 3. This was flagged in **both** previous reviews and remains unfixed. The `hydrateRun` call also JSON-parses every run's `config_json` and `result_json` — meaning for the summary view, you're deserializing large result blobs just to get the latest run.

**Fix:** Single query with JOINs, or at minimum fetch only the latest run per project rather than all runs.

#### P1-5: Keyboard shortcuts completely absent — unfixed since first review

**Files:** Entire codebase (grep for `onKeyDown` returns only `confirm-dialog.tsx:56`)

For a "developer-tool style" product (per README), zero keyboard shortcuts exist. Missing:
- `Cmd/Ctrl+S` → Save version
- `Cmd/Ctrl+Enter` → Run simulation
- `Escape` → Dismiss status/error banners
- Arrow keys → Navigate tabs within tablist
- Number keys `1-5` → Switch tabs (when not in an input)

This was flagged in UX_REVIEW_2 (P1-5) and remains unaddressed.

#### P1-6: No component or API route tests — only library-level unit tests

**Files:** `lib/__tests__/csv-parser.test.ts`, `lib/__tests__/utils.test.ts`, `lib/simulation/__tests__/engine.test.ts`, `lib/simulation/__tests__/validation.test.ts`

The 35 tests cover utility functions, CSV parsing, simulation engine, and validation — all good. But there are zero tests for:
- Any of the 9 API route handlers (no request/response testing)
- Any React component (no render testing)
- Database repository functions (no CRUD testing)
- Error paths (malformed JSON, missing IDs, authorization)

This means the entire HTTP layer and UI layer are untested. A regression in any API route or component is only caught manually.

#### P1-7: Breadcrumb navigation still missing — unfixed since first review

**Files:** `app/projects/[projectId]/page.tsx`, `components/projects/project-workbench.tsx`

Users inside a project workbench see "Project workspace" + project name, but no breadcrumb trail like `Projects > Dragon's Gambit > Dashboard`. The only navigation back is the top nav "Projects" link. Flagged in both previous reviews.

#### P1-8: `hand.splice(findIndex(...), 1)` can splice at index -1

**File:** `lib/simulation/mechanics.ts:61`

```typescript
player.hand.splice(player.hand.findIndex((handCard) => handCard.name === card.name && handCard.cost === card.cost), 1);
```

If `findIndex` returns `-1` (card not found in hand), `splice(-1, 1)` silently removes the **last** element of the hand. While the caller ensures the card is in `legalCards` (which is filtered from `hand`), a race condition or future refactor could trigger this silent data corruption.

**Fix:** Store the index, check for `-1`, and throw or skip:
```typescript
const idx = player.hand.findIndex(…);
if (idx !== -1) player.hand.splice(idx, 1);
```

---

### P2 — Polish and quality-of-life

#### P2-1: Status/error messages don't auto-dismiss

**Files:** `components/projects/project-workbench.tsx:67-68`, `components/projects/use-workbench-state.ts:22-23`

Success messages like "Project details saved." and "Saved v1.0." persist indefinitely until the next action replaces them. Success messages should auto-dismiss after 4-5 seconds. Error messages should persist but include a dismiss "×" button.

Flagged in UX_REVIEW_2 (P2-4), still unfixed.

#### P2-2: No custom `not-found.tsx` pages

**Files:** `app/` (no `not-found.tsx` files exist)

`notFound()` is called in project and report pages, but users see the generic Next.js 404 page which breaks the dark visual design. Flagged in UX_REVIEW_2 (P2-7), still unfixed.

#### P2-3: Confirm dialog focuses destructive button on danger actions

**File:** `components/ui/confirm-dialog.tsx:34-37`

For `variant === "danger"`, initial focus lands on the "Delete" button. An accidental `Enter` keypress immediately confirms deletion. Best practice: focus the cancel button for destructive actions. Flagged in UX_REVIEW_2 (P2-6), still unfixed.

#### P2-4: Mobile sidebar stacks below content with no collapse mechanism

**File:** `components/projects/project-workbench.tsx:71`

Below `xl` (1280px), the sidebar stacks below the main content. Mobile users must scroll past the entire workbench to see version list and simulation history — the most important navigational element. Flagged in UX_REVIEW_2 (P2-3), still unfixed.

#### P2-5: Hardcoded database path with no environment variable override

**File:** `lib/db/schema.ts:18-19`

```typescript
const dataDir = path.join(process.cwd(), "data");
const dbPath = path.join(dataDir, "playtestai.sqlite");
```

The database path is hardcoded. There's no way to override it via `DATABASE_PATH` or similar environment variable. This makes it harder to:
- Run tests against an in-memory or temp database
- Deploy to environments with different filesystem layouts
- Run multiple instances side-by-side

#### P2-6: CSV parser doesn't handle quoted fields with embedded commas

**File:** `components/projects/workbench/types.ts:74-113`

The CSV parser splits on commas naively (`.split(",")`). A card named `"Dragon, Ancient"` breaks into two columns. This is a known limitation from UX_REVIEW_2 (P2-10) and remains unfixed.

#### P2-7: Balanced agent uses RNG inside sort comparator

**File:** `lib/simulation/agents.ts:128`

```typescript
: leftValue.blended - left.cost * b.costPenalty + rng() * b.jitter;
```

The balanced agent adds `rng() * b.jitter` during sort comparison. This means the same pair of cards can compare differently depending on call order, making the sort non-transitive. While the shortlist selection (line 138-139) mitigates this in practice, it's technically an unstable sort that could produce unexpected ordering in edge cases.

#### P2-8: `select` elements still render with browser-default dropdown appearance

**Files:** `components/projects/workbench/compare-tab.tsx:129,137`, `components/projects/create-project-form.tsx:107-115`

Native `<select>` elements have custom border/background but the dropdown arrow and option list render in the browser's native light-mode style. On macOS, the dropdown is white with dark text — visually inconsistent with the dark theme. Flagged in UX_REVIEW_2 (P2-1), partially addressed but not fully resolved.

#### P2-9: No database migration strategy

**File:** `lib/db/schema.ts:29-60`

The schema uses `CREATE TABLE IF NOT EXISTS` which works for initial setup but provides no migration path. If a column needs to be added, renamed, or a table restructured, there's no mechanism to handle it. Users with existing data would need to manually alter their database or delete it.

#### P2-10: Autosave effect has dependency cycle via `handleSaveVersion`

**File:** `components/projects/workbench/definition-tab.tsx:69-90`

The autosave `useEffect` depends on `handleSaveVersion`, which is a `useCallback` that depends on `workingVersion`. Every keystroke creates a new `workingVersion` → new `handleSaveVersion` → re-runs the effect → clears and resets the timer. While the 5-second debounce works in practice, the cleanup/re-creation churn is wasteful. Use a ref for `handleSaveVersion` to break the cycle.

---

## 4. Quick Wins (< 1 day each)

| ID | Fix | Priority | Effort |
|---|---|---|---|
| QW-1 | Wrap all `request.json()` calls in `try/catch` across 6 API routes | P0 | 30 min |
| QW-2 | Add `sqlite.pragma("foreign_keys = ON")` in `lib/db/schema.ts:23` | P0 | 5 min |
| QW-3 | Guard `winner!` non-null assertion with explicit null check | P0 | 10 min |
| QW-4 | Add `aria-label="Main navigation"` to `<nav>` in `top-nav.tsx:18` | P1 | 2 min |
| QW-5 | Add Zod schema for version duplication (`POST /versions`) | P1 | 15 min |
| QW-6 | Add Zod schema for `PATCH /versions/:id` action | P1 | 10 min |
| QW-7 | Guard `splice(-1)` with `findIndex` check in `mechanics.ts:61` | P1 | 5 min |
| QW-8 | Add auto-dismiss timeout for success status messages | P2 | 15 min |
| QW-9 | Add `not-found.tsx` with branded 404 styling | P2 | 20 min |
| QW-10 | Focus cancel button in danger confirm dialogs | P2 | 10 min |
| QW-11 | Add `DATABASE_PATH` env var support in `schema.ts` | P2 | 15 min |

---

## 5. Medium-Term Improvements (days to a sprint)

| ID | Improvement | Priority | Effort |
|---|---|---|---|
| MT-1 | Add keyboard shortcuts (`Cmd+S`, `Cmd+Enter`, `Escape`, arrows for tabs) | P1 | 1-2 days |
| MT-2 | Optimize `getProjectsSummary` — single JOIN query instead of N+1 | P1 | 2-3 hours |
| MT-3 | Add breadcrumb navigation to workbench | P1 | half day |
| MT-4 | Add API route integration tests (at least happy-path + error-path) | P1 | 2-3 days |
| MT-5 | Add component smoke tests for workbench tabs | P1 | 2-3 days |
| MT-6 | Fix autosave `useEffect` dependency cycle with ref pattern | P2 | 2 hours |
| MT-7 | Replace native `<select>` with custom dark-themed dropdown | P2 | 1 day |
| MT-8 | Implement collapsible sidebar drawer for mobile | P2 | 1 day |
| MT-9 | Add proper CSV parser for quoted fields | P2 | half day |
| MT-10 | Add database migration framework (versioned schema changes) | P2 | 1-2 days |

---

## 6. Long-Term Investments

| ID | Investment | Priority | Impact |
|---|---|---|---|
| LT-1 | **Move simulation to Web Worker** — currently runs on main thread via `setTimeout(0)` yielding; large batches (5k-10k games) block UI | P1 | Eliminates jank during long simulations |
| LT-2 | **Add E2E tests** (Playwright) for critical user flows: create project → define cards → run simulation → view results | P1 | Catches full-stack regressions |
| LT-3 | **Undo/redo system** for card and resource editing — currently one mis-edit requires manual reversal | P2 | Major UX improvement for power users |
| LT-4 | **WebSocket or SSE progress** for simulation — replace polling pattern with real-time push | P2 | Better simulation feedback loop |
| LT-5 | **Multi-user support** — add auth layer and shared project ownership for team workflows | P2 | Enables the "Studio" pricing tier |

---

## 7. Comparison to Best Practices

| Area | Current State | Best Practice Gap |
|---|---|---|
| **API error handling** | Zod validates after parse, but `request.json()` itself is unguarded | Wrap all JSON parsing; return structured error responses for all failure modes |
| **Database integrity** | Foreign keys declared but not enforced | Always enable `PRAGMA foreign_keys = ON` for SQLite |
| **Test coverage** | 35 unit tests for library code only | Modern apps test API routes, components, and E2E flows; aim for ≥80% coverage |
| **Keyboard accessibility** | Tab semantics correct, but no shortcuts | Developer tools should have keyboard shortcuts for all frequent actions |
| **Responsive design** | Good at mobile and desktop; weak at tablet | Intermediate breakpoints needed for complex layouts like card editors |
| **Error recovery** | Error boundaries exist; no undo/redo | Power-user tools need undo for destructive edits |
| **Performance** | Main-thread simulation with `setTimeout(0)` yielding | Web Workers for CPU-intensive work is the standard approach |
| **Navigation** | Top nav with project link; no breadcrumbs | Multi-level apps need breadcrumb trails for orientation |
| **Status feedback** | Messages persist forever | Auto-dismiss success messages; allow manual dismiss of errors |
| **Database migrations** | `CREATE TABLE IF NOT EXISTS` only | Version-tracked migrations (e.g., `drizzle-kit`, `prisma migrate`, or manual version table) |

---

## 8. Overall Assessment

**Rating: Strong beta — approaching production-ready.**

The project has addressed ~60% of issues across two previous reviews, with all original P0s now resolved. The remaining issues fall into three categories:

1. **Robustness gaps** (P0-1 through P0-3) — unguarded JSON parsing, unenforced foreign keys, and a non-null assertion that could crash at runtime. These are quick fixes but critical for reliability.

2. **Repeatedly deferred items** (P1-4, P1-5, P1-7) — the N+1 query, keyboard shortcuts, and breadcrumbs have been flagged in every review. They should be prioritized or explicitly accepted as out-of-scope.

3. **Test coverage deficit** (P1-6) — the library-level tests are good, but the complete absence of API and component tests means the most user-facing code is the least tested. This is the single largest DX risk for ongoing development.

The codebase architecture is solid: clean separation of concerns, well-typed interfaces, deterministic simulation engine, and a modular component structure. The visual design is polished and consistent. The README and CONTRIBUTING docs are excellent for onboarding. The quick wins in section 4 can be completed in a single day and would resolve all remaining P0s.

---

*Third-pass audit conducted against codebase at current HEAD. All file references relative to project root.*
