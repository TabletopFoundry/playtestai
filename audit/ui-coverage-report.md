# PlaytestAI UX Coverage Report — Fourth Pass

## Summary

Fresh fourth-pass audit of the current `playtestai` experience reviewed the runtime surface in `package.json`, the App Router routes under `app/**`, the workspace shell in `components/projects/project-workbench.tsx`, every active workbench panel in `components/projects/workbench/**`, and the supporting persistence/reporting flows in `app/api/**` plus `components/projects/use-workbench-state.ts`. This pass found **5 new actionable UX issues** that still remained after the prior three passes: background keyboard shortcuts leaking through modal confirmations, a misleading Variant B snapshot shortcut in A/B comparison, version-selection drift between editing and analytics surfaces, hidden card notes after import/manual authoring, and ambiguous printable-report run switching. **All 5 remediations were implemented in this pass.** Validation after implementation: `npm run lint` passed with **2 pre-existing warnings** in `lib/data-seeds.ts`; `npm run build` passed; `npm test` passed (**152 tests**).

## Phase 1 — Inventory

### Audit scope
- Reviewed runtime/build/test entry points in `package.json`.
- Re-audited route entry points under `app/page.tsx`, `app/projects/**`, `app/status/page.tsx`, and `app/projects/[projectId]/report/page.tsx`.
- Re-audited the workbench shell and every primary tab under `components/projects/project-workbench.tsx` and `components/projects/workbench/**`.
- Re-reviewed state orchestration and shortcut plumbing in `components/projects/use-workbench-state.ts` and `components/projects/use-keyboard-shortcuts.ts`.
- Re-reviewed persistence and run/version creation flows in `app/api/projects/**`, `lib/db/projects.ts`, `lib/db/runs.ts`, and `lib/db/versions.ts`.

### Feature inventory
1. **Landing page + global navigation** — `app/page.tsx`, `components/chrome/top-nav.tsx`
2. **Projects directory** — `app/projects/page.tsx`
3. **New-project flow** — `app/projects/new/page.tsx`, `components/projects/create-project-form.tsx`
4. **Workspace shell + status framing** — `components/projects/project-workbench.tsx`
5. **Keyboard shortcuts** — `components/projects/use-keyboard-shortcuts.ts`
6. **Workbench state synchronization** — `components/projects/use-workbench-state.ts`
7. **Rule definition + validation** — `components/projects/workbench/definition-tab.tsx`
8. **Resource authoring** — `components/projects/workbench/resource-editor.tsx`
9. **Card authoring + CSV import** — `components/projects/workbench/card-editor.tsx`, `components/projects/workbench/csv-import-panel.tsx`, `components/projects/workbench/types.ts`
10. **Simulation setup + progress** — `components/projects/workbench/simulation-tab.tsx`
11. **A/B comparison workflow** — `components/projects/workbench/compare-tab.tsx`
12. **Dashboard analytics** — `components/projects/workbench/dashboard-tab.tsx`
13. **In-workbench report preview** — `components/projects/workbench/report-tab.tsx`
14. **Printable report route** — `app/projects/[projectId]/report/page.tsx`
15. **Version/run history sidebar** — `components/projects/workbench/version-sidebar.tsx`
16. **Status / diagnostics** — `app/status/page.tsx`, `app/api/health/route.ts`
17. **Persistence + API flows** — `app/api/projects/**`, `lib/db/projects.ts`, `lib/db/runs.ts`, `lib/db/versions.ts`

## Phase 2 — Coverage

