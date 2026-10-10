# S026: Welcome screen with sign-in

State: Implemented; device observation pending.
Source: user request (2026-10-10): at first launch show sign in or continue as a guest, with the
available sign-in methods. Extends S018.

## Problem

Sign-in (S018) is only reachable from Settings or a small start-screen link, so new players
rarely discover it and a reinstall does not lead them to their backup.

## Scope and exclusions

- A welcome screen on the first launch of an install with no career: the platform's sign-in button
  (Apple on iOS, Google on Android build) and "Continue as guest".
- Shown once: either choice (or a finished sign-in) is remembered on the device.
- Not shown where no sign-in exists (web, Expo Go), or when a career is already saved.
- If the account has a backup, the screen offers Restore or Not now (decided later in Account).
- Excluded: email/password or other providers; changing S018 backup rules.

## Acceptance criteria

| ID | Observable result | Verification method | Evidence / state |
| --- | --- | --- | --- |
| S026-AC01 | First launch shows the logo, this platform's sign-in button and "Continue as guest" | Device observation | Android: passed 2026-10-10 (BlueStacks, EAS preview APK); iOS pending |
| S026-AC02 | Guest continues to the start screen; the welcome never returns after restart | Device observation | Pending |
| S026-AC03 | Signing in with a backup offers Restore (loads career) or Not now (start screen) | Two installs, same account | Pending |
| S026-AC04 | Web, Expo Go and installs with a saved career skip the welcome screen | Web run; code review | Web: see PROJECT_STATUS |

## Implementation and validation

Task T044. Files: src/screens/WelcomeScreen.tsx, App.tsx, src/screens/AccountSheet.tsx (shared button).
Checks: npm run lint, npx tsc --noEmit, web run.
