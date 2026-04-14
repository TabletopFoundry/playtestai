# PlaytestAI — UX & Developer Experience Audit

> Reviewed as a senior engineer encountering the codebase for the first time, evaluating product UX, developer experience, PRD alignment, polish, and performance.

---

## 1. Summary

PlaytestAI is a surprisingly complete MVP for its scope. The landing page communicates the value proposition clearly, the workbench delivers a functional simulation → analytics → comparison loop, and the visual design is polished and consistent. However, the product has several UX gaps that would frustrate real users: the card editor lacks inline labels making it cryptic, there are no loading skeletons, the CSV import uses a textarea instead of a file upload, accessibility is weak (no focus rings, no ARIA labels, no keyboard shortcuts), and the 1060-line monolith workbench component will become a maintenance burden. The project is in a strong position to iterate, but needs attention to form usability, empty/error states, and the simulation feedback loop before it's ready for real designer validation.

---

## 2. Top Friction Points

### 2.1 Card editor fields have no visible labels — P0
**File:** `components/projects/project-workbench.tsx:714-733`

Each card is rendered as a row of unlabeled `<input>` elements. A user seeing `[name] [1] [1] [2] [damage:2, draw:1]` has no idea which number is cost, power, or quantity without inspecting source. The resource editor at line 696–703 has the same problem. Column headers or placeholder text should explain each field.

### 2.2 CSV import is a textarea paste, not a file upload — P1
**File:** `components/projects/project-workbench.tsx:750-777`

The PRD (FR-03) specifies file upload, column mapping, preview table, and append/replace choice. The implementation asks users to paste CSV text into a `<textarea>` and only supports "replace all cards." There is no preview, no column mapping, no append mode, and no row-level error display. A board game designer with 200 cards in a spreadsheet will not manually paste CSV text.

### 2.3 Single 1060-line monolith component — P1
**File:** `components/projects/project-workbench.tsx`

The entire workbench — dashboard, rule editor, simulation config, A/B comparison, report tab, sidebar — lives in one component with 20+ `useState` hooks. This makes the component hard to reason about, test in isolation, or extend. Each tab should be its own component.

### 2.4 No loading skeletons or transition states — P1
**Files:** `app/projects/page.tsx`, `components/projects/project-workbench.tsx`

Page-level data loads are synchronous server components (no loading.tsx files anywhere). The workbench uses `setStatusMessage` and `setErrorMessage` strings but has no skeleton placeholders for chart areas, no optimistic UI, and no transition feedback when switching tabs or versions. The PRD (§9 Cross-Cutting State Requirements) explicitly requires skeleton/structured loading placeholders.

### 2.5 No confirmation dialogs for destructive actions — P0
**File:** `components/projects/project-workbench.tsx:700, 730, 764`

Deleting a card (trash icon), deleting a resource, or replacing all cards via CSV are all instant with no confirmation. One mis-click on the trash icon destroys card data with no undo. There's also no project deletion, but the lack of undo for card/resource removal is immediately dangerous.

### 2.6 No delete project or delete version capability — P1
There's no way to delete a project, version, or simulation run anywhere in the UI or API. Users accumulate stale data with no cleanup path.

### 2.7 Accessibility violations — P1
**Files:** Multiple

- No visible focus indicators on inputs beyond the browser default (all inputs use `outline-none` at `project-workbench.tsx:628, 632, 645` etc.)
- Form inputs use `<label>` wrapping but the resource/card editors have no labels at all
- Charts from Recharts have no `aria-label` or `<title>` alternatives
- Tab navigation buttons lack `role="tab"`, `aria-selected`, or `tablist` semantics (`project-workbench.tsx:479-493`)
- Color contrast: `text-slate-500` on dark backgrounds may fail WCAG AA for small text
- The PRD requires WCAG 2.1 AA compliance for core workflows

---

## 3. Quick Wins (< 1 day each)

### QW-1: Add column headers to card and resource editors — P0
Add a header row above the card grid showing "Name | Cost | Power | Qty | Stats" and above the resource grid showing "Name | Start | Per turn". Alternatively, add `placeholder` text to each input. This is the single highest-impact UX fix for under 30 minutes of work.

