import { BENCH_SIZE, FORMATIONS, SLOT_WEIGHTS, TACTICS } from './constants';
import { chemFromLinks, lineupLinks } from './links';
import { clamp, ratingAt } from './players';
import { coachBonus } from './staff';
import type { FormationId, GameState, Player, Position, Tactic } from './types';

export interface TeamStrength {
  attack: number;
  defense: number;
  power: number;
  chemistry: number;
  filled: number;
}

const EMPTY_SLOT_RATING = 25;

export function starters(squad: Player[], lineup: (string | null)[]) {
  return lineup.map((id) => (id ? (squad.find((p) => p.id === id) ?? null) : null));
}

export function teamStrength(
  squad: Player[],
  lineup: (string | null)[],
  formationId: FormationId,
  tactic: Tactic,
  captainId: string | null,
): TeamStrength {
  const formation = FORMATIONS[formationId];
  const xi = starters(squad, lineup);
  let att = 0;
  let attW = 0;
  let def = 0;
  let defW = 0;
  let filled = 0;
  formation.slots.forEach((slot, i) => {
    const p = xi[i];
    const r = p ? ratingAt(p, slot.pos) : EMPTY_SLOT_RATING;
    const w = SLOT_WEIGHTS[slot.pos];
    att += r * w.attack;
    attW += w.attack;
    def += r * w.defense;
    defW += w.defense;
    if (p) filled += 1;
  });
  const captainIn = captainId !== null && xi.some((p) => p?.id === captainId);
  // FIFA-style: chemistry comes from the links between neighbouring starters.
  const linked = lineupLinks(xi, formationId);
  const teamChem = filled ? clamp(chemFromLinks(linked.average) + (captainIn ? 10 : 0), 0, 100) : 0;
  const chemBonus = (teamChem - 50) / 10;
  const t = TACTICS[tactic];
  const attack = Math.round(att / attW + formation.bias.attack + t.attack + chemBonus);
  const defense = Math.round(def / defW + formation.bias.defense + t.defense + chemBonus);
  return {
    attack,
    defense,
    power: Math.round((attack + defense) / 2),
    chemistry: teamChem,
    filled,
  };
}

/** The user's team: squad strength plus the head coach's effect. */
/**
 * Bench depth: the substitutes' average rating against the starters'. A bench as good as the XI
 * adds 3 to attack and defence, a typical one (2–3 points weaker) adds 1, a thin one costs up to 2.
 * Relative to the club's own XI, so it is fair in every league.
 */
export function benchBonus(state: Pick<GameState, 'squad' | 'lineup' | 'bench'>) {
  const xi = starters(state.squad, state.lineup).filter((p): p is Player => !!p);
  const bench = benchFor(state.squad, state.lineup, BENCH_SIZE, state.bench);
  if (!xi.length || !bench.length) return { rating: 0, bonus: 0 };
  const avg = (ps: Player[]) => ps.reduce((sum, p) => sum + p.rating, 0) / ps.length;
  const depth = avg(bench) - avg(xi);
  return { rating: Math.round(avg(bench)), bonus: clamp(Math.round((depth + 4.5) / 1.5), -2, 3) };
}

export function userTeam(state: GameState, tactic: Tactic = state.tactic): TeamStrength & { bench: number } {
  const s = teamStrength(state.squad, state.lineup, state.formation, tactic, state.captainId);
  const c = coachBonus(state.staff);
  const b = benchBonus(state).bonus;
  const attack = s.attack + c.attack + b;
  const defense = s.defense + c.defense + b;
  return { ...s, attack, defense, power: Math.round((attack + defense) / 2), bench: b };
}

export function userStrength(state: GameState) {
  return userTeam(state);
}

/** Small bonus so a natural-position player wins a tie on rating. */
const NATURAL_BONUS = 0.5;

function fitScore(p: Player, pos: Position) {
  return ratingAt(p, pos) + (p.positions.includes(pos) ? NATURAL_BONUS : 0);
}

/**
 * Best XI for a formation: the assignment of players to slots with the highest
 * total rating (Hungarian algorithm), preferring natural positions on ties.
 * Slots already set in `base` are kept.
 */
export function autoPick(
  squad: Player[],
  formationId: FormationId,
  base?: (string | null)[],
): (string | null)[] {
  const slots = FORMATIONS[formationId].slots;
  const lineup: (string | null)[] = slots.map((_, i) => base?.[i] ?? null);
  const used = new Set(lineup.filter((id): id is string => id !== null));
  const open = slots.map((s, i) => ({ pos: s.pos, i })).filter(({ i }) => lineup[i] === null);
  const pool = squad.filter((p) => !used.has(p.id));
  if (!open.length || !pool.length) return lineup;
  const score = open.map(({ pos }) => pool.map((p) => fitScore(p, pos)));
  const match = maxAssignment(score);
  match.forEach((col, row) => {
    if (col >= 0) lineup[open[row].i] = pool[col].id;
  });
  return lineup;
}

