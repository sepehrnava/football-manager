import { FORMATIONS } from './constants';
import type { FormationId, Player } from './types';

/**
 * FIFA-style chemistry links: lines between neighbouring positions in a formation.
 * A link is 0–3: +1 per season the two have played together at the club (max 2)
 * and +1 when they share a nationality.
 */
export type Link = [number, number];

const cache = new Map<FormationId, Link[]>();

/** Neighbouring slots: each slot's two nearest, anything close, mirrored left/right. */
export function formationLinks(id: FormationId): Link[] {
  const hit = cache.get(id);
  if (hit) return hit;
  const slots = FORMATIONS[id].slots;
  const dist = (a: number, b: number) => Math.hypot(slots[a].x - slots[b].x, (slots[a].y - slots[b].y) * 1.25);
  const mirror = (i: number) =>
    slots.findIndex((s) => Math.abs(s.x - (1 - slots[i].x)) < 0.02 && Math.abs(s.y - slots[i].y) < 0.02);
  const keys = new Set<string>();
  const add = (a: number, b: number) => {
    if (a >= 0 && b >= 0 && a !== b) keys.add(a < b ? `${a}-${b}` : `${b}-${a}`);
  };
  slots.forEach((_, i) => {
    slots
      .map((_, j) => j)
      .filter((j) => j !== i)
      .sort((a, b) => dist(i, a) - dist(i, b))
      .filter((j, k) => k < 2 || dist(i, j) < 0.28)
      .forEach((j) => {
        add(i, j);
        add(mirror(i), mirror(j));
      });
  });
  const links = [...keys].map((k) => k.split('-').map(Number) as Link);
  cache.set(id, links);
  return links;
}

export function linkScore(a: Player | null, b: Player | null) {
  if (!a || !b) return 0;
  const together = Math.min(2, a.seasonsAtClub, b.seasonsAtClub);
  const nation = a.flag && a.flag === b.flag ? 1 : 0;
  return Math.min(3, together + nation);
}

/** Chemistry from an average link strength (0–3): 40 for all red, 100 for all strong. */
export function chemFromLinks(average: number) {
  return Math.round(40 + 20 * average);
}

/** Every link of a lineup with its strength, plus each starter's own chemistry. */
export function lineupLinks(xi: (Player | null)[], formation: FormationId) {
  const links = formationLinks(formation).map(([a, b]) => ({ a, b, score: linkScore(xi[a], xi[b]) }));
  const average = links.length ? links.reduce((sum, l) => sum + l.score, 0) / links.length : 0;
  const perSlot = xi.map((_, i) => {
    const mine = links.filter((l) => l.a === i || l.b === i);
    return mine.length ? chemFromLinks(mine.reduce((sum, l) => sum + l.score, 0) / mine.length) : 40;
  });
  return { links, average, perSlot };
}
