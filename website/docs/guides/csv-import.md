---
id: csv-import
title: Import cards from CSV
sidebar_position: 3
description: Bulk-define cards in a spreadsheet and paste them in.
---

# Import cards from CSV

For anything beyond a dozen cards, editing in the spreadsheet is faster than
clicking through forms. PlaytestAI accepts a flat CSV with one card per row.

## Format

The header row is required. Every column shown below is recognised. Any
column you add beyond these is treated as a **custom stat** and stored in
the card's `stats` map.

```csv
name,cost,power,quantity,damage,shield,draw,economy,score,notes
Spark,1,1,6,1,0,0,0,0,Cheap chip damage
Surge,2,2,5,2,0,0,0,0,
Charge,1,0,4,0,0,0,1,0,Ramps economy
Scry,1,0,4,0,0,1,0,0,Card filter
Overload,4,3,3,3,0,0,0,2,Finisher
Finisher,5,4,2,4,0,0,0,4,Real finisher
```

### Required columns

| Column | Type | Notes |
| --- | --- | --- |
| `name` | string | Used as the displayed card name. Must be unique within a version. |
| `cost` | integer ≥ 0 | Resource cost to play. |
| `power` | integer ≥ 0 | Base board power. |
| `quantity` | integer ≥ 1 | Copies in the shared deck. |

### Known custom stats

These are recognised by the simulation engine and get weighted appropriately:

`damage`, `shield`, `draw`, `economy`, `score`, `steal`, `combo`

### Free-form custom stats

Any other column header becomes a generic custom stat with per-unit weight
`0.35` (configurable in [simulation constants](../reference/simulation-constants.md)).

For example, a `taunt,1` column becomes `stats: { taunt: 1 }` — the engine
won't know what "taunt" means semantically but will treat it as a small
positive value.

## How to import

1. In the **Definition** tab, open the **Cards** section.
2. Click **Import CSV**.
3. Paste the CSV text (or upload a file).
4. The panel previews parsed rows and flags errors per-row.
5. Click **Replace cards** (overwrites the whole card list) or **Append** to
   add to the existing list.

## How to export

1. From the **Definition** tab, click **Export CSV**.
2. The downloaded file uses the same format and re-imports cleanly.

> **Formula injection guard.** The exporter prefixes any field starting with
> `=`, `+`, `-`, or `@` with a single quote, so opening the file in Excel
> doesn't execute it as a formula. The single quote is stripped on re-import.

## Validation

Imports are validated with the same Zod schemas as the API. Common errors:

| Error | Cause |
| --- | --- |
| `name must not be empty` | Blank name cell. |
| `cost must be a non-negative integer` | Decimal or negative number in `cost`. |
| `quantity must be at least 1` | A card with zero copies makes no sense. |
| `duplicate name "Spark"` | Two rows share a `name`. |

Fix the rows, paste again, and re-import. The version is only modified after
a clean parse.
