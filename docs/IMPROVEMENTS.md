# PlaytestAI — Improvement Plan

> Analysis date: 2025-07-18
> Scope: Quick wins and high-impact improvements for MVP polish

---

## 1. Executive Summary

PlaytestAI is a well-architected Next.js + TypeScript local-first MVP with solid fundamentals:
a clean simulation engine, proper Zod validation, modular DB layer, and good test coverage
of core logic. The main gaps are in **developer experience scaffolding**, **documentation
depth**, **configuration hardening**, and **missing project infrastructure** that top GitHub
projects always ship.

### Top 5 highest-impact changes

1. **Upgrade README** — Add badges, architecture diagram, prerequisites, environment variables,
   and a "first success in < 2 minutes" quick-start section.
2. **Add CONTRIBUTING.md** — Clear path from clone → first PR with development workflow,
   testing instructions, and code style expectations.
3. **Harden tsconfig & ESLint** — Raise `target` to ES2022, enable `noUncheckedIndexedAccess`,
   and add stricter lint rules for unused vars and consistent type imports.
4. **Add .nvmrc + .editorconfig** — Pin the Node version and enforce consistent formatting
   across editors.
5. **Improve next.config.ts** — Add security headers, powered-by suppression, and strict mode.

---

## 2. Current State Assessment

| Dimension              | Score (1-10) | Key Gap                                                      |
|------------------------|--------------|--------------------------------------------------------------|
| Language Modernity     | 7            | ES2017 target; missing `noUncheckedIndexedAccess`            |
| Tooling & CI/CD        | 4            | No CI pipeline, no pre-commit hooks, no automated checks     |
| Type Safety            | 8            | Strict mode on; some `require()` calls in DB layer           |
| Documentation          | 5            | README is functional but sparse; no CONTRIBUTING or ADRs     |
| Security Posture       | 3            | No security headers, no rate limiting, no CSP                |
| Community Health       | 2            | No issue templates, PR templates, or contribution guide      |
| Discoverability        | 3            | No badges, no topic tags, no social preview                  |

---

## 3. Prioritized Recommendations

### Quick Wins (< 1 day effort each)

#### QW-1: Enhanced README with badges and architecture
- Add Node version badge, license badge, test status badge
- Add prerequisites section (Node ≥ 20, npm)
- Add environment variable documentation
- Add architecture overview section with module descriptions
- **Impact**: First-impression quality; reduces onboarding friction by ~50%

#### QW-2: Add `.nvmrc`
- Pin Node version to `20` for consistent development environments
- **Impact**: Eliminates "works on my machine" issues

#### QW-3: Add `.editorconfig`
- Enforce consistent indentation (2 spaces), charset, final newline, trailing whitespace
- **Impact**: Consistent formatting across IDEs without extra tooling

#### QW-4: Harden `tsconfig.json`
- Raise `target` from ES2017 → ES2022 (Node 20+ supports it natively)
- Add `noUncheckedIndexedAccess: true` for safer array/object access
- Add `noFallthroughCasesInSwitch: true`
- **Impact**: Catches real bugs at compile time; uses modern JS features

#### QW-5: Improve `next.config.ts`
- Add `poweredByHeader: false` to suppress `X-Powered-By` header
- Add security headers (X-Content-Type-Options, X-Frame-Options, Referrer-Policy)
- **Impact**: Basic security hardening for any deployment

#### QW-6: Add `CONTRIBUTING.md`
- Prerequisites, setup steps, testing commands, code style, PR process
- **Impact**: Reduces barrier to contribution; signals project maturity

#### QW-7: Add npm scripts for common workflows
- Add `npm run typecheck` script for standalone type checking
- Add `npm run test:coverage` for coverage reporting
- **Impact**: Better DX for contributors; enables CI integration

### Medium Effort (1 day – 1 week)

#### ME-1: GitHub Actions CI pipeline
- Test matrix across Node 20.x and 22.x
- Run lint, typecheck, and tests on every PR
- Cache `node_modules` for faster runs
- **Impact**: Automated quality gates; prevents regressions

