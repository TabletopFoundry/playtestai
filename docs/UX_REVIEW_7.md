# PlaytestAI — Seventh-Pass UX & DX Audit

> Focused delta review after six prior passes ([UX_REVIEW.md](./UX_REVIEW.md) through [UX_REVIEW_6.md](./UX_REVIEW_6.md)) and three code reviews ([CODE_REVIEW.md](./CODE_REVIEW.md) through [CODE_REVIEW_3.md](./CODE_REVIEW_3.md)). This audit verifies previous fixes and **only flags genuinely new P0/P1 issues** not already documented.

---

## 1. Summary

Significant progress since Review 6. Two of the three P1 items from that review — the four-cycle-old `splice(-1)` guard and the four-cycle-old `ConfirmDialog` danger focus — are fully resolved, along with the `decomposeCardStats` duplication from CODE_REVIEW_3. The codebase now has 127 passing tests across 13 suites (up from 78/9 at Review 6), TypeScript compiles clean, and ESLint reports 0 errors. This seventh pass surfaces **three genuinely new P1 issues**: (1) `deleteVersion` performs its "at least one version must remain" invariant check outside the transaction, creating a structural TOCTOU gap; (2) `createSimulationRun` does not wrap its INSERT + UPDATE in a transaction, the same class of atomicity bug that was explicitly fixed for `deleteSimulationRun`; and (3) `next.config.ts` defines six security headers but omits `Content-Security-Policy`, leaving the app without script-injection mitigation for a UI that renders user-entered text.

---

## 2. Sixth-Review Fix Verification

| Sixth Review Item | Status | Evidence |
|---|---|---|
| **P1-1** `splice(-1)` guard in `mechanics.ts:58` | ✅ Fixed | `lib/simulation/mechanics.ts:58-61` — matches by `card.id`, guards `cardIndex !== -1` before splice |
| **P1-2** DELETE response convention inconsistency | ❌ Unfixed | `[projectId]/route.ts:42` returns `204`; version and run DELETEs still return `200` with body — convention unchanged |
| **P1-3** `ConfirmDialog` danger focus | ✅ Fixed | `components/ui/confirm-dialog.tsx:37-41` — danger variant focuses `cancelBtnRef`, default focuses `confirmBtnRef` |

**Also resolved from CODE_REVIEW_3:**

| CODE_REVIEW_3 Item | Status | Evidence |
|---|---|---|
| **P1-12** Duplicated stat decomposition block | ✅ Fixed | `lib/simulation/helpers.ts:32-46` — shared `decomposeCardStats` function; imported by both `agents.ts:15` and `mechanics.ts:64` |

**Score: 2 of 3 P1 from Review 6 fixed. 1 of 1 CODE_REVIEW_3 items checked fixed.**

---

## 3. New Findings

### P1 — Should fix before beta/launch

#### P1-1: `deleteVersion` invariant check is outside the transaction — structural TOCTOU

**File:** `lib/db/versions.ts:116-129`

```typescript
export function deleteVersion(projectId: string, versionId: string): boolean {
  const db = getDb();
  const versionCount = (db.prepare("SELECT COUNT(*) as count FROM versions WHERE project_id = ?")
    .get(projectId) as { count: number } | undefined)?.count ?? 0;

  if (versionCount <= 1) {
    return false;                    // ← guard is here
  }

  const transaction = db.transaction(() => {
    db.prepare("DELETE FROM versions WHERE id = ? AND project_id = ?").run(versionId, projectId);
    db.prepare("UPDATE projects SET updated_at = ? WHERE id = ?").run(new Date().toISOString(), projectId);
  });
  transaction();                     // ← but delete is here, not atomic with the check
  return true;
}
```

The `versionCount > 1` guard (line 118-121) runs **before** the transaction starts (line 124-128). If two concurrent requests each target a different version of the same project, both can read `versionCount = 2`, both pass the guard, and both delete — leaving the project with **zero versions**, violating the invariant the guard is supposed to protect.

**Mitigating factor:** `better-sqlite3` is synchronous and Node.js is single-threaded, so within a single process this race is not exploitable today. However: (a) the code is structurally wrong — the invariant check and the mutation it protects are not atomic; (b) if the app ever moves to a multi-worker deployment, a connection pool, or an async database driver, this becomes exploitable; and (c) the fix is trivial.

