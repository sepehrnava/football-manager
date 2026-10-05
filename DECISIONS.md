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
