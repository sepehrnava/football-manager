# League data

The game's league comes from two spreadsheets per league. Edit them in Excel, Numbers or
Google Sheets (export as CSV), then rebuild the league file the game loads.

## Files

- `english/clubs.csv`: one row per club: short code, name, kit colours, crest pattern, strength.
- `english/players.csv`: one row per player: club, name, positions, age, nation, rating,
  potential (optional). Instructions are in the comment lines at the top of each file.

## Rebuild after editing

```bash
npm run build:league
```

This checks every row and writes `src/data/english.json`. Problems are listed with the file
and line number, and nothing is written until they are fixed. Reload the app afterwards.

## Current data

`players.csv` holds about 20 players per club (400 total), based on 2025/26 squads, with
ratings that are the game's own estimates. Transfers after mid-2026 are not included: check
each club before publishing and adjust names, clubs or ratings freely.

## Tips

- You can fill the league gradually. A club with fewer than 18 players is topped up with
  generated players at its strength, so the game always works.
- Once a club has 11 or more real players, its strength comes from its best 11 ratings.
- Ratings are your own judgement (40-95). Never copy ratings from other games or sites.
- No badges, logos or photos: crests are simple shapes in the club colours.
- Before publishing: check the club list for the season, keep real names out of store
  screenshots and the app title, and get a short IP-lawyer review.
