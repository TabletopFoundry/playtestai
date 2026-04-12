# Gap Analysis

> The original PRD is strategically strong but not implementation-ready. All specificity added below that was not explicit in the original document is marked **[INFERRED]**. Open decisions that need stakeholder confirmation are marked **[NEEDS INPUT]**.

| Gap Area | Gap in Original PRD | Delivery Risk | Enhancement in This PRD |
|---|---|---|---|
| Scope definition | The document mixes long-term vision, MVP, business model, and research roadmap without a firm v1 boundary. | Engineering cannot plan a release or estimate accurately. | v1 is narrowed to a concrete, buildable slice with explicit in-scope, out-of-scope, and v2+ items. |
| Target users | User segments are named, but there are no actionable personas with workflow, skill level, or success criteria. | UX and onboarding decisions will be guesswork. | Added personas with goals, pain points, and tech comfort. |
| User stories | Features are listed, but the user intent behind each feature is mostly implicit. | Teams may build technically correct features that do not solve the right user problem. | Each functional requirement now includes a user story. |
| Acceptance criteria | No feature has testable acceptance criteria. | QA cannot verify completion; engineers cannot know what “done” means. | Added Given/When/Then acceptance criteria per requirement. |
| Edge cases | Simulation failure states, invalid rules, low-sample analytics, and import errors are not defined. | High risk of unusable first release and support burden. | Added edge cases for each requirement and major user flow. |
| Prioritization | Many advanced capabilities are listed alongside MVP needs with no tradeoff guidance. | Scope creep and delayed launch are likely. | Every requirement now has a MoSCoW priority. |
| Contradictions | The PRD proposes a broad board-game platform, but the go-to-market MVP says “card games only.” | Teams may overbuild infrastructure or disagree on implementation scope. | v1 explicitly targets turn-based, card-driven games **[INFERRED]** while preserving the broader vision for v2+. |
| Non-functional requirements | Performance, availability, accessibility, browser support, retention, and security are missing. | Engineering cannot size infrastructure or define operational readiness. | Added explicit NFR targets and support matrix. |
| Metrics | Success metrics are high-level business outcomes only; no activation, engagement, or system health metrics exist. | Product teams cannot evaluate whether v1 is delivering user value. | Added product KPIs, operational KPIs, and rollout gates. |
| Data model | The document names features but not the core entities or data ownership model. | Schema design, API design, and privacy review will stall. | Added conceptual data model with relationships and PII flags. |
| Integrations | Imports, exports, compute, and notifications are mentioned but not contractually defined. | Hidden dependencies will emerge late in delivery. | Added v1 integration points and explicit deferrals. |
| Security/privacy | The product handles proprietary game rules and user data, but tenancy, encryption, and AI-data usage are undefined. | Designers and publishers may not trust the platform with unreleased IP. | Added tenant isolation, encryption, retention, and “no training without opt-in” defaults **[INFERRED]**. |
| Release plan | The original phases are strategic, not operational. | No clear launch checklist or feature flag plan exists. | Added alpha/beta/GA rollout plan with gating criteria and rollback controls. |

---

# Enhanced PRD: PlaytestAI — AI-Powered Board Game Playtesting & Balance Platform

## 1. Overview

### Product Name
PlaytestAI

### One-Liner
An AI-powered platform that lets board game designers define a game, simulate thousands of plays, and identify balance issues before expensive human playtesting.

### Problem
Board game balancing is slow, expensive, and statistically weak when done only through human playtesting. Designers often discover dominant strategies, first-player advantage, pacing problems, or broken card combinations late in development, after many physical prototypes and playtest sessions. Existing workflows rely on notebooks, spreadsheets, and anecdotal feedback rather than repeatable simulation data.

### Solution
PlaytestAI provides a structured game-definition workflow, a simulation engine, and a balance analytics dashboard so designers can validate rulesets, run large simulation batches, compare rule variants, and combine AI findings with real human playtest data. To make v1 implementable, the first release is optimized for **turn-based, card-driven tabletop games with 2-4 players and finite win conditions [INFERRED]**.

### KPIs
| KPI | Target | Notes |
|---|---|---|
| Time to first completed simulation | <= 30 minutes from signup to first 1,000-game run **[INFERRED]** | Measures onboarding clarity and setup friction. |
| Activation rate | >= 60% of new workspaces complete project setup, validation, and at least one simulation within 7 days **[INFERRED]** | Primary early product metric. |
| Simulation completion reliability | >= 95% of queued runs complete without manual support intervention **[INFERRED]** | Operational health metric. |
| Insight usefulness | >= 70% of completed runs include at least one user-saved or user-confirmed insight **[INFERRED]** | Proxy for perceived value. |
| 30-day retained workspaces | >= 25% of activated workspaces run a new simulation in days 8-30 **[INFERRED]** | Retention target for v1 beta. |
| Median time to variant decision | <= 1 business day from baseline run to compared variant run **[INFERRED]** | Measures iteration speed improvement. |

