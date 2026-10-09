import { FORMATIONS, SQUAD_MAX } from './constants';
import { askingPrice } from './market';
import { potentialRange, ratingAt, ratingRange, wageDemand } from './players';
import type { GameState, Player, Position } from './types';

export type FinderTab = 'foryou' | 'wonder' | 'experienced' | 'world' | 'bargain' | 'browse' | 'watch';

export interface Finder {
  tab: FinderTab;
  /** Browse only: country id or 'ALL'. */
  country: string;
  /** Any tab: a specific position, or 'ALL'. */
  position: Position | 'ALL';
  /** Browse only: highest transfer fee, or null for any. */
  maxFee: number | null;
  /** Browse only: part of a player's name. */
  text: string;
}

export interface Found {
  player: Player;
  /** Why this player is shown (a short hint). */
  note?: string;
}

export const DEFAULT_FINDER: Finder = { tab: 'foryou', country: 'ALL', position: 'ALL', maxFee: null, text: '' };

/** How many players the World class list shows. */
export const WORLD_CLASS = 50;

/**
 * The rating the user can count on: the bottom of the scouting range (exact once
 * scouted). Ranking by the middle would surface players whose range happens to
 * overstate them (picking the best of many guesses favours lucky guesses), so
 * results would disappoint after scouting. The bottom never overpromises.
 */
function seen(state: GameState, p: Player) {
  return ratingRange(p, state.scouting[p.id] ?? 0)[0];
}

function clubCountry(state: GameState, p: Player) {
  return state.clubs.find((c) => c.id === p.clubId)?.country;
}

/**
 * Players matching a tab and filters, best first. Uses only what the user can
 * see, so unscouted players are ranked by their rating range, never the truth.
 */
export function findPlayers(state: GameState, f: Finder): Found[] {
  const afford = state.money;
  const priced = state.world
    .filter((p) => p.clubId && (f.position === 'ALL' || p.positions.includes(f.position)))
    .map((p) => ({ p, fee: askingPrice(state, p), vis: seen(state, p) }));
  // The bottom of the potential range: what a youngster will at least become.
  const potFloor = (p: Player) => potentialRange(p, state.scouting[p.id] ?? 0)?.[0] ?? p.rating;

  if (f.tab === 'watch') {
    const ids = new Set(state.watch ?? []);
    return priced
      .filter(({ p }) => ids.has(p.id))
      .sort((a, b) => b.vis - a.vis)
      .map(({ p }) => ({ player: p }));
  }

  if (f.tab === 'foryou') {
    // How much better would each candidate be than the current starter in the slot they'd play?
    const slots = FORMATIONS[state.formation].slots;
    const current = slots.map((sl, i) => {
      const starter = state.squad.find((p) => p.id === state.lineup[i]);
      return starter ? ratingAt(starter, sl.pos) : 25;
    });
    const room = state.squad.length < SQUAD_MAX;
    const out: (Found & { gain: number; fee: number })[] = [];
    for (const { p, fee, vis } of priced) {
      // Affordable means the fee plus a first season of wages.
      if (!room || p.retiring || fee + wageDemand(p) > afford) continue;
      const fake = { positions: p.positions, rating: vis };
      let best = 0;
      let at = '';
      slots.forEach((sl, i) => {
        const gain = ratingAt(fake, sl.pos) - current[i];
        if (gain > best) {
          best = gain;
          at = sl.pos;
        }
      });
      if (best >= 1) out.push({ player: p, note: `At least +${Math.round(best)} at ${at}`, gain: best, fee });
    }
    return out.sort((a, b) => b.gain - a.gain || a.fee - b.fee).map(({ player, note }) => ({ player, note }));
  }

  if (f.tab === 'wonder') {
    return priced
      .filter(({ p }) => p.age <= 21 && potFloor(p) >= p.rating + 4)
      .sort((a, b) => potFloor(b.p) - potFloor(a.p) || a.fee - b.fee)
      .map(({ p }) => {
        const [lo, hi] = potentialRange(p, state.scouting[p.id] ?? 0) ?? [p.potential, p.potential];
        return { player: p, note: lo === hi ? `Potential ${lo}` : `Potential ${lo}–${hi}` };
      });
  }

  if (f.tab === 'experienced') {
    return priced
      .filter(({ p, fee }) => p.age >= 30 && !p.retiring && fee + wageDemand(p) <= afford)
      .sort((a, b) => b.vis - a.vis || a.fee - b.fee)
      .map(({ p }) => ({ player: p, note: 'Proven quality for a low fee' }));
  }

  if (f.tab === 'world') {
    return priced
      .sort((a, b) => b.vis - a.vis || b.p.potential - a.p.potential)
      .slice(0, WORLD_CLASS)
      .map(({ p }, i) => ({ player: p, note: `#${i + 1} ${f.position === 'ALL' ? 'in the world' : f.position}` }));
  }

  if (f.tab === 'bargain') {
    return priced
      .filter(({ p, fee }) => p.contract.years <= 1 && !p.retiring && fee + wageDemand(p) <= afford && p.age <= 33)
      .sort((a, b) => b.vis - a.vis || a.fee - b.fee)
      .map(({ p }) => ({ player: p, note: 'Last contract year: a cheaper fee' }));
  }

  // browse
  const text = f.text.trim().toLowerCase();
  return priced
    .filter(({ p, fee }) => {
      if (text.length >= 2 && !p.name.toLowerCase().includes(text)) return false;
      if (f.country !== 'ALL' && clubCountry(state, p) !== f.country) return false;
      if (f.maxFee !== null && fee > f.maxFee) return false;
      return true;
    })
    .sort((a, b) => b.vis - a.vis || a.fee - b.fee)
    .map(({ p }) => ({ player: p }));
}