No prior review flagged this. The `deleteVersion` function was examined in UX_REVIEW_5 for cascade behavior (MT-1) but the TOCTOU was not identified.

**Fix — move the count check inside the transaction:**

```typescript
export function deleteVersion(projectId: string, versionId: string): boolean {
  const db = getDb();

  const transaction = db.transaction(() => {
    const versionCount = (db.prepare(
      "SELECT COUNT(*) as count FROM versions WHERE project_id = ?"
    ).get(projectId) as { count: number } | undefined)?.count ?? 0;

    if (versionCount <= 1) {
      return false;
    }

    db.prepare("DELETE FROM versions WHERE id = ? AND project_id = ?")
      .run(versionId, projectId);
    db.prepare("UPDATE projects SET updated_at = ? WHERE id = ?")
      .run(new Date().toISOString(), projectId);
    return true;
  });

  return transaction();
}
```

---

#### P1-2: `createSimulationRun` is not wrapped in a transaction — INSERT + UPDATE are non-atomic

**File:** `lib/db/runs.ts:31-34`

```typescript
db.prepare(
  "INSERT INTO simulation_runs (id, project_id, version_id, label, config_json, result_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
).run(run.id, run.projectId, run.versionId, run.label, JSON.stringify(run.config), JSON.stringify(run.result), run.createdAt);
db.prepare("UPDATE projects SET updated_at = ? WHERE id = ?").run(run.createdAt, projectId);
```

The INSERT (line 31-33) and UPDATE (line 34) are two independent statements. If the INSERT succeeds but the UPDATE throws (e.g., disk full, schema corruption), the simulation run is persisted but the project's `updated_at` is stale.

This is the **exact same class of bug** that UX_REVIEW_5 MT-5 flagged for `deleteSimulationRun` and was fixed by wrapping in `db.transaction()` (confirmed in `runs.ts:40-44`). The create counterpart was never flagged.

**Fix — wrap in a transaction to match the delete pattern:**

```typescript
export function createSimulationRun(projectId: string, versionId: string, label: string, config: SimulationConfig, result: SimulationBatchResult): void {
  const db = getDb();

  // Verify the version belongs to this project (referential integrity)
  const versionOwner = db.prepare(
    "SELECT project_id FROM versions WHERE id = ?"
  ).get(versionId) as { project_id: string } | undefined;

  if (!versionOwner || versionOwner.project_id !== projectId) {
    throw new Error("Version does not belong to this project.");
  }

  const run: SimulationRun = {
    id: randomUUID(),
    projectId,
    versionId,
    label,
    config,
    result,
    createdAt: new Date().toISOString(),
  };

  const transaction = db.transaction(() => {
    db.prepare(
      "INSERT INTO simulation_runs (id, project_id, version_id, label, config_json, result_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ).run(run.id, run.projectId, run.versionId, run.label, JSON.stringify(run.config), JSON.stringify(run.result), run.createdAt);
    db.prepare("UPDATE projects SET updated_at = ? WHERE id = ?").run(run.createdAt, projectId);
  });
  transaction();
}
```

---

#### P1-3: Missing `Content-Security-Policy` header — no script-injection mitigation

**File:** `next.config.ts:3-10`

```typescript
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];
```

Six security headers are present — but **no `Content-Security-Policy`** (CSP). The app renders user-entered text in project names, descriptions, version labels, card names, and card stat keys. While React's JSX escaping prevents most XSS, CSP is a critical defense-in-depth layer that would block exploitation if a rendering bypass were ever found.

No prior review flagged the missing CSP. UX_REVIEW_5 §7 noted the HSTS-on-localhost issue but CSP was never examined.

**Fix — add a baseline CSP:**

```typescript
{
  key: "Content-Security-Policy",
  value: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none';"
},
```

Note: Next.js uses inline scripts for hydration. Depending on the Next.js 16 configuration, you may need `'unsafe-inline'` or nonce-based CSP for `script-src`. Test after adding.

---

## 4. Previously Flagged — Verified as Fixed Since Earlier Reviews

