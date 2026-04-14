# PlaytestAI — Second-Pass UX & DX Audit

> Follow-up review after fixes from [UX_REVIEW.md](./UX_REVIEW.md) were implemented. This audit focuses on remaining gaps, regressions, accessibility, responsive edge cases, error handling, and visual polish.

---

## 1. Summary

The first review drove meaningful improvements: the monolith workbench was split into focused sub-components (7 files under `workbench/`), confirmation dialogs now guard destructive actions, column headers were added to card/resource editors, loading skeletons exist for both route segments, ARIA tab semantics are properly wired, CSV import now uses a real file upload with preview/append mode, autosave is in place, validation shows severity levels, published versions are immutable, and delete endpoints exist for projects/versions/runs. The project has gone from a rough MVP to a credible beta. However, this pass reveals a second layer of issues: hover-only action buttons are invisible to touch/keyboard users, `.sqlite` files remain committed to git, there are no `error.tsx` error boundaries anywhere, the create-project form still uses bare `outline-none` without `focus-visible:outline-none`, per-route `<title>` metadata is still missing, charts still lack data-table alternatives for screen readers, the Recharts tooltip is unthemed and clashes with the dark UI, and several responsive layout breakdowns remain at tablet widths. These are the polish and robustness issues that separate a functional beta from a production-grade tool.

---

## 2. Findings

### P0 — Must fix before any user-facing milestone

#### P0-1: Sidebar action buttons are hover-only — invisible on touch and keyboard

**Files:** `components/projects/workbench/version-sidebar.tsx:113, 182`

The publish, delete-version, and delete-run buttons use `hidden group-hover:flex` / `hidden group-hover:block`. These buttons are completely invisible and unreachable on:
- **Touch devices** (iPads, tablets) — no hover event exists
- **Keyboard-only navigation** — Tab can focus the buttons but the user has no visual cue they exist

This means a touch user literally **cannot** delete a version or publish it. The first review flagged accessibility broadly (2.7) but this specific pattern was introduced in the refactor and is a P0 regression.

**Fix:** Replace hover-reveal with always-visible icon buttons (lower opacity until hovered), or use `group-hover:flex group-focus-within:flex` so keyboard focus also reveals them. For touch, consider a context menu or swipe-to-reveal pattern.

#### P0-2: SQLite database files are committed to git

**Files:** `.gitignore`, `data/playtestai.sqlite`, `data/playtestai.sqlite-shm`, `data/playtestai.sqlite-wal`

The `.gitignore` excludes `data/*.db` and `*.db` but the actual files are `.sqlite`, `.sqlite-shm`, and `.sqlite-wal` — none of which match. All three are tracked by git:
```
$ git ls-files data/
data/playtestai.sqlite
data/playtestai.sqlite-shm
data/playtestai.sqlite-wal
```

This will cause merge conflicts for any collaborator and leaks local test data into the repository. The first review noted this (8.1) but the gitignore fix was incorrect — it added `*.db` patterns instead of `*.sqlite*`.

**Fix:** Add `data/*.sqlite*` to `.gitignore`, then `git rm --cached data/playtestai.sqlite*` to untrack.

#### P0-3: No error boundaries anywhere in the app

**Files:** `app/` (no `error.tsx` files found)

There is not a single `error.tsx` error boundary in the entire route tree. A runtime error in any component — Recharts receiving unexpected data, a JSON parse failure, a missing field in simulation results — will crash the full page to a white screen with no recovery. The first review called this out in §7 ("Error boundaries: None") but it was not addressed.

**Fix:** Add `app/error.tsx` (global), `app/projects/error.tsx`, and `app/projects/[projectId]/error.tsx` with a styled retry UI.

---

### P1 — Should fix before beta/launch

#### P1-1: Create-project form uses bare `outline-none` without `focus-visible:outline-none`

**File:** `components/projects/create-project-form.tsx:69, 79, 91, 102, 110`

All five form inputs use the class pattern `outline-none transition focus:border-cyan-400/40 focus-visible:ring-2`. The bare `outline-none` removes the browser's default focus outline for **all** focus methods (including Tab navigation). While `focus-visible:ring-2` adds a ring for keyboard focus, the `outline-none` removes the native outline before the ring can replace it. The workbench tabs correctly use `focus-visible:outline-none` (which only removes the outline for non-keyboard focus), but the create-project form was not updated.

This is inconsistent with the workbench inputs which were fixed in the first pass — the create-project form was missed.

**Fix:** Replace `outline-none` with `focus-visible:outline-none` on all inputs in `create-project-form.tsx`.

