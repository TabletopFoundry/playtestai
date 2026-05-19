---
id: troubleshooting
title: Troubleshooting & FAQ
sidebar_position: 90
description: Solutions to the problems users actually hit.
---

# Troubleshooting & FAQ

## Install and startup

### `better-sqlite3` fails to compile

You're missing a C toolchain. Install it:

- **macOS**: `xcode-select --install`
- **Debian/Ubuntu**: `sudo apt install build-essential python3`
- **Windows**: install [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) with the *Desktop development with C++* workload.

Then:

```bash
rm -rf node_modules package-lock.json
npm install
```

### "Port 3000 already in use"

Either kill the other process or use a different port:

```bash
PORT=4000 npm run dev
```

### Database is locked

SQLite uses WAL mode by default, so concurrent reads are fine. A "database
is locked" error usually means two dev servers are pointing at the same
file. Kill the extra process.

If the lock persists, clear the WAL files:

```bash
rm data/playtestai.sqlite-shm data/playtestai.sqlite-wal
```

### App boots but no seed data

Seeding only runs in `development` and `test` by default. In production
(`NODE_ENV=production`) you must explicitly opt in:

```bash
PLAYTESTAI_ENABLE_SEEDING=true npm start
```

If seeding is enabled and you still see no projects, you probably already
have a database file with the seed marker set but the projects deleted.
Reset:

```bash
rm data/playtestai.sqlite*
npm run dev
```

## Simulations

### Simulation runs but the dashboard is empty

Look at the run config. If `games` was set very low (e.g., 1–10), some
analytics panels won't render meaningfully. Raise to at least 500.

### Card never gets played

Either the AI considers it too weak (low `powerScore`), or it's literally
unreachable — `cost` exceeds the maximum economy any agent can accumulate in
`maxTurns`. Check by computing `startAmount + gainPerTurn × maxTurns` for
each resource.

### One seed shows balance score 80, another shows 55

Your sample size is too low for the variance in your game. Raise `games` to
10,000 and the spread will collapse. If it doesn't, your game genuinely has
high variance — that's a design finding, not a tool bug.

### Simulation feels slow

Sanity checks, in order:

1. Are you running with the dev server (`npm run dev`)? It's slower than
   `npm run build && npm start`.
2. Is your `games` × `playerCount` particularly large? 10k×4 with deep cards
   can take 30+ seconds.
3. Browser tab in background? Some browsers throttle background timers.
   Keep the tab focused.

### Results disagree between runs of the same config

Genuinely shouldn't happen. If it does:

1. Verify both runs targeted the same `versionId`. The Compare tab makes
   this clear.
2. Confirm the version wasn't edited between runs.
3. File an issue with both run payloads attached. This would be a
   determinism regression and we want to know.

## A/B compare

### Compare panel shows only one version

The other version isn't `published`. Open the version sidebar and toggle
its publish state.

### Numbers don't match the dashboard

The Compare tab shows latest runs per version by default. If you stored
multiple runs against the same version, the compare picker lets you choose
which one — it isn't necessarily the same as what the dashboard shows.

## CSV import

### "duplicate name" on import

Card names must be unique within a version. Add a suffix (`Spark`, `Spark+`)
or rename one.

### Numbers get treated as text

You exported from Excel and a `=`-prefixed value got stored. The exporter
prefixes with a single quote to neutralise formula injection; the importer
strips the quote. If you hand-built the CSV with literal `=` values,
prefix them with `'` yourself.

## Production

### Auto-seed doesn't run in production

By design. Set `PLAYTESTAI_ENABLE_SEEDING=true`.

### Database file grows large

Each stored run includes the full result payload (cards × games). If you
have 500+ runs, the file can reach hundreds of MB. Use the UI's trash icon
to delete old runs, or back up and reset:

```bash
cp data/playtestai.sqlite ~/backups/$(date +%F)-playtestai.sqlite
sqlite3 data/playtestai.sqlite "DELETE FROM runs WHERE createdAt < '2025-01-01';"
sqlite3 data/playtestai.sqlite "VACUUM;"
```

## FAQ

### Does it work offline?

Yes. Once installed, PlaytestAI needs no network. Everything runs locally.

### Can I host it on a public URL?

Yes — `npm run build && npm start` behind a reverse proxy works. There is
no auth layer; do not put it on the public internet without one.

### Is there a CLI?

Not yet — everything goes through `npm run` and the HTTP API. The
simulation engine is plain TypeScript, so writing your own CLI is a few
lines:

```ts
import { runBatchSimulation } from "@/lib/simulation/engine";
import { loadVersion } from "@/lib/db/versions";

const version = loadVersion(process.argv[2]);
const result = runBatchSimulation(version, {
  games: 5000, playerCount: 2, seed: 42, agentTypes: ["balanced","balanced"],
});
console.log(result.summary);
```

### Does it support drafting / set design?

Not at v0.1. The simulation model assumes a shared deck per version. Set
balance is on the roadmap.

### Can I use my own AI agent?

Yes — implement the `Agent` interface in `lib/simulation/agents.ts` and add
it to the `AgentType` union. Tests in `__tests__/agents.test.ts` cover the
contract.

### Where can I ask questions?

[GitHub Discussions](https://github.com/TabletopFoundry/playtestai/discussions).
Bugs and feature requests: [issues](https://github.com/TabletopFoundry/playtestai/issues).
