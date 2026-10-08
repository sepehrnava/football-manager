# S005: Simple to play, fair money rules

State: Implemented; Android device observation pending.
Source: user requests (2026-10-08/09): losing must come from the player's choices, never
from an unwinnable spiral; everything must be very simple ("lazy players", like Golazo).
Revises S003 sim controls and S004 contracts and selling.

## Rules the player sees

- Money below $0: in debt, so no transfer fees can be paid. Selling always works.
- End a season below -$5M: final warning. End the next one below -$5M too: sacked.
- Contracts renew automatically; good players ask for more when they do.
- Selling below 18 players or a line minimum calls up an academy youngster.
- Running the club costs more as the fan base grows; owners take 25% of profit only.

## Acceptance criteria

| ID | Observable result | Verification method | Evidence / state |
| --- | --- | --- | --- |
| S005-AC01 | A frugal manager is never sacked, even starting $4.5M in debt | Headless, 30 careers × 6 seasons | Passed: 0 sacked (frugal and rescue) |
| S005-AC02 | Reckless spending leads to warnings and sackings | Same | Passed: 6 warnings, 2 sacked |
| S005-AC03 | Doing nothing stays mid-table; smart trading climbs | Same | Passed: passive ~6.5th, smart ~4th |
| S005-AC04 | Sim has one Pause/Continue button and a skip icon; no speed or step controls | Web flow | Passed (web) |
| S005-AC05 | Club screen: one Play button, plain money card, debt/warning message only when relevant | Web screenshot | Passed (web) |
| S005-AC06 | Buying: Cheeky/Fair/Full price buttons, one-step scouting, search on chip tap | Web flow: scouted, offered, signed | Passed (web) |
| S005-AC07 | No player is lost to an expired contract | Engine (auto-renewal) | Passed |
| S005-AC09 | Clubs bid only when a window opens; the match screen shows each bid with Sell/Keep as the window opens | Web: no bids during the season, bid cards at the window | Passed (web) |
| S005-AC10 | Auto-pick chooses the XI with the highest total rating, preferring natural positions on ties | Headless: 2,400 line-ups, none improvable by one swap | Passed |
| S005-AC11 | Careers: grow to ~potential by 26, peak to 30, decline after; retirement decided at season start and shown (tag, pitch label, Club notice) | Headless 300 careers: peak 76.4 of 78, retire ~36; web: notice and tags shown | Passed |
| S005-AC12 | Renewed wages follow current rating (fall as players age) | Engine (renewalDemand) | Passed |
| S005-AC13 | Matches are never interrupted except by a transfer window or the season end | Web: first half played to MD9 with no pauses | Passed (web) |
| S005-AC14 | No free agents: every market player belongs to a club; released AI players leave the league | Web: no free-agent option; headless league stable (~71) | Passed |
| S005-AC08 | All of the above on Android | Device observation | Pending |

## Implementation

Engine: game.ts (moneyStatus, boardVerdict, auto-renewal, running costs), market.ts
(academyFill on sale, one-step scouting). UI: Club, Transfers, PlayerSheet, SimScreen.
Tuning: constants.ts (ECONOMY, MARKET).
