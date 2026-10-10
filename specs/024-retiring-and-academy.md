# S024: Visible retirements and an always-open academy

State: Implemented; Android observation pending.
Source: user request (2026-10-10): the Club tab says a player retires, but the Squad pitch area
does not show who; the academy is hidden and should always be reachable.

## Problem

Retiring players were tagged only on the pitch, so a retiring substitute or reserve in the green
bench strip had no mark, and the note did not name them. The academy worked only in the
background (season-end graduates, cover after a sale, a fill button while the squad is short).

## Scope and exclusions

In scope: retirement tags in the bench strip, names in the Club note, an Academy row and sheet on
the Club tab, and one academy call-up per transfer window.
Excluded: academy facilities, upgrades or a separate youth squad.

## Acceptance criteria

| ID | Observable result | Verification method | Evidence / state |
| --- | --- | --- | --- |
| S024-AC01 | A retiring player shows a red LAST SEASON tag on the pitch and in the bench strip (subs and reserves) | Web: Brighton (Steele 36, Milner 40) | Passed (web) |
| S024-AC02 | The Club note names up to two retiring players ("Steele and Milner retire after this season"), else gives the count; it opens the Squad tab | Web | Passed (web) |
| S024-AC03 | The Club tab always has an Academy row (shows "Call-up ready" when one is available, else the academy player count) that opens an Academy sheet with the youth coach and the academy players in the squad | Web | Passed (web) |
| S024-AC04 | In a transfer window, with fewer than 25 players, the user can call up one youngster (16–18, $50K wage) per window; otherwise the button is disabled with the reason | Web: call-up added 1 player, then "Next call-up in the next window" | Passed (web) |
| S024-AC05 | All of the above on Android | Device observation | Pending |

## Implementation and validation

Task T040. Rules: src/game/market.ts (academyCallUp, academyCallUpBlocker, fromAcademy flag),
src/game/game.ts. UI: src/screens/AcademySheet.tsx, ClubScreen.tsx, SquadScreen.tsx.
Academy players from before this change have no flag and are not listed.
Checks: tsc, lint, web export, headless Chrome flows, 0 console errors.
