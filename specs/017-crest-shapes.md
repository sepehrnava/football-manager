# S017: Crest shapes

State: Implemented; Android observed (league table and own crest).
Source: user request (2026-10-09): "what if we add shapes to the club logos?"

## Problem

Every crest was the same shield, so clubs looked alike in lists and on the roadmap.

## Scope and exclusions

- Four outlines: shield, round, square, oval. All fit the old shield's size × 1.15 box, so
  rows and layouts do not move.
- League clubs get a steady shape from their code (about half shields). Create your club shows
  Shape and Pattern as separate rows of small crests in your colours (the user could not tell
  the earlier word buttons apart); the start screen's changing crest cycles shapes too.
- Saves: `shape` is optional; a crest without it is a shield. Loading an older save gives the
  other clubs their shape; the user's own crest stays as designed.
- Every crest shows its three-letter code at any size (user request): small crests use
  relatively larger, tighter text; the tab-bar crest icon draws the code in vector form.
- Excluded: real-club shape data in the CSV; patterns stay the same four.

## Acceptance criteria

| ID | Observable result | Verification method | Evidence / state |
| --- | --- | --- | --- |
| S017-AC01 | Club lists show mixed shapes; layouts unchanged | Web club list; Android league table | Passed (web and BlueStacks) |
| S017-AC02 | Create your club offers Shape and Pattern as crest choices; the preview follows | Web: Square + Halves selected | Passed (web) |
| S017-AC03 | An older save loads with shapes for other clubs and the user's crest unchanged | BlueStacks: Espanyol career after reload | Passed (BlueStacks) |

## Implementation and validation

Task T030. types.ts (CrestShape), game.ts (crestShapeFor, clubCrest, load migration),
ui/components Crest, NewClubScreen, StartHome. Checks: tsc, lint, web and adb screenshots.