---

## 2. Users & Personas

| Persona | Goals | Pain Points | Tech Comfort |
|---|---|---|---|
| **Indie Designer Dana** | Validate whether a prototype is balanced before printing more prototypes; compare card cost changes quickly; show evidence to collaborators. | Too few testers, biased feedback, heavy spreadsheet work, little statistical confidence. | Medium. Comfortable with spreadsheets and structured forms, not with coding. |
| **Publisher Producer Priya** | Track multiple games in development; standardize balance reviews; reduce expensive late-stage redesigns. | Each team logs playtests differently; hard to compare versions; surprises appear close to launch. | Medium-high. Comfortable with dashboards, exports, permissions, and portfolio reporting. |
| **Research Analyst Rowan** | Run repeatable simulations on defined rulesets; compare mechanic outcomes across experiments. | Academic tools are powerful but not productized; setup is time-consuming. | High. Comfortable with structured schemas and experimental controls. |

### Primary User for v1
**Indie Designer Dana** is the primary design target for onboarding, terminology, and first-run experience **[INFERRED]**.

### Secondary User for v1
**Publisher Producer Priya** is supported through shared workspaces, exports, and version comparisons **[INFERRED]**.

---

## 3. Scope

### In Scope for v1
- Web application for authenticated users and shared workspaces.
- Project creation for **turn-based, card-driven games** with configurable player count, setup, turn phases, actions, win conditions, and scoring **[INFERRED]**.
- Structured component modeling for cards, decks, resources, tokens, and simple zones (deck, hand, discard, play area) **[INFERRED]**.
- Manual rule entry plus CSV import for component data.
- Rules validation with blocking errors and non-blocking warnings.
- Immutable ruleset versions and comparison against prior versions.
- Batch simulations using **Random** and **Greedy** agents.
- Simulation configuration for player counts, run count, random seed, and chosen ruleset version.
- Core analytics: win rate, first-player advantage, score distribution, game length, dominant option detection, and high-frequency card/component usage.
- A/B comparison between two saved ruleset versions.
- Human playtest result logging tied to ruleset version.
- CSV export and PDF report generation.
- Email notifications for invites and completed reports **[INFERRED]**.

### Out of Scope for v1
- Real-time multiplayer digital board-game UI.
- Spatial board logic (hex grids, adjacency graphs, pathfinding-heavy movement) **[INFERRED]**.
- Reinforcement learning agents and custom per-game model training.
- Direct Google Sheets sync; v1 supports CSV upload/download only **[INFERRED]**.
- Public marketplace/community template sharing.
- Mobile-native apps.
- Enterprise SSO, SCIM, or customer-managed keys.
- Public API access.
- Crowdfunding badges or public marketing widgets.
- Automated natural-language rule ingestion from rulebooks **[INFERRED]**.

### Future Scope for v2+
- MCTS and RL agents.
- Support for board/spatial games and more complex hidden-information mechanics.
- Direct Google Sheets integration.
- API/webhooks for design pipelines.
- Shared template library and mechanic marketplace.
- Portfolio analytics across multiple games.
- Anonymous playtester surveys and playtester CRM.
- Enterprise controls (SSO, audit export, advanced tenant policies).

---

## 4. Functional Requirements

### FR-01 — Workspace and Project Setup
- **User Story:** As a designer, I want to create a workspace and a game project so I can organize rulesets, runs, and collaborators in one place.
- **Description:** The system must support account creation, personal workspace creation, optional collaborator invitation, and new project creation with core metadata (game name, genre, intended player count, estimated duration, and template selection).
- **Acceptance Criteria:**
  - **Given** a new user completes sign-up, **when** account creation succeeds, **then** a personal workspace is created automatically and the user lands on a guided onboarding screen.
  - **Given** a signed-in user clicks “New Project,” **when** required fields are valid, **then** the project is created and a draft ruleset shell is generated.
  - **Given** a user abandons onboarding before creating a project, **when** they return later, **then** onboarding resumes from the last incomplete step.
- **Edge Cases:** Duplicate project names in the same workspace should be allowed with unique internal IDs **[INFERRED]**; invite email already belongs to an existing user; user leaves onboarding without saving.
- **Priority:** Must
- **Dependencies:** Managed authentication, email service, FR-13 for collaboration roles.

