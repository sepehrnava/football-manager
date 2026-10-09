# S014: League stats

State: Implemented; device observation pending
Source: user request 2026-10-09 ("top scorer in the league, those kinds of things").

## Scope and exclusions

- Goals in every match of the user's league are credited to players (AI clubs: stronger
  players and attackers score more often), so league-wide scorer stats exist.
- League tab, under the table of the user's league: best attack, best defence, most wins,
  biggest win, goals per game, and the top 10 scorers (the user's players highlighted).
- Excluded: stats for other leagues (no goal data), assists, clean sheets.

## Acceptance criteria

| ID | Observable result | Verification method | Evidence / state |
| --- | --- | --- | --- |
| S014-AC01 | League stats and top scorers show for the user's league | Web screenshot | 2026-10-09: observed mid-season |
| S014-AC02 | Numbers are plausible and the simulation stays fast | Headless full season | 2026-10-09: top scorer 27, 2.4 goals per game, ~3 ms per round |
| S014-AC03 | Works in Expo Go on Android | Device observation | Pending |

## Implementation and validation

Task T027. Files: `clubScorers` in `game.ts`, `src/game/stats.ts`, LeagueScreen.
