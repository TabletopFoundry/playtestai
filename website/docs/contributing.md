---
id: contributing
title: Contributing
sidebar_position: 92
description: How to set up, propose changes, and get a PR merged.
---

# Contributing

PlaytestAI is open source under the MIT licence. We welcome contributions —
from typo fixes to new analytics panels to new AI agents.

## Quick setup

```bash
git clone https://github.com/TabletopFoundry/playtestai.git
cd playtestai
npm install
npm run dev          # http://localhost:3000
```

Seed data loads automatically on first launch.

## The expected workflow

1. **Open or comment on an issue** describing what you want to change.
   Drive-by PRs are accepted; coordinating first saves wasted work.
2. **Branch from `main`.** Naming convention: `feat/your-feature` or
   `fix/short-description`.
3. **Make your change** with the dev server hot-reloading.
4. **Run the validation gate** before pushing:

   ```bash
   npm run validate     # typecheck + lint + tests
   ```

5. **Open a PR** against `main`. The PR template will ask you to confirm
   `npm run validate` is clean and to describe the change.

## Code style

| Concern | Rule |
| --- | --- |
| TypeScript | Strict mode. **No `any`**. Prefer `unknown` and narrow. |
| Indentation | 2 spaces, LF line endings (see `.editorconfig`). |
| Imports | Use the `@/` path alias for project imports. |
| Naming | `camelCase` for variables and functions, `PascalCase` for types/components. |
| Components | Functional, with explicit prop types. |
| API inputs | **Must** be validated with Zod in `lib/validation.ts`. |
| Tests | Co-located in `__tests__/` directories. |
| Commits | Imperative mood: `feat: add ...`, `fix: correct ...`, `docs: ...`. |

ESLint enforces: `no-console`, `eqeqeq`, `prefer-const`, `no-var`.

## What to work on

Good first contributions:

- **Tests for analytics edge cases** — `lib/simulation/analytics.ts`.
- **Improved flagged-issue copy** — same file.
- **New CSV columns** — see `lib/csv-export.ts`.
- **Documentation** — `website/docs/`. Most-needed: more worked examples.

Bigger contributions to discuss first:

- New AI agent archetypes (e.g., `defensive`, `ramp`).
- Set / draft simulation.
- Alternative win conditions.
- Engine constants changes (these affect every user's results).

## Testing your simulation changes

The engine has 141 tests, but no test catches a constants drift that just
shifts every balance score by 5. After any change to `lib/simulation/`:

1. Run `npm test`.
2. Pick three seeded projects.
3. Re-simulate them with the same config you used last time.
4. Confirm the balance scores didn't move surprisingly.

If they did move, that's a finding — note it in the PR description.

## Code of conduct

Be kind. Assume good faith. Help newcomers. The project follows the
[Contributor Covenant](https://www.contributor-covenant.org/version/2/1/code_of_conduct/)
v2.1. Maintainers will enforce it.

## Releases

We follow [Semantic Versioning](https://semver.org/) and document every
change in [`CHANGELOG.md`](./changelog.md) using
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format. Add an
entry under `## [Unreleased]` as part of your PR.

## Need help?

Open a [discussion](https://github.com/TabletopFoundry/playtestai/discussions)
— maintainers respond within a few days. For bugs, file an
[issue](https://github.com/TabletopFoundry/playtestai/issues) with steps to
reproduce and the seed you used.
