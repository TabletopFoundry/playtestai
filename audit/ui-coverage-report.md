# PlaytestAI UI Coverage Report

## Summary

PlaytestAI currently exposes a strong end-to-end MVP for creating projects, modeling rules, running simulations, reviewing analytics, and exporting reports across the App Router pages `/`, `/projects`, `/projects/new`, `/projects/[projectId]`, and `/projects/[projectId]/report`, backed by API routes under `/api/projects/**` and `/api/health`. The main feature flag discovered during the audit is `PLAYTESTAI_ENABLE_SEEDING` in `lib/db/seed.ts`, which controls demo-data seeding in production. The largest UX gaps are not feature absence so much as **partial orchestration UX**: the project list has no true empty state, workbench readiness is buried inside tabs, locked-version behavior is underspecified, long-running simulations/comparisons cannot be canceled from the UI, and the existing health surface is hidden from operators. Baseline verification before implementation: `npm run build` passed; `npm run lint` failed because generated docs-site files under `website/.docusaurus/` are currently linted.

## Phase 1 — Feature Inventory

### Domain A — Navigation, entry points, and recovery
1. **Marketing landing page** — hero, capability cards, workflow explainer, pricing teaser, and calls to action. Route: `/`. Evidence: `app/page.tsx`, `components/chrome/top-nav.tsx`.
2. **Global navigation and skip-link flow** — persistent header, primary navigation, and skip-to-content affordance. Entry points: all top-nav pages. Evidence: `app/layout.tsx`, `components/chrome/top-nav.tsx`.
3. **Project directory** — project cards with versions, runs, balance score, seat-one edge, and latest recommendation. Route: `/projects`. Evidence: `app/projects/page.tsx`, `lib/db/projects.ts`.
4. **Project creation** — new-project form with name, description, player counts, and win-condition setup. Route: `/projects/new`. Evidence: `app/projects/new/page.tsx`, `components/projects/create-project-form.tsx`, `app/api/projects/route.ts`.
5. **Error and recovery surfaces** — 404, global error, project-list error, and project-detail error handling. Routes: `app/not-found.tsx`, `app/error.tsx`, `app/projects/error.tsx`, `app/projects/[projectId]/error.tsx`.

### Domain B — Project and version modeling
6. **Project workspace shell** — workspace summary metrics, tabbed navigation, status/error banners, and version/run sidebar. Route: `/projects/[projectId]`. Evidence: `app/projects/[projectId]/page.tsx`, `components/projects/project-workbench.tsx`.
7. **Project metadata editing** — editable project name/description with persistence. Components/API: `components/projects/workbench/definition-tab.tsx`, `app/api/projects/[projectId]/route.ts`.
8. **Version browsing and selection** — choose active version from sidebar and swap editing context. Component: `components/projects/workbench/version-sidebar.tsx`.
9. **Version publishing / locking** — publish a version, lock it, and preserve it as an immutable checkpoint. Component/API/DB: `components/projects/workbench/version-sidebar.tsx`, `app/api/projects/[projectId]/versions/[versionId]/route.ts`, `lib/db/versions.ts`.
10. **Version snapshotting / duplication** — branch a current ruleset into a new draft variant. Component/API/DB: `components/projects/workbench/definition-tab.tsx`, `components/projects/workbench/compare-tab.tsx`, `app/api/projects/[projectId]/versions/route.ts`, `lib/db/versions.ts`.
11. **Resource definition editor** — manage named resources, start values, and per-turn gain. Component: `components/projects/workbench/resource-editor.tsx`.
12. **Card definition editor** — manage card name, cost, power, quantity, and arbitrary numeric stats. Component: `components/projects/workbench/card-editor.tsx`.
13. **CSV card import** — upload a CSV, preview parsed rows, choose replace/append mode, and import cards. Component: `components/projects/workbench/csv-import-panel.tsx`.
14. **Validation and run-readiness** — schema-driven and simulation-readiness validation surfaced in definition/simulation views. Evidence: `components/projects/workbench/definition-tab.tsx`, `components/projects/workbench/simulation-tab.tsx`, `lib/validation.ts`, `lib/simulation/engine.ts`.
15. **Keyboard shortcuts** — save (`Cmd/Ctrl+S`), run simulation (`Cmd/Ctrl+Enter`), dismiss banners (`Escape`), and tab switching (`1-5`). Evidence: `components/projects/use-keyboard-shortcuts.ts`, `components/projects/project-workbench.tsx`.

