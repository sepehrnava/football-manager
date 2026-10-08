# Agent instructions

Communicate with the user in English. Keep repository documents and app text in English and concise.

## Context budget

1. Read PROJECT_STATUS.md for current state and next step.
2. Read SPECS.md and only the feature spec relevant to the request.
3. Read the relevant task in TASKS.md. Open DECISIONS.md only for architectural choices.
4. Read README.md only for setup. Inspect selected source files using targeted searches.

Do not load all specs, the lockfile, generated files, or old logs by default.
Link stable criteria IDs instead of repeating requirements. Status is a snapshot:
replace obsolete entries instead of appending session history.

## Spec-driven workflow

- Before behavior changes, create/update a numbered spec using specs/_template.md.
- Define the user problem, scope, exclusions, observable acceptance criteria, and validation.
- Mark Ready when the user's request authorizes scope and criteria are actionable.
  Do not add redundant approval gates for already authorized work.
- Record material unknowns; ask necessary questions and progress on independent work.
- Link small tasks to spec/criteria IDs. Implement only the relevant scope.
- Update acceptance evidence, task state, and project status together.
- Record only durable architectural choices in DECISIONS.md.
- Verified requires evidence for every criterion, including required device observations.

## Facts and checks

- Expo + React Native + TypeScript; npm and package-lock.json.
- Entry: index.ts -> App.tsx -> src/screens. Game rules: src/game (pure, no UI).
  No Router or native project directories currently exist.
- Versions are authoritative in package.json; avoid repeating them in every document.
- Android preview uses Expo Go; browser preview is supported. Add routing/native modules
  only when a spec needs them; unsupported native modules require a development build.
- Before using an Expo API, consult the installed SDK's official documentation:
  https://docs.expo.dev/versions/v<major>.0.0/ . Use https://docs.expo.dev/llms.txt
  to find the specific workflow page. Fetch only relevant documentation.
- Add packages with npx expo install <package>; preserve SDK compatibility.
- Code changes: npm run lint, npx tsc --noEmit, and relevant acceptance checks.
- Dependency/config changes: also npx expo install --check and npx expo-doctor.
- Docs-only changes: check links, IDs, facts, and git diff --check; skip unrelated builds.
- Do not hand-edit generated android/ios folders; use app config/plugins when needed.

## Boundaries and completion

Preserve user changes and remote history. No force push without explicit authorization.
Never commit secrets, local auth files, dependencies, or generated bundles.
Do not disable TLS or use npm audit fix --force to bypass a problem.
Do not claim phone/emulator display without an actual observation.
Done means relevant checks pass, acceptance evidence and affected docs are current,
and remaining limitations are explicit. Verify the remote commit before reporting a push.
