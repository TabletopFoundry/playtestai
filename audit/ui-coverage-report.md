# PlaytestAI UX Coverage Report — Second Pass

## Summary

Fresh second-pass audit of the current `playtestai` app reviewed `package.json`, the App Router surface under `app/**`, UI components under `components/**`, and the seeding flag in `lib/db/seed.ts` after a filtered file inventory (`find . -type f` with standard junk ignored). The only UI-affecting feature flag found remains `PLAYTESTAI_ENABLE_SEEDING` in `lib/db/seed.ts`; no additional UI gates were detected. This pass found **5 new actionable UX issues** beyond the previous audit: missing header wayfinding, weak first-project onboarding, empty modeling states with little guidance, stale A/B comparison results after control changes, and silent report fallback when a `runId` is missing. **All 5 remediations were implemented in this pass.** Validation after implementation: `npm run lint` passed with **2 pre-existing warnings** in `lib/data-seeds.ts`; `npm run build` passed; `npm test` passed (**152 tests**).

## Phase 1 — Feature Inventory

### Inventory setup
- File inventory reviewed with filtered `find . -type f`; ignored standard junk like `.git`, `node_modules`, `.next`, and build artifacts.
- Runtime/build surface confirmed from `package.json` scripts: `dev`, `build`, `start`, `lint`, `typecheck`, `test`, `test:coverage`, `validate`.
- Router surface reviewed under `app/**`; key UI modules reviewed under `components/chrome`, `components/projects`, and `components/ui`.
- Feature flags reviewed via environment lookups; only `PLAYTESTAI_ENABLE_SEEDING` in `lib/db/seed.ts` affects user-visible bootstrapping.

### Feature list
1. **Landing + primary entry CTA** — `app/page.tsx`, `components/chrome/top-nav.tsx`
2. **Global header / primary navigation** — `components/chrome/top-nav.tsx`
3. **Projects directory** — `app/projects/page.tsx`
4. **System status / health surface** — `app/status/page.tsx`, `app/api/health/route.ts`
5. **New project setup flow** — `app/projects/new/page.tsx`, `components/projects/create-project-form.tsx`
6. **Project workspace shell** — `app/projects/[projectId]/page.tsx`, `components/projects/project-workbench.tsx`
7. **Definition tab: project metadata + version settings** — `components/projects/workbench/definition-tab.tsx`
8. **Definition tab: resource modeling** — `components/projects/workbench/resource-editor.tsx`
9. **Definition tab: card modeling** — `components/projects/workbench/card-editor.tsx`
10. **Definition tab: CSV import** — `components/projects/workbench/csv-import-panel.tsx`
11. **Simulation setup + progress** — `components/projects/workbench/simulation-tab.tsx`
12. **A/B comparison workflow** — `components/projects/workbench/compare-tab.tsx`, `components/projects/workbench/types.ts`
13. **Dashboard analytics + CSV export** — `components/projects/workbench/dashboard-tab.tsx`
14. **Report tab / printable report route** — `components/projects/workbench/report-tab.tsx`, `app/projects/[projectId]/report/page.tsx`
15. **Version/run history sidebar** — `components/projects/workbench/version-sidebar.tsx`
16. **Error / loading states** — `app/error.tsx`, `app/not-found.tsx`, `app/projects/error.tsx`, `app/projects/[projectId]/error.tsx`, `app/projects/loading.tsx`, `app/projects/[projectId]/loading.tsx`
17. **Keyboard shortcuts / workbench interactions** — `components/projects/use-keyboard-shortcuts.ts`, `components/projects/use-workbench-state.ts`
18. **Seeded demo bootstrap** — `lib/db/seed.ts`, `app/status/page.tsx`, `README.md`

## Phase 2 — UI Coverage

