---
id: api
title: REST API reference
sidebar_position: 1
description: Every HTTP endpoint exposed by the PlaytestAI server.
---

# REST API reference

The PlaytestAI Next.js server exposes a small REST API under `/api`. All
endpoints accept and return JSON. Inputs are validated with
[Zod](https://zod.dev/) schemas defined in
[`lib/validation.ts`](https://github.com/TabletopFoundry/playtestai/blob/main/lib/validation.ts).

Base URL during local development: `http://localhost:3000`.

## Conventions

- **Content type** — all bodies are `application/json`.
- **Error shape** — `{ "error": "<message>", "issues"?: [...] }`.
- **`DELETE`** — deleting a **project** returns `204 No Content`. Deleting a
  child resource (version, run) returns `200` with the updated parent
  `{ project }` payload so the client can refresh state in a single round trip.

## `GET /api/health`

Health probe. Returns version and timestamp.

```bash
curl http://localhost:3000/api/health
```

```json
{
  "ok": true,
  "version": "0.1.0",
  "timestamp": "2025-05-18T12:34:56.789Z"
}
```

## `GET /api/projects`

List all projects with lightweight summaries.

```bash
curl http://localhost:3000/api/projects
```

```json
{
  "projects": [
    {
      "id": "proj_01HJYZ...",
      "name": "Aether Drift",
      "description": "Tempo-based deck builder",
      "createdAt": "2025-05-17T10:00:00.000Z",
      "updatedAt": "2025-05-17T11:30:00.000Z",
      "versionCount": 5,
      "runCount": 4,
      "latestRun": { /* SimulationRun or null */ }
    }
  ]
}
```

## `POST /api/projects`

Create a new project. Returns `201 Created`.

```bash
curl -X POST http://localhost:3000/api/projects \
  -H 'content-type: application/json' \
  -d '{
    "name": "Spark Duel",
    "description": "Tiny 2P resource battler",
    "playerCountMin": 2,
    "playerCountMax": 2,
    "winConditionType": "first_to_x"
  }'
```

Required fields: `name`, `description`, `playerCountMin`, `playerCountMax`,
`winConditionType` (`"highest_score" | "first_to_x" | "last_standing"`).

## `GET /api/projects/:id`

Get a single project, including all versions and runs.

```bash
curl http://localhost:3000/api/projects/proj_01HJYZ...
```

Returns `404` if the project doesn't exist.

## `PUT /api/projects/:id`

Update name/description.

```bash
curl -X PUT http://localhost:3000/api/projects/proj_01HJYZ... \
  -H 'content-type: application/json' \
  -d '{ "name": "Spark Duel", "description": "Updated blurb" }'
```

## `DELETE /api/projects/:id`

Delete a project and **all** of its versions and runs. Returns `204 No Content`.

```bash
curl -X DELETE http://localhost:3000/api/projects/proj_01HJYZ...
```

## `POST /api/projects/:id/versions`

Duplicate a version. The request body specifies which version to clone.

```bash
curl -X POST http://localhost:3000/api/projects/proj_01HJYZ.../versions \
  -H 'content-type: application/json' \
  -d '{ "sourceVersionId": "vers_01HJYZ...", "label": "v2 — Finisher nerf" }'
```

Returns `201` with the updated `{ project }` payload (so the client can pick
up the new version without a follow-up `GET`).

## `PUT /api/projects/:id/versions/:vid`

Replace a version's definition. The body is the full
[`GameVersion`](./data-model.md#gameversion) payload minus the immutable IDs.

```bash
curl -X PUT http://localhost:3000/api/projects/proj_01HJYZ.../versions/vers_01HJYZ... \
  -H 'content-type: application/json' \
  -d @version.json
```

Returns `200` with `{ project }`.

## `DELETE /api/projects/:id/versions/:vid`

Delete a version (and any runs that referenced it).

```bash
curl -X DELETE http://localhost:3000/api/projects/proj_01HJYZ.../versions/vers_01HJYZ...
```

Returns `200` with `{ project }`.

## `POST /api/projects/:id/runs`

Persist a simulation run. The body is a complete `SimulationRun` payload
(client-computed). The server validates structure but does not re-run the
simulation.

```bash
curl -X POST http://localhost:3000/api/projects/proj_01HJYZ.../runs \
  -H 'content-type: application/json' \
  -d @run.json
```

Returns `201` with `{ project }`.

> Why client-computed? Simulations are deterministic and CPU-bound. Running
> them in the browser keeps the server stateless and avoids long-running
> HTTP requests. The server's job is persistence and validation only.

## `DELETE /api/projects/:id/runs/:rid`

Delete a stored simulation run.

```bash
curl -X DELETE http://localhost:3000/api/projects/proj_01HJYZ.../runs/run_01HJYZ...
```

Returns `200` with `{ project }`.

## Error responses

All endpoints return JSON errors with appropriate HTTP status:

| Status | Meaning |
| --- | --- |
| `400` | Validation failure. The `issues` array contains Zod issue paths. |
| `404` | Resource not found. |
| `409` | Conflict — e.g., creating a project with a duplicate name. |
| `500` | Unexpected server error. Check the server logs. |

Example validation error:

```json
{
  "error": "Invalid input",
  "issues": [
    { "path": ["playerCountMin"], "message": "Must be at least 1" }
  ]
}
```
