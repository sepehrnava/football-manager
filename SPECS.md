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
| S003 | [Season roadmap and motion](specs/003-season-roadmap.md) | Implemented; device observation pending |
| S004 | [Transfer market and contracts](specs/004-transfer-market-contracts.md) | Implemented; partly revised by S005 |
| S005 | [Simple and fair](specs/005-simple-and-fair.md) | Implemented; device observation pending |
| S006 | [Club choice and transfer list](specs/006-club-choice-and-transfer-list.md) | Implemented; device observation pending |
| S007 | [Real league data](specs/007-real-league-data.md) | Implemented |
| S008 | [Divisions](specs/008-divisions.md) | Implemented; device observation pending |
| S009 | [Six leagues and two cups](specs/009-world-leagues-and-cups.md) | Implemented; player data partial |
| S010 | [Staff, daily challenge, honours and news](specs/010-staff-daily-honours-news.md) | Implemented; device observation pending |
| S011 | [Chemistry links](specs/011-chemistry-links.md) | Implemented; device observation pending |
| S012 | [Easier swaps](specs/012-easier-swaps.md) | Implemented; device observation pending |
| S013 | [Build your squad (new club)](specs/013-build-your-squad.md) | Implemented; device observation pending |
| S014 | [League stats](specs/014-league-stats.md) | Implemented; device observation pending |
| S015 | [Match highlights (2D)](specs/015-match-highlights.md) | Draft; demo built |

Use [the template](specs/_template.md) for the next feature. Number specs sequentially.
Keep IDs stable; criteria use S002-AC01 style IDs referenced by tasks and evidence.

States: Draft (questions remain), Ready (actionable and user-authorized),
Implemented (code exists), Verified (all criteria have evidence).
Superseded specs name their replacement. Status labels alone are not evidence.

## Next product questions

Product direction (user, 2026-10-08/09): the challenge is managing squad and money, not
match play. Keep it very simple to play: no fatigue, no level grinding, no energy bar.
Next: a full UI/UX pass over every screen. Monetization later (rewarded ads, remove-ads,
cosmetics), which needs a development build.
