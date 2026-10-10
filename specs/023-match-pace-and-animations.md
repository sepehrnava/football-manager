# S023: Slower match pace, play modes and game-like result animations

State: Implemented; Android observation pending.
Source: user requests (2026-10-10): matches after kick-off run too fast (a first 30% slow-down
was still far too fast); add game-like animations; let users choose between playing match by
match and auto-play. Builds on S003 (simulation screen and motion).

## Problem

During a simulated run, matchdays flashed past too quickly to enjoy each result, the result
card simply faded in, and Play always ran every match up to the next stop, which can confuse.

## Scope and exclusions

In scope: the matchday timer, a remembered play mode (match by match or auto-play) and
animations on the simulation screen (SimScreen).
Excluded: match engine, results, new packages, sound or haptics. Skip stays instant.

## Acceptance criteria

| ID | Observable result | Verification method | Evidence / state |
| --- | --- | --- | --- |
| S023-AC01 | Auto-play advances one matchday every 1.8 s (was 650 ms); the first match of a run starts after 0.4 s | Web timing of matchday changes | Passed (web): ~1.84 s between matchdays |
| S023-AC02 | The user's result plays out: crests slide in from both sides, the score ticks up goal by goal with a pop (up to 0.26 s per goal, 0.9 s at most), then a WIN/DRAW/LOSS stamp slams down; a win bursts confetti, a loss shakes the card | Web frame captures | Passed (web) |
| S023-AC03 | A live dot pulses while matches run; the matchday title pops on change; before kick-off a ball bounces | Web frame captures | Passed (web) |
| S023-AC04 | The user's table row shows places gained (green ▲) or lost (red ▼) since the last result (none after the first matchday) | Web flow | Passed (web) |
| S023-AC05 | Pause, continue, skip and the window offer still work, with no console errors | Web flow | Passed (web) |
| S023-AC07 | The match screen has a "Match by match / Auto-play" switch (default match by match). Match by match plays one match per NEXT MATCH tap; auto-play runs to the next stop with PAUSE/CONTINUE; switching stops or starts at once; the choice is remembered across careers. A "play to here" target from a match preview always runs on its own | Web flow | Passed (web) |
| S023-AC06 | All of the above look smooth on Android | Device observation | Pending |

## Implementation and validation

Tasks T039, T040. UI: src/screens/SimScreen.tsx, src/ui/matchFx.tsx (core Animated only).
The play mode is stored in the cross-career meta (`playMode`, src/game/meta.ts).
Checks: tsc, lint, web export, headless Chrome flow (Arsenal, kick off, timings, frames, skip).
