---
id: intro
title: Welcome to PlaytestAI
sidebar_position: 1
description: AI-powered playtesting and balance analysis for card-driven board games.
---

# PlaytestAI

**Balance your card game before humans touch it.**

PlaytestAI is an open-source workbench for card-driven board game designers.
You define your rules, cards, and resources, and the engine runs **hundreds to
tens of thousands of automated playtests** against three AI archetypes. You
get a balance score, win-rate tables, card power rankings, and a flagged-issue
list — in seconds, in your browser.

It is the tool you reach for **before** the prototype hits a table, and again
every time you tweak a number.

## What you can do with it

- **Find first-player advantage** before your testers do.
- **Catch the broken opener** — the one card that wins 78% of games when drawn turn 1.
- **A/B test two versions** of the same deck and decide with data, not gut feeling.
- **Replay any result** — every run is deterministic on a seed.
- **Export a balance report** you can hand to a publisher.

## Who it's for

- **Solo game designers** prototyping deck builders, TCGs, drafters, and skirmish games.
- **Small studios** standardising a balance gate in their design process.
- **Educators and students** studying mechanics, game theory, and Monte Carlo testing.

## What it isn't

PlaytestAI is **not** a replacement for human playtesting. It cannot tell you
whether your game is *fun*. It tells you whether your game is *mathematically
fair*, *strategically interesting*, and *free of dominant lines* — so that
your human playtests can focus on what only humans can judge.

## Where to start

- New to the project? Run the [5-minute quickstart](/getting-started/quickstart).
- Want the mental model first? Read [Core Concepts](/concepts/overview).
- Comparing tools? See [Why PlaytestAI](/why).
- Looking for a specific endpoint or constant? Jump to the [API Reference](/reference/api).

## Project status

PlaytestAI is at **v0.1** — the MVP is feature-complete, well-tested
(141 passing tests), and used by the maintainers on real designs. The
simulation model and balance score are deliberately simple and documented end
to end so you can decide how much to trust them for your game.