### FR-02 — Structured Game Definition
- **User Story:** As a designer, I want to define my game in a structured format so the simulation engine can execute legal plays.
- **Description:** Users must be able to define players, setup state, turn phases, available actions, costs/effects, card/component attributes, scoring logic, and win/end conditions through forms and templates. v1 supports card-driven, turn-based games with finite victory conditions **[INFERRED]**.
- **Acceptance Criteria:**
  - **Given** an existing project, **when** the user enters rule data and saves, **then** the system persists a draft ruleset with autosave every <= 30 seconds **[INFERRED]**.
  - **Given** a component schema includes required fields, **when** the user omits a required field, **then** the UI shows an inline validation error and prevents publish.
  - **Given** the user defines turn phases and actions, **when** the configuration is saved, **then** the system stores a machine-readable ruleset that can be validated and simulated.
- **Edge Cases:** Multiple decks; optional setup rules by player count; shuffled zones; mutually exclusive actions; simultaneous effects **[NEEDS INPUT]**.
- **Priority:** Must
- **Dependencies:** FR-01.

### FR-03 — Component Data Import
- **User Story:** As a designer, I want to import card and component data from a spreadsheet so I do not need to re-enter large datasets manually.
- **Description:** Users can upload CSV files, map columns to component attributes, preview import results, and choose append or replace behavior for a component set.
- **Acceptance Criteria:**
  - **Given** a valid CSV upload, **when** the user maps required columns and confirms import, **then** the system creates or updates the target components and shows a success summary.
  - **Given** malformed rows or unmapped required columns, **when** the user previews the file, **then** the system highlights row-level errors before import is committed.
  - **Given** a repeated import for the same component set, **when** the user chooses replace, **then** prior draft components in that set are replaced and a revision is logged.
- **Edge Cases:** Duplicate component IDs; blank numeric cells; unsupported file encoding; more than 1,000 rows in a single upload **[INFERRED]**.
- **Priority:** Should
- **Dependencies:** FR-02, object storage.

### FR-04 — Rules Validation and Simulation Readiness
- **User Story:** As a designer, I want the system to catch broken or incomplete rules before I spend simulation credits on bad runs.
- **Description:** The system must run schema validation, semantic validation, and a lightweight dry-run readiness check. Validation output must distinguish blockers from warnings.
- **Acceptance Criteria:**
  - **Given** a draft ruleset, **when** the user clicks Validate, **then** the system returns validation results within the NFR target and classifies each issue as blocker or warning.
  - **Given** the ruleset has a blocker (for example, missing win condition or unreachable setup reference), **when** the user attempts to publish or simulate, **then** the action is prevented.
  - **Given** the ruleset passes schema checks but produces deadlocks in dry-run sampling, **when** validation completes, **then** the system shows the failing state and marks the ruleset “simulation not ready.”
- **Edge Cases:** Infinite turn loops; no legal moves; contradictory end conditions; references to deleted components; player-count-specific rules that are only invalid for some counts.
- **Priority:** Must
- **Dependencies:** FR-02, simulation engine dry-run capability.

### FR-05 — Ruleset Versioning
- **User Story:** As a designer, I want immutable ruleset versions so I can compare balance outcomes across iterations.
- **Description:** Draft rules can be published into immutable versions with version notes. All simulation runs and human playtests must reference a specific version.
- **Acceptance Criteria:**
  - **Given** a validated draft, **when** the user publishes it, **then** the system creates a versioned snapshot and records publish metadata.
  - **Given** a user edits the draft after publishing, **when** they save changes, **then** the existing published version remains unchanged.
  - **Given** a completed simulation run, **when** the user opens the run later, **then** the run displays the exact ruleset version and configuration used.
- **Edge Cases:** Publishing the same draft twice; reverting to an earlier version; comparing versions with deleted components.
- **Priority:** Must
- **Dependencies:** FR-02, FR-04.

### FR-06 — Simulation Configuration and Queueing
- **User Story:** As a designer, I want to configure a batch run so I can test a ruleset under specific conditions.
- **Description:** Users can select ruleset version, player counts, number of games, agent types, random seed behavior, and optional comparison tag before submitting a run to the queue.
- **Acceptance Criteria:**
  - **Given** a published ruleset, **when** the user submits a valid configuration, **then** the run enters a queued state and displays estimated usage and expected duration **[INFERRED]**.
  - **Given** a run request exceeds workspace quota, **when** the user submits it, **then** the system blocks submission and explains the limit.
  - **Given** two identical runs are submitted intentionally, **when** both are valid, **then** both may execute but must retain separate run IDs.
- **Edge Cases:** Queue backlog; cancellation before execution starts; mixed player-count runs; seed reuse for reproducibility.
- **Priority:** Must
- **Dependencies:** FR-05, FR-13, job queue.

