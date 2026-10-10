# S027: Transfers in context

State: Implemented; device observation pending.
Source: player feedback relayed by the user (2026-10-10): (1) on the squad/lineup page, tap a position
and buy a player for it without going to the Transfers tab and back; (2) when a club bids for one of
our players, look at the lineup or compare him with our other players before selling.

## Problem

Buying for a weak position means leaving the lineup, filtering the finder, and finding the way back.
Bids arrive on a full-screen overlay (and on the Transfers tab), so the player cannot check whether
the offered player is vital or replaceable before choosing Keep or Sell.

## Scope and exclusions

- Squad tab: with a pitch position selected, a "Find" button opens a sheet of players for that
  exact position (best for your XI first, or all by rating). Tapping one opens the usual player sheet
  (scout, bid, sign). After signing, the sheet closes so the player can be placed.
- Offers: a "Check squad" button on each offer (overlay and Transfers tab) opens a sheet with: where
  he plays (XI position or not in the XI), team power now → after the sale, who takes his place,
  and our other players for his positions.
- Excluded: changing prices, negotiation, offer rules, or the Transfers tab finder.

## Acceptance criteria

| ID | Observable result | Verification method | Evidence / state |
| --- | --- | --- | --- |
| S027-AC01 | Selecting a pitch position shows "Find"; it lists players with that position and opens their sheet without leaving the Squad tab | Web flow | Passed (web, 390 px): CB slot → Find CB → player sheet; notes show the gain at that slot |
| S027-AC02 | After signing from the sheet, it closes; the new player is in the bench strip/squad | Web flow | Passed (web): bid, pay, "Deal done", Find sheet closed, player in squad |
| S027-AC03 | An offer shows "Check squad" with position, power before → after, replacement and same-position players | Web flow; headless check of saleImpact | Passed (web overlay offer; headless: state unchanged by the check). Transfers-tab CHECK button not exercised |
| S027-AC04 | Keep and Sell still work after opening the check; the check never changes the game | Web flow | Check never changes state (headless); Keep/Sell after a check not exercised |

## Implementation and validation

XI power excludes the bench-depth bonus (it moves with the XI's average and would blur a sale).
Task T045. Files: src/game/insights.ts (saleImpact), src/screens/SlotMarketSheet.tsx,
SaleCheckSheet.tsx, SquadScreen.tsx, SimScreen.tsx, TransfersScreen.tsx. Checks: lint, tsc, web flow.