| Surface | Pass-start coverage | Current state | Evidence / notes |
| --- | --- | --- | --- |
| Global header navigation | Partial | Covered | `components/chrome/top-nav.tsx` originally lacked current-route styling/`aria-current` and stayed single-row on smaller screens; this pass added active states and responsive wrapping. |
| Landing page CTA flow | Covered | Covered | `app/page.tsx` still cleanly routes users into `/projects` and `/projects/new`. |
| Projects directory | Covered | Covered | `app/projects/page.tsx` already had the first-pass empty-state/status recovery improvements. |
| Status / health visibility | Covered | Covered | `app/status/page.tsx` continues to expose health, version, persistence, and seed-flag context backed by `app/api/health/route.ts`. |
| New project creation | Partial | Covered | `app/projects/new/page.tsx` previously dropped users straight into the form; this pass added onboarding steps, a back-link, and seed-status guidance. |
| Workspace readiness shell | Covered | Covered | `components/projects/project-workbench.tsx` already surfaces blockers, run readiness, and shortcuts from the first pass. |
| Resource modeling | Partial | Covered | `components/projects/workbench/resource-editor.tsx` previously rendered a blank section when no resources existed; this pass adds empty-state coaching and a clear first action. |
| Card modeling | Partial | Covered | `components/projects/workbench/card-editor.tsx` previously offered little guidance when the card list was empty and hid stat syntax expectations; this pass adds setup coaching and stat examples. |
| CSV import affordance | Partial | Covered | `components/projects/workbench/csv-import-panel.tsx` previously described headers only in prose; this pass adds a visible template row. |
| Simulation setup | Covered | Covered | `components/projects/workbench/simulation-tab.tsx` retains the first-pass cancel/preset improvements. |
| A/B comparison setup | Partial | Covered | `components/projects/workbench/compare-tab.tsx` allowed stale results to coexist with changed controls and could imply the selected versions matched the latest comparison; this pass adds swap controls, distinct variant selection, and stale-result messaging. |
| Analytics dashboard | Covered | Covered | `components/projects/workbench/dashboard-tab.tsx` remains comprehensive for post-run analytics and export. |
| Printable report route | Partial | Covered | `app/projects/[projectId]/report/page.tsx` previously fell back silently when `runId` was invalid and provided no direct run switcher; this pass adds a visible fallback warning and benchmark switch links. |
| Error/loading recovery | Covered | Covered | Error and loading files under `app/**` remain in place and unchanged in this pass. |
| Seed-flag visibility | Covered | Covered | `lib/db/seed.ts` + `app/status/page.tsx` continue to explain demo seeding; no new gaps found here. |

## Phase 3 — UX Quality Severities

### 1. Missing current-page feedback in the sticky header — **Major**
- **Why it mattered:** Users could move between `/projects`, `/status`, and `/projects/new` without any current-route signal, weakening orientation once more top-level pages were added.
- **Evidence:** `components/chrome/top-nav.tsx`
- **Impact:** Lower wayfinding confidence; more pronounced now that status and setup are first-class flows.

### 2. New-project screen had weak onboarding and no clear escape hatch — **Major**
- **Why it mattered:** `app/projects/new/page.tsx` rendered the form immediately, but gave no pre-submit explanation of what happens next or how to recover if the user expected demo data instead.
- **Evidence:** `app/projects/new/page.tsx`, `components/projects/create-project-form.tsx`, `app/status/page.tsx`
- **Impact:** First-time users had to infer post-create workflow and seeding behavior.

### 3. Empty modeling states were under-explained — **Major**
- **Why it mattered:** When resources/cards were empty, the editors mostly collapsed to blank space plus generic add buttons, and CSV expectations were easy to miss.
- **Evidence:** `components/projects/workbench/resource-editor.tsx`, `components/projects/workbench/card-editor.tsx`, `components/projects/workbench/csv-import-panel.tsx`
- **Impact:** Higher setup friction right when the user needs the most scaffolding.

### 4. A/B comparison results could go stale after control changes — **Critical**
- **Why it mattered:** Users could change selected variants or fairness controls after a comparison, but the result area still showed the last completed comparison with limited warning.
- **Evidence:** `components/projects/workbench/compare-tab.tsx`, `components/projects/workbench/types.ts`
- **Impact:** Trust risk: users could read an old recommendation while believing it reflected current controls.