### Domain C — Simulation, analysis, and export
16. **Simulation setup and execution** — configure game count, player count, seed, seat agents, run batch simulations, and persist results. Component/API: `components/projects/workbench/simulation-tab.tsx`, `app/api/projects/[projectId]/runs/route.ts`.
17. **Simulation history management** — select historical runs and delete saved runs. Component/API: `components/projects/workbench/version-sidebar.tsx`, `app/api/projects/[projectId]/runs/[runId]/route.ts`.
18. **Analytics dashboard** — win-rate, game-length, score-distribution, strategy, and card-power visualizations plus CSV export. Component: `components/projects/workbench/dashboard-tab.tsx`.
19. **A/B comparison workflow** — compare two versions with the same load and receive a recommendation. Component: `components/projects/workbench/compare-tab.tsx`.
20. **Printable balance report** — printable browser report page and report-tab launch action. Route/components: `app/projects/[projectId]/report/page.tsx`, `components/projects/workbench/report-tab.tsx`.

### Domain D — Bootstrap and operations
21. **Seeded demo dataset bootstrap** — automatically seed example projects when the database is empty, gated by `PLAYTESTAI_ENABLE_SEEDING` in production. Evidence: `lib/db/seed.ts`, `app/projects/page.tsx`.
22. **Health check endpoint** — JSON health payload with version and timestamp. Route: `/api/health`. Evidence: `app/api/health/route.ts`.
23. **Project deletion** — destructive project removal from the workspace sidebar. Component/API: `components/projects/workbench/version-sidebar.tsx`, `app/api/projects/[projectId]/route.ts`.

## Phase 2 — UI Coverage Mapping

| # | Feature | Domain | UI Status | Notes |
| --- | --- | --- | --- | --- |
| 1 | Marketing landing page | Navigation | [COVERED] | Strong top-of-funnel page at `app/page.tsx` with clear CTAs into `/projects` and `/projects/new`. |
| 2 | Global navigation and skip-link flow | Navigation | [COVERED] | `app/layout.tsx` provides a skip link; `components/chrome/top-nav.tsx` exposes primary entry points. |
| 3 | Project directory | Navigation | [PARTIAL] | `app/projects/page.tsx` renders cards well when projects exist, but offers no empty-state UX if seeding is off or data is cleared. |
| 4 | Project creation | Navigation | [COVERED] | `components/projects/create-project-form.tsx` validates required fields and posts to `POST /api/projects`. |
| 5 | Error and recovery surfaces | Navigation | [COVERED] | Dedicated global, collection, detail, and 404 recovery views exist under `app/**/error.tsx` and `app/not-found.tsx`. |
| 6 | Project workspace shell | Modeling | [PARTIAL] | `components/projects/project-workbench.tsx` provides tabs and banners, but overall readiness state is not visible unless users inspect individual tabs. |
| 7 | Project metadata editing | Modeling | [COVERED] | Definition tab saves project name and description through `PUT /api/projects/[projectId]`. |
| 8 | Version browsing and selection | Modeling | [COVERED] | Sidebar selection in `components/projects/workbench/version-sidebar.tsx` changes the active editing context. |
| 9 | Version publishing / locking | Modeling | [PARTIAL] | Locking exists, but the current “editing a published version creates a draft” rule is only lightly explained in `definition-tab.tsx` and the sidebar lock icon. |
| 10 | Version snapshotting / duplication | Modeling | [COVERED] | Snapshot actions exist in both Definition and Compare flows and call `POST /api/projects/[projectId]/versions`. |
| 11 | Resource definition editor | Modeling | [COVERED] | `components/projects/workbench/resource-editor.tsx` exposes add/edit/delete flows with labeled inputs. |
| 12 | Card definition editor | Modeling | [COVERED] | `components/projects/workbench/card-editor.tsx` covers row editing, add/delete, and custom stat parsing. |
| 13 | CSV card import | Modeling | [COVERED] | `components/projects/workbench/csv-import-panel.tsx` previews CSV input and supports replace/append import modes. |
| 14 | Validation and run-readiness | Modeling | [PARTIAL] | Validation exists in Definition and Simulation tabs, but the workspace shell does not summarize whether the current version is ready to simulate. |
| 15 | Keyboard shortcuts | Modeling | [HIDDEN] | Shortcut logic exists in `components/projects/use-keyboard-shortcuts.ts`, but there is no visible affordance teaching it. |
| 16 | Simulation setup and execution | Simulation | [PARTIAL] | `components/projects/workbench/simulation-tab.tsx` configures runs and shows progress, but offers no cancel control and does not clearly resync defaults after version changes. |
| 17 | Simulation history management | Simulation | [COVERED] | Historical runs are selectable/deletable from `components/projects/workbench/version-sidebar.tsx`. |
| 18 | Analytics dashboard | Simulation | [COVERED] | `components/projects/workbench/dashboard-tab.tsx` exposes charts, metrics, and CSV export. |
| 19 | A/B comparison workflow | Simulation | [PARTIAL] | `components/projects/workbench/compare-tab.tsx` compares versions, but hides key fairness controls (seed/seat-agent setup), hardcodes player-count limits, and offers no cancel control. |
| 20 | Printable balance report | Simulation | [COVERED] | Report tab and printable route give a strong final artifact at `/projects/[projectId]/report`. |
| 21 | Seeded demo dataset bootstrap | Operations | [HIDDEN] | Users implicitly benefit from demo data, but there is no status surface explaining whether seeding is enabled or why a workspace is empty. |
| 22 | Health check endpoint | Operations | [HIDDEN] | `/api/health` exists only as a raw JSON endpoint; there is no linked UI page for operators. |
| 23 | Project deletion | Operations | [COVERED] | Danger-zone delete flow is present in the workspace sidebar and calls `DELETE /api/projects/[projectId]`. |