#### P1-2: Per-route `<title>` metadata is still missing

**Files:** `app/projects/page.tsx`, `app/projects/[projectId]/page.tsx`, `app/projects/new/page.tsx`, `app/projects/[projectId]/report/page.tsx`

The first review flagged this as QW-7. Only `app/layout.tsx` sets `metadata.title = "PlaytestAI"`. Every route shows the same browser tab title. Users with multiple project tabs open cannot distinguish them.

**Fix:** Add `export const metadata` or `generateMetadata()` to each route. Examples:
- `/projects` → `"Projects | PlaytestAI"`
- `/projects/[id]` → `"${project.name} | PlaytestAI"` (via `generateMetadata`)
- `/projects/new` → `"New Project | PlaytestAI"`
- `/projects/[id]/report` → `"Report — ${project.name} | PlaytestAI"`

#### P1-3: Recharts tooltip renders with default white/light styling

**Files:** `components/projects/workbench/dashboard-tab.tsx:130, 144, 159, 174`, `compare-tab.tsx:190`

The `<Tooltip />` component across all five chart instances uses Recharts' default light-mode tooltip style (white background, dark text, light border). Against the dark slate-950 UI, this creates a jarring visual flash — the tooltip is the only light-colored element on screen.

**Fix:** Add custom `contentStyle`, `labelStyle`, and `itemStyle` props to all `<Tooltip />` instances:
```tsx
<Tooltip
  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem' }}
  labelStyle={{ color: '#94a3b8' }}
  itemStyle={{ color: '#e2e8f0' }}
/>
```

#### P1-4: Charts provide no data-table alternative for screen readers

**Files:** `components/projects/workbench/dashboard-tab.tsx:124-184`, `compare-tab.tsx:186-198`

The first review's charts now have `role="img"` and `aria-label` attributes (good). However, `role="img"` tells screen readers "this is an image" — the actual data values are inaccessible. A screen reader user cannot learn that Seat 1 wins 36% of games. WCAG 1.1.1 requires a text alternative for non-text content.

**Fix:** Add a visually-hidden (`sr-only`) `<table>` or `<dl>` inside each chart container that presents the same data as text. Or use Recharts' `<AccessibilityLabel />` if available.

#### P1-5: No keyboard shortcuts for power-user workflows

**Files:** Entire codebase (no keyboard shortcut handling found)

The first review noted this (§8.3) and it remains unaddressed. For a developer-tool-style product, the absence of keyboard shortcuts is a significant friction point. There is zero `onKeyDown` handling in the app outside of the confirm dialog's Escape handler.

Key missing shortcuts:
- `Ctrl+S` / `Cmd+S` → Save version (currently requires finding and clicking the Save button)
- `Ctrl+Enter` / `Cmd+Enter` → Run simulation
- `Escape` → Close status/error banners
- `1-5` number keys → Switch tabs (when not focused on an input)

#### P1-6: Tab panels render nothing when inactive — no animation or transition

**File:** `components/projects/project-workbench.tsx:244-272`

Tab panels use conditional rendering (`activeTab === "dashboard" ? <div>...</div> : null`). This means:
1. **State is lost** when switching tabs — e.g., if a user partially fills simulation config on the Simulate tab, switches to Dashboard, then returns, the Simulate tab re-mounts from scratch with default state (the `useState` for `simulationConfig` is inside `SimulationTab`)
2. **No exit/enter animation** — content pops in/out instantly

**Fix:** Either use CSS `hidden` to keep panels mounted but invisible, or lift transient form state to the parent. Consider `display: contents` + `hidden` pattern to preserve tab state across switches.

#### P1-7: Autosave fires on every dirty change, even during rapid typing

**File:** `components/projects/workbench/definition-tab.tsx:66-91`

The autosave effect depends on `[dirty, workingVersion, handleSaveVersion]`. Every keystroke in any card field triggers a new `workingVersion` state, which:
1. Creates a new `handleSaveVersion` closure (it depends on `workingVersion`)
2. Clears and resets the autosave timer
3. But `handleSaveVersion` is in the dependency array, so the effect re-runs on every render

While the 5-second debounce technically works, the effect cleanup/re-creation on every keystroke is wasteful. More critically, `handleSaveVersion` is a `useCallback` that depends on `workingVersion` — if `workingVersion` changes during save, the next autosave may fire with stale state or duplicate.

**Fix:** Use a ref for `handleSaveVersion` to avoid the dependency cycle, or use `useRef` for the timer and only debounce on `dirty` transitions.

