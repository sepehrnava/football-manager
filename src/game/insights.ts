import { ROUNDS } from './constants';
import { counterEffect, tacticFor, USER_ID } from './game';
import { expectedGoals, leagueTable, type TableRow } from './league';
import { teamStrength } from './team';
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
  const base = teamStrength(state.squad, state.lineup, state.formation, tactic, state.captainId);
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

export interface KeyMoment {
  title: string;
  text: string;
}

/**
 * Should the fast simulation pause before the next round?
 * Returns why, or null to keep playing.
 */
export function keyMoment(state: GameState): KeyMoment | null {
  if (state.phase !== 'season') return null;
  const fixture = userFixture(state, state.round);
  if (!fixture) return null;
  const table = leagueTable(state.clubs, state.fixtures);
  const myIndex = table.findIndex((r) => r.clubId === USER_ID);
  const me = table[myIndex];
  if (me.played === 0) return null;
  const oppId = fixture.homeId === USER_ID ? fixture.awayId : fixture.homeId;
  const oppIndex = table.findIndex((r) => r.clubId === oppId);
  const opp = table[oppIndex];
  const oppName = state.clubs.find((c) => c.id === oppId)!.name;
  const left = ROUNDS - state.round;

  // Fires once per streak: exactly three losses, not four or five.
  if (me.form.length >= 3 && lastResults(me, 3).every((r) => r === 'L') && me.form.at(-4) !== 'L') {
    return {
      title: 'Three defeats in a row',
      text: 'Time to change something. Try another tactic, or close this and adjust your XI.',
    };
  }
  if (left <= 3 && myIndex > 0 && table[0].points - me.points <= 3 * left && table[0].points - me.points <= 4) {
    return {
      title: 'Title race',
      text: `${left} match${left > 1 ? 'es' : ''} left and you are ${table[0].points - me.points} points off the top.`,
    };
  }
  if (oppIndex === 0 && myIndex > 0 && myIndex <= 3) {
    return { title: 'Against the leaders', text: `${oppName} are top of the league.` };
  }
  if (Math.abs(oppIndex - myIndex) === 1 && Math.abs(opp.points - me.points) <= 1) {
    return {
      title: 'Six-pointer',
      text: `${oppName} are right ${oppIndex < myIndex ? 'above' : 'below'} you, ${Math.abs(opp.points - me.points)} points apart.`,
    };
  }
  return null;
}

function lastResults(row: TableRow, n: number) {
  return row.form.slice(-n);
}

export function percent(p: number) {
  return `${Math.round(p * 100)}%`;
}