### FR-07 — Simulation Execution Engine
- **User Story:** As a designer, I want AI agents to play my game many times so I can detect statistical balance issues.
- **Description:** The v1 engine must support Random and Greedy agents, deterministic replay when a fixed seed is provided, sharded batch execution, and safe termination when illegal or non-progressing states are encountered.
- **Acceptance Criteria:**
  - **Given** a queued run, **when** workers begin execution, **then** the engine simulates games until the requested count is reached or the run fails due to configured error thresholds.
  - **Given** a fixed random seed is supplied, **when** the same ruleset and config are re-run, **then** aggregated results must be reproducible within deterministic tolerance **[INFERRED]**.
  - **Given** a game exceeds the configured turn limit, **when** the limit is hit, **then** the simulation ends that game as invalid and records a structured failure reason.
- **Edge Cases:** Stochastic draws; ties; hidden information; repeated state loops; workers crashing mid-shard.
- **Priority:** Must
- **Dependencies:** FR-04, FR-06, compute workers, results storage.

### FR-08 — Run Monitoring and Failure Recovery
- **User Story:** As a designer, I want to monitor run progress and understand failures so I can trust the output.
- **Description:** The system must expose run states (queued, running, partially failed, completed, failed, canceled), progress counters, ETA, failure summaries, and retry behavior for transient worker failures.
- **Acceptance Criteria:**
  - **Given** a running simulation, **when** the user opens the run details screen, **then** progress updates refresh automatically at least every 5 seconds **[INFERRED]**.
  - **Given** a worker fails due to a transient infrastructure error, **when** retry policy allows, **then** unfinished shards are retried up to 2 times **[INFERRED]** without double-counting results.
  - **Given** the run finishes with partial failures, **when** completion is reached, **then** the system shows completed-game count, failed-game count, and whether statistical output is still considered usable.
- **Edge Cases:** Browser disconnect during monitoring; websocket fallback to polling; cancellation after partial completion; stale ETA.
- **Priority:** Must
- **Dependencies:** FR-07, websocket/polling transport, observability stack.

### FR-09 — Balance Analytics Dashboard
- **User Story:** As a designer, I want a clear dashboard of balance metrics so I can decide what to change next.
- **Description:** For each completed run, the platform must provide summary cards, charts, and flagged findings for win rate by player count/position, score spread, game length distribution, dominant option signals, card/component usage frequency, and anomaly notes.
- **Acceptance Criteria:**
  - **Given** a completed run with sufficient data, **when** the user opens analytics, **then** the overview loads within the NFR target and displays the configured run context.
  - **Given** a metric is based on too little data, **when** the dashboard renders, **then** the system labels it “low confidence” and suppresses strong recommendations.
  - **Given** first-player win rate exceeds configured threshold, **when** analysis completes, **then** the dashboard flags potential first-player advantage and shows the underlying sample size.
- **Edge Cases:** Tied games; missing score data for win-condition-only games; low sample sizes; heavily skewed distributions; incomplete runs.
- **Priority:** Must
- **Dependencies:** FR-07, FR-08, analytics service.

### FR-10 — Variant Comparison
- **User Story:** As a designer, I want to compare two versions of my game so I can tell whether a change improved balance.
- **Description:** Users can select a baseline and variant run or version, and the system shows metric deltas, significance labels, and a human-readable summary of what changed.
- **Acceptance Criteria:**
  - **Given** two completed runs from comparable configurations, **when** the user selects Compare, **then** the system displays delta views for core metrics and highlights statistically meaningful changes **[INFERRED]**.
  - **Given** runs are not comparable because key configuration differs, **when** comparison is attempted, **then** the UI warns the user and explains the mismatch.
  - **Given** the user changes one parameter across a small predefined set of values, **when** comparison completes, **then** the system renders a trend chart for that parameter sweep **[INFERRED]**.
- **Edge Cases:** Different player-count mixes; different agents; deleted baseline version; insufficient samples in one run.
- **Priority:** Should
- **Dependencies:** FR-05, FR-06, FR-09.

### FR-11 — Human Playtest Logging
- **User Story:** As a designer, I want to record human playtest outcomes alongside AI results so I can compare simulation findings with real player behavior.
- **Description:** Users can log playtest sessions with date, ruleset version, player count, winner, duration, notes, and structured ratings for fun, pacing, and clarity.
- **Acceptance Criteria:**
  - **Given** a project and published ruleset, **when** the user submits a human playtest entry, **then** the session is saved and linked to that version.
  - **Given** required fields are missing, **when** the user tries to save, **then** inline validation prevents submission.
  - **Given** both AI and human data exist for a version, **when** the user views the version summary, **then** the UI shows both data sources side by side with clear labels.
- **Edge Cases:** Anonymous playtesters; contradictory winner and score entry; partial feedback only; later correction of a logged session.
- **Priority:** Should
- **Dependencies:** FR-05, FR-09.