### QW-2: Add `loading.tsx` files for route segments — P1
Create `app/projects/loading.tsx` and `app/projects/[projectId]/loading.tsx` with skeleton cards. Next.js will automatically show these during server-side data loading. ~15 minutes per file.

### QW-3: Add confirmation for destructive actions — P0
Wrap the card delete, resource delete, and CSV replace buttons with a `window.confirm()` call at minimum. Better: add a small inline "Are you sure?" confirmation pattern.

### QW-4: Add focus-visible styles to all inputs — P1
Replace `outline-none` with `outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50` across all form elements. Global find-and-replace in `project-workbench.tsx` and `create-project-form.tsx`.

### QW-5: Add aria attributes to tab bar — P1
Add `role="tablist"` to the tab container, `role="tab"` and `aria-selected` to each tab button, and `role="tabpanel"` to each content section in `project-workbench.tsx:478-498`.

### QW-6: Show empty state guidance on the dashboard for new projects — P1
The current empty state at line 614 says "No simulation history yet" with a button. Improve this with a step-by-step guide: "1. Define your cards → 2. Run a simulation → 3. Review analytics." This aligns with PRD §9 UX Principles ("optimize for first completed run").

### QW-7: Add `<title>` metadata per route — P2
Only the root layout sets a page title. Add specific titles like "Projects | PlaytestAI" and "[Project Name] | PlaytestAI" via `export const metadata` or `generateMetadata()` in each route.

### QW-8: Disable "Run A/B comparison" button with tooltip when < 2 versions — P1
The button is already `disabled` when `project.versions.length < 2` (`project-workbench.tsx:894`), but there's no explanation. Add a tooltip or inline text explaining the user needs to create a snapshot first.

---

## 4. Medium-Term Improvements (days to 1 sprint)

### MT-1: Split `ProjectWorkbench` into sub-components — P1
Extract each tab into its own component: `DashboardTab`, `DefinitionTab`, `SimulationTab`, `CompareTab`, `ReportTab`. Share state via a context provider or prop drilling. This immediately makes each feature testable and reviewable in isolation.

### MT-2: Implement real CSV file upload with preview — P1
Replace the textarea with a file `<input type="file" accept=".csv">`, add column mapping UI, add a preview table showing the first 5 rows, and add an append/replace toggle. The PRD calls this out explicitly in FR-03.

### MT-3: Add autosave for rule drafts — P1
The PRD (FR-02) requires autosave every ≤30 seconds. Currently, all saves are manual. Add a debounced auto-save (e.g., 5 seconds after last edit) with a "Saving..." / "Saved" indicator. Use the existing `handleSaveVersion(true)` silent save path.

### MT-4: Add undo/redo for the card editor — P2
Maintain a version history stack for `workingVersion` so users can undo card deletions, stat changes, and CSV imports. This eliminates the most common data-loss scenario.

### MT-5: Add delete project, delete version, delete run — P1
Add API routes (`DELETE /api/projects/[id]`, etc.) and corresponding UI with confirmation modals. Without this, the database grows indefinitely.

### MT-6: Add validation panel with severity levels — P1
The PRD (FR-04) requires blockers vs. warnings. Currently, `validateVersionPlayable()` in `engine.ts:305-326` returns a flat string array. Restructure as `{ severity: 'error' | 'warning', message: string, field?: string }[]` and display with color-coded icons and linked field navigation.

### MT-7: Add per-run CSV export — P1
The PRD (FR-12) requires CSV export for run data. Add a "Download CSV" button on the dashboard that serializes `cardRankings`, `winRatesByPosition`, and `strategyBreakdown` as downloadable CSV. This is straightforward client-side generation.

### MT-8: Add confidence labels to low-sample metrics — P2
The PRD (FR-09, §9) requires "low confidence" labels when sample sizes are insufficient. When `config.games < 500`, display a warning badge on all metric cards. When a card has fewer than 10 plays, flag its ranking as unreliable.

### MT-9: Add responsive breakpoints for mobile — P2
The workbench grid at `project-workbench.tsx:500` uses `xl:grid-cols-[minmax(0,1fr)_340px]`, which stacks on smaller screens. But the card editor grid at line 715 uses `xl:grid-cols-[1.4fr_repeat(3,minmax(0,110px))_1.6fr_auto]`, which will overflow on tablets. The PRD notes min viewport 1280px, but the landing page is responsive — the workbench should match.

