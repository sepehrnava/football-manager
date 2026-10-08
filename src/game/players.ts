import { LINE_OF, MARKET, PENALTY, RELATED, RETIRE_ALWAYS_AT, RETIRE_CHANCE } from './constants';
import { NATIONS } from './names';
import type { Rng } from './rng';
import type { Line, Player, Position } from './types';

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function ageFactor(age: number) {
  if (age <= 21) return 1.5;
  if (age <= 24) return 1.25;
  if (age <= 28) return 1;
  if (age <= 31) return 0.7;
  return 0.45;
}

/** Transfer value in dollars. */
export function playerValue(p: Pick<Player, 'rating' | 'age' | 'potential'>) {
  const growth = Math.max(0, p.potential - p.rating);
  const base = 500_000 * Math.exp(0.16 * (p.rating - 60)) * ageFactor(p.age);
  return roundMoney(base * (1 + growth / 40));
}

/** The going yearly wage for a player of this rating, before personal demands. */
export function marketWage(p: Pick<Player, 'rating'>) {
  return roundMoney(100_000 * Math.exp(0.14 * (p.rating - 60)));
}

/** What the player asks for to sign or renew. Winning clubs pay more. */
export function wageDemand(p: Pick<Player, 'rating' | 'greed'>, success = 1) {
  return roundMoney(marketWage(p) * p.greed * success);
}

export function roundMoney(n: number) {
  if (n >= 1_000_000) return Math.round(n / 50_000) * 50_000;
  return Math.round(n / 5_000) * 5_000;
}

export function chemistry(p: Pick<Player, 'seasonsAtClub'>) {
  return Math.min(100, 40 + 20 * p.seasonsAtClub);
}

export function lineOf(p: Pick<Player, 'positions'>): Line {
  return LINE_OF[p.positions[0]];
}

/** Rating when playing in `pos`, after the out-of-position penalty. */
export function ratingAt(p: Pick<Player, 'positions' | 'rating'>, pos: Position) {
  if (p.positions.includes(pos)) return p.rating;
  const isGk = p.positions[0] === 'GK';
  if (isGk !== (pos === 'GK')) return Math.max(1, p.rating - PENALTY.goalkeeper);
  if (p.positions.some((own) => RELATED[own].includes(pos))) return p.rating - PENALTY.related;
  if (p.positions.some((own) => LINE_OF[own] === LINE_OF[pos])) return p.rating - PENALTY.sameLine;
  return Math.max(1, p.rating - PENALTY.otherLine);
}

export function surname(name: string) {
  const parts = name.split(' ');
  if (parts.length <= 1) return name;
  // Keep particles like "de Jong" together.
  return parts.length > 2 && parts[1] === parts[1].toLowerCase()
    ? parts.slice(1).join(' ')
    : parts[parts.length - 1];
}

const SECOND_POSITION: Partial<Record<Position, Position[]>> = {
  CB: ['CDM', 'LB', 'RB'],
  LB: ['LM', 'CB'],
  RB: ['RM', 'CB'],
  CDM: ['CM', 'CB'],
  CM: ['CDM', 'CAM'],
  CAM: ['CM', 'LW', 'RW', 'ST'],
  LM: ['LW', 'CM'],
  RM: ['RW', 'CM'],
  LW: ['RW', 'LM', 'ST'],
  RW: ['LW', 'RM', 'ST'],
  ST: ['CAM', 'LW', 'RW'],
};

export interface PlayerSpec {
  position: Position;
  rating: number;
  age: number;
  seasonsAtClub?: number;
  clubId?: string | null;
}