### FR-12 — Reporting and Export
- **User Story:** As a designer or publisher, I want to export results so I can share evidence with collaborators and decision-makers.
- **Description:** The system must support CSV export for structured data and PDF export for presentation-ready summaries, including version metadata, run configuration, charts, findings, and caveats.
- **Acceptance Criteria:**
  - **Given** a completed run, **when** the user requests CSV export, **then** the system generates a downloadable file containing run-level and metric-level output.
  - **Given** a completed run or comparison, **when** the user requests PDF export, **then** the system generates a report with charts, flagged findings, sample sizes, and limitations.
  - **Given** export generation fails, **when** the job errors, **then** the user sees a retry option and a non-destructive failure message.
- **Edge Cases:** Large exports; deleted source runs; stale cached exports; unsupported characters in file names.
- **Priority:** Should
- **Dependencies:** FR-09, FR-10, background export worker, object storage.

### FR-13 — Workspace Roles, Permissions, and Usage Limits
- **User Story:** As a workspace owner, I want to control who can edit projects and how much compute is used so collaboration is safe and predictable.
- **Description:** The system must support Owner, Editor, and Viewer roles **[INFERRED]** plus usage limits at the workspace level for simulation runs and storage.
- **Acceptance Criteria:**
  - **Given** a workspace owner invites a collaborator, **when** the invite is accepted, **then** the collaborator receives the assigned role.
  - **Given** a Viewer opens a project, **when** they attempt to edit rules or start a run, **then** the system blocks the action.
  - **Given** workspace quota is exhausted, **when** any user attempts to start a new run, **then** the system prevents it and shows next reset timing or upgrade contact path **[INFERRED]**.
- **Edge Cases:** Revoked access during an active session; over-quota workspaces with already queued runs; invite accepted after expiration.
- **Priority:** Must
- **Dependencies:** FR-01, billing/quota service **[NEEDS INPUT]**.

---

## 5. Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Performance** | Authenticated page load p95 <= 2.5s on broadband for primary screens **[INFERRED]**. Rules validation p95 <= 5s for games with <= 250 components, <= 20 action types, and <= 4 players **[INFERRED]**. CSV preview parse p95 <= 10s for 1,000-row files **[INFERRED]**. Run submission API p95 <= 2s. Analytics dashboard API p95 <= 3s for completed runs with <= 50 metrics/widgets **[INFERRED]**. Progress update staleness <= 5s p95. A 1,000-game run should complete within 10 minutes p95; a 10,000-game run within 45 minutes p95 for the standard game profile **[INFERRED]**. |
| **Availability SLA** | v1 public beta target: **99.5% monthly availability** excluding scheduled maintenance windows announced >= 24 hours ahead **[INFERRED]**. Internal workers may degrade gracefully; the app must still allow users to view existing results during compute incidents. |
| **Scalability** | Support at least 5,000 monthly active users, 500 concurrently signed-in users, and 200 concurrent simulation jobs **[INFERRED]**. Support 50,000 projects total, 10 million simulation-game records retained online, and 250 components per ruleset in v1 **[INFERRED]**. Horizontal worker scaling is required for simulation jobs. |
| **Security Model** | Tenant isolation at the workspace level. TLS 1.2+ in transit and AES-256 encryption at rest **[INFERRED]**. Role-based access control for Owner/Editor/Viewer. Secrets stored only in server-side secret manager. Audit log for sign-in, invite acceptance, publish version, run start/cancel, export generation, and permission changes **[INFERRED]**. Customer rules/data must **not** be used to train internal AI systems without explicit opt-in **[INFERRED]**. |
| **Accessibility** | Meet **WCAG 2.1 AA** for all core workflows: onboarding, project editing, run submission, dashboard review, and export download. Keyboard navigation, visible focus states, semantic headings, and chart alternatives are required. |
| **Internationalization (i18n)** | v1 UI ships in English only **[INFERRED]**, but all user-visible strings must be externalized, UI must support UTF-8 content for game/card names, and date/number formatting must be locale-aware. Additional locales are **[NEEDS INPUT]**. |
| **Data Retention** | Aggregated project, ruleset, and run summary data retained until customer deletion. Raw move-level traces retained 180 days **[INFERRED]**. Soft-deleted projects recoverable for 30 days **[INFERRED]**. Backups retained 35 days **[INFERRED]**. Users must be able to permanently delete a workspace after confirmation **[NEEDS INPUT]**. |
| **Browser Support** | Latest two stable versions of Chrome, Edge, Firefox, and Safari 17+ **[INFERRED]**. Minimum supported viewport width 1280px for analytics-heavy screens **[INFERRED]**. |
| **Observability** | Structured logs, request tracing, worker/job metrics, alerting for queue latency, run failure rate, export failures, and auth failures are required before beta launch **[INFERRED]**. |
| **Privacy/Compliance** | Collect minimum PII needed for account, invites, and optional playtester records. Provide clear data-processing terms for proprietary game content **[NEEDS INPUT]**. |

