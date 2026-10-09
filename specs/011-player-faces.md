# S011: Player faces

State: Draft (step 1 prototype built; step 2 waits on the user's decision)
Source: user request 2026-10-09. Related decisions: D008 (no photos of real players).

## Problem

Players are names and numbers only. Faces would make the squad feel alive, but photos are
not allowed (D008) and guessed faces of real players would misrepresent real people.

## Scope and exclusions

- Step 1 (prototype): drawn faces built from a few traits (skin tone, hair style and colour,
  beard, headband) on the club shirt, plus a shirt-with-initials alternative, shown on a
  preview screen only (Settings → Player faces). No game screen changes.
- Step 2 (only if approved): generated players get a random, stable look (seeded by id, not
  by nationality); real players show the shirt until their traits are added to the CSV data.
- Excluded: photos, realistic or AI-generated likenesses, inferring looks from name or nationality.

## Acceptance criteria

| ID | Observable result | Verification method | Evidence / state |
| --- | --- | --- | --- |
| S011-AC01 | Preview shows faces covering all skin tones, hair styles and beards, the user's squad as faces and shirts, and sizes 24–120 | Web screenshots | 2026-10-09: web preview observed, no console errors |
| S011-AC02 | The same player id always draws the same face | Shuffle changes only the preview salt | 2026-10-09: observed |
| S011-AC03 | Faces and shirts render in Expo Go on Android | Device observation | Pending |
| S011-AC04 | Step 2 decision recorded | User decision | Pending |

## Open questions

- Faces or shirt-only? Which screens first (player sheet, lists, pitch)?
- If faces: who fills in traits for real players, and for which clubs first?

## Implementation and validation

Task T024. Files: `src/game/looks.ts`, `src/ui/avatar.tsx`, `src/screens/FacesPreview.tsx`,
entry in the Settings sheet. Package: react-native-svg (SDK-matched version).
