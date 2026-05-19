# PlaytestAI UX Coverage Report — Third Pass

## Summary

Fresh third-pass audit of the current `playtestai` app reviewed the runtime surface in `package.json`, the App Router routes under `app/**`, the workbench flows under `components/projects/workbench/**`, shared confirmation UX in `components/ui/confirm-dialog.tsx`, and operational recovery paths in `app/status/page.tsx` plus `app/projects/[projectId]/report/page.tsx`. This pass found **5 new actionable UX issues** beyond the first two audits: focus loss after confirmation dialogs, slower-than-necessary card/resource authoring, weak benchmark context in analytics/report surfaces, a misleading printable-report dead end when no runs existed, and non-actionable status diagnostics. **All 5 remediations were implemented in this pass.** Validation after implementation: `npm run lint` passed with **2 pre-existing warnings** in `lib/data-seeds.ts`; `npm run build` passed; `npm test` passed (**152 tests**).

## Phase 1 — Inventory

### Inventory setup
- Reviewed the top-level runtime/build surface in `package.json` (`dev`, `build`, `lint`, `test`, `validate`).
- Re-audited route entry points under `app/page.tsx`, `app/projects/**`, `app/status/page.tsx`, and `app/projects/[projectId]/report/page.tsx`.
- Re-audited the main workbench shell and every active tab under `components/projects/project-workbench.tsx` and `components/projects/workbench/**`.
- Reviewed cross-cutting interaction helpers in `components/projects/use-workbench-state.ts`, `components/projects/use-keyboard-shortcuts.ts`, and `components/ui/confirm-dialog.tsx`.
- Confirmed that the only seed-related user-visible gate remains `PLAYTESTAI_ENABLE_SEEDING` in `lib/db/seed.ts` surfaced through `app/status/page.tsx`.

### Feature list
1. **Landing page + global navigation** — `app/page.tsx`, `components/chrome/top-nav.tsx`
2. **Projects directory** — `app/projects/page.tsx`
3. **New-project flow** — `app/projects/new/page.tsx`, `components/projects/create-project-form.tsx`
4. **Workspace shell + shortcuts** — `components/projects/project-workbench.tsx`, `components/projects/use-workbench-state.ts`, `components/projects/use-keyboard-shortcuts.ts`
5. **Definition tab: project/version settings** — `components/projects/workbench/definition-tab.tsx`
6. **Definition tab: resource authoring** — `components/projects/workbench/resource-editor.tsx`
7. **Definition tab: card authoring** — `components/projects/workbench/card-editor.tsx`
8. **Definition tab: CSV import** — `components/projects/workbench/csv-import-panel.tsx`
9. **Shared confirmation flows** — `components/ui/confirm-dialog.tsx`, `components/projects/workbench/definition-tab.tsx`, `components/projects/workbench/version-sidebar.tsx`
10. **Simulation setup + progress** — `components/projects/workbench/simulation-tab.tsx`
11. **A/B comparison workflow** — `components/projects/workbench/compare-tab.tsx`, `components/projects/workbench/types.ts`
12. **Dashboard analytics + CSV export** — `components/projects/workbench/dashboard-tab.tsx`
13. **Report tab + printable route** — `components/projects/workbench/report-tab.tsx`, `app/projects/[projectId]/report/page.tsx`
14. **Version/run history sidebar** — `components/projects/workbench/version-sidebar.tsx`
15. **Status / health diagnostics** — `app/status/page.tsx`, `app/api/health/route.ts`
16. **Error and loading recovery** — `app/error.tsx`, `app/not-found.tsx`, `app/projects/error.tsx`, `app/projects/[projectId]/error.tsx`, `app/projects/loading.tsx`, `app/projects/[projectId]/loading.tsx`
17. **Seed bootstrap behavior** — `lib/db/seed.ts`, `README.md`

## Phase 2 — Coverage