---

## 6. User Flows

### Flow 1 — Create Project and Define Initial Ruleset
**Happy Path**
1. User signs up and lands in onboarding.
2. User creates a new project and chooses a game template.
3. User enters project metadata and begins defining components, setup, phases, actions, and win conditions.
4. System autosaves draft progress.
5. User runs validation and receives a “ready to publish” result.

**Error/Exception Paths**
- If onboarding is abandoned, resume from last incomplete step.
- If required rule data is missing, validation highlights exact fields and blocks publish.
- If the template is too restrictive, user can switch to a blank template without losing project metadata **[INFERRED]**.

### Flow 2 — Import Card Data from CSV
**Happy Path**
1. User opens the Components tab.
2. User uploads a CSV and maps spreadsheet columns to component attributes.
3. System previews parsed rows and highlights any warnings.
4. User confirms import with append or replace mode.
5. Imported components appear in the draft ruleset and are included in validation.

**Error/Exception Paths**
- If required columns are unmapped, import cannot proceed.
- If rows contain invalid data types, the preview highlights specific row numbers.
- If the file exceeds the v1 size limit, the upload is rejected with guidance.

### Flow 3 — Publish Version and Run Simulation
**Happy Path**
1. User publishes a validated draft as Version N.
2. User opens “Run Simulation,” chooses player counts, agent types, run count, and seed behavior.
3. System checks permissions and quota, then queues the run.
4. Workers execute the run and the user sees live progress.
5. Run completes and analytics become available.

**Error/Exception Paths**
- If quota is exhausted, submission is blocked before queueing.
- If a worker fails transiently, the system retries unfinished shards.
- If too many simulated games terminate in invalid states, the run is marked failed or partially failed with structured reasons.

### Flow 4 — Review Analytics and Compare a Variant
**Happy Path**
1. User opens the analytics dashboard for a completed run.
2. User reviews headline metrics, flagged findings, and confidence labels.
3. User duplicates the prior draft, changes a value (for example, card cost), validates, and publishes a new version.
4. User runs the new version and selects Compare.
5. System shows baseline-versus-variant deltas and highlights meaningful improvements or regressions.

**Error/Exception Paths**
- If runs are not comparable, the compare screen explains which parameters differ.
- If sample size is too low, the compare screen labels results as directional only.
- If the compared baseline was deleted or archived, the system preserves the reference but marks it unavailable for deep drill-down **[INFERRED]**.

### Flow 5 — Log Human Playtest and Export a Report
**Happy Path**
1. User logs a human playtest session and ties it to a ruleset version.
2. System stores structured ratings and notes.
3. User opens the version summary to see AI and human data side by side.
4. User requests a PDF report.
5. System generates the report and notifies the user when it is ready.

**Error/Exception Paths**
- If required playtest fields are missing, save is blocked.
- If report generation fails, the user sees a retry option.
- If the user lacks export permission, the action is hidden or blocked.

---

## 7. Data Model

| Entity | Description | Key Relationships | PII Flag |
|---|---|---|---|
| **User** | Authenticated account holder. | Belongs to many Workspaces via Memberships. | **Yes** (email, name, auth identifiers) |
| **Workspace** | Collaboration boundary and tenant container. | Has many Memberships, Projects, ExportJobs, AuditEvents. | No |
| **Membership** | User-to-workspace role mapping. | Links User and Workspace. | **Yes** (user reference) |
| **GameProject** | Top-level container for one game. | Belongs to Workspace; has many RulesetVersions, HumanPlaytests, SimulationRuns. | No |
| **RulesetDraft** | Mutable working copy of a game definition. | Belongs to GameProject; may be published into RulesetVersion. | No |
| **RulesetVersion** | Immutable published snapshot used for runs. | Belongs to GameProject; has many SimulationRuns and HumanPlaytests. | No |
| **ComponentDefinition** | Card/component metadata and attributes. | Belongs to RulesetDraft or RulesetVersion snapshot. | No |
| **RuleDefinition** | Machine-readable setup, phase, action, and scoring logic. | Belongs to RulesetDraft or RulesetVersion snapshot. | No |
| **SimulationRun** | One submitted batch of simulated games. | Belongs to RulesetVersion; has many SimulationGame records and MetricSnapshots. | No |
| **SimulationGame** | One simulated match outcome. | Belongs to SimulationRun. | No |
| **MetricSnapshot** | Aggregated metrics for one run or comparison. | Belongs to SimulationRun or VariantComparison. | No |
| **VariantComparison** | Comparison artifact between baseline and variant runs/versions. | References two SimulationRuns and/or two RulesetVersions. | No |
| **HumanPlaytestSession** | Logged real-world playtest outcome. | Belongs to GameProject and RulesetVersion. | **Potentially Yes** (if facilitator or player names are stored) |
| **PlaytestFeedback** | Structured ratings and free-text notes from a human session. | Belongs to HumanPlaytestSession. | **Potentially Yes** (free text may include names) |
| **ExportJob** | Background job for CSV/PDF generation. | Belongs to Workspace and optionally SimulationRun/VariantComparison. | No |
| **AuditEvent** | Security and operational audit trail. | Belongs to Workspace and references acting User. | **Yes** (user reference, IP metadata if stored) |