export function makePlayer(rng: Rng, id: string, spec: PlayerSpec): Player {
  const nation = rng.pick(NATIONS);
  const positions: Position[] = [spec.position];
  const extra = SECOND_POSITION[spec.position];
  if (extra && rng.chance(0.45)) positions.push(rng.pick(extra));
  const rating = clamp(Math.round(spec.rating), 40, 95);
  const headroom = spec.age <= 21 ? 18 : spec.age <= 24 ? 10 : spec.age <= 27 ? 4 : 0;
  return {
    id,
    name: `${rng.pick(nation.first)} ${rng.pick(nation.last)}`,
    flag: nation.flag,
    age: spec.age,
    positions,
    rating,
    potential: clamp(rating + rng.int(0, headroom), rating, 96),
    seasonsAtClub: spec.seasonsAtClub ?? 0,
    goals: 0,
    clubId: spec.clubId ?? null,
    // Existing contracts vary: some players are bargains, some are overpaid.
    contract: {
      wage: roundMoney(marketWage({ rating }) * (0.8 + rng.next() * 0.5)),
      years: rng.int(1, 4),
    },
    scoutBias: rng.next(),
    greed: 0.9 + rng.next() * 0.5,
  };
}

/**
 * What the user sees at a scouting level: a range that always contains the
 * true value, positioned by the player's hidden bias.
 */
export function ratingRange(p: Pick<Player, 'rating' | 'scoutBias'>, level: number): [number, number] {
  const width = MARKET.ratingWidth[Math.min(level, 1)];
  const lo = p.rating - Math.round(p.scoutBias * width);
  return [lo, lo + width];
}

export function potentialRange(
  p: Pick<Player, 'potential' | 'scoutBias'>,
  level: number,
): [number, number] | null {
  const width = MARKET.potentialWidth[Math.min(level, 1)];
  if (width >= 99) return null;
  const lo = p.potential - Math.round(((p.scoutBias * 7) % 1) * width);
  return [lo, lo + width];
}

export function rangeLabel([lo, hi]: [number, number]) {
  return lo === hi ? String(lo) : `${lo}–${hi}`;
}

/** Rating that makes a player of this age worth roughly `value`. */
export function ratingForValue(value: number, age: number) {
  return 60 + Math.log(value / (500_000 * ageFactor(age))) / 0.16;
}

export const ALL_POSITIONS: Position[] = [
  'GK',
  'CB',
  'CB',
  'LB',
  'RB',
  'CDM',
  'CM',
  'CM',
  'CAM',
  'LM',
  'RM',
  'LW',
  'RW',
  'ST',
  'ST',
];

export function positionsForLine(line: Line | 'ALL'): Position[] {
  if (line === 'ALL') return ALL_POSITIONS;
  return ALL_POSITIONS.filter((p) => LINE_OF[p] === line);
}

/**
 * Season-end development: players grow toward their potential until 26, hold
 * their peak until 30, then decline gently, faster from 33.
 */
export function develop(rng: Rng, p: Player): Player {
  const age = p.age + 1;
  let delta: number;
  if (age <= 21) delta = rng.int(2, 4);
  else if (age <= 26) delta = rng.int(1, 3);
  else if (age <= 30) delta = rng.int(-1, 1);
  else if (age <= 32) delta = rng.int(-2, -1);
  else delta = rng.int(-3, -2);
  const rating = delta > 0 ? Math.min(p.potential, p.rating + delta) : Math.max(40, p.rating + delta);
  return {
    ...p,
    age,
    rating,
    potential: Math.max(p.potential, rating),
    seasonsAtClub: p.seasonsAtClub + 1,
    goals: 0,
  };
}

/** Decide who retires at the end of the coming season (players are already a season older). */
export function markRetirements<T extends Player>(rng: Rng, players: T[]): T[] {
  return players.map((p) => {
    const chance = p.age >= RETIRE_ALWAYS_AT ? 1 : (RETIRE_CHANCE[p.age] ?? 0);
    return chance > 0 && rng.chance(chance) ? { ...p, retiring: true } : { ...p, retiring: false };
  });
}

export type Trend = 'rising' | 'peak' | 'declining' | 'retiring';

/** Where a player is in their career, for a simple tag in the UI. */
export function trend(p: Pick<Player, 'age' | 'rating' | 'potential' | 'retiring'>): Trend {
  if (p.retiring) return 'retiring';
  if (p.age >= 31) return 'declining';
  if (p.age <= 26 && p.rating < p.potential) return 'rising';
  return 'peak';
}
