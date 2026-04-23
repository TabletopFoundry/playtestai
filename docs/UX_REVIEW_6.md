# PlaytestAI — Sixth-Pass UX & DX Audit

> Focused delta review after five prior passes ([UX_REVIEW.md](./UX_REVIEW.md) through [UX_REVIEW_5.md](./UX_REVIEW_5.md)) and two code reviews ([CODE_REVIEW.md](./CODE_REVIEW.md), [CODE_REVIEW_2.md](./CODE_REVIEW_2.md)). This audit verifies previous fixes and **only flags genuinely new P0/P1 issues** not already documented.

---

## 1. Summary

The project has reached a high level of maturity. All four P0/P1 items from Review 5 are resolved: `ON DELETE CASCADE` is present on all foreign keys, `CompareTab` now passes an `AbortController` to both `simulateBatchAsync` calls with unmount cleanup, POST routes return `201 Created`, and the `target="_blank"` link in `report-tab.tsx` now has `rel="noopener noreferrer"`. Additionally, several items from CODE_REVIEW_2 are resolved — the `require()` circular dependency hack is eliminated (0 ESLint errors), `getStat` is deduplicated into a shared `helpers.ts`, `summariseResult` accepts a `BatchAccumulator` object, the cross-project referential integrity check in `createSimulationRun` is implemented, and `deleteSimulationRun` is wrapped in a transaction. The codebase now passes ESLint with 0 errors, TypeScript with 0 errors, and all 78 tests pass. This sixth pass surfaces **three genuinely new issues**: (1) the `splice(findIndex(...))` in `mechanics.ts:58` remains unguarded and can corrupt game state if `findIndex` returns `-1`; (2) the version DELETE and run DELETE routes return `200` with a `{ project }` body while the project DELETE returns `204` — an inconsistency the client works around but that creates a silent contract divergence for API consumers; and (3) the `ConfirmDialog` still focuses the destructive "Confirm" button on open for danger-variant dialogs, violating the principle of least surprise for destructive actions.

---

## 2. Fifth-Review Fix Verification

| Fifth Review Item | Status | Evidence |
|---|---|---|
| **P0-1** `ON DELETE CASCADE` on all FK constraints | ✅ Fixed | `lib/db/schema.ts:47,58-59` — all three FKs have `ON DELETE CASCADE` |
| **P1-1** `CompareTab` simulations have no `AbortSignal` | ✅ Fixed | `compare-tab.tsx:47-50,101-104,109-110` — `AbortController` ref, abort on re-run, signal passed to both calls, cleanup on unmount |
| **P1-2** POST routes return 200 instead of 201 | ✅ Fixed | `app/api/projects/route.ts:27` returns `{ status: 201 }`; `versions/route.ts:22` returns `{ status: 201 }`; `runs/route.ts:38` returns `{ status: 201 }` |
| **P1-3** `target="_blank"` missing `rel="noopener noreferrer"` | ✅ Fixed | `report-tab.tsx:30` — `rel="noopener noreferrer"` present |

**Also resolved from CODE_REVIEW_2:**

| CODE_REVIEW_2 Item | Status | Evidence |
|---|---|---|
| **P0-4** `require()` circular dependency hack | ✅ Fixed | `grep -rn 'require(' lib/` returns 0 results; ESLint passes clean with 0 errors |
| **P0-5** Cross-project referential integrity bypass on `POST /runs` | ✅ Fixed | `lib/db/runs.ts:13-18` — ownership check before insert; `runs/route.ts:28-31` catches the error |
| **P1-10** `getStat` helper duplicated across modules | ✅ Fixed | `lib/simulation/helpers.ts:8-10` — single shared export; imported by both `agents.ts:15` and `mechanics.ts:9` |
| **P1-11** `summariseResult` accepts 8 positional params | ✅ Fixed | `lib/simulation/analytics.ts:60-64` — accepts `BatchAccumulator` object; interface exported from `analytics.ts:43-58` |

**Also resolved from UX_REVIEW_5 medium-term:**

| UX_REVIEW_5 MT Item | Status | Evidence |
|---|---|---|
| **MT-1** Simplify `deleteProject` after CASCADE | ✅ Fixed | `lib/db/projects.ts:99-103` — single `DELETE FROM projects` statement, no manual cascade |
| **MT-5** Wrap `deleteSimulationRun` in transaction | ✅ Fixed | `lib/db/runs.ts:40-44` — `db.transaction()` wraps both DELETE and UPDATE |

**Score: 4 of 4 P0/P1 from Review 5 fixed. 4 of 4 checked CODE_REVIEW_2 items fixed. 2 of 2 checked MT items fixed.**

---

## 3. New Findings