### Core Relationships
- A **Workspace** contains many **GameProjects**.
- A **GameProject** has one active **RulesetDraft** and many immutable **RulesetVersions**.
- A **RulesetVersion** can have many **SimulationRuns** and many **HumanPlaytestSessions**.
- A **SimulationRun** contains many **SimulationGames** and derived **MetricSnapshots**.
- A **VariantComparison** references two comparable **SimulationRuns** and/or **RulesetVersions**.

### Data Handling Notes
- Proprietary rulesets and component data are product-critical customer content and must be treated as confidential by default.
- Move-level traces should be stored separately from aggregated metrics so retention policies can differ **[INFERRED]**.

---

## 8. Integration Points

| Integration | Purpose | Direction | v1 Decision |
|---|---|---|---|
| **Managed Auth Provider** | Sign-up, sign-in, password reset/magic link or OAuth **[NEEDS INPUT]**. | Inbound | Required |
| **Email Service** | Send invites, onboarding reminders, export-ready notices, password reset flows. | Outbound | Required |
| **Object Storage** | Store CSV uploads, generated reports, and retained run artifacts. | Both | Required |
| **Job Queue / Worker Orchestrator** | Execute simulation shards, export jobs, retries, and background validation tasks. | Internal | Required |
| **Results Database / Analytics Store** | Persist run summaries, aggregated metrics, and comparison outputs. | Internal | Required |
| **Observability Stack** | Capture logs, traces, metrics, and alerts. | Outbound/Internal | Required |
| **Payment/Billing System** | Enforce quotas and plan limits. | Both | **[NEEDS INPUT]** for v1 beta; default is manual quota management **[INFERRED]** |
| **Google Sheets** | Direct sync for card/component data. | Both | Deferred to v2+; v1 supports CSV only |
| **Public API/Webhooks** | External design-pipeline integration. | Both | Deferred to v2+ |

---

## 9. UX/UI Requirements

### Key Screens
| Screen | Purpose | Required UI Elements |
|---|---|---|
| **Onboarding** | Get user to first project quickly. | Workspace creation, project template selection, progress indicator, “resume later” state. |
| **Project Dashboard** | Show project status at a glance. | Current draft/version, validation status, recent runs, latest flagged issues, CTA to run simulation. |
| **Rules Editor** | Define and edit game logic. | Sectioned editor for metadata, components, setup, phases, actions, scoring; autosave state; inline validation. |
| **Import Modal** | Bring in CSV component data. | Upload area, column mapping, preview table, row-level error summary, append/replace choice. |
| **Validation Panel** | Surface blockers/warnings. | Severity grouping, linked field navigation, dry-run trace preview for failures. |
| **Run Configuration Modal** | Configure simulations. | Ruleset selector, player-count selector, agent selector, run-count input, quota estimate, submit button. |
| **Run Details Screen** | Monitor execution. | Status chip, progress bar, ETA, failure counter, cancel action, live updates. |
| **Analytics Dashboard** | Review outcomes. | Summary cards, charts, confidence labels, flagged findings, filter controls, export action. |
| **Comparison Screen** | Compare two runs/versions. | Baseline/variant selector, delta cards, significance labels, trend chart, mismatch warnings. |
| **Human Playtest Log** | Record real playtest sessions. | Session metadata form, ratings, notes, linked ruleset version, save confirmation. |
| **Export Center** | Retrieve generated outputs. | Export history, status, download links, retry action. |

### Cross-Cutting State Requirements
| State Type | Requirement |
|---|---|
| **Loading** | All data-heavy screens must show skeletons or structured loading placeholders; long-running jobs must show current step and last update timestamp **[INFERRED]**. |
| **Empty** | Empty projects must teach the next action (“Define components,” “Run validation,” “Start first simulation”). Empty analytics states must explain why no data exists yet. |
| **Error** | Error messages must be actionable, plain-language, and scoped to the failing object (upload, validation, run, export). Avoid generic “something went wrong” without recovery guidance. |
| **Low Confidence** | Metrics derived from insufficient samples must be visually distinguished from strong findings. |
| **Permissions** | Hidden or disabled actions must explain whether the reason is role-based, quota-based, or version-status-based. |

