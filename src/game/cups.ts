import { playMatch, type Side } from './league';
import type { Rng } from './rng';
import type { Cup, CupId, CupTie } from './types';

/**
 * European cups. Names are generic on purpose: the real competition names are
 * trademarks. The best-placed top-division clubs of each country qualify.
 */
export const CUP_RULES: Record<
  CupId,
  { name: string; short: string; places: Record<string, number>; prizeMillions: number[] }
> = {
  champions: {
    name: 'Champions Cup',
    short: 'CC',
    places: { english: 4, spanish: 4, german: 3, italian: 3, french: 1, dutch: 1 },
    // Reaching the round of 16, then each win: QF, SF, final, title.
    prizeMillions: [3, 3, 4, 5, 6],
  },
  europa: {
    name: 'Europa Cup',
    short: 'EC',
    places: { english: 2, spanish: 2, german: 2, italian: 2, french: 4, dutch: 4 },
    prizeMillions: [1.5, 1.5, 2, 3, 4],
  },
};

export const CUP_IDS: CupId[] = ['champions', 'europa'];

const STAGE_NAMES: Record<number, string> = { 16: 'Round of 16', 8: 'Quarter-final', 4: 'Semi-final', 2: 'Final' };

/** When each stage is played, as a share of the user's league season. */
const STAGE_TIMING = [0.2, 0.42, 0.7, 0.9];

export function stageName(clubsLeft: number) {
  return STAGE_NAMES[clubsLeft] ?? `Last ${clubsLeft}`;
}

/** Largest power of two (8 or more) not above n, or 0 if too few clubs. */
function bracketSize(n: number) {
  let size = 1;
  while (size * 2 <= n) size *= 2;
  return size >= 8 ? size : 0;
}

/**
 * Builds both cups from each country's top-division ranking (best first).
 * Champions Cup takes the first places, Europa Cup the next ones.
 */
export function drawCups(
  rng: Rng,
  rankings: Map<string, string[]>,
  seasonRounds: number,
): Cup[] {
  const taken = new Map<string, number>();
  return CUP_IDS.flatMap((id) => {
    const rule = CUP_RULES[id];
    const entrants: string[] = [];
    for (const [country, places] of Object.entries(rule.places)) {
      const ranking = rankings.get(country) ?? [];
      const from = taken.get(country) ?? 0;
      entrants.push(...ranking.slice(from, from + places));
      taken.set(country, from + places);
    }
    const size = bracketSize(entrants.length);
    if (!size) return [];
    const field = entrants.slice(0, size);
    for (let i = field.length - 1; i > 0; i--) {
      const j = rng.int(0, i);
      [field[i], field[j]] = [field[j], field[i]];
    }
    const stages = Math.log2(size);
    const timing = STAGE_TIMING.slice(STAGE_TIMING.length - stages);
    const cup: Cup = {
      id,
      name: rule.name,
      stages: timing.map((t, k) => ({
        name: stageName(size / 2 ** k),
        afterRound: Math.max(1, Math.round(seasonRounds * t)),
        ties: [],
      })),
    };
    cup.stages[0].ties = pairUp(field);
    return [cup];
  });
}

function pairUp(clubIds: string[]): CupTie[] {
  const ties: CupTie[] = [];
  for (let i = 0; i + 1 < clubIds.length; i += 2) ties.push({ homeId: clubIds[i], awayId: clubIds[i + 1] });
  return ties;
}

/**
 * Plays every cup stage scheduled after `round`. A draw goes to penalties,
 * slightly favouring the stronger side. Winners are paired for the next stage.
 */
export function playCupStages(
  rng: Rng,
  cups: Cup[],
  round: number,
  sideOf: (clubId: string, opponentId: string) => Side,
): Cup[] {
  return cups.map((cup) => {
    const k = cup.stages.findIndex((s) => s.afterRound === round && s.ties.length && !s.ties[0].winnerId);
    if (k < 0) return cup;
    const ties = cup.stages[k].ties.map((t) => {
      const home = sideOf(t.homeId, t.awayId);
      const away = sideOf(t.awayId, t.homeId);
      const score = playMatch(rng, home, away);
      let winnerId = score.home > score.away ? t.homeId : t.awayId;
      let pens = false;
      if (score.home === score.away) {
        pens = true;
        const edge = 0.5 + (home.attack + home.defense - away.attack - away.defense) / 200;
        winnerId = rng.chance(Math.min(0.65, Math.max(0.35, edge))) ? t.homeId : t.awayId;
      }
      return { ...t, result: { ...score, pens }, winnerId };
    });
    const stages = cup.stages.map((s, i) => (i === k ? { ...s, ties } : s));
    if (k + 1 < stages.length) stages[k + 1] = { ...stages[k + 1], ties: pairUp(ties.map((t) => t.winnerId!)) };
    return { ...cup, stages };
  });
}

/** The user's journey in a cup: the stage reached, or null if not entered. */
export function cupProgress(cup: Cup, clubId: string) {
  const entered = cup.stages[0].ties.some((t) => t.homeId === clubId || t.awayId === clubId);
  if (!entered) return null;
  let wins = 0;
  let out = false;
  for (const stage of cup.stages) {
    const tie = stage.ties.find((t) => t.homeId === clubId || t.awayId === clubId);
    if (!tie || !tie.winnerId) break;
    if (tie.winnerId === clubId) wins++;
    else {
      out = true;
      break;
    }
  }
  const champion = wins === cup.stages.length;
  return { wins, out, champion };
}
