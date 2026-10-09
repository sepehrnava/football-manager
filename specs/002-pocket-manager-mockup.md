# S002: Pocket manager mockup

State: Implemented; device observation pending.
Source: user request 2026-10-08 (Figma notes + Golazo screenshots). Related decisions: D004, D005.

## Problem

Football manager games are too complex; Golazo is too simple and too random.
The user wants a small, fast manager: build formations, swap and buy players easily,
and simulate matches quickly until the next transfer window. Mock data first;
a real player database comes later.

## Scope and exclusions

In scope: club creation (name, short code, crest), squad and formation builder,
tactic, captain, chemistry, budget scouting, buying and selling, a 10-team league with
fast or match-by-match simulation, two transfer windows, season-end finances,
player development, retirements, academy graduates, being sacked, and local saves.

Excluded: real players or clubs, a backend or accounts, multiple leagues or promotion,
contracts, injuries, match engine detail, and AI clubs trading players.

## User flow and data

Create club → pre-season window (squad, transfers) → Kick off → rounds play on a timer
(pause for match by match, or skip) → mid-season window after matchday 9 → season end
report → next season window. State is one `GameState` object saved on the device.

Rules live in `src/game/` (constants in `constants.ts`):
- Team power: weighted slot ratings → attack and defense, adjusted by formation, tactic
  and chemistry (links between neighbours since S011). Out-of-position players lose 3, 8, 18 or 40 rating.
- Match: Poisson goals from attack vs. defense, home advantage.
- Money: income = prize by position + fans × $4; costs = wages + $4M fixed + $2M
  stakeholder cashout (+ top-3 bonuses). Below −$5M after a season → sacked.

## Acceptance criteria

| ID | Observable result | Verification method | Evidence / state |
| --- | --- | --- | --- |
| S002-AC01 | Create a club with name, short code and crest | Web run | Passed (web, 2026-10-08) |
| S002-AC02 | Pick formation and tactic; tap a slot to place or swap a player; ratings show out-of-position penalties | Web run | Passed (web) |
| S002-AC03 | Scout by max price and position; buy and sell only in a window | Web run + engine rules | Passed (web: buy changed money and squad) |
| S002-AC04 | Season simulates quickly to the next window, can pause and step one match, or skip | Web run | Passed (web) |
| S002-AC05 | Season end shows position, finances, development; next season starts with a window | Web run + headless sims | Passed (web; 40 seeds simulated) |
| S002-AC06 | The starting club loses money at a typical finish | Headless sims | Passed: about −$0.8M finishing 7th |
| S002-AC07 | Career survives an app reload | Web reload | Passed (web); Android pending |
| S002-AC08 | Same flow works in Expo Go on Android | Device observation | Pending |

## Open questions

- Real player database: source, licensing, and how potential is shown.
- Should AI clubs buy and sell, and should there be promotion and relegation?
- Do players need contracts and wage negotiation, or keep wages derived from rating?

## Implementation and validation

Tasks: T006–T007 in TASKS.md. Checks: `npx tsc --noEmit`, `npm run lint`,
`npx expo export --platform web`, and an Expo Go run on Android.
