import { SQUAD_MAX } from './constants';
import { ACADEMY_WAGE, USER_ID } from './market';
import { clamp, makePlayer, positionsForLine } from './players';
import type { Rng } from './rng';
import type { GameState, Player } from './types';

/** Prospects the academy presents each pre-season; the user may promote one. */
export const INTAKE_SIZE = 3;
/** First contract for a promoted prospect. */
export const YOUTH_CONTRACT = { wage: ACADEMY_WAGE, years: 3 };

/** Potential range width the youth coach can judge, by stars (1–5): better coaches see clearer. */
const JUDGEMENT = [12, 9, 6, 4, 2];

/**
 * The pre-season academy intake: three 16–17-year-olds, mostly raw (48–60) with very different
 * potential. A better youth coach finds slightly better talent. None in the Daily Challenge.
 */
export function academyIntake(state: GameState, rng: Rng): GameState {
  if (state.challenge) return { ...state, academy: null };
  const stars = state.staff?.youth?.stars ?? 1;
  let n = state.nextId;
  const prospects: Player[] = Array.from({ length: INTAKE_SIZE }, () => {
    const p = makePlayer(rng, `p${n++}`, {
      position: rng.pick(positionsForLine('ALL')),
      rating: rng.int(48, 60),
      age: rng.int(16, 17),
    });
    return { ...p, potential: clamp(p.rating + rng.int(6, 26) + (stars - 1), p.rating, 93) };
  });
  return { ...state, nextId: n, academy: { season: state.season, prospects } };
}

/** What the youth coach believes a prospect can become: a range that narrows with his stars. */
export function prospectRange(p: Player, stars: number): [number, number] {
  const width = JUDGEMENT[clamp(stars, 1, 5) - 1];
  const lo = clamp(p.potential - Math.round(p.scoutBias * width), p.rating, 99);
  return [lo, Math.min(99, lo + width)];
}

/** Promote one prospect into the squad on a youth contract; the others leave. */
export function promoteProspect(state: GameState, playerId: string): GameState {
  const p = state.academy?.prospects.find((x) => x.id === playerId);
  if (!p || state.squad.length >= SQUAD_MAX) return state;
  const joined: Player = { ...p, clubId: USER_ID, contract: { ...YOUTH_CONTRACT }, seasonsAtClub: 0, fromAcademy: true };
  return { ...state, squad: [...state.squad, joined], academy: null };
}
