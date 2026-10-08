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
| T007: Confirm mockup on Android | S002-AC08, S003-AC06, S004-AC09, S005-AC08, S006-AC05 | Todo | Run `npm run android` (BlueStacks) or Expo Go and play one season |
| T008: Season roadmap, smart sim, motion | S003-AC01–AC05 | Done | tsc, lint, web flow screenshots; 60 headless seasons |
| T009: Transfer market, contracts, counters | S004-AC01–AC08, AC10 | Done |
| T010: Simplify play and make money fair | S005-AC01–AC07, AC09–AC14 | Done |
| T011: Club choice, transfer list, simpler home | S006-AC01–AC04 | Done | tsc, lint, web flows; per-club headless careers | tsc, lint, web flow; 6 strategies × 30 careers | tsc, lint, web flows; 3 strategies × 30 careers × 5 seasons |

New implementation tasks reference one spec, relevant acceptance IDs, and a concrete check.
Split work by observable behavior. Candidate ideas do not become authorized tasks automatically.
