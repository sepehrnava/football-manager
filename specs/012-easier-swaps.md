# S012: Easier swaps

State: Implemented; device observation pending
Source: user request 2026-10-09 (swapping needed a long scroll to the substitutes).

## Problem

To bring on a substitute the user tapped a pitch player, then scrolled down to the
substitutes list. The selected player was hard to see, and the instruction bar covered the pitch.

## Scope and exclusions

- The selected player (on the pitch or the bench) gets a pulsing gold ring and grows slightly.
- A bench strip joined to the bottom of the pitch shows the substitutes, then the reserves,
  as tokens that scroll sideways. Tapping works both ways: pitch then bench, or bench then pitch.
- While a pitch position is selected, bench tokens show the rating there and any −N penalty.
- The instruction and Details / Cancel live in the bench header; selecting a pitch player
  scrolls the bench into view when needed.
- The natural-position tick is gone; only the −N penalty shows.
- Excluded: drag and drop. The lists below the pitch stay as they were.

## Acceptance criteria

| ID | Observable result | Verification method | Evidence / state |
| --- | --- | --- | --- |
| S012-AC01 | A selected player is clearly highlighted on the pitch and on the bench | Web screenshots | 2026-10-09: observed |
| S012-AC02 | A pitch player and a bench player swap with two taps, without scrolling to the lists | Web flow | 2026-10-09: Gyökeres ↔ Martinelli, Eze ↔ Ødegaard |
| S012-AC03 | The bench shows the −N penalty for the selected position | Web screenshot | 2026-10-09: observed |
| S012-AC05 | The bench strip under the pitch appears only while a pitch position or a bench player is selected (with best options first); otherwise the Substitutes and Reserves lists are enough | Web screenshots | 2026-10-10: observed |
| S012-AC04 | Works and feels right in Expo Go on Android | Device observation | Pending |

## Implementation and validation

Task T025. File: `src/screens/SquadScreen.tsx`. Checks: lint, tsc, web export and screenshots.