| Surface | Pass-start coverage | Current state | Evidence / notes |
| --- | --- | --- | --- |
| Global navigation / landing | Covered | Covered | `app/page.tsx` and `components/chrome/top-nav.tsx` retained prior-pass wayfinding and did not introduce new blockers in this audit. |
| Projects directory | Covered | Covered | `app/projects/page.tsx` still provides strong empty-state recovery and project-level summaries. |
| New-project flow | Covered | Covered | `app/projects/new/page.tsx` and `components/projects/create-project-form.tsx` remained clear and recoverable in this pass. |
| Confirmation UX | Partial | Covered | `components/projects/use-keyboard-shortcuts.ts` still let global shortcuts fire while dialogs from `components/ui/confirm-dialog.tsx`, `components/projects/workbench/definition-tab.tsx`, and `components/projects/workbench/version-sidebar.tsx` were open; this pass now suspends those shortcuts while a modal is active. |
| Version selection + analytics alignment | Partial | Covered | `components/projects/use-workbench-state.ts`, `components/projects/project-workbench.tsx`, `components/projects/workbench/dashboard-tab.tsx`, and `components/projects/workbench/report-tab.tsx` now keep analytics/report empty states aligned with the currently selected version instead of drifting to unrelated runs. |
| A/B comparison setup | Partial | Covered | `components/projects/workbench/compare-tab.tsx` previously created a snapshot without wiring the comparison controls to the new Variant B; this pass now preselects the fresh snapshot. |
| Card authoring / annotations | Partial | Covered | `components/projects/workbench/card-editor.tsx` now exposes card notes, and `components/projects/workbench/csv-import-panel.tsx` now documents that notes import cleanly from CSV. |
| Dashboard analytics | Covered | Covered | `components/projects/workbench/dashboard-tab.tsx` retained the benchmark-context work from the prior pass and now adds version-specific empty-state guidance. |
| In-workbench report preview | Covered | Covered | `components/projects/workbench/report-tab.tsx` retains explicit benchmark context and now explains when the active version has no saved report yet. |
| Printable report route | Partial | Covered | `app/projects/[projectId]/report/page.tsx` already handled zero-run recovery, and this pass now makes repeated runs distinguishable in the run switcher with version/date/seed metadata. |
| Status diagnostics | Covered | Covered | `app/status/page.tsx` retained the prior-pass deep-link improvements; no new diagnostics gaps were found here. |
| Error/loading recovery | Covered | Covered | `app/error.tsx`, `app/not-found.tsx`, and `app/projects/**/loading.tsx` continue to provide adequate recovery for this scope. |

## Phase 3 — UX Quality Severities

### 1. Global workbench shortcuts stayed active behind modal confirmations — **Major**
- **Why it mattered:** Number-key tab switches and save/run shortcuts could still fire while a destructive confirmation dialog was open.
- **Evidence:** `components/projects/use-keyboard-shortcuts.ts`, `components/ui/confirm-dialog.tsx`, `components/projects/workbench/definition-tab.tsx`, `components/projects/workbench/version-sidebar.tsx`
- **Impact:** Keyboard users could change tabs, save, or launch simulations while they were supposed to be focused on confirming a delete/import/publish action.

### 2. “Duplicate current version as Variant B” did not actually wire the comparison controls to the new snapshot — **Major**
- **Why it mattered:** The shortcut created a snapshot through `handleCreateSnapshot`, but the Version B selector in the compare panel still pointed at the old selection.
- **Evidence:** `components/projects/workbench/compare-tab.tsx`, `components/projects/use-workbench-state.ts`
- **Impact:** The primary compare CTA felt unreliable because the user still had to manually re-select the newly created branch before comparing variants.

### 3. Version selection and benchmark selection could drift apart — **Major**
- **Why it mattered:** Changing the selected version in the workspace did not re-align the active benchmark, so dashboard/report surfaces could keep showing a run from another branch.
- **Evidence:** `components/projects/use-workbench-state.ts`, `components/projects/project-workbench.tsx`, `components/projects/workbench/dashboard-tab.tsx`, `components/projects/workbench/report-tab.tsx`
- **Impact:** Designers could believe they were reviewing analytics for the version they were editing when they were actually reading data from a different branch.

### 4. Card notes were supported in data models/imports but hidden in manual authoring — **Moderate**
- **Why it mattered:** The domain model and CSV parser already supported `notes`, but the card editor did not render them anywhere.
- **Evidence:** `lib/types.ts`, `components/projects/workbench/types.ts`, `components/projects/workbench/card-editor.tsx`, `components/projects/workbench/csv-import-panel.tsx`
- **Impact:** Designers lost visibility into imported annotations such as intended combos, caveats, or playtest reminders.

### 5. Printable-report run switching was ambiguous for repeated reruns — **Moderate**
- **Why it mattered:** Saved run labels are generated from version label + game count, so repeated reruns can share the same display label.
- **Evidence:** `app/projects/[projectId]/report/page.tsx`, `app/api/projects/[projectId]/runs/route.ts`
- **Impact:** Shared report routes made it hard to tell which rerun was currently selected without leaving the report surface.

## Phase 4 — Remediations