| Item | First Flagged | Status |
|---|---|---|
| `splice(-1)` guard in `mechanics.ts` | UX_REVIEW_3 P1-8 | ✅ Fixed — 5th review cycle, now using `card.id` + guard |
| ConfirmDialog danger focus | UX_REVIEW_2 P2-6 | ✅ Fixed — 5th review cycle, danger variant focuses cancel button |
| `decomposeCardStats` duplication | CODE_REVIEW_3 P1-12 | ✅ Fixed — shared `helpers.ts` function |

---

## 5. Quick Wins (< 1 day each)

| ID | Fix | Priority | Effort |
|---|---|---|---|
| QW-1 | Wrap `createSimulationRun` INSERT + UPDATE in `db.transaction()` (`lib/db/runs.ts:31-34`) | P1 | 5 min |
| QW-2 | Move `deleteVersion` count check inside the transaction (`lib/db/versions.ts:116-129`) | P1 | 10 min |
| QW-3 | Add `Content-Security-Policy` header to `next.config.ts:3-10` | P1 | 15 min |
| QW-4 | Document DELETE convention in README API table — project returns 204, version/run return 200 with body (carried from Review 6 P1-2) | P1 | 10 min |

---

## 6. Medium-Term Improvements

| ID | Improvement | Priority | Effort |
|---|---|---|---|
| MT-1 | Add API route integration tests — still 0 coverage on all 11 handlers | P1 | 2-3 days |
| MT-2 | Add `.tsx` to vitest coverage include (`vitest.config.ts:11`) — currently only `.ts`, missing all component coverage | P2 | 5 min |
| MT-3 | Split `definition-tab.tsx` (518 lines) into sub-components (carried from CODE_REVIEW_3 P1-13) | P1 | 1-2 hours |
| MT-4 | Update hardcoded test count badges — README says "127 passing" but this will drift | P2 | 10 min |

---

## 7. Deferred Items Tracker

Items flagged in prior reviews that remain unfixed. Included for continuity — not re-audited.

| Item | First Flagged | Current Status |
|---|---|---|
| DELETE response convention (200 vs 204) | UX_REVIEW_6 P1-2 | ❌ Unfixed — version/run DELETEs return 200, project DELETE returns 204 |
| `definition-tab.tsx` 518 lines | CODE_REVIEW_3 P1-13 | ❌ Unfixed |
| API/component test coverage | UX_REVIEW LT-1 | ❌ 127 library-level tests only; 0 API or component tests |
| Breadcrumb navigation | UX_REVIEW §8.3 | ❌ Unfixed |
| Status message auto-dismiss | UX_REVIEW_2 P2-4 | ❌ Only Escape key dismissal |
| Mobile sidebar collapsible | UX_REVIEW_2 P2-3 | ❌ Unfixed |
| Web Worker for simulation | UX_REVIEW LT-4 | ❌ Unfixed |
| `DATABASE_PATH` env var | UX_REVIEW_3 P2-5 | ❌ Still hardcoded at `lib/db/schema.ts:18-19` |
| HSTS header in dev | UX_REVIEW_5 §7 | ⚠️ `Strict-Transport-Security` applied globally including localhost |

---

## 8. Overall Assessment

**Rating: Production-ready MVP — second consecutive pass with zero P0 issues.**

For the second consecutive review cycle, there are **zero P0 findings**. The three P1 issues are all database-layer atomicity and security hardening:

1. A structural TOCTOU in `deleteVersion` where the invariant check is outside the transaction — not exploitable today due to single-threaded SQLite, but structurally wrong — **P1**.
2. A missing transaction in `createSimulationRun` — the exact same bug class that was explicitly fixed for `deleteSimulationRun` — **P1**.
3. Missing `Content-Security-Policy` header — the only major security header gap in an otherwise well-hardened configuration — **P1**.

All three are fixable in under 30 minutes combined. The project resolved two long-standing issues that had been open for four consecutive review cycles (splice guard and confirm dialog focus), demonstrating commitment to addressing debt. Test count grew from 78 → 127 (+63%) with 13 suites passing. The biggest remaining structural investment remains **API route integration tests**: 127 tests cover the simulation engine, utilities, validation, and CSV thoroughly, but there are still zero API or component tests.

The codebase has resolved **30+ issues across seven review cycles** and consistently demonstrates quality improvement at each pass.

---

*Audit conducted against codebase at current HEAD. All 127 tests pass across 13 suites, TypeScript compiles clean (`tsc --noEmit` exits 0), ESLint reports 0 errors. All file references are relative to the project root.*
