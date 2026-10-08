# Product scope and spec index

Repository: sepehrnava/football-manager. Current product: Pocket Manager, a simple
football manager mockup with generated data (S002).

## Confirmed scope

- Run on the user's Windows computer using project-local tools.
- React Native, Expo, TypeScript, and minimal initial functionality.
- Android Expo Go preview and a computer browser preview.
- Reproducible source/dependencies in the specified GitHub repository.
- Develop subsequent behavior from specs and observable acceptance criteria.

Not yet in scope: accounts, backend, real player database, payments, release builds,
or hosting. These are not approved features.

## Feature specs

| ID | File | State |
| --- | --- | --- |
| S001 | [Starter and previews](specs/001-expo-starter.md) | Implemented; device observation pending |
| S002 | [Pocket manager mockup](specs/002-pocket-manager-mockup.md) | Implemented; device observation pending |

Use [the template](specs/_template.md) for the next feature. Number specs sequentially.
Keep IDs stable; criteria use S002-AC01 style IDs referenced by tasks and evidence.

States: Draft (questions remain), Ready (actionable and user-authorized),
Implemented (code exists), Verified (all criteria have evidence).
Superseded specs name their replacement. Status labels alone are not evidence.

## Next product questions

Next likely feature: a real player database (see S002 open questions). Establish its
data source and persistence needs before implementation.