| Remediation | Severity | Effort | Target files | Status |
| --- | --- | --- | --- | --- |
| Suspend global workbench shortcuts while a modal confirmation dialog is open | Major | S | `components/projects/use-keyboard-shortcuts.ts` | Implemented |
| Make the Variant B snapshot shortcut preselect the newly created snapshot in the compare flow | Major | S | `components/projects/workbench/compare-tab.tsx`, `components/projects/use-workbench-state.ts`, `components/projects/workbench/types.ts` | Implemented |
| Align benchmark/report surfaces with the currently selected version and add version-specific empty states | Major | M | `components/projects/use-workbench-state.ts`, `components/projects/project-workbench.tsx`, `components/projects/workbench/dashboard-tab.tsx`, `components/projects/workbench/report-tab.tsx` | Implemented |
| Expose card notes in manual authoring and document note import support in CSV guidance | Moderate | S | `components/projects/workbench/card-editor.tsx`, `components/projects/workbench/csv-import-panel.tsx` | Implemented |
| Disambiguate printable-report run switching with version/date/seed metadata | Moderate | S | `app/projects/[projectId]/report/page.tsx` | Implemented |

## Phase 5 — Stack Rank

### Quick Wins — Top 5

| Rank | Remediation | Severity | Effort | Why it ranked here |
| --- | --- | --- | --- | --- |
| 1 | Align benchmark/report surfaces with the selected version | Major | M | Protects decision quality by making analytics follow the branch the designer is actively editing. |
| 2 | Make the Variant B snapshot shortcut preselect the new snapshot | Major | S | Fixes the highest-friction compare CTA with a small but high-trust implementation. |
| 3 | Suspend shortcuts while modal confirmations are open | Major | S | Prevents dangerous background actions during delete/import/publish confirmations. |
| 4 | Disambiguate printable-report run switching | Moderate | S | Keeps shared report review trustworthy when a team reruns the same benchmark repeatedly. |
| 5 | Expose card notes in authoring/import flows | Moderate | S | Restores designer annotations that were already present in data but invisible in the UI. |

### Full stack rank

| Rank | Remediation | Severity | Effort | Evidence |
| --- | --- | --- | --- | --- |
| 1 | Align benchmark/report surfaces with the selected version | Major | M | `components/projects/use-workbench-state.ts`, `components/projects/project-workbench.tsx`, `components/projects/workbench/dashboard-tab.tsx`, `components/projects/workbench/report-tab.tsx` |
| 2 | Make the Variant B snapshot shortcut preselect the new snapshot | Major | S | `components/projects/workbench/compare-tab.tsx`, `components/projects/use-workbench-state.ts` |
| 3 | Suspend shortcuts while modal confirmations are open | Major | S | `components/projects/use-keyboard-shortcuts.ts`, `components/ui/confirm-dialog.tsx` |
| 4 | Disambiguate printable-report run switching | Moderate | S | `app/projects/[projectId]/report/page.tsx`, `app/api/projects/[projectId]/runs/route.ts` |
| 5 | Expose card notes in authoring/import flows | Moderate | S | `components/projects/workbench/card-editor.tsx`, `components/projects/workbench/csv-import-panel.tsx`, `components/projects/workbench/types.ts` |

## Implementation Status

### Delivered in this pass
- **Modal-safe shortcuts:** `components/projects/use-keyboard-shortcuts.ts` now ignores global workbench shortcuts whenever a confirmation dialog is open.
- **Variant B snapshot wiring:** `components/projects/workbench/compare-tab.tsx`, `components/projects/use-workbench-state.ts`, and `components/projects/workbench/types.ts` now return the created snapshot and immediately bind it into the compare selectors.
- **Version/run alignment:** `components/projects/use-workbench-state.ts`, `components/projects/project-workbench.tsx`, `components/projects/workbench/dashboard-tab.tsx`, and `components/projects/workbench/report-tab.tsx` now keep benchmark/report UX aligned with the selected version and explain version-specific empty states.
- **Card-note visibility:** `components/projects/workbench/card-editor.tsx` now renders editable notes for every card, and `components/projects/workbench/csv-import-panel.tsx` now documents imported note support.
- **Report-switcher clarity:** `app/projects/[projectId]/report/page.tsx` now shows version, capture date, game count, and seed for every saved run in the printable-report switcher.

### Validation
- `npm run lint` ✅ (2 pre-existing warnings remain in `lib/data-seeds.ts`: unused `WinConditionType` and `sumStats`)
- `npm run build` ✅
- `npm test` ✅ (`152` tests passing)

### Remaining new actionable items
- **None identified in this fourth-pass scope after the fixes above.**
