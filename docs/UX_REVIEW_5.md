# PlaytestAI — Fifth-Pass UX & DX Audit

> Focused review after four prior passes ([UX_REVIEW.md](./UX_REVIEW.md), [UX_REVIEW_2.md](./UX_REVIEW_2.md), [UX_REVIEW_3.md](./UX_REVIEW_3.md), [UX_REVIEW_4.md](./UX_REVIEW_4.md)). This audit verifies previous fixes and **only flags genuinely new P0/P1 issues** not already documented.

---

## 1. Summary

The project has matured significantly over four review cycles. The most critical issues from prior reviews (missing Zod validation, `PRAGMA foreign_keys`, `request.json()` error handling, monolith decomposition, AbortSignal for simulations, CSV formula injection, useEffect dependency array) are all resolved. The codebase now has 78 passing tests across 9 suites, clean TypeScript, clean ESLint, proper loading skeletons, a branded 404 page, error boundaries, file-based CSV upload with preview, delete confirmators for all destructive actions, autosave, and keyboard shortcuts. This fifth pass surfaces **four genuinely new issues** across three categories: (1) the foreign key schema lacks `ON DELETE CASCADE`, forcing fragile manual cascade code that can orphan rows on partial failure; (2) the A/B comparison tab runs two sequential simulations with no AbortSignal/cancellation support, creating the same lifecycle bug that was just fixed in the simulation tab; (3) POST API routes return 200 instead of 201 and DELETE routes return 200 instead of 204, violating HTTP semantics; and (4) the `report-tab.tsx` `target="_blank"` link is missing `rel="noopener noreferrer"`.

---

## 2. Fourth-Review Fix Verification

| Fourth Review Item | Status | Evidence |
|---|---|---|
| **P0-1** `useEffect` missing dependency array in SimulationTab | ✅ Fixed | `simulation-tab.tsx:92-104` — `handleRunRef` pattern + `useEffect([], [])` |
| **P1-1** Simulation cancellation / unmount guard | ✅ Fixed | `simulation-tab.tsx:34-35,49-51,107-110` — `AbortController` ref, abort on re-run and unmount, signal passed to both `simulateBatchAsync` and `fetch` |
| **P1-2** CSV formula injection | ✅ Fixed | `lib/csv-export.ts:10-15` — `escapeCsvField` with OWASP-recommended prefix; used in `dashboard-tab.tsx:47,54` |
| **P1-3** Stale `selectedRunId`/`selectedVersionId` in `updateFromResponse` | ✅ Fixed | `use-workbench-state.ts:22-27` — refs with sync effect, read via `.current` at lines 73, 79 |

**Score: 4 of 4 fixed.** All P0/P1 items from review 4 are resolved.

---

## 3. New Findings

### P0 — Must fix before any user-facing milestone

#### P0-1: Foreign key schema missing `ON DELETE CASCADE` — manual cascade is fragile and can orphan rows

**File:** `lib/db/schema.ts:40-61`

```sql
FOREIGN KEY (project_id) REFERENCES projects(id)     -- no ON DELETE clause
FOREIGN KEY (project_id) REFERENCES projects(id)     -- same
FOREIGN KEY (version_id) REFERENCES versions(id)     -- same
```

The schema declares foreign keys but omits `ON DELETE CASCADE` on all three constraints. This forces every delete operation to manually cascade in application code:

- `deleteProject` (`lib/db/projects.ts:106-110`): manually deletes runs → versions → project in a transaction
- `deleteVersion` (`lib/db/versions.ts:124-129`): manually deletes runs → version in a transaction

The problem: if any statement within a transaction fails after a partial delete has been written (e.g., the `DELETE FROM versions` succeeds but `DELETE FROM projects` throws), SQLite's rollback *should* undo it — but the code does **not** catch transaction errors or propagate them cleanly. More critically, **`deleteSimulationRun`** at `lib/db/runs.ts:37-41` does **not** use a transaction at all — the `DELETE` and the subsequent `UPDATE projects SET updated_at` are two separate statements. If the process crashes between them, the project's `updated_at` is stale.

Additionally, without `ON DELETE CASCADE`, if any future code path deletes a project or version without going through the repository functions (e.g., a direct SQL migration, a seed reset, or a new API route), orphaned rows will silently accumulate.

No prior review flagged the missing cascade clause. UX_REVIEW.md §8.4 noted "no delete project" as a missing feature. UX_REVIEW_4 §2 confirmed the feature was implemented. But the schema-level cascade gap was never identified.

**Fix:** Add `ON DELETE CASCADE` to all foreign key constraints:
```sql
FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
FOREIGN KEY (version_id) REFERENCES versions(id) ON DELETE CASCADE
```
This also simplifies `deleteProject` and `deleteVersion` to single-statement deletes, removing the manual cascade code.

---

### P1 — Should fix before beta/launch

#### P1-1: A/B CompareTab simulations have no AbortSignal — the same lifecycle bug just fixed in SimulationTab

**File:** `components/projects/workbench/compare-tab.tsx:96-108`

