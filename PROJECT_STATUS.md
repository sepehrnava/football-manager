# Project status

Updated: 2026-10-10. Replace outdated entries; keep this as a snapshot.

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
- FIFA-style chemistry links between neighbouring players, shown as coloured lines on the
  pitch, with an explanation sheet and per-player links (S011).
- A new club starts empty and builds its squad from a budget in the normal screens (S013);
  league stats (scorers, assists, team records) on the League tab (S014); swaps via a bench strip (S012).
- Simple start screen: upright pitch with faint players and a 3D logo, three plain rows
  with animated icons, Random club (difficulty + slot-machine roll) and Honours links (S015).
- Simple in-career screens: flat panels, no emoji icons, short text, pickers instead of chip
  rows (formation, tactic, finder, league), Staff on the Club tab, one squad list (S016).
- Crest shapes (shield, round, square, oval) (S017); chemistry links now include each slot's
  nearest player ahead, so centre-backs link to midfield (S011, D010).
- Optional sign-in (Apple on iOS, Google on Android build) with gzip cloud backup in Firebase
  Firestore (free plan), restore and account deletion (S018, D012). Firebase project
  top-squad-fm-97218 is fully set up, Google and Apple sign-in enabled; untested on a device.
- First launch shows a welcome screen with the platform's sign-in button or "Continue as guest"; shown once, skipped on web/Expo Go and when a career exists (S026).
- Remote updates with EAS Update (Expo project @sepehrnava/top-squad, channels per build) (D013).
- Academy intake: each pre-season promote 1 of 3 prospects (potential range judged by the
  youth coach) from the always-open Academy row; replaces the automatic graduate (S023, S025).
- Most players have 2–3 positions (stable per player, older saves upgraded on load); potential
  shows as "▲84" under rating badges in lists for growing players (S022).
- Bench strength (−2 to +3 power from bench depth) and transfer-list bids that arrive over
  time with a notice, instead of instantly (S021).
- Season money forecast: now, ~season end and safe to spend on the Club and Transfers tabs, a
  breakdown sheet, and each deal's effect on the season end (S020).
- Ads (S019, D014): rewarded sponsor bonus (1% of wages per ad, unlimited in windows) and free scouting, one
  capped interstitial at the season break; simulated in development, Google test ads in builds.
- Play offers "Match by match" (default) or "Auto-play" (1.8 s per matchday), remembered across
  careers; the result plays out with sliding crests, a ticking score, a WIN/DRAW/LOSS stamp,
  confetti on wins, a shake on losses and ▲/▼ table moves (S024).
- Retiring players are tagged on the pitch and in the bench strip and named in the Club note; Staff
  and Academy are their own rows on the Club tab, every Club row has an icon, and Next match
  and Money have no white cards; the Academy sheet shows the youth coach, the intake and
  the academy players (S025).
- The bench strip under the pitch shows only while choosing a player (S012); market rows wrap
  long position lists instead of overlapping.
- Fixed: after a season ended, its tables dropped games against clubs that had moved division,
  so the shown place could differ from the real finish (S008-AC08).
- Game rules in src/game (pure TypeScript); screens in src/screens; theme in src/ui.
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
- Android display not yet observed (S001-AC03, S002-AC08, S003-AC06, S004-AC09, S005-AC08, S011-AC05, S012-AC04, S013-AC04, S014-AC03, S015-AC05, S016-AC05, S023-AC03, S024-AC06, S025-AC05, S026-AC01–AC03).
- 2026-10-09 S015: start screen web flows (create, manage, daily, honours, random club by
  difficulty → career started); 0 console errors on a fresh load. Start screen layout seen
  on BlueStacks via adb screenshot (S015-AC05 partly); Expo Go on BlueStacks works with
  `adb` at 127.0.0.1:5555.
- Save format v2: careers saved before S004 start over.
- 2026-10-10 S024/S025: web auto-play ~1.84 s per matchday, match-by-match flow and mode memory,
  result animation frames, skip to window, retiring tags (Brighton); merged Academy sheet promote flow; 0 console errors.
- 2026-10-10 S008-AC08: headless 180 seasons (38 with a division move), final tables match the
  season-end position (before the fix 76 of 120 differed). Club, market and squad at 320/360 px.
- 2026-10-09 S010: 12 leagues × 3 clubs with staff wages, 0 sacked; 30 daily challenges
  generated in ~70 ms each; web flows for hiring, challenge, toast, honours, news.

## Limits and next step

- Next: an Android development build (EAS) to verify S018 sign-in and S019 test ads; play a full season on Android (T007, S016-AC05); then gameplay ideas (board goals,
  rival club, quick decision moments) if the user wants them.
- Developed on macOS; README setup steps still describe the original Windows setup.
- Initial npm audit: 23 warnings (7 moderate, 16 high). Historical result, not a fresh audit.
- Work queue: [TASKS.md](TASKS.md). Product scope: [SPECS.md](SPECS.md).
