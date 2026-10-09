# S013: Build your squad (new club)

State: Implemented; device observation pending
Source: user requests 2026-10-09 (draft the first squad; no separate page, use the normal screens).

## Problem

A new club started with a ready-made squad. The user wants to build it from nothing with a
budget, using the normal Squad and Transfers screens (find, scout, negotiate, buy).

## Scope and exclusions

- A new club starts with no players and lands on the Squad tab.
- Budget = founding money + a player budget (the old ready-made squad's value × 1.6, i.e.
  market prices). A "Build your squad" card on Home and Squad shows what is missing, the
  suggested spend on players, the average per player, spending so far, and a warning above it.
- Kick-off stays locked (the play button shows n/18) until 18 players with at least 2 GK,
  5 DEF, 5 MID and 3 ATT. The card offers Find players and free academy youngsters for the rest.
- New signings drop into empty places in the XI; the first signing becomes captain.
- Excluded: taking over an existing club (unchanged); the separate draft page (rejected).

## Acceptance criteria

| ID | Observable result | Verification method | Evidence / state |
| --- | --- | --- | --- |
| S013-AC01 | A new club starts empty on the Squad tab with the Build your squad card and budget advice | Web screenshot | 2026-10-09: observed |
| S013-AC02 | Kick-off is locked until the squad is complete; academy fill completes it | Web flow | 2026-10-09: 0/18 locked; +18 academy, then kicked off and played |
| S013-AC03 | Spending the suggestion on the market plays about like the old squad | Headless auto-buyer, 30 English seasons | 2026-10-09: finish 20.2 vs 19.4, power 67.2 vs 67.3; money ends lower (higher wages) |
| S013-AC04 | Works in Expo Go on Android | Device observation | Pending |

## Implementation and validation

Task T026. Files: `newClubBudget` and the empty squad in `game.ts`, `squadNeeds` in
`market.ts`, `fillAcademy` action, `src/screens/BuildSquad.tsx`, MainScreen, SquadScreen, ClubScreen.