| Surface | Pass-start coverage | Current state | Evidence / notes |
| --- | --- | --- | --- |
| Global navigation / landing | Covered | Covered | `app/page.tsx` and `components/chrome/top-nav.tsx` already retained the prior-pass wayfinding work; no new coverage gaps found here. |
| Projects directory | Covered | Covered | `app/projects/page.tsx` still provides strong empty-state recovery and first-project entry actions. |
| New-project flow | Covered | Covered | `app/projects/new/page.tsx` and `components/projects/create-project-form.tsx` retained the second-pass onboarding and recovery guidance. |
| Confirmation UX | Partial | Covered | `components/ui/confirm-dialog.tsx` was reusable but did not restore focus to the trigger after close; this pass now preserves keyboard position for delete/import/publish flows initiated from `components/projects/workbench/definition-tab.tsx` and `components/projects/workbench/version-sidebar.tsx`. |
| Resource and card authoring | Partial | Covered | `components/projects/workbench/resource-editor.tsx` and `components/projects/workbench/card-editor.tsx` already coached empty states, but adding a new row still left focus on the add button; this pass now lands focus in the new name field so editing can continue immediately. |
| Simulation setup | Covered | Covered | `components/projects/workbench/simulation-tab.tsx` still exposes presets, progress, cancellation, and validation feedback clearly. |
| A/B comparison | Covered | Covered | `components/projects/workbench/compare-tab.tsx` kept the stale-result protections from the second pass and did not expose a new trust gap in this audit. |
| Dashboard analytics | Partial | Covered | `components/projects/workbench/dashboard-tab.tsx` showed analytics but left the exact selected run/version/config mostly implicit; this pass adds a dedicated run-context band. |
| In-workbench report preview | Partial | Covered | `components/projects/workbench/report-tab.tsx` previously centered the recommendation without enough context for which saved benchmark it reflected; this pass adds explicit run/version/config metadata. |
| Printable report route | Partial | Covered | `app/projects/[projectId]/report/page.tsx` already handled invalid `runId` fallbacks, but still turned projects with zero runs into a dead-end 404; this pass replaces that with a guided empty state. |
| Status / diagnostics | Partial | Covered | `app/status/page.tsx` exposed the latest workspace and benchmark as plain text only; this pass makes both surfaces directly actionable with deep links. |
| Error/loading recovery | Covered | Covered | `app/error.tsx`, `app/not-found.tsx`, and the `app/projects/**` loading/error files remain intact and fit the current scope. |

## Phase 3 — UX Quality Severities

### 1. Confirmation dialogs dropped keyboard focus after closing — **Major**
- **Why it mattered:** Confirming or cancelling delete/import/publish flows returned keyboard users to an undefined focus position instead of the control they were operating.
- **Evidence:** `components/ui/confirm-dialog.tsx`, `components/projects/workbench/definition-tab.tsx`, `components/projects/workbench/version-sidebar.tsx`
- **Impact:** Keyboard-only users had to re-find their place after every destructive or guarded action.

### 2. Adding a resource or card interrupted authoring flow — **Major**
- **Why it mattered:** After pressing “Add resource” or “Add card,” focus stayed on the button while the new row appeared elsewhere on the page.
- **Evidence:** `components/projects/workbench/resource-editor.tsx`, `components/projects/workbench/card-editor.tsx`
- **Impact:** Repetitive rules authoring required extra tabbing/clicking exactly where designers expect rapid iteration.

### 3. Analytics and report surfaces under-explained the selected benchmark — **Major**
- **Why it mattered:** The dashboard, report tab, and workbench summary all depended on `selectedRun`, but they did not foreground the source version or simulation config strongly enough.
- **Evidence:** `components/projects/project-workbench.tsx`, `components/projects/workbench/dashboard-tab.tsx`, `components/projects/workbench/report-tab.tsx`
- **Impact:** Designers could review metrics or recommendations without immediately knowing which saved benchmark produced them.

### 4. Printable report routes behaved like missing pages when no runs existed — **Major**
- **Why it mattered:** Opening `/projects/[projectId]/report` for a real project with no saved runs produced a 404-style dead end instead of explaining the missing prerequisite.
- **Evidence:** `app/projects/[projectId]/report/page.tsx`
- **Impact:** Shared/bookmarked report URLs looked broken, even though the real next step was simply to run the first benchmark.

### 5. Status diagnostics surfaced dead-end latest-item summaries — **Moderate**
- **Why it mattered:** The status page identified the latest stored workspace and benchmark, but users still had to leave the page and manually navigate to inspect them.
- **Evidence:** `app/status/page.tsx`
- **Impact:** Recovery/debugging flows took more steps than necessary when users were already on the diagnostics surface.