```typescript
const resultA = await simulateBatchAsync(versionA, configA, (value) => setCompareProgress(value / 2));
const resultB = await simulateBatchAsync(versionB, configB, (value) => setCompareProgress(50 + value / 2));
```

`simulateBatchAsync` now accepts an optional `AbortSignal` parameter (added to fix UX_REVIEW_4 P1-1), and `SimulationTab` correctly uses it. However, `CompareTab` **does not pass a signal** to either call. This means:

1. If the user navigates away mid-comparison, both simulations continue running to completion, calling `setCompareProgress` on a potentially unmounted component.
2. There is no cancel button during A/B comparison (the simulation tab has implicit cancel-on-unmount).
3. Running an A/B comparison with 2× 5,000 games is twice the CPU cost with no escape hatch.

This is the exact same class of bug that was P1-1 in UX_REVIEW_4, but in a different component. It was not flagged because prior reviews examined `SimulationTab` specifically.

**Fix:** Mirror the `SimulationTab` pattern — create an `AbortController` ref, pass `controller.signal` to both `simulateBatchAsync` calls, and abort on unmount:
```typescript
const abortRef = useRef<AbortController | null>(null);

async function handleRunComparison() {
  abortRef.current?.abort();
  const controller = new AbortController();
  abortRef.current = controller;
  // ...
  const resultA = await simulateBatchAsync(versionA, configA, (v) => setCompareProgress(v / 2), controller.signal);
  const resultB = await simulateBatchAsync(versionB, configB, (v) => setCompareProgress(50 + v / 2), controller.signal);
}

useEffect(() => () => { abortRef.current?.abort(); }, []);
```

#### P1-2: POST routes return 200 instead of 201; DELETE routes return 200 instead of 204

**Files:**
- `app/api/projects/route.ts:27` — `POST` returns `200`
- `app/api/projects/[projectId]/versions/route.ts:22` — `POST` returns `200`
- `app/api/projects/[projectId]/runs/route.ts:38` — `POST` returns `200`
- `app/api/projects/[projectId]/route.ts:42` — `DELETE` returns `200`
- `app/api/projects/[projectId]/runs/[runId]/route.ts:15` — `DELETE` returns `200`
- `app/api/projects/[projectId]/versions/[versionId]/route.ts:57` — `DELETE` returns `200`

All resource-creating endpoints (`POST`) return an implicit `200 OK` instead of `201 Created`. All resource-destroying endpoints (`DELETE`) return `200 OK` with a JSON body instead of `204 No Content`. While the client code happens to work because it checks `response.ok` (which covers 200-299), this violates HTTP/REST semantics and will confuse any third-party integration, API test suite, or developer reading the routes.

No prior review flagged status codes. UX_REVIEW.md §8.4 noted API design issues (missing validation, missing pagination, missing error codes) but not status code semantics.

**Fix:**
```typescript
// POST routes
return NextResponse.json({ projectId: project.id }, { status: 201 });

// DELETE routes
return new Response(null, { status: 204 });
```

Note: For DELETE routes that currently return the refreshed project (`{ project }`), decide whether to return `204` (clean REST) or keep `200` with a body (pragmatic). If the client needs the refreshed project, `200` with a body is defensible but should be documented. If switching to `204`, the client should re-fetch explicitly.

#### P1-3: `target="_blank"` link missing `rel="noopener noreferrer"`

**File:** `components/projects/workbench/report-tab.tsx:30`

```tsx
<Link href={`/projects/${project.id}/report?runId=${selectedRun.id}`} target="_blank" ...>
```

