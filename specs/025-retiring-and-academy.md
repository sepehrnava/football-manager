# S025: Visible retirements and an always-open academy

State: Implemented; Android observation pending.
Source: user requests (2026-10-10): the Club tab says a player retires, but the Squad pitch area
does not show who; the academy is hidden and should be its own row; Club rows need icons; no white cards.

## Problem

Retiring players were tagged only on the pitch, so a retiring substitute or reserve in the green
bench strip had no mark, and the note did not name them. The academy worked only in the
background (season-end graduates, cover after a sale, a fill button while the squad is short).

## Scope and exclusions

In scope: retirement tags in the bench strip, names in the Club note, Staff and Academy rows,
icons for every Club tab row, plain Next match and Money sections, and an always-open Academy
sheet that also holds the S023 intake.
Excluded: academy facilities, upgrades or a separate youth squad.

## Acceptance criteria

| ID | Observable result | Verification method | Evidence / state |
| --- | --- | --- | --- |
| S025-AC01 | A retiring player shows a red LAST SEASON tag on the pitch and in the bench strip (subs and reserves) | Web: Brighton (Steele 36, Milner 40) | Passed (web) |
| S025-AC02 | The Club note names up to two retiring players ("Steele and Milner retire after this season"), else gives the count; it opens the Squad tab | Web | Passed (web) |
| S025-AC03 | The Club tab list always has Staff (stars) and Academy rows with icons, in the same style as the Daily challenge row (Academy shows "Promote 1 of 3" in a pre-season with an intake, else the academy player count); Academy opens a sheet with the youth coach, the S023 intake (Promote) and the academy players in the squad | Web at 360 px | Passed (web) |
| S025-AC07 | Next match and Money sit on the page background (no white cards) | Web at 360 px | Passed (web) |
| S025-AC06 | Every row in the Club tab list has an icon like the Daily challenge: offers (arrows), retirements (hourglass), cups (trophy), money trouble (warning) | Web | Passed (web) |
| S025-AC04 | ~~One academy call-up per transfer window~~ Removed when merged with S023: the pre-season intake is the way youngsters join | — | Superseded by S023 |
| S025-AC05 | All of the above on Android | Device observation | Pending |

## Implementation and validation

Task T041 (academy merged with S023 in T043). Rules: fromAcademy flag on academy fills and
promoted prospects (src/game/market.ts, academy.ts). UI: src/screens/AcademySheet.tsx, ClubScreen.tsx, SquadScreen.tsx, src/ui/icons.tsx.
Academy players from before this change have no flag and are not listed.
Checks: tsc, lint, web export, headless Chrome flows, 0 console errors.
