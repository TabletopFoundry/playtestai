---
id: cli-scripts
title: npm scripts
sidebar_position: 5
description: Every script in package.json, what it does, and when to run it.
---

# npm scripts

PlaytestAI exposes its tooling through `package.json` scripts. There is no
separate CLI binary.

| Script | What it does | When to run |
| --- | --- | --- |
| `npm run dev` | Next.js dev server with hot reload at `localhost:3000`. | While developing. |
| `npm run build` | Production build. | Before deploying or running `npm start`. |
| `npm start` | Serve the production build. | In production-like environments. |
| `npm run lint` | ESLint against the entire repo. | Pre-commit. CI. |
| `npm run typecheck` | `tsc --noEmit` strict TypeScript check. | Pre-commit. CI. |
| `npm test` | Vitest, one-shot run of all 141 tests. | Pre-commit. CI. |
| `npm run test:watch` | Vitest in watch mode. | While editing simulation code. |
| `npm run test:coverage` | Vitest with V8 coverage. | When you want a coverage report. |
| `npm run validate` | typecheck + lint + tests, in that order. | Pre-push. CI. |

## Typical flows

### While editing engine code

In two terminals:

```bash
npm run dev          # terminal 1 — visual feedback
npm run test:watch   # terminal 2 — instant test feedback
```

### Pre-push gate

```bash
npm run validate
```

If `validate` fails, your push will likely fail in CI too. Fix locally first.

### Generating a coverage report

```bash
npm run test:coverage
open coverage/index.html
```

The HTML report is gitignored — local-only.

## Adding a script

If you contribute a script, follow the existing conventions:

- Lowercase, hyphen-separated names.
- Short descriptions in `package.json` if non-obvious.
- Update this table in the same PR.
- Update `npm run validate` if the new check should gate pushes.
