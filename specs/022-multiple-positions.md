# S022: Multiple positions

State: Implemented; Android observation pending.
Source: user request (2026-10-10): players should have multiple positions. Real players in
the data almost all had one (650 of 671); generated players got a second 45% of the time.

## Scope

- `withExtraPositions` (players.ts): from the main position's neighbours (SECOND_POSITION),
  about 70% of outfield players get one extra position and a quarter of those a second.
  Worked out from the player's name, so it never changes; goalkeepers stay goalkeepers.
- Used for real players (fromPack), generated players (makePlayer) and, on load, for
  one-position players in older saves (squad and world).
- Squad tab: Bench (rating and power bonus) sits next to Power, Attack, Defense and
  Chemistry in one compact row of five.
- Potential at a glance (user idea, 2026-10-10): a small "▲84" under the rating badge in the
  Substitutes / Reserves lists and the market list, only with 3+ points of growth left; an
  unscouted market player shows the range in grey ("▲80–90"). Not on the pitch. The
  Wonderkids note that repeated it was removed.

## Acceptance criteria

| ID | Observable result | Verification method | Evidence / state |
| --- | --- | --- | --- |
| S022-AC01 | Most players have more than one position, stable per player | Headless new world | Passed: 1 position 37% (incl. all GKs), 2 46%, 3 16% of 4,696 |
| S022-AC02 | Older saves gain extra positions on load | Web reload of an existing career | Passed: Milner CM/CDM, Ayari CM/CAM/CDM, March RW/ST |
| S022-AC03 | Squad stats row shows Bench with its power next to the other four | Web screenshot | Passed: 81 · 80 · 82 · 91 (+4) · 73 (−1 power) |
| S022-AC04 | Potential shows under badges for growing players only | Web screenshots | Passed: Tzimas ▲82, Hinshelwood ▲78; Lamine Yamal ▲94–99 unscouted |
| S022-AC05 | Same on Android | Device observation | Pending |

Note: makePlayer no longer draws positions from the random generator, so generated worlds for
a given seed differ from before (saved careers are unaffected apart from the extra positions).