## Phase 3 — UX Quality Assessment

**#3 — Project directory** `[MAJOR]`  
Criterion: Feedback / Edge cases  
Problem: `app/projects/page.tsx` assumes demo projects exist (“Seeded example projects are ready to explore”) and falls back to an empty grid when the database is empty, leaving users without a recovery path or explanation.  
Location: `app/projects/page.tsx` (`/projects`).

**#6 — Project workspace shell** `[MAJOR]`  
Criterion: Discoverability / Feedback  
Problem: `components/projects/project-workbench.tsx` only exposes generic status/error banners; users cannot tell at a glance which version is active, whether the draft is runnable, or where to go next without scanning the sidebar plus multiple tabs.  
Location: `components/projects/project-workbench.tsx`, `components/projects/workbench/definition-tab.tsx`, `components/projects/workbench/simulation-tab.tsx` (`/projects/[projectId]`).

**#9 — Version publishing / locking** `[MAJOR]`  
Criterion: Consistency / Feedback  
Problem: `components/projects/workbench/version-sidebar.tsx` relies on a small lock icon and `components/projects/workbench/definition-tab.tsx` uses a single callout, so the “published versions are immutable and edits create a new draft” rule is easy to miss before editing.  
Location: `components/projects/workbench/version-sidebar.tsx`, `components/projects/workbench/definition-tab.tsx`, `lib/db/versions.ts`.

**#14 — Validation and run-readiness** `[MAJOR]`  
Criterion: Discoverability / Accessibility  
Problem: Validation messages are only rendered inside the Definition and Simulation tabs, forcing keyboard and screen-reader users to hunt for run blockers instead of receiving a workspace-level readiness summary.  
Location: `components/projects/workbench/definition-tab.tsx`, `components/projects/workbench/simulation-tab.tsx`, `components/projects/project-workbench.tsx`.

**#15 — Keyboard shortcuts** `[MINOR]`  
Criterion: Discoverability / Consistency  
Problem: `components/projects/use-keyboard-shortcuts.ts` implements high-value shortcuts, but no page-level hint teaches them, so power-user behavior is effectively hidden.  
Location: `components/projects/use-keyboard-shortcuts.ts`, `components/projects/project-workbench.tsx`.

