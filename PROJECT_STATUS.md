# Project status

Updated: 2026-10-09. Replace outdated entries; keep this as a snapshot.

## Implemented

- Pocket Manager mockup (S002): club creation, formation builder, transfers, fast
  season simulation, season-end finances, local save. Generated data only.
- Season roadmap home, match odds, play-to-round, key-match pauses, transitions (S003).
- Transfer market with negotiation and scouting, incoming offers, opponent styles (S004).
- Simplified play and fair money rules: auto-renewing contracts, debt → final warning →
  sacked, academy cover on sales, running costs that grow with fans (S005).
- Start by creating a club or managing one of 10 existing clubs; transfer list;
  simplified Club page and bottom bar; settings sheet (S006).
- English league (20 clubs, 400 real players, no badges) from editable CSV data with a
  validating converter and a disclaimer (S007). Economy is priced relative to the league.
  Squads reflect 2025/26 knowledge; recent transfers need checking before publishing.
- Two divisions with promotion and relegation; Second Division clubs use generated
  players for now; new clubs start in the Second Division (S008).
- Six countries with two divisions each (252 clubs), flags and division badges in the league
  picker; a player finder (For you, Wonderkids, Experienced, World class, Bargains, Browse,
  Watchlist) across all leagues with exact-position filters; Champions Cup and Europa Cup knockouts for top finishers (S009). Real players
  exist for 20 English clubs and the top 2-4 clubs elsewhere; the rest are generated.
- Staff (head coach, youth coach, chief scout), a Daily Challenge with streak and share,
  a trophy cabinet with 12 achievements, and a short news feed (S010). The challenge and
  the cross-career meta are saved apart from the career.
- UI redesign (S011): flat matchday-programme look, condensed display font, vector icons,
  haptics, sliding indicators and cross-fades; Daily Challenge preview and a visible way back
  to the career.
- Game rules in src/game (pure TypeScript); screens in src/screens; design kit in src/ui.
- npm lockfile, lint configuration, and setup instructions in README.md.
- Spec-driven documentation and selective context-reading workflow.

## Evidence

- 2026-10-08: tsc and lint pass; web export builds; full flow played in headless Chrome
  (create club, pick slot, buy, simulate, season end, reload keeps the save).
- 40 headless careers: starting club finishes 4th–10th, typically loses money.
- S003 web flow (roadmap, play to MD3, key-match stop, season end): no console errors.
- S004 web flows (scout, reject, counter, sign, free agent, renew, offers): no errors.
- S005 balance, 30 careers × 6 seasons: frugal/rescue never sacked, reckless sacked
  2/30, smart trading climbs to ~4th. Simplified screens checked in Chrome.
- Android display not yet observed (S001-AC03, S002-AC08, S003-AC06, S004-AC09, S005-AC08, S011-AC09).
- Save format v2: careers saved before S004 start over.
- 2026-10-09 S010: 12 leagues × 3 clubs with staff wages, 0 sacked; 30 daily challenges
  generated in ~70 ms each; web flows for hiring, challenge, toast, honours, news.
- 2026-10-09 S011: tsc and lint pass; headless Chrome full season, challenge round trip and
  reload with no console errors. expo-doctor network checks could not run in the cloud sandbox.

## Limits and next step

- Next: confirm on Android in Expo Go (T007), including fonts, icons and haptics (S011-AC09).
- Developed on macOS; README setup steps still describe the original Windows setup.
- Initial npm audit: 23 warnings (7 moderate, 16 high). Historical result, not a fresh audit.
- Work queue: [TASKS.md](TASKS.md). Product scope: [SPECS.md](SPECS.md).
