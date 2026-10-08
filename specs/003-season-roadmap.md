# S003: Season roadmap, smart simulation and motion

State: Implemented; Android device observation pending.
Source: user request (2026-10-08) for a calendar-like home overview, a recommendation on
game-by-game vs. batch play, and smoother transitions. Builds on S002.

## Problem

The home screen did not show the season at a glance, and fast simulation either ran
blindly to the next window or required tapping through every match.

## Scope and exclusions

In scope: a horizontal season roadmap on the Club screen, match previews with odds and a
tactic tip, "play to here", key-match auto-pauses, and UI transitions.
Excluded: new game mechanics, AI transfers, real player data.

## Acceptance criteria

| ID | Observable result | Verification method | Evidence / state |
| --- | --- | --- | --- |
| S003-AC01 | Club screen shows every matchday, both windows and the finish; results colored W/D/L; current stop pulses and is scrolled into view | Web screenshots | Passed (web) |
| S003-AC02 | Tapping a played round shows its score, scorers and other results | Web flow | Passed (web) |
| S003-AC03 | Tapping a future round shows win/draw/loss odds and a tactic tip, and can play up to that round | Web flow ("play 3 matches" stopped at MD3) | Passed (web) |
| S003-AC04 | Open-ended simulation pauses before key matches (losing streak, leaders, six-pointer, title race), about 3 times per season | Headless: 60 seasons, avg 3.4 stops; web flow stopped | Passed |
| S003-AC05 | Tabs slide/fade in, sheets spring up, results pop in, table rows animate, season end reveals in steps | Web observation | Passed (web) |
| S003-AC06 | All of the above on Android | Device observation | Pending |

## Implementation and validation

Logic: src/game/insights.ts (odds, scout report, key moments). UI: src/screens/Roadmap.tsx,
MatchSheet.tsx, SimScreen.tsx, src/ui/motion.tsx (core Animated, no new packages).
Checks: tsc, lint, web export, headless Chrome flow with no console errors.
