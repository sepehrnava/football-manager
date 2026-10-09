# S018: Sign in and cloud save

State: Implemented; sign-in not yet verified (needs the user's Firebase, Apple and Google setup).
Source: user request (2026-10-09): release on Android and iOS, sign in so players don't lose
progress, right buttons per platform. Answers: keep it simple (cross-platform moves are not
important), Firebase, Apple only on iOS. Changes the "no accounts, no backend" boundary.
Related decision: D012.

## Problem

Progress lives only on the device (AsyncStorage, about 1.6 MB per career, D009). A new phone,
a reinstall or a lost device loses the career, honours and daily streak.

## Scope and exclusions

- Playing without an account stays possible; signing in is optional and only backs up.
- iOS: Sign in with Apple. Android: Sign in with Google. Web and Expo Go on Android: no
  account option (Google sign-in needs a development or store build).
- Backup = career save, daily-challenge save and meta (honours, streak), gzip-compressed
  (about 265 KB per career), in Firestore document `saves/{uid}`; only the owner can read or
  write it (`firebase/firestore.rules`). Firestore keeps the project on the free plan.
- Backups run when the app goes to the background (at most every 5 minutes) and with
  "Back up now". After signing in, an existing backup can be restored after a confirmation.
- Sign out, and Delete account (removes the backup, then the account).
- Excluded: moving a career between Android and iOS, merging two saves, multiple slots.

## Acceptance criteria

| ID | Observable result | Verification method | Evidence / state |
| --- | --- | --- | --- |
| S018-AC01 | iOS shows only Apple, Android build only Google; web and Expo Go show no account option | Code review; web and Expo Go observation | Web: no Account link or button (export run); devices pending |
| S018-AC02 | Signing in backs up; the backup time is shown | Device with the user's Firebase project | Pending (needs accounts) |
| S018-AC03 | On a fresh install, signing in and confirming Restore brings back career, honours and streak | Two installs, same account | Pending (needs accounts) |
| S018-AC04 | Delete account removes the backup and the account | Firebase console after deletion | Pending (needs accounts) |
| S018-AC05 | Without Firebase settings the app works as before | tsc, lint, web and Expo Go runs | Passed: tsc, lint, expo checks, web/iOS/Android export, web flow with 0 errors; Expo Go run pending |

## Setup the user must do

Done from the CLI (2026-10-10): project `top-squad-fm-97218` with web/Android/iOS apps,
Firestore + rules, `.env.local`, EAS environment variables, `google-services.json`, debug SHA-1.
Google and Apple enabled and the Google web client ID set (2026-10-10). Remaining: EAS / Play
signing SHA-1s, Apple Developer account, and a development build to test.

## Implementation and validation

Task T031. Files: src/cloud/*, GameContext (export/import saves, background backup),
AccountSheet, MainScreen settings, start screen link, app.json, .env.example, README.