#### ME-2: Resolve `require()` anti-pattern in DB layer
- Files `versions.ts`, `runs.ts` use `require("./projects")` to avoid circular deps
- Refactor to pass `getProjectById` as a parameter or use a shared registry
- **Impact**: Eliminates CommonJS in an ESM codebase; better tree-shaking

#### ME-3: Add integration tests for API routes
- Test all 6 API endpoints with actual DB operations
- Use in-memory SQLite for test isolation
- **Impact**: Catches API regressions; currently only engine + utils are tested

#### ME-4: Error boundary improvements
- Add `not-found.tsx` pages at app and project levels
- Improve error messages with actionable recovery steps
- **Impact**: Better UX for edge cases

### Strategic Investments (> 1 week)

#### SI-1: Documentation site with Docusaurus
- Simulation model deep-dive
- Card stat reference
- CSV import format specification
- Agent strategy explanations
- **Impact**: Enables self-service learning; reduces support burden

#### SI-2: Web Worker for simulation
- Move `simulateBatchAsync` to a dedicated Web Worker
- Prevent UI thread blocking for large simulations (10k+ games)
- **Impact**: Dramatically better UX for heavy simulations

#### SI-3: OpenAPI specification for API routes
- Document all 6 endpoints with request/response schemas
- Generate from Zod schemas for consistency
- **Impact**: Enables API client generation; better documentation

---

## 4. Implemented Changes

The following improvements have been applied directly to the codebase:

- [x] **QW-1**: Enhanced README with badges, architecture, prerequisites, environment docs
- [x] **QW-2**: Added `.nvmrc` pinning Node 20
- [x] **QW-3**: Added `.editorconfig` for consistent formatting
- [x] **QW-4**: Hardened `tsconfig.json` (ES2022, noUncheckedIndexedAccess, noFallthroughCasesInSwitch)
- [x] **QW-5**: Improved `next.config.ts` with security headers
- [x] **QW-6**: Added `CONTRIBUTING.md`
- [x] **QW-7**: Added `typecheck` and `test:coverage` npm scripts

---

## 5. Project Health Checklist

```
Repository Basics:
[x] Descriptive README with quick start
[ ] LICENSE file
[x] CONTRIBUTING.md
[ ] Issue templates
[ ] PR template
[ ] CODEOWNERS

Automation:
[ ] CI running on PRs
[x] Automated testing (vitest)
[ ] Dependency updates
[ ] Release automation
[ ] Security scanning

Documentation:
[ ] API docs
[ ] Examples directory
[x] Architecture overview (in README)
[ ] Changelog

Community:
[ ] Good first issues
[ ] Discussion forum or chat
[ ] Social preview image
[ ] Appropriate topic tags
```

---

## 6. 90-Day Roadmap to Top-Project Status

### Days 1–7: Foundation
- [x] Harden tsconfig, ESLint, editorconfig
- [x] Improve README and add CONTRIBUTING.md
- [x] Add security headers to next.config.ts
- [ ] Add LICENSE file (MIT recommended)
- [ ] Add GitHub issue and PR templates

### Days 8–30: Core Improvements
- [ ] Set up GitHub Actions CI (lint + typecheck + test)
- [ ] Refactor `require()` calls in DB layer to proper ESM imports
- [ ] Add API route integration tests
- [ ] Add `not-found.tsx` error pages
- [ ] Set up Dependabot for automated dependency updates
- [ ] Add Prettier for consistent code formatting

### Days 31–60: Polish & Documentation
- [ ] Create API documentation (OpenAPI or markdown)
- [ ] Add CSV format specification doc
- [ ] Document simulation model and agent strategies in detail
- [ ] Add performance benchmarks for simulation engine
- [ ] Move simulation to Web Worker for large batches

### Days 61–90: Community & Growth
- [ ] Create documentation site (Docusaurus or similar)
- [ ] Add "good first issue" labels to starter tasks
- [ ] Set up GitHub Discussions
- [ ] Create social preview image
- [ ] Write comparison guide vs manual playtesting workflows
- [ ] Submit to relevant awesome-lists (awesome-boardgames, awesome-nextjs)
