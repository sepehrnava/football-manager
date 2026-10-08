# S004: Transfer market, contracts and tactic counters

State: Implemented; Android device observation pending. Contract renewal, scouting levels
and the selling limits were simplified by [S005](005-simple-and-fair.md).
Source: user request (2026-10-08): the challenge should be managing the squad and money,
not playing matches. No divisions, levels or fatigue. Builds on S002/S003.

## Problem

Buying was "pay the listed price", wages were automatic and nothing pushed back, so
building a strong squad was effortless.

## Scope and exclusions

In scope: AI clubs with real squads, negotiation, scouting uncertainty, contracts with
renewal raises and free departures, incoming offers, quick sales, board warning, opponent
styles with per-match tactic plans. Excluded: divisions/levels, fatigue, continental cups.

## Acceptance criteria

| ID | Observable result | Verification method | Evidence / state |
| --- | --- | --- | --- |
| S004-AC01 | AI club strength comes from its squad; buying a starter weakens the seller | Engine (refreshClubs on transfer) | Passed |
| S004-AC02 | Bids are accepted, countered, rejected or end talks; free agents need no fee | Web flow: rejection, then 110% + counter signed; free agent signed | Passed (web) |
| S004-AC03 | Market ratings show as ranges until scouted; scouting costs money and narrows them | Web: 66–76 → 68–72 after $150K | Passed (web) |
| S004-AC04 | Contracts have wage and length; final-year players can renew at a demanded raise or leave free | Web renew sheet; season summary lists free departures | Passed (web) |
| S004-AC05 | AI clubs bid for user players each window; accept or reject | Web: offers shown above/below value | Passed (web) |
| S004-AC06 | Projected season-end money and a board warning before a sacking | Transfers and Club screens | Passed (web) |
| S004-AC07 | Opponent style revealed after facing them; planned tactic counters it (±3) | Engine + match preview | Passed (web) |
| S004-AC08 | Hard but fair: passive play declines, smart trading climbs over seasons | Headless, 30 careers × 5 seasons: passive 6.4→9.3, renew-all ~6, smart 6.2→3.8 (5/30 sacked) | Passed |
| S004-AC10 | Squad always holds 18+ players (11 starters + 7 subs) with 2 GK, 5 DF, 5 MD, 3 AT; sales that break this are blocked; academy fills gaps | Headless 450 seasons: min 18 at kick-off, 0 shortfalls; web: sale blocked at 18 | Passed |
| S004-AC09 | All of the above on Android | Device observation | Pending |

## Implementation and validation

Engine: src/game/market.ts (world, prices, bids, offers, contracts, season advance),
game.ts (actions, counters, projection), insights.ts (odds with known styles).
UI: TransfersScreen, PlayerSheet (market/squad views), MatchSheet plans, Club desk.
Saves use format v2; older saves start a new career. Tuning lives in constants.ts.
