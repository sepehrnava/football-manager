import { counterEffect, tacticFor, USER_ID } from './game';
import { expectedGoals } from './league';
import { FORMATIONS } from './constants';
import { ratingAt } from './players';
import { userTeam } from './team';
import type { Fixture, GameState, Player, Position, Style, Tactic } from './types';

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

export interface SaleImpact {
  /** The XI position he plays, or null when he is not in the XI. */
  slot: Position | null;
  /** XI power now and after the sale (the best free player takes his place; bench bonus left out). */
  before: number;
  after: number;
  /** Who takes his place in the XI. */
  cover: Player | null;
}

/** Team power from the XI alone: the bench-depth bonus moves with the XI's average, so it would blur a sale. */
function xiPower(state: GameState) {
  const t = userTeam(state);
  return Math.round((t.attack - t.bench + (t.defense - t.bench)) / 2);
}

/** What selling a player would do to the XI. Read-only: nothing in the state changes. */
export function saleImpact(state: GameState, playerId: string): SaleImpact | null {
  if (!state.squad.some((p) => p.id === playerId)) return null;
  const before = xiPower(state);
  const idx = state.lineup.indexOf(playerId);
  const squad = state.squad.filter((p) => p.id !== playerId);
  const captainId = state.captainId === playerId ? null : state.captainId;
  if (idx < 0) return { slot: null, before, after: xiPower({ ...state, squad, captainId }), cover: null };
  const pos = FORMATIONS[state.formation].slots[idx].pos;
  const score = (p: Player) => ratingAt(p, pos) + (p.positions.includes(pos) ? 0.5 : 0);
  const cover = squad.filter((p) => !state.lineup.includes(p.id)).sort((a, b) => score(b) - score(a))[0] ?? null;
  const lineup = state.lineup.map((id, i) => (i === idx ? (cover?.id ?? null) : id));
  return { slot: pos, before, after: xiPower({ ...state, squad, lineup, captainId }), cover };
}
