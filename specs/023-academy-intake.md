# S023: Academy intake

State: Implemented; Android observation pending.
Source: user request (2026-10-10): a youth academy, kept simple. Replaces the automatic
graduate who joined every season without a choice.

## Scope

- Each pre-season (and a new career's first) the academy presents 3 prospects aged 16–17,
  rated 48–60, potential +6 to +26 (a better youth coach adds a little).
- The user promotes one for free (youth contract $50K, 3 seasons) from a Club-tab row; the others
  leave at kick-off. Promotion is blocked at the 25-player squad limit.
- Potential is shown as a range the youth coach can judge: 12 points wide at 1 star, down to 2 at
  5 stars (truth inside the range).
- The academy still fills a squad that is short of 18; it no longer adds a graduate every season.
- Older saves get the current window's intake once on load. None in the Daily Challenge.
- Excluded for now: paid academy upgrades (possible next step).

## Acceptance criteria

| ID | Observable result | Verification method | Evidence / state |
| --- | --- | --- | --- |
| S023-AC01 | New careers and each pre-season have 3 prospects; promote adds one; kick-off clears | Headless cycle | Passed: promote 21 → 22, kick-off clears, season 2 new intake, no automatic graduate |
| S023-AC02 | The Club tab's Academy row (always shown, S025) says "Promote 1 of 3" and opens the Academy sheet; Promote adds the player, clears the intake and lists them under Academy players | Web flow | Passed: row shown on an older save, reserves 3 → 4, intake gone; 2026-10-10 merged sheet (web): row "Promote 1 of 3", Academy players 0 → 1, row then "1 player"; headless squad 23 → 24 |
| S023-AC03 | Same on Android | Device observation | Pending |

## Implementation

Task T039. game/academy.ts (academyIntake, prospectRange, promoteProspect), game.ts (create,
next season, kick-off, load), types.ts (GameState.academy), AcademySheet, ClubScreen.
Also in this task: the season timeline is wider (80 px per stop) and upcoming stops have no grey
ring (S016).
