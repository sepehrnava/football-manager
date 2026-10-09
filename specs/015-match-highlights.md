# S015: Match highlights (2D)

State: Draft (demo built; waiting on the user's verdict)
Source: user request 2026-10-09 (players moving and passing, like manager-game match views).

## Scope and exclusions

- A fast top-down replay of the key moments of the user's match: 22 dots in club colours,
  the ball passing up the pitch, a clock, the score and one line of commentary.
- The score is decided before the replay (unchanged match engine); the replay shows the real
  scorers for the user's goals, plus a few saves and misses. It never changes a result.
- Demo entry: "Watch highlights" on the user's match in the match screen; 1×/2×/4× and skip.
- Excluded: a real 2D match engine, 3D, other clubs' matches.

## Acceptance criteria

| ID | Observable result | Verification method | Evidence / state |
| --- | --- | --- | --- |
| S015-AC01 | The replay plays the moments in order and ends on the real final score | Web recording | 2026-10-09: observed, no console errors |
| S015-AC02 | Attackers push up and defenders hold a shape; kits stay distinguishable | Web frames | 2026-10-09: ARS v MUN shown with MUN in second colours |
| S015-AC03 | Smooth in Expo Go on Android | Device observation | Pending |

## Implementation and validation

Task T028. Files: `src/game/highlights.ts` (pure), `src/screens/MatchViewer.tsx`, SimScreen.
