# Architectural decisions

Record lasting choices: context, decision, consequence, and when to revisit.
Number new decisions and link the feature requiring a change.

## D001: Minimal Expo starter

Accepted during setup. TypeScript blank template, npm lockfile, index.ts -> App.tsx.
Keep one screen until a feature needs navigation. No Router/backend/native folders yet.
Revisit when an authorized spec requires more screens or unsupported native functionality.

## D002: Android Go and browser previews

Accepted during setup. Use Expo Go for initial Android preview and React Native Web
for computer preview. Browser evidence does not establish Android behavior.
Revisit the build approach for native modules absent from Expo Go.

## D003: Small linked specs

Accepted by the user's 2026-10-05 SDD request. Separate agent instructions, current status,
product scope, tasks, and durable decisions; read feature specs on demand.
Reference stable acceptance IDs instead of copying requirements.
Revisit document structure only when project size makes retrieval difficult.

## D004: Single game state with useReducer and AsyncStorage

Accepted for S002. All game data is one serializable `GameState`, changed only by a
pure reducer (src/game/game.ts) and saved to AsyncStorage after each change.
Screens switch with local state and a custom tab bar; no router yet.
Revisit when a backend, accounts, or deep links are needed.

## D005: Seeded randomness in the state

Accepted for S002. Match results and generated players use a seeded generator whose
seed is stored in `GameState`, so reducer actions stay pure and results are reproducible.

## D006: AI clubs are made of players

Accepted for S004. Every AI club owns a squad in `GameState.world`; its attack and
defense are derived from its best XI. Transfers move player objects between clubs, so
the market changes the league. Negotiation prices are hidden but derived from a hash,
so no extra state is stored. Revisit when real player data replaces generated squads.

## D007: Fair money floor

Accepted for S005. Running costs scale with fans (floor 250K fans) and owners take a share of
profit only, so a cheap squad can break even anywhere in the table and debt always traces back
to the player's spending. Selling is never blocked; academy call-ups keep the squad legal.
Revisit if real league finances replace the generated economy.

## D011: Vector icons with react-native-svg

Accepted for S016 (2026-10-09): icons drawn from Views and borders looked pixelated at tab-bar
size. `react-native-svg` (installed with `npx expo install`, supported in Expo Go) draws the
tab icons in `src/ui/icons.tsx`. Use it for small icons; full-size crests stay View-based for
now. Revisit if crests also need smoother edges.

## D010: Chemistry from links between neighbours

Accepted for S011 at the user's request (FIFA-style). Chemistry comes from links between
neighbouring positions (each slot's nearest, plus its nearest slot in the line ahead, added
2026-10-09 so centre-backs link to midfield): time together at the club and shared nationality. Club and league links
are left out because every squad player shares them. Team chemistry keeps the old range and
effect, so balance stays close to the previous rule.

## D009: Chunked saves

The saved world (about 1.6 MB) is written as 400 KB chunks plus a manifest, because Android's
AsyncStorage fails on single values near 2 MB. Writes are queued so chunks never interleave, and
the old chunks are removed only after the new manifest is in place.

## D008: Real names as data, never as assets

Accepted for S007 at the user's request, following the approach of comparable apps: real club
and player names appear as plain text only, with a non-affiliation disclaimer. No badges, logos,
photos or real league names; ratings are the game's own. All names live in editable data files,
so the game can return to fictional data quickly if a rights holder objects. Not legal advice:
an IP-lawyer review is required before publishing (T014).