**#16 — Simulation setup and execution** `[CRITICAL]`  
Criterion: Feedback / Edge cases  
Problem: `components/projects/workbench/simulation-tab.tsx` shows progress but gives users no cancel affordance despite maintaining an `AbortController`; long 10k-game runs can monopolize the interface until completion. It also leaves config context opaque after switching versions.  
Location: `components/projects/workbench/simulation-tab.tsx` (`/projects/[projectId]`, Simulations tab).

**#19 — A/B comparison workflow** `[MAJOR]`  
Criterion: Feedback / Edge cases  
Problem: `components/projects/workbench/compare-tab.tsx` also owns an `AbortController` but exposes no cancel button, hardcodes player-count limits to 2-4, and does not reveal seed/seat-agent assumptions, which weakens trust in comparison fairness for wider-player games.  
Location: `components/projects/workbench/compare-tab.tsx` (`/projects/[projectId]`, A/B testing tab).

**#22 — Health check endpoint** `[MAJOR]`  
Criterion: Discoverability / Feedback  
Problem: `app/api/health/route.ts` is useful for operators but fully hidden in the UI, so users cannot quickly confirm build version, server time, or whether seeding-related emptiness is an app-state issue.  
Location: `app/api/health/route.ts`, `components/chrome/top-nav.tsx`.

## Phase 4 — Remediation Plan

**Remediation #1** `[S]`  
Add an explicit empty state and adaptive summary copy to `app/projects/page.tsx` (`/projects`) so the directory explains when no projects exist and offers a primary CTA plus an operational fallback.  
Target component/page/route: `app/projects/page.tsx` (`/projects`).  
UI pattern: Empty-state panel with primary action (“Create project”) and secondary route to status/ops context.

**Remediation #2** `[S]`  
Add a persistent workspace readiness band in `components/projects/project-workbench.tsx` that surfaces the active version label, validation counts, latest-run context, next-step links, and visible shortcut hints before users dive into tabs.  
Target component/page/route: `components/projects/project-workbench.tsx` (`/projects/[projectId]`).  
UI pattern: Summary status strip with badges, inline action chips, and helper text.

**Remediation #3** `[S]`  
Make version lifecycle state explicit in `components/projects/workbench/version-sidebar.tsx`, `components/projects/workbench/definition-tab.tsx`, and `components/projects/use-workbench-state.ts` by labeling Draft vs Published states and by using clearer save feedback when editing a locked version spawns a new draft.  
Target component/page/route: `components/projects/workbench/version-sidebar.tsx`, `components/projects/workbench/definition-tab.tsx`, `components/projects/use-workbench-state.ts`.  
UI pattern: State badges + explanatory inline callout + success message with resulting draft label.

**Remediation #4** `[S]`  
Upgrade `components/projects/workbench/simulation-tab.tsx` so users can cancel in-flight runs, see the effective simulation preset, and get version-synced defaults when the selected ruleset changes.  
Target component/page/route: `components/projects/workbench/simulation-tab.tsx` (Simulations tab).  
UI pattern: Busy-state secondary action (“Cancel”), preset summary card, and auto-synced setup form.

**Remediation #5** `[M]`  
Upgrade `components/projects/workbench/compare-tab.tsx` so A/B testing exposes seed and seat-agent controls, respects the overlapping player-count range of both versions, and lets users cancel in-flight comparisons.  
Target component/page/route: `components/projects/workbench/compare-tab.tsx` (A/B testing tab).  
UI pattern: Comparison setup form with shared-range guardrails, fairness metadata, and cancel action.

**Remediation #6** `[S]`  
Expose the hidden health surface by adding a first-party status page linked from the main navigation, reusing `app/api/health/route.ts` data and explaining demo-seeding state derived from `lib/db/seed.ts`.  
Target component/page/route: new status page route plus `components/chrome/top-nav.tsx`; raw endpoint remains `/api/health`.  
UI pattern: Lightweight operational status page with health cards, raw JSON link, and feature-flag summary.

## Phase 5 — Priority Stack Rank

### Quick Wins

