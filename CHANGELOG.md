# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- GitHub Actions CI workflow with Node.js 20/22 matrix
- Issue templates for bug reports and feature requests
- Pull request template with validation checklist
- Dependabot configuration for automated dependency updates
- LICENSE file (MIT)
- CHANGELOG following Keep a Changelog format
- Extended validation schema test coverage
- Extended utility function test coverage
- Extended CSV export edge case tests
- Stricter ESLint rules (no-console, eqeqeq, prefer-const, no-var)

## [0.1.0] - 2025-05-17

### Added

- Initial MVP release
- Rule modeling with player counts, win conditions, resources, and cards
- Simulation engine with Random, Greedy, and Balanced AI agents
- Balance analytics: win rates, card power rankings, game length distribution
- A/B testing with version duplication and side-by-side comparison
- SQLite persistence via better-sqlite3
- CSV card import/export with formula injection protection
- Printable balance reports
- REST API with 11 endpoints
- Zod schema validation for all API inputs
- 87 tests covering simulation engine, agents, mechanics, and utilities
- Dark theme UI with Tailwind CSS 4
- Next.js 16 App Router architecture
