import type { Player, Position } from './types';

/** Classic shirt numbers for each position, best first. */
const PREFERRED: Record<Position, number[]> = {
  GK: [1, 13, 31, 25],
  CB: [5, 4, 6, 15, 3, 24],
  LB: [3, 12, 23],
  RB: [2, 22, 12],
  CDM: [6, 16, 4, 14],
  CM: [8, 14, 18, 16],
  CAM: [10, 20, 8],
  LM: [11, 17, 7],
  RM: [7, 17, 19],
  LW: [11, 7, 17],
  RW: [7, 11, 19],
  ST: [9, 19, 21, 10],
};

/**
 * Gives every squad player without a shirt number a free one. Numbers never
 * change once given; the best players pick classic numbers first. Returns the
 * same array when nothing changes.
 */
export function assignNumbers(squad: Player[]): Player[] {
  if (squad.every((p) => p.number)) return squad;
  const taken = new Set(squad.filter((p) => p.number).map((p) => p.number!));
  const given = new Map<string, number>();
  const waiting = squad.filter((p) => !p.number).sort((a, b) => b.rating - a.rating);
  for (const p of waiting) {
    const wish = PREFERRED[p.positions[0]] ?? [];
    let n = wish.find((x) => !taken.has(x));
    if (n === undefined) for (n = 2; taken.has(n) && n < 99; n++);
    taken.add(n);
    given.set(p.id, n);
  }
  return squad.map((p) => (given.has(p.id) ? { ...p, number: given.get(p.id) } : p));
}