| Rank | Remediation | Severity | Coverage gap | Effort | Target |
| --- | --- | --- | --- | --- | --- |
| 1 | Remediation #4 — Simulation cancel + synced preset UX | [CRITICAL] | [PARTIAL] | [S] | `components/projects/workbench/simulation-tab.tsx` |
| 2 | Remediation #2 — Workspace readiness band | [MAJOR] | [PARTIAL] | [S] | `components/projects/project-workbench.tsx` |
| 3 | Remediation #3 — Explicit Draft/Published lifecycle feedback | [MAJOR] | [PARTIAL] | [S] | `components/projects/workbench/version-sidebar.tsx`, `components/projects/workbench/definition-tab.tsx`, `components/projects/use-workbench-state.ts` |
| 4 | Remediation #1 — Project-list empty state | [MAJOR] | [PARTIAL] | [S] | `app/projects/page.tsx` |
| 5 | Remediation #6 — Visible status/health page | [MAJOR] | [HIDDEN] | [S] | `app/status/page.tsx`, `components/chrome/top-nav.tsx`, `/api/health` |

### Full Stack Rank

| Rank | Remediation | Impact × severity rationale | Coverage gap | Effort | Target |
| --- | --- | --- | --- | --- | --- |
| 1 | Remediation #4 — Simulation cancel + synced preset UX | Directly unblocks long-running primary-task failures in the core simulation workflow. | [PARTIAL] | [S] | `components/projects/workbench/simulation-tab.tsx` |
| 2 | Remediation #2 — Workspace readiness band | Reduces navigation thrash and makes blockers/action paths visible across the entire workspace. | [PARTIAL] | [S] | `components/projects/project-workbench.tsx` |
| 3 | Remediation #3 — Explicit Draft/Published lifecycle feedback | Prevents accidental misunderstandings around immutable versions and spawned drafts. | [PARTIAL] | [S] | `components/projects/workbench/version-sidebar.tsx`, `components/projects/workbench/definition-tab.tsx`, `components/projects/use-workbench-state.ts` |
| 4 | Remediation #5 — Fairer, cancellable A/B setup | Improves trust and control in the second-most important decision-making workflow after baseline simulation. | [PARTIAL] | [M] | `components/projects/workbench/compare-tab.tsx` |
| 5 | Remediation #1 — Project-list empty state | Removes a dead-end first-run experience when demo data is unavailable. | [PARTIAL] | [S] | `app/projects/page.tsx` |
| 6 | Remediation #6 — Visible status/health page | Converts hidden operational capability into a usable support/debugging surface. | [HIDDEN] | [S] | `app/status/page.tsx`, `components/chrome/top-nav.tsx`, `/api/health` |

## Phase B Appendix — Implemented vs Deferred

### Implemented

- **Remediation #1** — implemented in `app/projects/page.tsx` by replacing seeded-only copy with adaptive project-count messaging and by adding an empty-state panel with `/projects/new` and `/status` escape hatches.
- **Remediation #2** — implemented in `components/projects/project-workbench.tsx` with a persistent readiness band that surfaces the active version, blocker/warning counts, next-step actions, and visible shortcut hints.
- **Remediation #3** — implemented across `components/projects/workbench/version-sidebar.tsx`, `components/projects/workbench/definition-tab.tsx`, and `components/projects/use-workbench-state.ts` with explicit Draft/Published chips plus clearer “save creates a draft” feedback.
- **Remediation #4** — implemented in `components/projects/workbench/simulation-tab.tsx` by adding a cancel action, visible preset summary, version-aware clamping, and clearer run-state messaging.
- **Remediation #5** — implemented in `components/projects/workbench/compare-tab.tsx` by adding shared seed/seat-agent controls, overlapping-player-range guardrails, and a cancel action for in-flight comparisons.
- **Remediation #6** — implemented in `app/status/page.tsx` and `components/chrome/top-nav.tsx` by exposing a first-party status route that links to `/api/health`, explains `PLAYTESTAI_ENABLE_SEEDING`, and summarizes persisted project/run activity.
- **Test coverage** — added `components/projects/workbench/status-utils.ts` and `components/projects/workbench/status-utils.test.ts` to lock in the new readiness/version-state/shared-player-range helper behavior.
- **Verification support** — updated `eslint.config.mjs` and `vitest.config.ts` so repository verification ignores generated or third-party website artifacts (`website/.docusaurus/**`, `website/build/**`, and nested `node_modules/**`) instead of failing on vendored content outside the application UX scope.

### Deferred

- None.
