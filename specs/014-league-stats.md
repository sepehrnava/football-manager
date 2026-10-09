# S014: League stats

State: Implemented; device observation pending
Source: user request 2026-10-09 ("top scorer in the league, those kinds of things").

## Scope and exclusions

- Goals and assists in every match of the user's league are credited to players (stronger
  players and attackers score more often; creative players assist more; 75% of goals have an
  assist). Player cards show goals and assists this season.
- League tab: a Table | Stats switch. Stats (user's league) has Scorers, Assists,
  Goals + assists (top 10 each, the user's players highlighted) and Teams: best attack, best
  defence, most wins, biggest win, goals per game, best form over the last 5 (W/D/L) and clean
  sheets (top 5).
- Excluded: player stats for other leagues (no data), player ratings per match.

## Acceptance criteria

| ID | Observable result | Verification method | Evidence / state |
| --- | --- | --- | --- |
| S014-AC01 | Scorers, assists, goals + assists and team stats show for the user's league | Web screenshots | 2026-10-09: all four views observed mid-season |
| S014-AC02 | Numbers are plausible and the simulation stays fast | Headless full season | 2026-10-09: top scorer 27, 2.4 goals per game, ~3 ms per round |
| S014-AC03 | Works in Expo Go on Android | Device observation | Pending |

## Implementation and validation

Task T027. Files: `clubScorers` and `pickAssists` in `game.ts`, `src/game/stats.ts`, LeagueScreen, PlayerSheet.