/**
 * Rows-to-columns assignment maximizing the total score (rows ≤ columns or
 * not). Returns the matched column for each row, or -1. O(n³) Hungarian method.
 */
function maxAssignment(score: number[][]): number[] {
  const rows = score.length;
  const cols = score[0].length;
  const n = Math.max(rows, cols);
  const max = Math.max(...score.flat());
  // Square cost matrix for minimization; padding cells cost the same as a zero score.
  const cost = (r: number, c: number) => (r < rows && c < cols ? max - score[r][c] : max);
  const u = new Array(n + 1).fill(0);
  const v = new Array(n + 1).fill(0);
  const p = new Array(n + 1).fill(0);
  const way = new Array(n + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    p[0] = i;
    let j0 = 0;
    const minv = new Array(n + 1).fill(Infinity);
    const usedCol = new Array(n + 1).fill(false);
    do {
      usedCol[j0] = true;
      const i0 = p[j0];
      let delta = Infinity;
      let j1 = 0;
      for (let j = 1; j <= n; j++) {
        if (usedCol[j]) continue;
        const cur = cost(i0 - 1, j - 1) - u[i0] - v[j];
        if (cur < minv[j]) {
          minv[j] = cur;
          way[j] = j0;
        }
        if (minv[j] < delta) {
          delta = minv[j];
          j1 = j;
        }
      }
      for (let j = 0; j <= n; j++) {
        if (usedCol[j]) {
          u[p[j]] += delta;
          v[j] -= delta;
        } else {
          minv[j] -= delta;
        }
      }
      j0 = j1;
    } while (p[j0] !== 0);
    do {
      const j1 = way[j0];
      p[j0] = p[j1];
      j0 = j1;
    } while (j0);
  }
  const result = new Array(rows).fill(-1);
  for (let j = 1; j <= n; j++) {
    if (p[j] - 1 < rows && j - 1 < cols) result[p[j] - 1] = j - 1;
  }
  return result;
}

/**
 * Re-seat the current starters in a new formation: each keeps the slot that
 * suits them best; empty slots are left for the user.
 */
export function remapLineup(
  squad: Player[],
  lineup: (string | null)[],
  to: FormationId,
): (string | null)[] {
  const slots = FORMATIONS[to].slots;
  const current = starters(squad, lineup).filter((p): p is Player => p !== null);
  const result: (string | null)[] = slots.map(() => null);
  const pairs: { slot: number; p: Player; r: number }[] = [];
  slots.forEach((s, i) => current.forEach((p) => pairs.push({ slot: i, p, r: ratingAt(p, s.pos) })));
  pairs.sort((a, b) => b.r - a.r);
  const placed = new Set<string>();
  for (const { slot, p } of pairs) {
    if (result[slot] || placed.has(p.id)) continue;
    result[slot] = p.id;
    placed.add(p.id);
  }
  return result;
}

/**
 * The 7 substitutes: the ones the user chose (still in the squad and not starting) first, then
 * filled automatically with a backup goalkeeper and the best remaining players. Everyone else is
 * a reserve, outside the matchday squad.
 */
export function benchFor(squad: Player[], lineup: (string | null)[], size: number, chosen: string[] = []): Player[] {
  const out = squad.filter((p) => !lineup.includes(p.id));
  const picked = chosen
    .map((id) => out.find((p) => p.id === id))
    .filter((p): p is Player => !!p)
    .slice(0, size);
  const rest = out.filter((p) => !picked.includes(p)).sort((a, b) => b.rating - a.rating);
  const needGk = !picked.some((p) => p.positions[0] === 'GK');
  const gk = needGk ? rest.find((p) => p.positions[0] === 'GK') : undefined;
  const fill = gk ? [gk, ...rest.filter((p) => p !== gk)] : rest;
  return [...picked, ...fill].slice(0, size);
}

export function wageBill(squad: Player[]) {
  return squad.reduce((sum, p) => sum + p.contract.wage, 0);
}

/** What makes up the user's team chemistry, for explaining it on screen. */
export function chemistryBreakdown(state: GameState) {
  const xi = starters(state.squad, state.lineup);
  const { links, average, perSlot } = lineupLinks(xi, state.formation);
  const captainIn = state.captainId !== null && xi.some((p) => p?.id === state.captainId);
  const team = userTeam(state).chemistry;
  return {
    team,
    fromLinks: chemFromLinks(average),
    captainIn,
    /** Added to both attack and defence. */
    bonus: Math.round((team - 50) / 10),
    counts: [0, 1, 2, 3].map((n) => links.filter((l) => l.score === n).length),
    links,
    perSlot,
  };
}
