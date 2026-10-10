# S028: A harder game and quicker auto-play

State: Implemented; user play-test and Android observation pending.
Source: user feedback (2026-10-10): a mid-table Second Division club became champion with a large
point difference after buying some good players; buying good players is too easy and the
mechanics are too easy; auto-play waits too long between matches. Related: S005 (fair money), S024.

## Problem

Top-flight veterans cost a fraction of their strength: players aged 32+ were priced at 45% of a
prime player's value (29–31: 70%) although they play at full strength this season. A few such signings
lifted a mid-table club far above its division, and matches let the stronger side dominate (a 10-point
gap meant 1.65× the goals), so title races were won by wide margins.

## Scope and exclusions

- Prices: age factor 29–31 from 0.70 to 0.85, 32+ from 0.45 to 0.70 (src/game/players.ts).
  This also raises sale offers for the user's older players.
- Matches: goal expectation per rating gap flattened (e-fold per 20 → 24 rating points,
  GOAL_SLOPE in src/game/league.ts), so upsets are likelier and margins smaller. Applies to every match.
- Auto-play: 1.3 s between matchdays (was 1.8 s); the score count-up is shortened to fit
  (src/screens/SimScreen.tsx, src/ui/matchFx.tsx).
- Excluded: new mechanics, difficulty setting, wages, budgets, AI behaviour, prize money.
  Further levers if this is still too easy: wage premium for stars joining smaller clubs,
  AI clubs strengthening after a title, stricter sale bids.

## Acceptance criteria

Yardstick: a headless bot that buys the best improvement per dollar within the game's own
"safe to spend" (and optionally lists its surplus and takes the bids), English Second Division,
24 seeded careers, first season, mid-table club (Stoke City) and top club (Ipswich Town).

| ID | Observable result | Verification method | Evidence / state |
| --- | --- | --- | --- |
| S028-AC01 | A smart buyer at a mid-table Second Division club wins the title clearly less often | Headless bot, 24 seeds | Passed: buy+sell titles 9/24 → 2/24, top two 13/24 → 2/24; buy only 1/24 → 5/24 (noisy), top two 9 → 6 |
| S028-AC02 | The strongest club of a division still wins about as often | Headless bot, Ipswich Town | Passed: titles 12/24 → 12/24 (buy), 9/24 → 10/24 (buy+sell) |
| S028-AC03 | Doing nothing never gets a club sacked, in either division | 6 clubs × 12 careers × 4 seasons | Passed: 0/72 ended early before and after; positions within about one place (top club 2.0 → 2.8) |
| S028-AC04 | Auto-play advances a matchday about every 1.3 s and the result stamp still shows | Web timing | Passed (web): 1.37 s average (was 1.84 s); stamp on screen ~67% of the time; 0 console errors |
| S028-AC05 | The user finds the game harder but fair | User play-test | Pending |

## Implementation and validation

Task T046. Checks: tsc, lint, headless bot runs, web timing run. The bot is a rough proxy for a
human (it does not choose tactics or chemistry): the user's play-test decides whether to turn the
levers further.
