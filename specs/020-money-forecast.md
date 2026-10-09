# S020: Season money forecast

State: Implemented; Android observation pending.
Source: user request (2026-10-10): show wages better, with a projection of what is left at the
end of the season and how much can be spent, so money doesn't go wrong.

## Scope

- One calculation (`settlement` in game.ts) for both the real season end and the forecast.
- Forecast finish: squad-strength projection until 5 matches are played, then the table.
- Safe to spend = the lower of money now and money at season end (never below $0).
- Club tab: a Money row (now, ~season end, safe to spend) that opens a breakdown sheet
  (income at the forecast finish, costs, season result). Transfers: the same figures as a
  tappable line, wages under it. Transfer targets: "Season end after this deal" at full price
  plus the new wage, red when it would end in debt.
- Excluded: changes to the economy itself.

## Acceptance criteria

| ID | Observable result | Verification method | Evidence / state |
| --- | --- | --- | --- |
| S020-AC01 | The forecast is close to the real season end without transfers | Headless, 6 clubs, full seasons | Passed: start-of-season forecast within $0.5–2M, mostly cautious; mid-season usually exact |
| S020-AC02 | Club tab, breakdown sheet, Transfers line and deal line show the figures | Web screenshots and flow | Passed (web): $18.0M now, ~$17.8M end, $17.8M safe; deal ~$8.5M |
| S020-AC03 | Same on Android | Device observation | Pending |

## Implementation

Task T034. game.ts (settlement, seasonForecast), MoneySheet, ClubScreen, TransfersScreen,
PlayerSheet.