### 5. Printable report links fell back silently on missing `runId` — **Major**
- **Why it mattered:** If a bookmarked/shared report referenced a deleted or invalid run, the route quietly showed the latest run instead, with no explanation and no direct way to switch context.
- **Evidence:** `app/projects/[projectId]/report/page.tsx`
- **Impact:** Report consumers could mistake fallback data for the requested benchmark.

## Phase 4 — Remediation Plan

| Remediation | Severity | Effort | Target files | Status |
| --- | --- | --- | --- | --- |
| Add active-state wayfinding and better header wrapping | Major | S | `components/chrome/top-nav.tsx` | Implemented |
| Add onboarding panel + recovery link on new-project page | Major | S | `app/projects/new/page.tsx` | Implemented |
| Add empty-state coaching and visible modeling templates | Major | S | `components/projects/workbench/resource-editor.tsx`, `components/projects/workbench/card-editor.tsx`, `components/projects/workbench/csv-import-panel.tsx` | Implemented |
| Prevent misleading stale A/B reads with clearer selection controls | Critical | M | `components/projects/workbench/compare-tab.tsx`, `components/projects/workbench/types.ts`, `components/projects/workbench/types.test.ts` | Implemented |
| Make printable report context explicit with run-switching and fallback messaging | Major | S | `app/projects/[projectId]/report/page.tsx` | Implemented |

## Phase 5 — Priority Stack Rank

### Quick Wins — Top 5

| Rank | Remediation | Severity | Effort | Why it ranked here |
| --- | --- | --- | --- | --- |
| 1 | Stale-result protection in A/B comparison | Critical | M | Protects decision quality in a core tuning workflow. |
| 2 | Report run-context + fallback warning | Major | S | Prevents misleading exported/report-view conclusions. |
| 3 | Empty-state modeling guidance | Major | S | Directly reduces first-edit friction in the most complex tab. |
| 4 | New-project onboarding improvements | Major | S | Helps first-time users understand what creation unlocks next. |
| 5 | Active-state header wayfinding | Major | S | Cheap clarity improvement across every top-level route. |

### Full stack rank

| Rank | Remediation | Severity | Effort | Evidence |
| --- | --- | --- | --- | --- |
| 1 | Stale-result protection in A/B comparison | Critical | M | `components/projects/workbench/compare-tab.tsx`, `components/projects/workbench/types.ts` |
| 2 | Report run-context + fallback warning | Major | S | `app/projects/[projectId]/report/page.tsx` |
| 3 | Empty-state modeling guidance | Major | S | `components/projects/workbench/resource-editor.tsx`, `components/projects/workbench/card-editor.tsx`, `components/projects/workbench/csv-import-panel.tsx` |
| 4 | New-project onboarding improvements | Major | S | `app/projects/new/page.tsx`, `components/projects/create-project-form.tsx` |
| 5 | Active-state header wayfinding | Major | S | `components/chrome/top-nav.tsx` |

## Implementation Status

### Delivered in this pass
- **Header wayfinding:** added active nav states, `aria-current`, and responsive wrapping in `components/chrome/top-nav.tsx`.
- **New-project onboarding:** added a setup guide, back-to-projects action, and seed-status recovery hint in `app/projects/new/page.tsx`.
- **Modeling empty states:** added first-resource / first-card empty-state coaching plus a visible CSV template in `components/projects/workbench/resource-editor.tsx`, `components/projects/workbench/card-editor.tsx`, and `components/projects/workbench/csv-import-panel.tsx`.
- **A/B comparison trust:** added swap controls, distinct version-B options, stale-result detection, and test coverage in `components/projects/workbench/compare-tab.tsx`, `components/projects/workbench/types.ts`, and `components/projects/workbench/types.test.ts`.
- **Printable report clarity:** added invalid-run fallback messaging and direct run switching in `app/projects/[projectId]/report/page.tsx`.

### Validation
- `npm run lint` ✅ (2 pre-existing warnings remain in `lib/data-seeds.ts`: unused `WinConditionType` and `sumStats`)
- `npm run build` ✅
- `npm test` ✅ (`152` tests passing)

### Remaining new actionable items
- **None identified in this second-pass scope after the fixes above.**