### P1 — Should fix before beta/launch

#### P1-1: `splice(findIndex(...))` still unguarded in `mechanics.ts:58` — can corrupt hand state

**File:** `lib/simulation/mechanics.ts:58`

```typescript
player.hand.splice(player.hand.findIndex((handCard) => handCard.name === card.name && handCard.cost === card.cost), 1);
```

If `findIndex` returns `-1` (no match), `splice(-1, 1)` removes the **last element** of the hand rather than the intended card. While this is unlikely with the current engine (only called after `chooseCard` picks from `legalCards` which filters `player.hand`), the match predicate uses `name + cost` equality — not identity or ID. If two different cards share the same name and cost but different stats (which is valid in the card schema), `findIndex` may find the wrong card, and a future refactor could make a `-1` return path reachable.

This was first flagged as **UX_REVIEW_3 P1-8** and tracked as unfixed in UX_REVIEW_4, UX_REVIEW_5 (§7 Deferred Items). It has been open for four consecutive reviews. Elevating visibility because the splice-of-last-element behavior is a **silent data corruption** that would produce wrong simulation analytics without any error signal.

**Fix:**
```typescript
const cardIndex = player.hand.findIndex(
  (handCard) => handCard.id === card.id
);
if (cardIndex !== -1) {
  player.hand.splice(cardIndex, 1);
}
```

Using `card.id` is both safer (unique identifier) and eliminates the name+cost ambiguity.

---

#### P1-2: Version DELETE and run DELETE return `200` with body; project DELETE returns `204` — inconsistent API contract

**Files:**
- `app/api/projects/[projectId]/route.ts:42` — DELETE returns `204 No Content` ✅
- `app/api/projects/[projectId]/versions/[versionId]/route.ts:57` — DELETE returns `200` with `{ project }` body
- `app/api/projects/[projectId]/runs/[runId]/route.ts:15` — DELETE returns `200` with `{ project }` body

UX_REVIEW_5 P1-2 flagged that all DELETE routes returned `200`. The fix applied to the project DELETE (`new Response(null, { status: 204 })`) but not to the version and run DELETE routes. This creates an inconsistent contract: deleting a project returns 204 with no body, but deleting a version or run returns 200 with the updated project payload.

The client code in `version-sidebar.tsx:44-56` calls `updateFromResponse(response)` on version/run DELETE, which expects a `{ project }` body — so changing these to `204` would break the client. However, the current state is a **leaky abstraction**: any API consumer looking at the project DELETE for convention would assume all DELETEs return 204 and fail to parse version/run DELETE responses.

**Fix — choose one convention and document it:**

Option A (recommended): Keep 200 with `{ project }` body for version and run DELETEs (the client needs the refreshed state), change the project DELETE back to `200` with `{ deleted: true }`, and document the pattern: "DELETE routes return the parent resource after deletion."

Option B: Switch version/run DELETEs to `204`, update `version-sidebar.tsx` to re-fetch the project separately after delete via `GET /api/projects/:id`. This is cleaner REST but adds a network round-trip.

Either way, document the convention in the README API table.

---

#### P1-3: `ConfirmDialog` focuses destructive "Confirm" button on open for danger-variant dialogs

**File:** `components/ui/confirm-dialog.tsx:36`

```typescript
confirmBtnRef.current?.focus();
```

When a danger-variant `ConfirmDialog` opens (e.g., "Delete project?", "Delete version?"), the destructive "Delete" button receives initial focus. A user pressing Enter immediately after the dialog opens would confirm the destructive action. The expected behavior for danger dialogs is to focus the **Cancel** button, so that the default keyboard action (Enter) is the safe choice.

This was first flagged as **UX_REVIEW_2 P2-6** and tracked as unfixed in UX_REVIEW_3, UX_REVIEW_4, and UX_REVIEW_5 (§7 Deferred Items). It has been open for four consecutive reviews. Elevating to P1 because the codebase now has delete operations for projects, versions, and runs — all using this dialog — increasing the surface area for accidental data loss.

**Fix:**
```typescript
const cancelBtnRef = useRef<HTMLButtonElement>(null);

useEffect(() => {
  const dialog = dialogRef.current;
  if (!dialog) return;

  if (open && !dialog.open) {
    dialog.showModal();
    if (variant === "danger") {
      cancelBtnRef.current?.focus();
    } else {
      confirmBtnRef.current?.focus();
    }
  } else if (!open && dialog.open) {
    dialog.close();
  }
}, [open, variant]);

// Add ref={cancelBtnRef} to the cancel button
```

---

## 4. Previously Flagged — Verified as Fixed Since Earlier Reviews

Items from the deferred tracker that are now resolved (not counted above):

