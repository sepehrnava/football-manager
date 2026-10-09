# S011: UI redesign

State: Implemented; device observation pending
Source: user requests of 2026-10-09 (UI/UX redo; "less AI-made", smooth motion, a clearer daily challenge).

## Problem

The screens looked like a generic template: soft rounded cards everywhere, 3D buttons,
emoji icons, icon bubbles and hint text on every section. The Daily Challenge swapped the
whole game to another club with one tap, and the only way back was hidden in Settings.

## Scope and exclusions

- One shared kit (`src/ui`): flat surfaces with hairline borders, tight corners, condensed
  caps (Barlow Condensed) for headings, numbers and buttons, Inter for text, vector icons,
  gold/silver/bronze rating tiers, haptics on phones.
- Every screen uses the kit; no emoji as UI icons (game data may still store emoji, mapped to icons).
- Motion: sliding tab and segment indicators, cross-fade between career, challenge and new
  club, staggered list entry, money that counts, a pop on new scores.
- Daily Challenge: a preview before switching, and a visible way back to the career.
- Excluded: game rules, balance, save format, new routing or native modules.

## User flow and data

Home → Daily challenge card opens a preview sheet (club, goal, rules, "your career stays
saved"). Play switches games with a cross-fade. While the challenge is open, a dark bar under
the header shows the goal and a "Back to <club>" button. The result screen offers the same way back.
The career's club name for the button is kept in memory only.

## Acceptance criteria

| ID | Observable result | Verification method | Evidence / state |
| --- | --- | --- | --- |
| S011-AC01 | Shared kit used across screens: flat cards, condensed caps, icons not emoji | Code search for emoji in screens; screenshots | 2026-10-09: only emoji→icon lookup tables remain; 40+ web screenshots |
| S011-AC02 | Transfers: Find / Offers segments with an offer badge, chip filters, rows with rating left and price right, window and money strip, own transfer list under Offers | Web flow | 2026-10-09 web screenshots, pre- and mid-season |
| S011-AC03 | League: competition picker sheet, Table / Matches / Cups segments, restyled cups | Web flow | 2026-10-09 web screenshots |
| S011-AC04 | Match screen: dark broadcast look, condensed scores, labelled "Skip to the window" / "Skip to the end" | Web flow | 2026-10-09 web screenshots |
| S011-AC05 | Season end: large finishing position, icons on finance rows, large primary button | Web flow | 2026-10-09 web screenshots |
| S011-AC06 | Daily Challenge opens a preview first; a bar and the result screen lead back to the career, which is intact | Web flow: preview → play → skip to end → back → play a full season | 2026-10-09: Arsenal career resumed and finished its season |
| S011-AC07 | Indicators slide, games cross-fade, lists stagger, money counts | Web observation | 2026-10-09 observed on web |
| S011-AC08 | No console errors over a full season | Headless Chrome run: create club → kick off → skip → continue → season end → next season → reload | 2026-10-09: no errors or warnings |
| S011-AC09 | Fonts, icons and haptics correct on a real Android phone in Expo Go | Device observation | Pending (T007) |

## Open questions

None blocking. Whether the look reads as "less AI-made" is the user's call on device.

## Implementation and validation

Task T023. Areas: `src/ui/*`, every file in `src/screens`, `src/state/GameContext.tsx`, `App.tsx`.
Checks: `npm run lint`, `npx tsc --noEmit`, `npx expo export -p web` plus the headless flows above.
Gap: no Android observation yet (AC09).
