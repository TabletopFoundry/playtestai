---
id: configuration
title: Configuration
sidebar_position: 2
description: Environment variables, config files, and runtime knobs.
---

# Configuration

PlaytestAI has very little to configure. The whole app is designed to run
out-of-the-box; anything you'd typically configure is either a project-level
setting (stored in SQLite) or an engine constant (a code change).

## Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `NODE_ENV` | `development` | Standard Next.js mode. `production` disables auto-seed. |
| `PLAYTESTAI_ENABLE_SEEDING` | unset | When `true`, force seed insertion even in production. |
| `PORT` | `3000` | Port the dev/start server binds to. |

Set them at launch:

```bash
PLAYTESTAI_ENABLE_SEEDING=true PORT=4000 npm start
```

## Files

| File | Purpose |
| --- | --- |
| `.nvmrc` | Pinned Node.js version. Use with `nvm use`. |
| `.editorconfig` | Whitespace conventions (2-space, LF). |
| `eslint.config.mjs` | ESLint flat config. Strict rules: `no-console`, `eqeqeq`, `prefer-const`, `no-var`. |
| `tsconfig.json` | TypeScript strict mode. |
| `next.config.ts` | Next.js config (defaults are fine). |
| `vitest.config.ts` | Test runner config. |

You should not need to edit any of these to use the tool. Edit them when you
contribute changes to the engine.

## Where data lives

| Path | Contents |
| --- | --- |
| `data/playtestai.sqlite` | The main SQLite database. Gitignored. |
| `data/playtestai.sqlite-shm` | SQLite shared memory file (WAL mode). |
| `data/playtestai.sqlite-wal` | SQLite write-ahead log. |

Delete the `.sqlite*` files to reset the app to seed state.

## Engine constants

All simulation tuning lives in
[`lib/simulation/constants.ts`](./simulation-constants.md). Changing those
constants changes how every future simulation values cards and scores
balance. Treat changes there with the same care as a schema migration:
re-run all important baselines.
