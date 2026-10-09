# S007: Real-name English league from editable data

State: Implemented; player data to be filled by the user; Android observation pending.
Source: user decision (2026-10-09): real club and player names (no badges or photos),
English league first, real size (20 clubs), ratings entered by the user. Related: D008.

## Scope

- League pack from `data/english/*.csv`, converted by `npm run build:league` with
  validation; the game falls back to the fictional league if the pack has no clubs.
- Any even league size; season length and the mid-season window follow it.
- Clubs: real squads first, generated players fill missing lines; level from best 11.
- Prize money scales with league size and strength; a new club starts just below the
  weakest club with a founding investment.
- Disclaimer on the start screen and in Settings while real names are in use.
- Excluded: badges, photos, real league names, scraped or copied ratings.

## Acceptance criteria

| ID | Observable result | Verification method | Evidence / state |
| --- | --- | --- | --- |
| S007-AC01 | Converter accepts valid rows and reports invalid ones by file and line | Ran with bad rows: 4 precise errors, no file written | Passed |
| S007-AC02 | The English league loads with 20 clubs and 38 matchdays; window after matchday 19 | Web: Brentford career, 0/38, mid-window at MD19 | Passed (web) |
| S007-AC03 | Every club is playable: passive play is roughly break-even at the expected finish | Headless, 15 careers × 3 seasons per club | Passed |
| S007-AC04 | A new club can climb by developing young players without being sacked | Headless youth strategy, 20 careers: 18th → ~8th by season 8, 0 sacked | Passed |
| S007-AC05 | Disclaimer shown while real names are in use | Web start screen and Settings | Passed (web) |
| S007-AC06 | Real player data filled in for the 20 clubs | 400 players (17–23 per club) from 2025/26 knowledge, own ratings; converter passed | Passed; user to verify transfers |
| S007-AC08 | Economy stays balanced whatever ratings are entered (relative to the league) | Headless: every club near break-even at its expected finish; youth strategy 18th → ~5th, 0 sacked; frugal 0 sacked | Passed |
| S007-AC07 | Shown correctly on Android | Device observation | Pending |