---

## 5. Long-Term Investments

### LT-1: Add a test suite — P1
There are zero tests in the project. The simulation engine (`lib/simulation/engine.ts`) is the most critical piece of logic and has zero test coverage. Priority test targets:
- `simulateSingleGame` determinism with fixed seeds
- `validateVersionPlayable` edge cases
- `parseCsvCards` error handling
- API route validation logic
- Balance score calculation accuracy

### LT-2: Implement human playtest logging (FR-11) — P2
The PRD describes logging real playtest sessions with structured ratings for fun, pacing, and clarity, linked to ruleset versions. This is completely unimplemented. It's the bridge between AI simulation data and real-world validation — a core differentiator.

### LT-3: Add immutable version semantics (FR-05) — P1
The PRD requires immutable published versions. Currently, all versions are mutable — you can edit v1.0, run a simulation against it, then edit v1.0 again, invalidating the relationship between the run and its ruleset. Implement a `published` flag on versions; once published, edits create a new draft.

### LT-4: Move simulation to a Web Worker — P2
The simulation engine runs on the main thread (`simulateBatchAsync` yields to the event loop via `setTimeout(0)` at `engine.ts:656`). For 10,000 games, this blocks the UI for seconds between yields. Moving the engine to a Web Worker would keep the UI fully responsive during long runs.

### LT-5: Add real-time collaborative features — P3
The PRD envisions shared workspaces (FR-13). The current architecture is single-user with SQLite. Moving to a client-server model with proper auth, per-workspace isolation, and role-based access would require significant architectural changes but is needed for the publisher persona (Priya).

### LT-6: Add statistical significance to comparisons — P2
The A/B comparison at `project-workbench.tsx:423-435` uses a simple weighted score difference. The PRD (FR-10) calls for "statistically meaningful changes." Add confidence intervals, p-values, or at minimum sample-size-aware significance labels so designers don't over-interpret noise.

---

## 6. PRD Feature Completeness Scorecard

| PRD Requirement | Status | Notes |
|---|---|---|
| **FR-01** Workspace & Project Setup | ⚠️ Partial | Projects work, but no workspaces, auth, onboarding, or resume-later |
| **FR-02** Structured Game Definition | ✅ Implemented | Cards, resources, version settings all editable |
| **FR-03** CSV Import | ⚠️ Partial | Textarea paste only — no file upload, preview, column mapping, or append mode |
| **FR-04** Rules Validation | ⚠️ Partial | Basic checks exist but no severity levels, no dry-run, no field linking |
| **FR-05** Ruleset Versioning | ⚠️ Partial | Versions exist but are mutable, not immutable snapshots |
| **FR-06** Simulation Configuration | ✅ Implemented | Player count, agent types, seed, game count all configurable |
| **FR-07** Simulation Engine | ✅ Implemented | Random, Greedy, and Balanced agents; deterministic with seed |
| **FR-08** Run Monitoring | ⚠️ Partial | Progress bar exists but no cancel, no failure recovery, no ETA |
| **FR-09** Balance Analytics | ✅ Implemented | Win rates, distributions, card rankings, flagged issues all present |
| **FR-10** Variant Comparison | ✅ Implemented | A/B testing with side-by-side charts and recommendations |
| **FR-11** Human Playtest Logging | ❌ Not implemented | No UI or data model for manual playtest sessions |
| **FR-12** Reporting & Export | ⚠️ Partial | Printable report page exists; no CSV export, no real PDF generation |
| **FR-13** Workspace Roles & Permissions | ❌ Not implemented | No auth, no roles, no usage limits |

---

## 7. Comparison to Best Practices

