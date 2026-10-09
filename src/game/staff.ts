import { MARKET } from './constants';
import { randomName } from './players';
import type { Rng } from './rng';
import type { GameState, Staff, StaffRole } from './types';

/** Yearly wage by star rating (1–5). Hiring costs one season's wage up front. */
const WAGE_BY_STARS = [200_000, 500_000, 1_000_000, 2_000_000, 3_500_000];

export const STAFF_ROLES: StaffRole[] = ['coach', 'youth', 'scout'];

export const ROLE_INFO: Record<StaffRole, { title: string; icon: string; what: string }> = {
  coach: { title: 'Head coach', icon: '📋', what: 'Makes the whole team play better' },
  youth: { title: 'Youth coach', icon: '🌱', what: 'Helps players aged 23 or under improve faster' },
  scout: { title: 'Chief scout', icon: '🔍', what: 'Makes scouting reports cheaper' },
};

export function staffWage(stars: number) {
  return WAGE_BY_STARS[Math.min(5, Math.max(1, stars)) - 1];
}

/** Attack and defense added by the head coach: a 2-star coach is neutral. */
export function coachBonus(staff: GameState['staff']) {
  const c = staff?.coach;
  if (!c) return { attack: 0, defense: 0 };
  const base = c.stars - 2;
  return {
    attack: base + (c.style === 'attacking' ? 1 : 0),
    defense: base + (c.style === 'defensive' ? 1 : 0),
  };
}

/** Chance per season that a growing young player gets one extra rating point. */
export function youthBoostChance(staff: GameState['staff']) {
  return 0.15 * ((staff?.youth?.stars ?? 1) - 1);
}

/** Scouting price after the chief scout's discount (up to 60% off). */
export function scoutCost(state: Pick<GameState, 'staff'>) {
  const stars = state.staff?.scout?.stars ?? 1;
  return Math.round((MARKET.scoutCost * (1 - 0.15 * (stars - 1))) / 10_000) * 10_000;
}

/** What a staff member does, in a few words. */
export function staffEffect(s: Staff) {
  if (s.role === 'coach') {
    const b = s.stars - 2;
    const sign = (n: number) => (n > 0 ? `+${n}` : `${n}`);
    const style = s.style === 'attacking' ? ' (+1 attack)' : s.style === 'defensive' ? ' (+1 defense)' : '';
    return b === 0 && !style ? 'Average: no bonus' : `${sign(b)} team strength${style}`;
  }
  if (s.role === 'youth') return s.stars === 1 ? 'No extra growth' : `${s.stars * 15 - 15}% chance of extra growth`;
  return `Scouting ${s.stars * 15 - 15}% cheaper`;
}

export function makeStaff(rng: Rng, id: string, role: StaffRole, stars: number): Staff {
  const { name, flag } = randomName(rng);
  return {
    id,
    name,
    flag,
    role,
    stars,
    style: role === 'coach' ? rng.pick(['attacking', 'defensive', 'balanced'] as const) : undefined,
    wage: staffWage(stars),
  };
}

/** Every new career starts with modest staff. */
export function startingStaff(rng: Rng, nextId: () => string): GameState['staff'] {
  return {
    coach: { ...makeStaff(rng, nextId(), 'coach', 2), style: 'balanced' },
    youth: makeStaff(rng, nextId(), 'youth', 1),
    scout: makeStaff(rng, nextId(), 'scout', 1),
  };
}

/** Candidates available in a transfer window: a few per role, mostly 2–4 stars. */
export function staffMarket(rng: Rng, nextId: () => string): Staff[] {
  return STAFF_ROLES.flatMap((role) =>
    [rng.int(1, 3), rng.int(2, 4), rng.int(3, 4), rng.int(3, 5)].map((stars) => makeStaff(rng, nextId(), role, stars)),
  );
}

export function staffWages(staff: GameState['staff']) {
  return STAFF_ROLES.reduce((sum, r) => sum + (staff?.[r]?.wage ?? 0), 0);
}

/**
 * Hire a candidate: pay one season's wage as a signing fee, plus half a season's
 * wage to release the person being replaced. Only during a transfer window.
 */
export function hireStaff(state: GameState, candidateId: string): GameState {
  const c = state.staffMarket?.find((s) => s.id === candidateId);
  if (!c || state.phase !== 'window') return state;
  const current = state.staff?.[c.role];
  const cost = hireCost(state, c);
  if (cost > state.money) return state;
  return {
    ...state,
    money: state.money - cost,
    staff: { ...state.staff, [c.role]: c },
    staffMarket: [...(state.staffMarket ?? []).filter((s) => s.id !== c.id), ...(current ? [current] : [])],
  };
}

export function hireCost(state: Pick<GameState, 'staff'>, c: Staff) {
  const current = state.staff?.[c.role];
  return c.wage + Math.round((current?.wage ?? 0) / 2);
}