| Item | First Flagged | Status |
|---|---|---|
| `ON DELETE CASCADE` on FK constraints | UX_REVIEW_5 P0-1 | ✅ Fixed |
| `require()` circular dependency | CODE_REVIEW_2 P0-4 | ✅ Fixed |
| Cross-project run integrity check | CODE_REVIEW_2 P0-5 | ✅ Fixed |
| `getStat` duplication | CODE_REVIEW_2 P1-10 | ✅ Fixed |
| `summariseResult` 8 params | CODE_REVIEW_2 P1-11 | ✅ Fixed |
| `deleteSimulationRun` not in transaction | UX_REVIEW_5 MT-5 | ✅ Fixed |
| Manual cascade code after CASCADE | UX_REVIEW_5 MT-1 | ✅ Fixed |

---

## 5. Quick Wins (< 1 day each)

| ID | Fix | Priority | Effort |
|---|---|---|---|
| QW-1 | Guard `splice(-1)` in `mechanics.ts:58` — match by `card.id` instead of name+cost | P1 | 5 min |
| QW-2 | Focus cancel button in danger `ConfirmDialog` (`confirm-dialog.tsx:36`) | P1 | 10 min |
| QW-3 | Document DELETE convention in README API table (200 with body vs 204) | P1 | 10 min |

---

## 6. Medium-Term Improvements

| ID | Improvement | Priority | Effort |
|---|---|---|---|
| MT-1 | Add API route integration tests — still 0 coverage on all 11 handlers | P1 | 2-3 days |
| MT-2 | Add `.tsx` to vitest coverage include (`vitest.config.ts:11`) — currently only `.ts`, missing all component coverage | P2 | 5 min |
| MT-3 | Update hardcoded "78 tests" count in `CONTRIBUTING.md:33` and `README.md:7` badge — or use a dynamic badge | P2 | 10 min |
| MT-4 | Add skip-to-content link in `top-nav.tsx` for keyboard/screen-reader users | P2 | 15 min |
| MT-5 | Add active-route indication in `top-nav.tsx` nav links | P2 | 20 min |
| MT-6 | Unify version/run DELETE response convention (see P1-2 options) | P1 | 30 min |

---

## 7. Deferred Items Tracker

Items flagged in prior reviews that remain unfixed. Included for continuity — not re-audited.

| Item | First Flagged | Current Status |
|---|---|---|
| `splice(-1)` guard in `mechanics.ts:58` | UX_REVIEW_3 P1-8 | ❌ Unfixed — **4th review cycle** (re-raised as P1-1 above) |
| Confirm dialog danger focus | UX_REVIEW_2 P2-6 | ❌ Unfixed — **4th review cycle** (re-raised as P1-3 above) |
| API/component test coverage | UX_REVIEW LT-1 | ❌ 78 library-level tests only; 0 API or component tests |
| Breadcrumb navigation | UX_REVIEW §8.3 | ❌ Unfixed |
| Status message auto-dismiss | UX_REVIEW_2 P2-4 | ❌ Only Escape key dismissal |
| Mobile sidebar collapsible | UX_REVIEW_2 P2-3 | ❌ Unfixed |
| Web Worker for simulation | UX_REVIEW LT-4 | ❌ Unfixed |
| `DATABASE_PATH` env var | UX_REVIEW_3 P2-5 | ❌ Still hardcoded at `lib/db/schema.ts:18-19` |
| HSTS header in dev | UX_REVIEW_5 §7 | ⚠️ `Strict-Transport-Security` applied globally including localhost |

---

## 8. Overall Assessment

**Rating: Production-ready MVP — the first pass where no P0 issues were found.**

For the first time across six review cycles, there are **zero P0 findings**. The three P1 issues are:
1. A four-review-old `splice(-1)` guard that's a 5-minute fix — **P1**.
2. An API response convention inconsistency that works but creates documentation debt — **P1**.
3. A four-review-old confirm dialog focus issue that becomes more impactful as delete operations multiply — **P1**.

All three are fixable in under 30 minutes combined. The biggest remaining structural investment remains **test coverage**: 78 tests cover the simulation engine and utilities well, but there are still zero API route tests and zero component tests. ESLint reports 0 errors, TypeScript compiles clean, and the architecture is well-decomposed with clear module boundaries.

The project has resolved **25+ issues across six review cycles** and demonstrates consistent quality improvement. The remaining deferred items (breadcrumbs, mobile sidebar, Web Worker, auto-dismiss status messages) are all P2 UX polish — none are blockers.

---

*Audit conducted against codebase at current HEAD. All 78 tests pass, TypeScript compiles clean (`tsc --noEmit` exits 0), ESLint reports 0 errors. All file references are relative to the project root.*
