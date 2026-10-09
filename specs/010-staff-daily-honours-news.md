# S010: Staff, daily challenge, honours and news

State: Implemented
Source: user request 2026-10-09 (extra features that keep the game simple; a coach that
affects the team and costs wages; reasons to come back daily). Related: S005 economy.

## Problem

Players finish a career and have little reason to return each day. The user also wants a
coach to choose, which affects the team and costs money, without adding complexity.

## Scope and exclusions

- Staff: head coach (team strength, optional attack/defense lean), youth coach (extra
  growth for players aged 23 or under), chief scout (cheaper scouting). 1–5 stars, a
  yearly wage, and a signing fee; hired only in a transfer window.
- Daily challenge: one club and goal per calendar day, starting at the mid-season window;
  one attempt; streak, score and share text. Saved apart from the career.
- Honours: trophy cabinet for the current career, 12 achievements across careers, and a
  toast when one is earned.
- News: up to 20 notable headlines (hat-tricks, big wins, shock wins, going top, cup
  progress, season results, retirements).
- Excluded: energy bar or play limits, online leaderboards, ads, accounts.

## User flow and data

- Squad tab → Staff card → role tabs → HIRE. Season-end finances list staff wages.
- Start screen and Club tab → Daily challenge card → Club tab shows the goal → Kick off →
  result screen (score, streak, share) → Done returns to the career or start screen.
- Top bar club chip → Honours sheet. Club tab → Latest (3 items) → See all.
- Storage: career `pocket-manager/save-v3`, challenge `pocket-manager/challenge-v1`
  (both chunked, D009), meta `pocket-manager/meta-v1` (streak, results, achievements).

## Acceptance criteria

| ID | Observable result | Verification method | Evidence / state |
| --- | --- | --- | --- |
| S010-AC01 | Hiring a coach in a window charges the fee and changes the coach | Web flow | Done: $8.0M → $5.8M after hire |
| S010-AC02 | Staff wages appear in costs; mid-table clubs stay near break-even | Headless 12 leagues × 3 clubs × 6 seeds × 3 seasons | Done: 0 sacked, mid-table net −1 to +1M |
| S010-AC03 | Same day gives the same club and goal; goals fit the table position | Headless 30 days | Done: climb 16, title 8, promote 5, survive 1; idle success 9/30 |
| S010-AC04 | Finishing the challenge shows the result, records streak and score once per day | Web flow | Done: result screen, start card shows "Missed · pts" |
| S010-AC05 | Career achievements and trophies are earned from play | Headless 3 clubs × 6 seasons; web toast | Done: titles, promotion, Europa Cup; toast shown over the sim |
| S010-AC06 | Club tab shows the latest headlines | Headless season; web | Done |
| S010-AC07 | Everything above works on Android | Device | Pending (T007) |

## Implementation and validation

Task T022. Code: src/game/{staff,challenge,meta,achievements,news}.ts,
src/state/{GameContext.tsx,saveStore.ts}, src/screens/{StaffSheet,Challenge,Honours}.tsx.