This `target="_blank"` link omits `rel="noopener noreferrer"`. While modern browsers (Chrome 88+, Firefox 79+) default to `noopener` for `target="_blank"`, older browsers and some WebView contexts do not, creating a potential [reverse tabnabbing](https://owasp.org/www-community/attacks/Reverse_Tabnabbing) vector where the opened page could redirect the opener via `window.opener`.

Next.js `<Link>` does not automatically add `rel="noopener noreferrer"` when `target="_blank"` is used (unlike `<a>` in some React configurations).

No prior review flagged this. UX_REVIEW.md §8.3 mentioned navigation gaps; UX_REVIEW_2 and _3 covered accessibility; but the security implication of the report link was never examined.

**Fix:**
```tsx
<Link href={...} target="_blank" rel="noopener noreferrer" ...>
```

---

## 4. Previously Flagged — Verified as Fixed Since Earlier Reviews

Items that were open in prior reviews but are now resolved (not counted in review 4's verification):

| Item | First Flagged | Status |
|---|---|---|
| Custom `not-found.tsx` page | UX_REVIEW_2 P2-7 | ✅ Fixed — `app/not-found.tsx` with branded 404, nav links |
| `loading.tsx` skeletons | UX_REVIEW QW-2 | ✅ Fixed — `app/projects/loading.tsx`, `app/projects/[projectId]/loading.tsx` exist |
| File-based CSV upload with preview | UX_REVIEW MT-2 | ✅ Fixed — `definition-tab.tsx:144-177` — file input, preview table, append/replace mode |
| Confirmation dialogs for destructive actions | UX_REVIEW QW-3 | ✅ Fixed — `ConfirmDialog` component used in `version-sidebar.tsx` and `definition-tab.tsx` |
| Autosave for rule drafts | UX_REVIEW MT-3 | ✅ Fixed — `definition-tab.tsx:70-94` — 5-second debounced autosave |
| Delete project/version/run capability | UX_REVIEW MT-5 | ✅ Fixed — DELETE routes for all three entities; sidebar UI with confirmation |
| Per-route `<title>` metadata | UX_REVIEW QW-7 | ✅ Fixed — `app/projects/page.tsx:9-11`, `app/projects/[projectId]/page.tsx:9-13` with `generateMetadata` |
| CSV export formula injection | UX_REVIEW_4 P1-2 | ✅ Fixed — `lib/csv-export.ts` |
| AbortSignal for simulation | UX_REVIEW_4 P1-1 | ✅ Fixed — `simulation-tab.tsx:34-35,49-51` |

---

## 5. Quick Wins (< 1 day each)

| ID | Fix | Priority | Effort |
|---|---|---|---|
| QW-1 | Add `rel="noopener noreferrer"` to `target="_blank"` Link in `report-tab.tsx:30` | P1 | 1 min |
| QW-2 | Add `{ status: 201 }` to all POST route responses | P1 | 10 min |
| QW-3 | Add `ON DELETE CASCADE` to both FK constraints in `lib/db/schema.ts` | P0 | 15 min |
| QW-4 | Add `AbortController` to `CompareTab.handleRunComparison` + unmount cleanup | P1 | 20 min |

---

## 6. Medium-Term Improvements

| ID | Improvement | Priority | Effort |
|---|---|---|---|
| MT-1 | Simplify `deleteProject` and `deleteVersion` after adding CASCADE (remove manual cascade code) | P1 | 30 min |
| MT-2 | Add API route integration tests — still 0 coverage on all 11 handlers | P1 | 2-3 days |
| MT-3 | Add skip-to-content link in `top-nav.tsx` for keyboard/screen-reader users | P2 | 15 min |
| MT-4 | Add active-route indication in `top-nav.tsx` nav links (e.g., highlight "Projects" when on `/projects`) | P2 | 20 min |
| MT-5 | Wrap `deleteSimulationRun` in a transaction (`lib/db/runs.ts:37-41`) so the DELETE and `updated_at` UPDATE are atomic | P1 | 5 min |
| MT-6 | Add `.tsx` to vitest coverage include (`vitest.config.ts:11`) — currently only collects `.ts`, missing all React component coverage | P2 | 5 min |
| MT-7 | Update hardcoded test count "78 tests" in `CONTRIBUTING.md:33` and `README.md:7` badge — or replace with a dynamic badge | P2 | 10 min |

---

## 7. Deferred Items Tracker

Items flagged in prior reviews that remain unfixed. Included for continuity — not re-audited.

| Item | First Flagged | Current Status |
|---|---|---|
| `splice(-1)` guard in `mechanics.ts:58` | UX_REVIEW_3 P1-8 | ❌ Unfixed — `findIndex` can return `-1` |
| API/component test coverage | UX_REVIEW LT-1 | ❌ 78 library-level tests only; 0 API or component tests |
| Breadcrumb navigation | UX_REVIEW §8.3 | ❌ Unfixed |
| Confirm dialog danger focus (cancel vs confirm) | UX_REVIEW_2 P2-6 | ❌ `confirm-dialog.tsx:36` still focuses confirm button on danger dialogs |
| Status message auto-dismiss | UX_REVIEW_2 P2-4 | ❌ Only Escape key dismissal |
| Mobile sidebar collapsible | UX_REVIEW_2 P2-3 | ❌ Unfixed |
| Web Worker for simulation | UX_REVIEW LT-4 | ❌ Unfixed |
| `DATABASE_PATH` env var | UX_REVIEW_3 P2-5 | ❌ Still hardcoded at `lib/db/schema.ts:18-19` |
| HSTS header in dev | next.config.ts:9 | ⚠️ New observation (not prior flagged, P2) — `Strict-Transport-Security` is applied globally including localhost dev, which can cause browser issues over HTTP |

---

## 8. Overall Assessment

**Rating: Strong beta — genuinely approaching production readiness.**

The project has resolved 13+ issues across four review cycles. The four new findings are:
1. One schema-level design gap (`ON DELETE CASCADE`) that hasn't caused data loss yet but will if anyone touches the DB outside the repository layer — **P0**.
2. One component-level lifecycle bug (`CompareTab` missing AbortSignal) that is a copy-paste omission from a fix already applied elsewhere — **P1**.
3. One REST semantics issue (wrong status codes) that will bite during integration testing — **P1**.
4. One security hygiene item (`rel="noopener"`) that's a one-line fix — **P1**.

All four are fixable in under an hour combined. The biggest remaining structural investment is test coverage: 78 tests cover the simulation engine and utilities well, but there are still zero API route tests and zero component tests. This is the single highest-risk area for confident iteration and should be the next strategic investment after these quick wins.

---

*Audit conducted against codebase at current HEAD. All 78 tests pass, TypeScript compiles clean, ESLint reports no issues. All file references are relative to the project root.*
