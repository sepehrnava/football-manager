# S023: Slower match pace and game-like result animations

State: Implemented; Android observation pending.
Source: user request (2026-10-10): matches after kick-off run too fast; make them about 30%
slower and add game-like animations. Builds on S003 (simulation screen and motion).

## Problem

During a simulated run, matchdays flashed past too quickly to enjoy each result, and the
result card simply faded in.

## Scope and exclusions

In scope: the matchday timer and animations on the simulation screen (SimScreen).
Excluded: match engine, results, new packages, sound or haptics. Skip stays instant.

## Acceptance criteria

| ID | Observable result | Verification method | Evidence / state |
| --- | --- | --- | --- |
| S023-AC01 | Matchdays advance about 30% slower than before (850 ms instead of 650 ms; first match 325 ms instead of 250 ms) | Web timing of matchday changes | Passed (web): ~0.89 s between matchdays |
| S023-AC02 | The user's result plays out: crests slide in from both sides, the score ticks up goal by goal with a pop, then a WIN/DRAW/LOSS stamp slams down; a win bursts confetti, a loss shakes the card | Web frame captures | Passed (web) |
| S023-AC03 | A live dot pulses while matches run; the matchday title pops on change; before kick-off a ball bounces | Web frame captures | Passed (web) |
| S023-AC04 | The user's table row shows places gained (green ▲) or lost (red ▼) since the last result (none after the first matchday) | Web flow | Passed (web) |
| S023-AC05 | Pause, continue, skip and the window offer still work, with no console errors | Web flow | Passed (web) |
| S023-AC06 | All of the above look smooth on Android | Device observation | Pending |

## Implementation and validation

Task T039. UI: src/screens/SimScreen.tsx, src/ui/matchFx.tsx (core Animated only).
Checks: tsc, lint, web export, headless Chrome flow (Arsenal, kick off, timings, frames, skip).