## Phase 4 — Remediations

| Remediation | Severity | Effort | Target files | Status |
| --- | --- | --- | --- | --- |
| Restore focus to the triggering control when confirmation dialogs close | Major | S | `components/ui/confirm-dialog.tsx` | Implemented |
| Autofocus newly added resource/card rows so editing can continue immediately | Major | S | `components/projects/workbench/resource-editor.tsx`, `components/projects/workbench/card-editor.tsx` | Implemented |
| Make selected benchmark context explicit across workspace analytics/report surfaces | Major | M | `components/projects/project-workbench.tsx`, `components/projects/workbench/dashboard-tab.tsx`, `components/projects/workbench/report-tab.tsx` | Implemented |
| Replace printable-report 404s for zero-run projects with guided empty-state recovery | Major | S | `app/projects/[projectId]/report/page.tsx` | Implemented |
| Add direct workspace/report deep links to status diagnostics | Moderate | S | `app/status/page.tsx` | Implemented |

## Phase 5 — Stack Rank

### Quick Wins — Top 5

| Rank | Remediation | Severity | Effort | Why it ranked here |
| --- | --- | --- | --- | --- |
| 1 | Clarify selected benchmark context across analytics/report surfaces | Major | M | Protects decision quality in the dashboard/report flows where users interpret simulation outcomes. |
| 2 | Replace zero-run report 404s with a guided empty state | Major | S | Prevents a broken-feeling dead end in a shareable route and teaches the prerequisite immediately. |
| 3 | Restore focus after confirmation dialogs | Major | S | High accessibility payoff across delete/import/publish flows with a small implementation footprint. |
| 4 | Autofocus new resource/card rows | Major | S | Removes repeated friction in the heaviest data-entry workflow. |
| 5 | Add direct links from status diagnostics | Moderate | S | Makes the debugging/recovery surface operational instead of informational only. |

### Full stack rank

| Rank | Remediation | Severity | Effort | Evidence |
| --- | --- | --- | --- | --- |
| 1 | Clarify selected benchmark context across analytics/report surfaces | Major | M | `components/projects/project-workbench.tsx`, `components/projects/workbench/dashboard-tab.tsx`, `components/projects/workbench/report-tab.tsx` |
| 2 | Replace zero-run report 404s with a guided empty state | Major | S | `app/projects/[projectId]/report/page.tsx` |
| 3 | Restore focus after confirmation dialogs | Major | S | `components/ui/confirm-dialog.tsx`, `components/projects/workbench/version-sidebar.tsx`, `components/projects/workbench/definition-tab.tsx` |
| 4 | Autofocus new resource/card rows | Major | S | `components/projects/workbench/resource-editor.tsx`, `components/projects/workbench/card-editor.tsx` |
| 5 | Add direct links from status diagnostics | Moderate | S | `app/status/page.tsx` |

## Implementation Status

### Delivered in this pass
- **Dialog focus recovery:** `components/ui/confirm-dialog.tsx` now captures the triggering element before `showModal()` and restores focus after close so delete/import/publish flows do not strand keyboard users.
- **Definition authoring autofocus:** `components/projects/workbench/resource-editor.tsx` and `components/projects/workbench/card-editor.tsx` now focus/select the newly added name field so rules authors can type immediately after adding an entry.
- **Benchmark context clarity:** `components/projects/project-workbench.tsx`, `components/projects/workbench/dashboard-tab.tsx`, and `components/projects/workbench/report-tab.tsx` now label the active benchmark as selected context and expose version/date/config metadata inline.
- **Printable report empty-state recovery:** `app/projects/[projectId]/report/page.tsx` now renders a guided zero-run state with workspace/project links instead of treating valid projects as missing pages.
- **Status-page actionability:** `app/status/page.tsx` now deep-links the latest workspace and latest benchmark directly into the relevant project/report surface.

### Validation
- `npm run lint` ✅ (2 pre-existing warnings remain in `lib/data-seeds.ts`: unused `WinConditionType` and `sumStats`)
- `npm run build` ✅
- `npm test` ✅ (`152` tests passing)

### Remaining new actionable items
- **None identified in this third-pass scope after the fixes above.**
