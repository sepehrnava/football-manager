import { FORMATIONS, SLOT_WEIGHTS, TACTICS } from './constants';
import { chemistry, clamp, ratingAt } from './players';
import type { FormationId, GameState, Player, Tactic } from './types';

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
  let chem = 0;
  let filled = 0;
  formation.slots.forEach((slot, i) => {
    const p = xi[i];
    const r = p ? ratingAt(p, slot.pos) : EMPTY_SLOT_RATING;
    const w = SLOT_WEIGHTS[slot.pos];
    att += r * w.attack;
    attW += w.attack;
    def += r * w.defense;
    defW += w.defense;
    if (p) {
      chem += chemistry(p);
      filled += 1;
    }
  });
  const captainIn = captainId !== null && xi.some((p) => p?.id === captainId);
  const teamChem = filled ? clamp(Math.round(chem / filled + (captainIn ? 10 : 0)), 0, 100) : 0;
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

export function userStrength(state: GameState) {
  return teamStrength(state.squad, state.lineup, state.formation, state.tactic, state.captainId);
}

/**
 * Best XI for a formation: fill the hardest slots first with the
 * highest effective rating available. Slots already set in `base` are kept.
 */
export function autoPick(
  squad: Player[],
  formationId: FormationId,
  base?: (string | null)[],
): (string | null)[] {
  const slots = FORMATIONS[formationId].slots;
  const lineup: (string | null)[] = slots.map((_, i) => base?.[i] ?? null);
  const used = new Set(lineup.filter((id): id is string => id !== null));
  // GK first, then strikers and centre-backs, then the rest.
  const order = slots
    .map((s, i) => ({ s, i }))
    .filter(({ i }) => lineup[i] === null)
    .sort((a, b) => slotPriority(a.s.pos) - slotPriority(b.s.pos));
  for (const { s, i } of order) {
    let best: Player | null = null;
    let bestR = -1;
    for (const p of squad) {
      if (used.has(p.id)) continue;
      const r = ratingAt(p, s.pos);
      if (r > bestR) {
        best = p;
        bestR = r;
      }
    }
    if (best) {
      used.add(best.id);
      lineup[i] = best.id;
    }
  }
  return lineup;
}

function slotPriority(pos: string) {
  return pos === 'GK' ? 0 : pos === 'ST' || pos === 'CB' ? 1 : 2;
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
 * The 7 substitutes: a backup goalkeeper first, then the best remaining
 * reserves. Everyone else is outside the matchday squad.
 */
export function benchFor(squad: Player[], lineup: (string | null)[], size: number): Player[] {
  const reserves = squad
    .filter((p) => !lineup.includes(p.id))
    .sort((a, b) => b.rating - a.rating);
  const gk = reserves.find((p) => p.positions[0] === 'GK');
  const rest = reserves.filter((p) => p !== gk);
  return (gk ? [gk, ...rest] : rest).slice(0, size);
}

export function wageBill(squad: Player[]) {
  return squad.reduce((sum, p) => sum + p.contract.wage, 0);
}
