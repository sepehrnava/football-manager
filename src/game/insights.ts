import { counterEffect, tacticFor, USER_ID } from './game';
import { expectedGoals } from './league';
import { userTeam } from './team';
import type { Fixture, GameState, Style, Tactic } from './types';

export function userFixture(state: GameState, round: number): Fixture | undefined {
  return state.fixtures.find(
    (f) => f.round === round && (f.homeId === USER_ID || f.awayId === USER_ID),
  );
}

function poissonPmf(lambda: number, max: number) {
  const p: number[] = [];
  let term = Math.exp(-lambda);
  for (let k = 0; k <= max; k++) {
    p.push(term);
    term = (term * lambda) / (k + 1);
  }
  return p;
}

/** Win / draw / loss chances from the user's point of view. */
export function matchOdds(
  us: { attack: number; defense: number },
  them: { attack: number; defense: number },
  home: boolean,
) {
  const goalsFor = poissonPmf(expectedGoals(us.attack, them.defense, home), 10);
  const goalsAgainst = poissonPmf(expectedGoals(them.attack, us.defense, !home), 10);
  let win = 0;
  let draw = 0;
  goalsFor.forEach((pf, f) =>
    goalsAgainst.forEach((pa, a) => {
      if (f > a) win += pf * pa;
      else if (f === a) draw += pf * pa;
    }),
  );
  return { win, draw, loss: Math.max(0, 1 - win - draw) };
}

export interface MatchInsight {
  opponentId: string;
  home: boolean;
  tactic: Tactic;
  /** Null until the user has played this opponent. */
  style: Style | null;
  /** Effect of the planned tactic on this style: +, 0 or −. */
  effect: number;
  odds: { win: number; draw: number; loss: number };
}

/**
 * The user's view of an upcoming match. A style only counts in the odds once
 * it is known, so the odds never leak the answer.
 */
export function matchInsight(state: GameState, fixture: Fixture): MatchInsight {
  const home = fixture.homeId === USER_ID;
  const opp = state.clubs.find((c) => c.id === (home ? fixture.awayId : fixture.homeId))!;
  const tactic = tacticFor(state, fixture.round);
  const known = state.knownStyles.includes(opp.id);
  const effect = known ? counterEffect(tactic, opp.style) : 0;
  const base = userTeam(state, tactic);
  const us = { attack: base.attack + effect, defense: base.defense + effect };
  return {
    opponentId: opp.id,
    home,
    tactic,
    style: known ? opp.style : null,
    effect,
    odds: matchOdds(us, opp, home),
  };
}

export function percent(p: number) {
  return `${Math.round(p * 100)}%`;
}
