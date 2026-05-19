---
id: why
title: Why PlaytestAI
sidebar_position: 91
description: How PlaytestAI compares to the alternatives, and when not to use it.
---

# Why PlaytestAI

## The problem we're solving

Human playtesting is the right way to find out whether a game is **fun**. It
is an expensive, slow, and noisy way to find out whether a game's **math is
broken**. The most common reasons playtests fail aren't gameplay problems:

- One card wins every game it's drawn turn 1.
- The first player wins 65% of two-player matches.
- One strategy dominates and nobody discovers the others.
- Games end on the turn cap with nobody close to the win condition.

These are math problems. Computers find math problems faster than humans.

## The alternatives

### Spreadsheet modelling

Designers commonly model expected card value in a spreadsheet. This catches
the most obvious mispricings but cannot model:

- Card interactions across a turn.
- Resource curves over a game.
- Skill differential between strategies.
- Distribution shape (mean vs. tail).

Spreadsheets give you point estimates. PlaytestAI gives you distributions.

### Hand-rolled simulations

Many designers eventually write a one-off Python script to simulate their
game. It works, but:

- It dies in a private repo after one project.
- It has no UI for comparing variants.
- Re-running last month's experiment is impossible.
- A teammate can't reproduce your numbers.

PlaytestAI is the productised version of that script, kept consistent
across projects and versions.

### Commercial board-game design tools

There are tools for **producing** prototypes (Component Studio, NanDeck) and
tools for **playing** them online (Tabletop Simulator, Tabletopia). None of
them simulate balance. PlaytestAI sits before either step.

### Just playtesting more

Always do this too — PlaytestAI doesn't replace it. But:

- 4 humans × 1 hour = 4 games.
- 1 laptop × 1 hour = 100,000 games.

Use humans to validate fun. Use simulation to validate math.

## When not to use PlaytestAI

PlaytestAI is a **bad fit** if:

- Your game is primarily about hidden information and bluffing.
- Your game is primarily about spatial play and board topology.
- Your game has no card/resource economy to speak of.
- You're tuning the **theme**, not the **numbers**.

For those, the human playtest is your only tool.

## Design principles we hold

These are the decisions that shape the tool — explicitly, so you can argue
with them.

### 1. Local-first

No accounts. No telemetry. No cloud. Your designs are yours, and the tool
works on a plane.

### 2. Deterministic by default

Same seed, same result. Every output can be reproduced. We refuse to ship
features that break this.

### 3. Opinionated balance score

A single number is reductive on purpose. Designers need a target to push
toward, not a 12-dimensional vector to interpret. The sub-scores are right
there if you want to look.

### 4. Versions are first-class

Every change is a new version. Old runs stay tied to the version they ran
against. History is preserved by default; nothing about your design work
is implicit.

### 5. No "AI" magic in the agents

The three AI agents are 200 lines of TypeScript and a constants file. You
can read them in fifteen minutes. We will never replace them with a
black-box model — the whole tool's value is being able to defend a number.

## What we'd like to add

In rough order of "what we'd build next":

1. **Set / draft simulation** — simulate the deck-building phase, not just play.
2. **Hidden information modelling** — partial-observation agents.
3. **Plot-export per-game** — visualise one game's full turn trace.
4. **Multi-tournament aggregation** — cross-project meta analytics.
5. **Plugin agents** — load a third-party agent module at runtime.

Open an [issue](https://github.com/TabletopFoundry/playtestai/issues)
or [discussion](https://github.com/TabletopFoundry/playtestai/discussions)
if any of those would change your workflow — we sort the roadmap by demand.
