# S016: Simple in-career screens

State: Implemented; Android partly observed.
Source: user request (2026-10-09): improve the other pages like the start screen (S015) and
make them simpler to interact with. Direction: plain rows over boxed cards, no emoji icons,
little explaining text (see SPECS.md visual direction).

## Problem

In-career screens used emoji for every icon, thick boxed cards, chips and explaining text,
and long scrolling chip rows for choices. They looked busy and felt harder than they are.

## Scope and exclusions

- Shared: flat cards (no outline or thick edge), flat pills, section labels without rules;
  a PickerButton + OptionSheet pair replaces long chip rows (one tap opens a short list).
- Top bar: crest + money (crest opens Honours), window or season as text, drawn menu dots.
- Bottom bar (revised by user feedback): colourful vector icons with an ink outline (your
  crest, a shirt in your club colours, a gold coin, a trophy; react-native-svg, D011), labels
  at full strength, a soft gold background behind the active tab, and a small round green
  Play / Kick off the size of a tab.
- Club: plain heading with position, roadmap without box or emoji (current stop marked by a
  still soft-gold highlight; the pulsing ring overlapped the line and was removed; 80 px per
  stop and no grey ring on upcoming stops, the grey line stays between them), one tappable next-match
  row, one list for notes, Staff (moved from Squad) and Daily; plain news lines.
- Squad: Formation and Tactic pickers plus Best XI; strength numbers without a card. Revised
  2026-10-10 (user): the pitch holds the 11 starters with a horizontal bench row at its bottom
  (a pop-up swap panel was tried and rejected). Tapping a pitch player shows a "Details" button
  next to them and sorts the bench row by rating in that position, best first, with SUB /
  RESERVE labels; tap a bench player or another position to swap, or empty grass to cancel. Substitutes and Reserves are
  also lists below the pitch: tap one to select (highlighted), then one in the other list to swap
  sub and reserve, or a pitch position to bring them on; each row has a Details button. The
  chosen bench is saved (GameState.bench, optional) and a substitute coming on leaves his bench
  place to the starter he replaces. The bench has no match effect yet (no in-match substitutions).
- Transfers: wages line instead of banner and money card; plain offer rows; Show and
  Position pickers (explanations live in the picker notes); Browse adds League and Max fee.
- League: one League picker instead of 12 chips; short promotion line.
- Sheets and other screens: emoji removed (sim, match, season end, challenge end, honours,
  staff, player, cups); achievements as plain rows; much shorter help text; "Starting…"
  while a career is created; league and club pickers before a career as plain rows.
- Excluded: game rules, save format, new dependencies. Player nationality flags stay
  (they are game data used by chemistry).

## Acceptance criteria

| ID | Observable result | Verification method | Evidence / state |
| --- | --- | --- | --- |
| S016-AC01 | Top and bottom bars show no emoji; tabs, Kick off, menu and Honours work | Web flow; Android screenshot | Passed (web); Android bars seen |
| S016-AC02 | Club: no boxed cards or emoji; next-match row opens the match sheet; notes open their tabs | Web flow; Android screenshot | Passed (web: match sheet, offers → Transfers); Android seen |
| S016-AC03 | Squad, Transfers and League use pickers; formation, finder and league choices change the view | Web flows; Android screenshots | Passed (web: 4-3-3, Wonderkids ST = 12, Spanish table); Android seen |
| S016-AC04 | Remaining screens have no emoji icons and short help text | Web screenshots (sim, player sheet, season end, pickers) | Passed (web) |
| S016-AC05 | Full season played on Android with the new screens | Device play-through | Pending |

## Implementation and validation

Task T029. UI only: ui/components (Card, Pill, SectionTitle, PickerButton, OptionSheet),
MainScreen, ClubScreen, Roadmap, BuildSquad, SquadScreen, StaffSheet, TransfersScreen,
LeagueScreen, PlayerSheet, SimScreen, MatchSheet, SeasonEndScreen, Challenge, Honours,
CupCard, NewClubScreen, ClubPick, StartHome. Checks: tsc, lint, web flows, BlueStacks
screenshots via adb.
