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
