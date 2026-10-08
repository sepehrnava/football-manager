# Project status

Updated: 2026-10-08. Replace outdated entries; keep this as a snapshot.

## Implemented

- Pocket Manager mockup (S002): club creation, formation builder, transfers, fast
  season simulation, season-end finances, local save. Generated data only.
- Game rules in src/game (pure TypeScript); screens in src/screens; theme in src/ui.
- npm lockfile, lint configuration, and setup instructions in README.md.
- Spec-driven documentation and selective context-reading workflow.

## Evidence

- 2026-10-08: tsc and lint pass; web export builds; full flow played in headless Chrome
  (create club, pick slot, buy, simulate, season end, reload keeps the save).
- 40 headless careers: starting club finishes 4th–10th, typically loses money.
- Android display of the mockup not yet observed (S002-AC08, S001-AC03).

## Limits and next step

- Next: confirm on Android (T007), then plan the real player database.
- Developed on macOS; README setup steps still describe the original Windows setup.
- Initial npm audit: 23 warnings (7 moderate, 16 high). Historical result, not a fresh audit.
- Work queue: [TASKS.md](TASKS.md). Product scope: [SPECS.md](SPECS.md).
