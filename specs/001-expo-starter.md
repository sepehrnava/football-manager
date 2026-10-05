# S001: Expo starter and previews

State: Implemented; Android device observation pending.
Source: initial setup request and subsequent computer-preview request.

## Problem and scope

A beginner needs a reproducible local project and a visible initial screen.
Provide a minimal TypeScript app, Android Expo Go connection, browser preview,
and source in the specified GitHub repository. No football features are implied.

## Acceptance criteria and evidence

| ID | Observable result | Evidence / state |
| --- | --- | --- |
| S001-AC01 | Install with compatible Node and project-local tools | Passed during setup; lockfile committed |
| S001-AC02 | TypeScript, lint, Expo compatibility pass | Passed; Doctor 21/21 during setup |
| S001-AC03 | Android Expo Go shows the Persian welcome screen | Bundle passed; phone observation pending |
| S001-AC04 | Computer browser shows the welcome screen | Passed; screen observed and web export generated |
| S001-AC05 | Source is on sepehrnava/football-manager | Passed; remote matched starter commit c11eb6c |

## Validation and exclusions

For changed code, run lint/typecheck and relevant previews; check compatibility when needed.
Android completion requires the user's actual observation. Startup/troubleshooting: README.md.
No emulator, release build, backend, or football game logic is required by this spec.
Audit warnings: PROJECT_STATUS.md. Do not mark Verified while S001-AC03 is pending.