| Area | Current State | Best Practice Gap |
|---|---|---|
| **Testing** | Zero tests | Modern projects expect unit tests for business logic and integration tests for API routes. The simulation engine especially needs determinism tests. |
| **Error boundaries** | None | No React error boundary wrapping the workbench. A runtime error in any tab crashes the entire page. Add `error.tsx` files per route segment. |
| **Form validation** | Minimal client-side | No server-side validation on the PUT version endpoint — the API accepts arbitrary JSON. Input sanitization and schema validation (e.g., Zod) should guard every endpoint. |
| **Type safety at boundaries** | `as` casts everywhere | API routes use `as Partial<CreateProjectInput>`, `as GameVersion`, etc. without runtime validation. Replace with Zod schemas to prevent malformed data from reaching the database. |
| **Linting/formatting** | ESLint only | No Prettier, no `lint-staged`, no pre-commit hooks. Code formatting is consistent due to single-author conventions but will drift with collaborators. |
| **Component architecture** | Monolith workbench | The 1060-line workbench with 20+ state hooks violates single-responsibility. Extract tabs, use composition, consider `useReducer` for complex state. |
| **Database** | SQLite in project dir | The `data/` directory contains the SQLite DB and is not gitignored (the `.sqlite` file is committed). This will cause merge conflicts and should be in `.gitignore`. |
| **Environment config** | Hardcoded paths | Database path is hardcoded in `lib/db.ts:10-11`. Should use an environment variable for flexibility across environments. |
| **Documentation** | README only | No CONTRIBUTING guide, no architecture doc, no API documentation. The README is good but doesn't explain the simulation model's scoring algorithm or balance calculation. |

---

## 8. Detailed Findings by Area

### 8.1 Onboarding & Setup
- **Good:** `npm install && npm run dev` just works. SQLite and seed data are auto-created. README is clear.
- **Gap:** No `.env.example` file (not needed yet, but will be). No documented prerequisites beyond Node.js. No mention of required Node version.
- **Gap:** The `.sqlite` file appears to be committed to git, which will cause issues for collaborators.

### 8.2 Visual Design Consistency
- **Good:** The design system is remarkably consistent — cyan-400 accent, white/10 borders, slate-950 backgrounds, rounded-3xl cards, tracking-[0.25em] uppercase labels. The aesthetic is cohesive and professional.
- **Good:** Print styles on the report page (`print:bg-white print:text-slate-950`) are thoughtful.
- **Gap:** No dark/light mode toggle (dark-only is fine for MVP but should be explicit in docs).
- **Gap:** The `<select>` elements render with browser-default dropdown styling that breaks the dark theme on some browsers.

### 8.3 Navigation & Information Architecture
- **Good:** Three-level hierarchy (Landing → Projects → Project Workbench) is intuitive.
- **Good:** Tab-based workbench with sidebar context is a strong pattern for this domain.
- **Gap:** No breadcrumb navigation inside the workbench. Users can't tell where they are relative to the project list.
- **Gap:** The report page (`/projects/[id]/report`) has no nav back to the project list — only "Back to workspace."
- **Gap:** No keyboard shortcuts for power users (Ctrl+S to save, Ctrl+Enter to run simulation).

### 8.4 API Design
- **Good:** RESTful route structure, consistent JSON response shapes, proper HTTP status codes.
- **Gap:** No input validation middleware — all endpoints cast `request.json()` to types without runtime checks.
- **Gap:** The `PUT /api/projects/[id]/versions/[versionId]` endpoint accepts an entire `GameVersion` object. It should validate that the version belongs to the project.
- **Gap:** No pagination on `getProjectsSummary()` — will degrade with many projects.
- **Gap:** Error responses lack error codes (only human-readable strings), making client-side error handling fragile.

### 8.5 Performance
- **Good:** `simulateBatchAsync` yields to the event loop every 20–50 games to avoid UI freezing.
- **Good:** Charts use `ResponsiveContainer` correctly.
- **Gap:** The `dirty` check at `project-workbench.tsx:184-189` does `JSON.stringify` comparison on every render. For large card sets, this is expensive. Use a revision counter or `useMemo` with structural comparison.
- **Gap:** `getProjectById` at `db.ts:175-197` fetches ALL versions and ALL runs for a project. For projects with many runs, this will slow down.
- **Gap:** `getProjectsSummary` at `db.ts:153-173` does N+1 queries (one per project for version count + runs). Should use JOINs or subqueries.

---

*Audit conducted against codebase at current HEAD. PRD reference: `docs/PRD.md`. All file references are relative to the project root.*
