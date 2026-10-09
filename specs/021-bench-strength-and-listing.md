# S021: Bench strength and realistic transfer-list interest

State: Implemented; Android observation pending.
Source: user requests (2026-10-10): the bench should count ("bench overall 70 adds 3 power");
listing a player brought offers instantly, which looked simulated.

## Scope

- Bench strength (`benchBonus` in team.ts): the 7 substitutes' average rating against the
  starting XI's, so it is fair in every league. Bonus to attack and defence:
  clamp(round((bench − XI + 4.5) / 1.5), −2, +3): as good as the XI +3, typical (2–3 weaker) +1,
  thin −1/−2. Shown as "BENCH 76 · +1 POWER" on the Squad tab and included in Power.
- Transfer list during an open window: no instant bids, but always at least one in the same
  window (revised 2026-10-10: a listed player got none when no club was at his level). Clubs at
  his level bid, any club if none is; the first after 8–25 s, a second 15–40 s later with 60%
  chance (75% for 23 and under). A "New offer" notice appears on arrival.
  Bids at a window's opening are unchanged. Game rules take the time from the screen (pure).
- Excluded: in-match substitutions.

## Acceptance criteria

| ID | Observable result | Verification method | Evidence / state |
| --- | --- | --- | --- |
| S021-AC01 | Bench bonus follows bench depth and is fair across leagues | Headless, 59 taken-over clubs and a new club | Passed: 0 ×10, +1 ×30, +2 ×17, +3 ×2; new club with academy bench 0 |
| S021-AC02 | Squad tab shows bench overall and bonus | Web screenshot | Passed: "BENCH 73 · -1 POWER" after weakening the bench |
| S021-AC03 | Listing in a window shows "clubs are looking", then a bid arrives with a notice | Web flow | Passed: notice after 30 s, offers 3 → 4 |
| S021-AC04 | Same on Android | Device observation | Pending |

## Implementation

Task T037. team.ts (benchBonus in userTeam), market.ts (listedOffers with arrival times,
visibleOffers, setListed with `now`), types.ts (Offer.at), useOffers hook, MainScreen
(OfferToast), Transfers, Club, Sim, PlayerSheet, SquadScreen.
