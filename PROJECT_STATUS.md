# Project status

Updated: 2026-10-08. Replace outdated entries; keep this as a snapshot.

## Implemented

- Pocket Manager mockup (S002): club creation, formation builder, transfers, fast
  season simulation, season-end finances, local save. Generated data only.
- Season roadmap home, match odds, play-to-round, key-match pauses, transitions (S003).
- Transfer market with negotiation and scouting, incoming offers, opponent styles (S004).
- Simplified play and fair money rules: auto-renewing contracts, debt → final warning →
  sacked, academy cover on sales, running costs that grow with fans (S005).
- Start by creating a club or managing one of 10 existing clubs; transfer list;
  simplified Club page and bottom bar; settings sheet (S006).
- Game rules in src/game (pure TypeScript); screens in src/screens; theme in src/ui.
- npm lockfile, lint configuration, and setup instructions in README.md.
- Spec-driven documentation and selective context-reading workflow.

## Evidence

- 2026-10-08: tsc and lint pass; web export builds; full flow played in headless Chrome
  (create club, pick slot, buy, simulate, season end, reload keeps the save).
- 40 headless careers: starting club finishes 4th–10th, typically loses money.
- S003 web flow (roadmap, play to MD3, key-match stop, season end): no console errors.
- S004 web flows (scout, reject, counter, sign, free agent, renew, offers): no errors.
- S005 balance, 30 careers × 6 seasons: frugal/rescue never sacked, reckless sacked
  2/30, smart trading climbs to ~4th. Simplified screens checked in Chrome.
- Android display not yet observed (S001-AC03, S002-AC08, S003-AC06, S004-AC09, S005-AC08).
- Save format v2: careers saved before S004 start over.

## Limits and next step

- Next: confirm on Android (T007), then plan the real player database.
- Developed on macOS; README setup steps still describe the original Windows setup.
- Initial npm audit: 23 warnings (7 moderate, 16 high). Historical result, not a fresh audit.
- Work queue: [TASKS.md](TASKS.md). Product scope: [SPECS.md](SPECS.md).
