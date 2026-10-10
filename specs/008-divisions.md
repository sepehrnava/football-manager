# S008: Divisions with promotion and relegation

State: Implemented; Android device observation pending.
Source: user request (2026-10-09): more content: league levels with promotion and relegation,
continental cups later. Builds on S007.

## Scope

- League data supports divisions (`division` column in clubs.csv). English pack: First
  Division (20 clubs, real players) and Second Division (24 real clubs, generated players).
- Generic division names only (no trademarked competition names).
- Every division plays a full season each year; other divisions keep pace with the user's
  matchdays. Bottom 3 and top 3 swap divisions at season end.
- A new club starts in the lowest division. TV money ($3M) keeps lower divisions survivable.
- Generated players never take a real player's name.
- Excluded for now: continental cups (planned next), playoffs.

## Acceptance criteria

| ID | Observable result | Verification method | Evidence / state |
| --- | --- | --- | --- |
| S008-AC01 | Both divisions play all fixtures each season; sizes stay 20/24; 3 up, 3 down | Headless, 2 careers × 5 seasons | Passed (0 problems) |
| S008-AC02 | User club is promoted or relegated with its finish | Headless: Burnley relegated then promoted; web: Leicester champions, promoted banner | Passed |
| S008-AC03 | League tab switches divisions and shows promotion/relegation zones | Web screenshot | Passed (web) |
| S008-AC04 | Careful play survives in the Second Division; youth strategy climbs | Headless: frugal, rescue, youth 0 sacked; youth ~6th of Div 2 by season 8 | Passed |
| S008-AC05 | Generated names never duplicate real players | Headless: 17,143 generated, 0 clashes | Passed |
| S008-AC07 | "Manage a club" first picks a league, then a club ranked by expected finish, with division-specific labels | Web: league cards, ranked Second Division list, back steps, managed Wolves | Passed (web) |
| S008-AC08 | After a season ends, its tables (match screen, League tab) still show the final order, matching the season-end position, although clubs have already moved division | Headless: 180 seasons incl. 38 with a move, 0 mismatches (was 76 of 120) | Passed |
| S008-AC06 | Shown correctly on Android | Device observation | Pending |
