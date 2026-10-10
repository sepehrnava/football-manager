# Work queue

States: Todo, In progress, Blocked (specific dependency), Done (with evidence).
Keep current work and a short completed baseline; avoid session logs.

| Task | Spec / criteria | State | Evidence or next action |
| --- | --- | --- | --- |
| T001: Build starter | S001-AC01, AC02, AC04 | Done | Setup checks passed; web screen observed |
| T002: Confirm Android screen | S001-AC03 | Todo | User opens Expo Go and confirms the welcome screen |
| T003: Publish starter | S001-AC05 | Done | Remote matched starter commit c11eb6c |
| T004: Publish SDD documents | User's documentation request | In progress | Commit documents and verify the corresponding remote commit |
| T005: Specify first football feature | S002 | Done | specs/002-pocket-manager-mockup.md |
| T006: Build pocket manager mockup | S002-AC01–AC07 | Done | tsc, lint, web export; web flow and reload observed; 40 headless seasons |
| T007: Confirm mockup on Android | S002-AC08, S003-AC06, S004-AC09, S005-AC08, S006-AC05, S010-AC07, S011-AC05, S012-AC04, S013-AC04, S014-AC03, S015-AC05, S023-AC06, S024-AC05 | Todo | Run `npm run android` (BlueStacks) or Expo Go and play one season |
| T008: Season roadmap, smart sim, motion | S003-AC01–AC05 | Done | tsc, lint, web flow screenshots; 60 headless seasons |
| T009: Transfer market, contracts, counters | S004-AC01–AC08, AC10 | Done | tsc, lint, web flow; 6 strategies × 30 careers |
| T010: Simplify play and make money fair | S005-AC01–AC07, AC09–AC14 | Done | tsc, lint, web flows; 3 strategies × 30 careers × 5 seasons |
| T011: Club choice, transfer list, simpler home | S006-AC01–AC04 | Done | tsc, lint, web flows; per-club headless careers |
| T012: Real-name league from editable data | S007-AC01–AC05 | Done | Converter validation, web English league, headless economy |
| T013: Fill English player data | S007-AC06 | Done | 400 players added; user to verify recent transfers and ratings |
| T014: Legal check before publishing | D008 | Todo (user) | Short IP-lawyer review; no real names in store assets |
| T015: Divisions, promotion and relegation | S008-AC01–AC05 | Done | Headless seasons, web promotion flow |
| T016: Second Division player data | S008 | Todo | Fill real players for the 24 Second Division clubs (optional) |
| T017: Continental cups | S009-AC03 | Done | Champions Cup and Europa Cup built |
| T018: Six leagues | S009-AC01–AC06 | Done | Converter, picker, headless per-league economy |
| T020: Second divisions, flags, chunked saves | S009-AC09 | Done | Converter, headless 12 leagues, web picker and reload |
| T021: Player finder and star prices | S009-AC10, AC11 | Done | Headless honesty check, web finder flow |
| T019: Fill remaining player data | S009-AC07 | Todo | Real players for the other clubs of the five new leagues and the Second Division |
| T022: Staff, daily challenge, honours, news | S010-AC01–AC06 | Done | tsc, lint, headless sims, web flows |
| T023: UI/UX pass over every screen | User request 2026-10-09 | Done (first pass) | 26-screen web audit: readable crests, top bar fits, club confirm sheet, compact staff row, offers lead with player, sim fixes |
| T024: FIFA-style chemistry links | S011-AC01–AC04 | Done | tsc, lint, web screenshots, headless balance vs previous rule; Android pending |
| T025: Easier swaps with a bench on the pitch | S012-AC01–AC03 | Done | tsc, lint, web swap flows; Android pending |
| T026: New club builds its squad from empty | S013-AC01–AC03 | Done | tsc, lint, web flow, headless market balance; Android pending |
| T027: League stats: scorers, assists, team records | S014-AC01, AC02 | Done | tsc, lint, web screenshots, headless season; Android pending |
| T028: Simple start screen and random club | S015-AC01–AC04 | Done | tsc, lint, web screenshots and flows; Android layout seen |
| T029: Simple in-career screens | S016-AC01–AC04 | Done | tsc, lint, web flows; Android screenshots of all tabs; full Android season pending |
| T030: Crest shapes; CB–midfield chemistry links | S017-AC01–AC03, S011 | Done | tsc, lint, web and BlueStacks screenshots; chemistry mean 67.2 before and after |
| T031: Sign in and cloud save | S018-AC01–AC05 | In progress | Firebase fully configured (apps, Firestore + rules, Google and Apple enabled, env and EAS vars); next: development build and device tests |
| T032: Remote updates (EAS Update) | D013 | Done (config) | Expo project linked, channels in eas.json; first update needs a store or preview build |
| T041: Season-end table fix, bench strip on demand, Club buttons and icons, market row wrap, slower goal count | S008-AC08, S012-AC05, S024-AC03, AC06 | Done | Headless 180 seasons 0 mismatches; web at 320/360 px, 0 console errors; Android pending |
| T040: Play modes, slower auto-play; retiring tags, academy | S023-AC01, AC07; S024-AC01–AC04 | Done | Web: 1.84 s per matchday, match-by-match and mode memory, Brighton retiring tags, academy call-up; 0 console errors; Android pending |
| T039: Slower matches, game-like result animations | S023-AC01–AC05 | Done | Web frame captures, skip flow, 0 console errors; Android pending |
| T038: Multiple positions; Bench in the stats row | S022-AC01–AC03 | Done | Headless distribution, web reload of an old save |
| T037: Bench strength bonus; offers arrive over time | S021-AC01–AC03 | Done | Headless bench distribution, web flows |
| T036: Choose the bench (swap subs and reserves) | S016 revision | Done | Headless bench swap and substitution; web flow, no console errors |
| T035: Fairer negotiation (5 offers, last-chance warning) | S004 revision | Done | Headless bid sequences; web: 4, 3, 2 left, last-chance warning, then talks end |
| T034: Season money forecast | S020-AC01, AC02 | Done | Headless accuracy check, web flow; Android pending |
| T033: Ads (AdMob) | S019-AC01–AC05 | In progress | AC01, AC02, AC05 passed (headless and simulated ads); next: Google test ads in an Android development build, then the user's AdMob account |

New implementation tasks reference one spec, relevant acceptance IDs, and a concrete check.
Split work by observable behavior. Candidate ideas do not become authorized tasks automatically.