#### P1-8: No breadcrumb navigation in the workbench

**Files:** `app/projects/[projectId]/page.tsx`, `components/projects/project-workbench.tsx`

The first review flagged this (§8.3). Users inside a project workbench have no indication of their location relative to the project list. The top nav has a "Projects" link, but there's no contextual breadcrumb like `Projects > Dragon's Gambit > Dashboard`. The report page's "Back to workspace" link is the only navigational aid.

#### P1-9: N+1 query pattern in `getProjectsSummary` persists

**File:** `lib/db.ts:154-173`

The first review flagged this (§8.5). The function still executes one `SELECT COUNT(*)` and one `SELECT * FROM simulation_runs` per project. With 20 projects and 10 runs each, that's 41 queries instead of 3. This was not addressed.

**Fix:** Use a single query with JOINs and GROUP BY:
```sql
SELECT p.*, COUNT(DISTINCT v.id) as version_count, COUNT(DISTINCT r.id) as run_count
FROM projects p
LEFT JOIN versions v ON v.project_id = p.id
LEFT JOIN simulation_runs r ON r.project_id = p.id
GROUP BY p.id ORDER BY p.updated_at DESC
```

#### P1-10: API endpoints still lack input validation

**Files:** `app/api/projects/[projectId]/versions/[versionId]/route.ts:9`, `app/api/projects/[projectId]/runs/route.ts:9-14`

The PUT version endpoint casts `request.json()` directly to `GameVersion` with no validation. A malicious or malformed request can inject arbitrary fields into the database. The runs POST endpoint checks for field presence but not field types or ranges.

The first review recommended Zod schemas (§7 "Type safety at boundaries"). Still unaddressed.

---

### P2 — Nice to have / polish

#### P2-1: `<select>` elements still render with browser-default dropdown styling

**Files:** `components/projects/workbench/definition-tab.tsx:255`, `simulation-tab.tsx:119`, `compare-tab.tsx:129, 137`, `dashboard-tab.tsx:194`

All `<select>` elements use custom border/background styling but the dropdown arrow and option list render in the browser's native light-mode style. On macOS, the dropdown background is white with dark text — visually inconsistent with the dark theme. The first review noted this (§8.2) and it remains.

**Fix:** Add `appearance-none` and a custom SVG chevron, or use a headless-UI `<Listbox>` component.

#### P2-2: Card editor grid overflows on tablet-width screens (768–1279px)

**File:** `components/projects/workbench/definition-tab.tsx:369`

The card editor uses `xl:grid-cols-[1.4fr_repeat(3,minmax(0,110px))_1.6fr_auto]`. Below `xl` (1280px), it falls back to a single-column stack. But between `md` (768px) and `xl`, each card row becomes a tall single-column card that requires significant scrolling. With 15+ cards, the page becomes extremely long.

**Fix:** Add an intermediate `lg` breakpoint layout — e.g., `lg:grid-cols-[1fr_1fr_1fr]` or a compact two-column layout for card name + a 3-column grid for numeric fields.

#### P2-3: Version sidebar stacks below content on mobile but has no collapse mechanism

**File:** `components/projects/project-workbench.tsx:241`

The sidebar uses `xl:grid-cols-[minmax(0,1fr)_340px]`. Below `xl`, the sidebar stacks below the main content — meaning mobile users must scroll past the entire dashboard/definition/simulation content to see their version list and simulation history. The sidebar is arguably the most important navigational element.

**Fix:** On small screens, show the sidebar as a collapsible drawer or move key sidebar info (current version, latest run) into a compact header above the tab content.

#### P2-4: Status and error messages auto-dismiss is missing

**Files:** `components/projects/project-workbench.tsx:237-238`

Status messages (`"Saved v1.0"`, `"Simulation complete"`) and error messages persist until the next action replaces them. Success messages should auto-dismiss after 4–5 seconds. Error messages should stay but include a dismiss button.

#### P2-5: MetricCard label text uses `text-slate-500` — potential WCAG contrast failure

**File:** `components/projects/workbench/shared.tsx:6`

The label in `MetricCard` uses `text-slate-500` (#64748b) on a `bg-slate-950/70` background. Against the near-black background, this gives approximately 4.1:1 contrast — borderline for WCAG AA for small text (4.5:1 required). Similar usage appears in the project list cards (`app/projects/page.tsx:43, 46, 50, 56`).

**Fix:** Upgrade to `text-slate-400` (#94a3b8) which provides ~5.5:1 contrast.

#### P2-6: Confirm dialog auto-focuses the destructive "Delete" button

**File:** `components/ui/confirm-dialog.tsx:36`

The confirm dialog focuses `confirmBtnRef` on open (line 36). For danger variant dialogs, this means the "Delete" button receives initial focus — an accidental Enter keypress immediately confirms deletion. Best practice is to focus the cancel button for destructive actions.

**Fix:** For `variant === "danger"`, focus the cancel button instead. Create a `cancelBtnRef` and conditionally focus based on variant.

#### P2-7: No `not-found.tsx` custom pages

**Files:** `app/` (none found)

Next.js provides `notFound()` calls in `app/projects/[projectId]/page.tsx:13` and `report/page.tsx:21, 28`, but there are no custom `not-found.tsx` files — users see the generic Next.js 404 page which breaks the visual design.

#### P2-8: Landing page stat cards show hardcoded mock data

**File:** `app/page.tsx:61-72, 81-109`

The "live simulation view" section shows hardcoded values (`72`, `61`, `48`, `39` for seat bars; `78` balance score; `Crystal Dragon` top card). This is marked as "seeded data" but could confuse users into thinking these are live metrics. There's no disclaimer beyond the tiny "seeded data" label.

#### P2-9: Report page has no print stylesheet for the top link area

**File:** `app/projects/[projectId]/report/page.tsx:42`

The "Back to workspace" link correctly uses `print:hidden`, but the overall page header's border and background styling (`border-white/10 bg-white/5`) prints as a very faint grey box. The `print:border-slate-200 print:bg-white` overrides exist for inner sections but the link area container doesn't fully override for print.

#### P2-10: CSV parser doesn't handle quoted fields with commas

**File:** `components/projects/workbench/types.ts:71-72`

The CSV parser splits on commas naively: `.split(",")`. A card named `"Dragon, Ancient"` would break into two columns. This is a known limitation but worth documenting or fixing with a proper CSV parser library.

---

## 3. First-Review Fix Verification

| First Review Item | Status | Notes |
|---|---|---|
| **2.1** Card editor labels (P0) | ✅ Fixed | Column headers added at `definition-tab.tsx:356-365`, mobile labels at `371, 375, 379, 383, 387` |
| **2.2** CSV textarea → file upload (P1) | ✅ Fixed | Real `<input type="file">` with preview table, append/replace mode at `definition-tab.tsx:425-511` |
| **2.3** Monolith component (P1) | ✅ Fixed | Split into 7 files under `workbench/` — `dashboard-tab`, `definition-tab`, `simulation-tab`, `compare-tab`, `report-tab`, `version-sidebar`, `shared` |
| **2.4** Loading skeletons (P1) | ✅ Fixed | `app/projects/loading.tsx` and `app/projects/[projectId]/loading.tsx` with `Skeleton` and `SkeletonCard` components |
| **2.5** Confirmation dialogs (P0) | ✅ Fixed | `ConfirmDialog` component with `<dialog>` element, ARIA attributes, used for card/resource delete and CSV import |
| **2.6** Delete capabilities (P1) | ✅ Fixed | DELETE endpoints for projects, versions, and runs; UI in `version-sidebar.tsx` with danger zone |
| **2.7** Accessibility — tabs (P1) | ✅ Fixed | `role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`, `role="tabpanel"` all correctly wired |
| **2.7** Accessibility — focus rings (P1) | ⚠️ Partial | Fixed in workbench components, **not fixed** in `create-project-form.tsx` (see P1-1) |
| **2.7** Accessibility — chart a11y (P1) | ⚠️ Partial | `role="img"` + `aria-label` added, but no data-table alternative (see P1-4) |
| **QW-6** Empty state guidance (P1) | ✅ Fixed | Three-step onboarding guide in `dashboard-tab.tsx:78-109` |
| **QW-7** Per-route titles (P2) | ❌ Not fixed | Still only root layout title (see P1-2) |
| **QW-8** Disabled A/B tooltip (P1) | ✅ Fixed | Inline text at `compare-tab.tsx:170-172` |
| **MT-2** Real CSV upload (P1) | ✅ Fixed | File input, preview table, column headers, append/replace radio |
| **MT-3** Autosave (P1) | ✅ Fixed | 5-second debounce with Saving.../Saved indicator at `definition-tab.tsx:66-91` |
| **MT-5** Delete capabilities (P1) | ✅ Fixed | Full CRUD for projects, versions, runs |
| **MT-6** Validation severity (P1) | ✅ Fixed | `ValidationIssue` with `severity` + `field`, color-coded display |
| **MT-7** CSV export (P1) | ✅ Fixed | "Export CSV" button in `dashboard-tab.tsx:203-209` with `generateRunCsv` |
| **LT-1** Test suite (P1) | ✅ Fixed | 35 tests across 4 files — `utils.test.ts`, `csv-parser.test.ts`, `validation.test.ts`, `engine.test.ts` — all passing |
| **LT-3** Immutable versions (P1) | ✅ Fixed | Published versions are locked; edits create a new draft in `db.ts:252-275` |
| **§7** Error boundaries | ❌ Not fixed | No `error.tsx` files anywhere (see P0-3) |
| **§7** SQLite in git | ❌ Not fixed | `.gitignore` patterns don't match `.sqlite` files (see P0-2) |
| **§7** Input validation / Zod | ❌ Not fixed | API routes still cast `request.json()` without runtime validation (see P1-10) |
| **§8.3** Breadcrumbs | ❌ Not fixed | (see P1-8) |
| **§8.3** Keyboard shortcuts | ❌ Not fixed | (see P1-5) |
| **§8.5** N+1 queries | ❌ Not fixed | (see P1-9) |

---

## 4. Quick Wins (< 1 day each)

| ID | Fix | Priority | Effort |
|---|---|---|---|
| QW-1 | Add `data/*.sqlite*` to `.gitignore` and `git rm --cached` | P0 | 10 min |
| QW-2 | Make sidebar action buttons visible (not hover-only) | P0 | 30 min |
| QW-3 | Add `app/error.tsx` with styled retry button | P0 | 30 min |
| QW-4 | Fix `outline-none` → `focus-visible:outline-none` in `create-project-form.tsx` | P1 | 5 min |
| QW-5 | Add `generateMetadata()` to project and report pages | P1 | 20 min |
| QW-6 | Theme Recharts `<Tooltip>` to match dark UI | P1 | 15 min |
| QW-7 | Upgrade `text-slate-500` labels to `text-slate-400` | P2 | 10 min |
| QW-8 | Focus cancel button (not delete) in danger confirm dialogs | P2 | 10 min |
| QW-9 | Add `not-found.tsx` with branded 404 page | P2 | 20 min |
| QW-10 | Add auto-dismiss for success status messages (5s timeout) | P2 | 15 min |

---

## 5. Medium-Term Improvements

| ID | Improvement | Priority | Effort |
|---|---|---|---|
| MT-1 | Add keyboard shortcuts (Cmd+S save, Cmd+Enter run) via `useEffect` key handler | P1 | 1–2 days |
| MT-2 | Add Zod schemas for all API request bodies | P1 | 1–2 days |
| MT-3 | Fix tab state loss — keep panels mounted with CSS hidden or lift state | P1 | 1 day |
| MT-4 | Fix autosave dependency cycle — use refs for stable callbacks | P1 | 2 hours |
| MT-5 | Add sr-only data tables as alternatives for each chart | P1 | 1 day |
| MT-6 | Optimize N+1 queries in `getProjectsSummary` | P1 | 2 hours |
| MT-7 | Add breadcrumb navigation to workbench pages | P1 | half day |
| MT-8 | Add intermediate responsive breakpoint for card editor grid | P2 | half day |
| MT-9 | Collapsible sidebar drawer on mobile viewports | P2 | 1 day |
| MT-10 | Replace native `<select>` with custom dark-themed dropdown | P2 | 1 day |
| MT-11 | Add proper CSV parser for quoted fields | P2 | half day |

---

## 6. Assessment

The first review drove 15+ concrete improvements — the codebase is significantly stronger. The component architecture, data management, and ARIA semantics are now solid foundations. The remaining issues fall into three categories:

1. **Regressions from the refactor** (P0-1: hover-only buttons) — the version sidebar introduced a touch/keyboard-inaccessible pattern that didn't exist in the monolith.

2. **Skipped first-review items** (P0-2, P0-3, P1-2, P1-5, P1-8, P1-9, P1-10) — about a third of the original findings were not addressed, likely deprioritized during the component split. These should be ticketed.

3. **Second-order polish** (P1-3 tooltip theming, P1-6 tab state, P2 items) — issues that only become visible once the first layer of problems is fixed.

The three P0s (hover-only buttons, SQLite in git, no error boundaries) should be fixed immediately — they represent a data-loss risk, a collaboration blocker, and a crash-to-white-screen hazard respectively.

---

*Second-pass audit conducted against codebase at current HEAD. All file references relative to project root.*
