---
id: installation
title: Installation
sidebar_position: 2
description: Set up PlaytestAI on macOS, Linux, or Windows.
---

# Installation

PlaytestAI is a [Next.js](https://nextjs.org) app with a local
[SQLite](https://www.sqlite.org/) store. It runs anywhere Node.js 20+ runs.

## Requirements

| Requirement | Notes |
| --- | --- |
| Node.js `>= 20` | The repo ships an `.nvmrc` with the tested version. |
| npm `>= 9` | Bundled with Node.js 20. |
| A C compiler toolchain | Needed by `better-sqlite3` on first install. |

### Toolchain prerequisites for `better-sqlite3`

`better-sqlite3` is a native module. Most installs work out of the box, but if
`npm install` fails compiling it:

- **macOS** — `xcode-select --install`
- **Debian/Ubuntu** — `sudo apt install build-essential python3`
- **Windows** — install [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) with the *Desktop development with C++* workload, or run `npm install --global windows-build-tools` (Node 16 path).

## Install

```bash
git clone https://github.com/TabletopFoundry/playtestai.git
cd playtestai
npm install
```

## Run the app

```bash
npm run dev       # http://localhost:3000 (hot reload)
npm run build     # production build
npm start         # serve the production build
```

## Where data lives

The SQLite database is created at `data/playtestai.sqlite` the first time the
server boots. The folder is gitignored. **Delete the file** to reset to a
clean seed state.

```bash
rm data/playtestai.sqlite*
npm run dev
```

## Verify the install

Open [http://localhost:3000](http://localhost:3000) — you should see eight
seeded projects on the Projects page. Or check the health endpoint:

```bash
curl http://localhost:3000/api/health
# { "ok": true, "version": "0.1.0", "timestamp": "..." }
```

## Disabling auto-seed in production

Seeding is automatic in `development` and `test`. In `production`, it is
**off by default**. To explicitly opt in (for example, deploying a demo
instance):

```bash
PLAYTESTAI_ENABLE_SEEDING=true npm start
```

Seeding is transactional and idempotent — re-running it never duplicates rows.

## Upgrading

```bash
git pull
npm install
npm run validate    # typecheck + lint + tests
npm run dev
```

If the schema ever changes between versions, the app prints a migration
notice on startup. For 0.1.x, the schema is stable.