### UX Principles
- Optimize for “first completed run” over feature discoverability.
- Prefer product language familiar to tabletop designers over AI jargon.
- Explain findings with sample sizes and caveats to avoid false certainty.
- Keep advanced configuration collapsible in v1 **[INFERRED]**.

---

## 10. Release & Rollout

### Rollout Stages
| Stage | Audience | Features Enabled | Exit Criteria |
|---|---|---|---|
| **Stage 0: Internal Alpha** | Internal team only | Full v1 core flow on sample games; no external invites. | 20 internal runs completed; no P0/P1 defects on core flow **[INFERRED]**. |
| **Stage 1: Design Partner Alpha** | 5-10 invited designers/publishers **[INFERRED]** | Core game definition, validation, runs, analytics, CSV export. | >= 80% of invited teams complete first run; run completion reliability >= 90%; weekly founder support acceptable **[INFERRED]**. |
| **Stage 2: Private Beta** | 50-100 waitlist users **[INFERRED]** | Adds comparison, human playtest logging, PDF export, shared workspaces. | Activation >= 60%; reliability >= 95%; no unresolved security-critical issues. |
| **Stage 3: Public Beta / GA Decision** | Open self-serve users | Plan/quota enforcement, onboarding polish, documentation, support workflows. | Retention and reliability targets met for 2 consecutive months **[INFERRED]**. |

### Release Controls
- Use feature flags for comparison, PDF export, and collaborator invites.
- Maintain disable controls for new agent types and long-running exports.
- Rate-limit simulation submission per workspace during beta **[INFERRED]**.
- Keep sample/template games available for support and regression testing.

### Launch Readiness Checklist
- Security review completed for tenant isolation and export permissions.
- Core observability dashboards and alerts are live.
- Backups and restore drill completed.
- At least 3 representative sample games pass validation and simulation end-to-end **[INFERRED]**.
- Support documentation exists for onboarding, validation failures, and simulation failures.

### Rollback Plan
- If simulation reliability drops below 90% for 24 hours **[INFERRED]**, pause new run submissions and preserve read-only access to existing results.
- If export jobs cause infrastructure instability, disable export features via flag while leaving analytics available.

---

## 11. Open Questions with Proposed Defaults

| Open Question | Why It Matters | Proposed Default |
|---|---|---|
| **[NEEDS INPUT] What exact game classes must v1 support?** | Drives schema design and simulation engine complexity. | Default to turn-based, card-driven games with 2-4 players, hidden information via decks/hands, and no spatial board logic. |
| **[NEEDS INPUT] Is MCTS required in v1, or are Random + Greedy enough for launch?** | Major impact on engine complexity and compute cost. | Default to Random + Greedy in v1; keep MCTS behind internal flag or v2. |
| **[NEEDS INPUT] Should direct Google Sheets integration be launch-critical?** | Affects integration scope and auth permissions. | Default to CSV import/export only in v1. |
| **[NEEDS INPUT] What auth methods are required for launch?** | Impacts security, onboarding, and enterprise readiness. | Default to email-based auth plus Google OAuth **[INFERRED]**. |
| **[NEEDS INPUT] Is billing live in beta, or are quotas managed manually?** | Determines whether billing must be in the launch path. | Default to invite-only beta with manual quota assignment and no self-serve billing. |
| **[NEEDS INPUT] Can customer game data be used to improve models or templates?** | Important for trust and legal terms. | Default to no training/no secondary use without explicit opt-in. |
| **[NEEDS INPUT] Are anonymous playtester surveys required in v1?** | Expands the human-playtest scope materially. | Default to manual/internal session logging only. |
| **[NEEDS INPUT] What statistical threshold should define a flagged balance issue?** | Affects trust in analytics and alert noise. | Default to minimum 1,000 simulated games and p < 0.05 for “high-confidence” flags **[INFERRED]**. |
| **[NEEDS INPUT] Is public/shareable reporting required?** | Impacts permissions, link security, and IP exposure. | Default to authenticated workspace-only exports in v1. |
| **[NEEDS INPUT] What legal/compliance commitments are needed for publisher contracts?** | Needed before enterprise sales. | Default to standard SaaS terms in beta; enterprise addenda deferred until post-beta. |

---

## Summary of Product Decision
PlaytestAI v1 should ship as a focused, trustworthy simulation and analytics platform for card-driven tabletop games, not as a universal board-game AI platform on day one. That narrower scope preserves the original vision while giving engineering a clear, testable path to launch.
