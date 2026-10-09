# S015: Simple start screen and random club

State: Implemented; Android device observation pending.
Source: user requests (2026-10-09): improve the start page with the three options and make
the game more interesting; then: keep it simple, fewer boxes and less text ("too much
information confuses users"), keep the green field with a margin, small changing badges;
a taller field with faint players, a 3D outlined logo, slower badges, no tick on Daily;
the field fills the free space; no emoji icons.

## Problem

The start page was three boxed cards with explanations and a long disclaimer, and the
Create text was stale (a new club starts empty since S013). Undecided players had no quick way in.

## Scope and exclusions

- Upright green pitch, inset from the screen edges, filling the free space above the menu:
  lines, penalty boxes, two faint 4-3-3 teams drifting slowly (one per half), and the logo
  on the centre circle with a black outline and drop (sticker 3D). Markings are placed in
  pixels from the measured size (percentage offsets misplaced them on Android).
- Three plain menu rows with thin dividers: Create your club (a crest that keeps changing
  design), Manage a club (real club badges taking turns), Daily challenge (a drawn target
  that jolts and settles). The three change one after another every 2.7 s. Daily shows only
  "Streak N" as text, never a tick. No emoji icons, subtitles, tags or tiles.
- Two quiet text links: Random club, Honours.
- Random club: Any / Easy / Normal / Hard, a blank crest, then a short slot-machine roll, then manage or spin again.
- Disclaimer stays, pinned to the bottom of the start view.
- Excluded: other screens (later UI pass), custom fonts, new dependencies, save format.

## Acceptance criteria

| ID | Observable result | Verification method | Evidence / state |
| --- | --- | --- | --- |
| S015-AC01 | Start page shows the upright pitch filling the free space, faint players in both halves, outlined logo, three rows with animated icons, two links, no emoji, tags or subtitles | Web screenshot at 400 px; target transform sampled over time | Passed (web) |
| S015-AC02 | Create and Manage open their flows; Daily opens today's challenge; Honours opens | Web flow | Passed (web) |
| S015-AC03 | Daily row shows "Streak N" and no tick, played today or not | Web, seeded meta | Passed (web, before the emoji was replaced by text) |
| S015-AC04 | Random club respects the difficulty, rolls, lands, and starts a career with that club | Web: Hard ×3 all Hard; Easy → PSV, career started | Passed (web) |
| S015-AC05 | All of the above on Android | Device observation | Partly: BlueStacks screenshot after a full reload shows the layout right (pitch, players, circle, icons, "Streak 1"); flows not yet run on Android |

## Implementation and validation

Task T028. UI: StartHome (Hero, Markings, Logo, MenuRow, CyclingCrest, ClubCycle, DartHit, DailyRow, StartLinks),
ClubPick (clubTier, PickedClub, SpinSheet, moved out of NewClubScreen), NewClubScreen.
Checks: tsc, lint, web screenshots and flows; 0 console errors on a fresh load.
