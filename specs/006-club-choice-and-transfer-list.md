# S006: Choose your club, transfer list, simpler home

State: Implemented; Android device observation pending.
Source: user requests (2026-10-09): FC26-style choice between creating a club and managing
an existing one; a way to sell on your own terms; a calmer Club page.

## Scope

- Start screen: "Create your club" (new club, takes the weakest club's place) or
  "Manage a club" (any of 10 clubs, with its squad). Clubs show stars, budget, difficulty.
- Club size sets starting money, fans and sponsor income; big clubs must keep finishing
  high to cover their wages.
- Transfer list: listed players get 1–2 offers at 85–110% of value when a window is open.
- Club page: club, roadmap, one "what's next" card, notes below it. Play/Kick off is a
  normal-sized button in the bottom bar; "Start a new career" lives in ⚙️ Settings.

## Acceptance criteria

| ID | Observable result | Verification method | Evidence / state |
| --- | --- | --- | --- |
| S006-AC01 | Both start modes work; managing a club gives its squad and budget | Web: managed Northport ($22M), created own club | Passed (web) |
| S006-AC02 | Every club is playable: passive play performs to its level and stays solvent | Headless, 20 careers × 4 seasons per club: positions follow level, net +$1–2M/season, 0 sacked | Passed |
| S006-AC03 | Listing a player in a window brings offers; FOR SALE tag shown | Web: listed → 2 offers | Passed (web) |
| S006-AC04 | Club page: notes below the card; no buttons in it; Play in the bottom bar; reset in Settings | Web screenshots; settings reset returned to start | Passed (web) |
| S006-AC05 | All of the above on Android | Device observation | Pending |

## Implementation

Engine: game.ts (createGame takeOver, clubEconomy, sponsorFor, clubCrest), market.ts
(setListed, listedOffers), names.ts (10 clubs with levels). UI: NewClubScreen, ClubScreen,
MainScreen (Play button, Settings sheet), PlayerSheet, SquadScreen.
