import { LINE_OF, PENALTY, RELATED } from './constants';
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

/** Yearly wage in dollars; depends on rating only. */
export function playerWage(p: Pick<Player, 'rating'>) {
  return roundMoney(100_000 * Math.exp(0.14 * (p.rating - 60)));
}

function roundMoney(n: number) {
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
  };
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
 * Season-end development: young players grow toward potential, veterans decline.
 */
export function develop(rng: Rng, p: Player): Player {
  const age = p.age + 1;
  let delta: number;
  if (age <= 21) delta = rng.int(2, 5);
  else if (age <= 24) delta = rng.int(1, 3);
  else if (age <= 28) delta = rng.int(-1, 1);
  else if (age <= 31) delta = rng.int(-2, 0);
  else delta = rng.int(-4, -1);
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
