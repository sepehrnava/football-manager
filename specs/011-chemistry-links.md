# S011: Chemistry links

State: Implemented; device observation pending
Source: user requests 2026-10-09 ("not obvious how chemistry works"; "like FIFA, lines between
the players"). Related decision: D010.

## Problem

Chemistry was a single number from seasons at the club, with no explanation on screen and no
way for the user to influence it except waiting. Real players could also start as "new".

## Scope and exclusions

- Neighbouring positions in each formation are linked. A link scores +1 per season the two
  players have been together at the club (max 2) and +1 for the same country (max 3 in total).
- Team chemistry = 40 + 20 × average link score, +10 when the captain starts, capped at 100.
  Its effect is unchanged: (chemistry − 50) / 10 added to attack and defence.
- Coloured lines on the pitch: red 0, orange 1, green 2–3.
- Explanations: a tappable Chemistry stat with a sheet, each starter's links on his card, and
  a note on the transfer card that new signings start with red links.
- Squads of existing clubs start with 2–4 seasons together; a new club's squad keeps 0–4.
- Excluded: club or league links (all players share them), player-level chemistry styles.

## Acceptance criteria

| ID | Observable result | Verification method | Evidence / state |
| --- | --- | --- | --- |
| S011-AC01 | The pitch shows coloured links that change when players or formation change | Web screenshots | 2026-10-09: taken-over club all green; new club mixed red, orange, green |
| S011-AC02 | Tapping Chemistry explains link rules, colours, link counts, captain bonus and the effect | Web screenshot | 2026-10-09: observed |
| S011-AC03 | A starter's card lists his links with colour and reason; bench players are told they have none | Web screenshot | 2026-10-09: observed |
| S011-AC04 | League balance stays close to the previous rule | Headless: 80 seasons each for a new club and three taken-over clubs, previous rule vs links | 2026-10-09: average finish within about one place (new club 20.5 vs 20.4; Arsenal 2.3 vs 2.3) |
| S011-AC05 | Links display correctly in Expo Go on Android | Device observation | Pending |

## Implementation and validation

Task T024. Files: `src/game/links.ts`, `src/game/team.ts`, starting seasons in `game.ts` and
`market.ts`, `src/screens/Chemistry.tsx`, SquadScreen and PlayerSheet.
Checks: `npm run lint`, `npx tsc --noEmit`, web export and screenshots, headless balance runs.
