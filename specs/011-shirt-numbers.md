# S011: Shirt numbers

State: Implemented; device observation pending
Source: user requests 2026-10-09. Drawn faces were prototyped and rejected; photos are excluded by D008.

## Problem

Players are names and ratings only. A picture helps recognise them, but photos are not
allowed (D008) and drawn faces were not liked and could misrepresent real people.

## Scope and exclusions

- Each player in the user's squad has a shirt number, given when he joins and then kept.
  The best players get classic numbers for their position first (GK 1, ST 9, CAM 10, ...).
- A shirt in the club's colours and crest pattern shows the number: in the squad lists and on
  the player sheet of the user's own players.
- Old saves get numbers on load. Excluded: faces, photos, numbers for other clubs' players.

## Acceptance criteria

| ID | Observable result | Verification method | Evidence / state |
| --- | --- | --- | --- |
| S011-AC01 | Squad rows and the player sheet show the club shirt with the player's number | Web screenshots | 2026-10-09: observed, no console errors |
| S011-AC02 | Numbers are unique in the squad and never change for a player across seasons and transfers | Headless: 6 careers × 4 seasons, selling every offer | 2026-10-09: OK |
| S011-AC03 | Shirts render in Expo Go on Android | Device observation | Pending |

## Implementation and validation

Task T024. Files: `src/game/numbers.ts` (assignment, run after every reducer step),
`src/ui/avatar.tsx` (ShirtAvatar), SquadScreen rows, PlayerSheet squad view.
Package: react-native-svg (SDK-matched version).
