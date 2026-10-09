# S013: Draft a new club's squad

State: Implemented; device observation pending
Source: user request 2026-10-09.

## Problem

A new club started with a ready-made squad. The user wants to build it: buy the first
players from a budget, guided by how much to spend.

## Scope and exclusions

- After naming the club, the user drafts from a pool of 54 generated players (all positions,
  half from the club's country) at founding prices (65% of market value).
- Total budget = the old founding money + what the old ready-made squad was worth. The screen
  suggests spending about that squad's value on players (and the average per player), and
  warns when the user goes above it. Squad wages are shown.
- The career can start only with 18 players (11 starters + 7 substitutes) and at least
  2 GK, 5 DEF, 5 MID and 3 ATT. A button fills the missing places with free academy youngsters.
- Drafted players are new to the club (red chemistry links unless compatriots); no transfer
  offers arrive on day one.
- Excluded: taking over an existing club (unchanged), negotiation during the draft.

## Acceptance criteria

| ID | Observable result | Verification method | Evidence / state |
| --- | --- | --- | --- |
| S013-AC01 | The draft shows the budget, the suggested spend and average per player, spending progress and wages | Web screenshot | 2026-10-09: observed |
| S013-AC02 | Start is blocked until 18 players and the position minimums are met; academy fill completes the squad | Web flow | 2026-10-09: 4 signed + 14 academy, then started |
| S013-AC03 | The career starts with the drafted squad and the money left | Web flow | 2026-10-09: $18.4M budget − $3.7M spent = $14.7M |
| S013-AC04 | Following the suggestion plays about like the old ready-made squad | Headless: 40 English seasons per strategy | 2026-10-09: finish 20.8 vs 20.3, power 67.0 vs 67.3 |
| S013-AC05 | Works in Expo Go on Android | Device observation | Pending |

## Implementation and validation

Task T026. Files: `src/game/draft.ts`, `newClubSize` / `foundingMoney` in `game.ts`,
`src/screens/DraftScreen.tsx`, NewClubScreen. Checks: lint, tsc, web flow, headless balance.
