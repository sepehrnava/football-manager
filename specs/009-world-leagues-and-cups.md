# S009: Six leagues and two European cups

State: Implemented; Android device observation pending; player data partly filled.
Source: user request (2026-10-09): German, French, English, Spanish, Italian and Dutch
leagues plus Champions League and Europa League; data written by the assistant.

## Scope

- Countries from data/<country>/clubs.csv and players.csv, built into src/data/leagues.json
  by `npm run build:league` (validated per country). 138 clubs in total.
- Promotion and relegation stay inside a country; every competition plays its season in
  step with the user's matchdays. "Manage a club": pick a league, then a club. "Create your
  club": pick a country; the club starts in its lowest division.
- Cups: generic names "Champions Cup" and "Europa Cup" (real names are trademarks). Top
  clubs by country qualify from the previous season's tables (new careers: by squad
  strength). 16-club single-leg knockouts, penalties on draws, played at fixed points of the
  season, prize money added at season end. Shown on the League tab and season summary.
- Real players filled for the top 2–4 clubs of each new country; the rest are generated.
- Excluded: two-legged ties, group stages, cup matches inside the match screen.

## Acceptance criteria

| ID | Observable result | Verification method | Evidence / state |
| --- | --- | --- | --- |
| S009-AC01 | Converter builds six countries and validates each | npm run build:league (caught three bad short codes) | Passed |
| S009-AC02 | All seven leagues are listed and playable; managed Real Madrid for a full season | Web flow | Passed (web) |
| S009-AC03 | Cups: 16 entrants each, every tie played, winners recorded, prize money paid | Headless, 3 seasons | Passed (0 unplayed ties) |
| S009-AC04 | Top, middle and bottom clubs of every league are viable | Headless, 8 careers × 3 seasons each: nobody sacked | Passed |
| S009-AC05 | Search and new career stay fast with ~2,750 players | Headless: new career 36 ms, search 1 ms | Passed |
| S009-AC06 | Saving is batched (about once a second and on app background) | Code | Passed |
| S009-AC09 | Second divisions for Spain, Germany, Italy, France and the Netherlands (252 clubs in all); flags and highlighted division badges in the league picker; saves written in chunks so they stay under Android storage limits | Converter, headless economy (12 leagues, nobody sacked), web: picker, Dutch Second Division, reload keeps the career | Passed |
| S009-AC07 | Player data for all clubs | User or assistant fills data/<country>/players.csv | Partial |
| S009-AC08 | Shown correctly on Android | Device observation | Pending |
