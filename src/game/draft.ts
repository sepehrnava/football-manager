import { ECONOMY, LINE_MIN, LINE_OF, SQUAD_MIN } from './constants';
import { foundingMoney, newClubSize, STARTING_SQUAD } from './game';
import { flagOf } from './leagues';
import { academyFill } from './market';
import { NATIONS } from './names';
import { generatedName, makePlayer, playerValue, roundMoney, wageDemand } from './players';
import { createRng } from './rng';
import type { Line, Player, Position } from './types';

/**
 * Drafting a brand-new club's first squad: a pool of players to buy from, a total
 * budget, and a suggested amount to spend on players (the rest pays wages and
 * running costs). The budget equals the old founding money plus what the old
 * ready-made squad was worth, so a sensible draft keeps the same balance.
 */

/** How many of each position the pool offers. */
const POOL: [Position, number][] = [
  ['GK', 5],
  ['CB', 8],
  ['LB', 4],
  ['RB', 4],
  ['CDM', 4],
  ['CM', 7],
  ['CAM', 4],
  ['LM', 3],
  ['RM', 3],
  ['LW', 3],
  ['RW', 3],
  ['ST', 6],
];

const templateAverage = () => STARTING_SQUAD.reduce((sum, [, r]) => sum + r, 0) / STARTING_SQUAD.length;

export interface DraftPlan {
  /** Everything there is to spend. */
  budget: number;
  /** Suggested spend on players; the rest covers wages and running costs. */
  suggested: number;
  pool: Player[];
}

function shiftFor(country: string) {
  return newClubSize(country) - ECONOMY.newClubSize;
}

/** What the old ready-made squad was worth: the suggested spend on players. */
function templateValue(country: string) {
  const rng = createRng(1);
  const shift = shiftFor(country);
  return STARTING_SQUAD.reduce(
    (sum, [position, rating, age]) => sum + playerValue(makePlayer(rng, 'x', { position, rating: rating + shift, age })),
    0,
  );
}

export function draftPlan(country: string, seed: number): DraftPlan {
  const rng = createRng(seed);
  const shift = shiftFor(country);
  // Half the pool comes from the club's own country: compatriots link better.
  const home = NATIONS.find((n) => n.flag === flagOf(country));
  let n = 0;
  const pool: Player[] = [];
  for (const [position, count] of POOL) {
    for (let i = 0; i < count; i++) {
      const age = rng.int(17, 33);
      const p = makePlayer(rng, `d${n++}`, {
        position,
        rating: templateAverage() + shift + rng.int(-7, 8) - (age <= 19 ? 3 : 0),
        age,
      });
      if (home && rng.chance(0.5)) pool.push({ ...p, flag: home.flag, name: generatedName(rng, home) });
      else pool.push(p);
    }
  }
  pool.sort((a, b) => b.rating - a.rating);
  return { ...draftBudget(country), pool };
}

export function draftBudget(country: string) {
  const suggested = Math.round(templateValue(country) / 100_000) * 100_000;
  return { budget: foundingMoney(country) + suggested, suggested };
}

/** What the drafted players cost: academy youngsters are free. */
export function draftCost(squad: Player[]) {
  return squad.reduce((sum, p) => sum + (isAcademy(p) ? 0 : draftPrice(p)), 0);
}

export const isAcademy = (p: Player) => p.id.startsWith('a');

/** The drafted squad as it joins the club: new contracts, and what is left of the budget. */
export function signDraft(country: string, picked: Player[]) {
  const squad = picked.map((p) => ({
    ...p,
    seasonsAtClub: isAcademy(p) ? 1 : 0,
    contract: isAcademy(p) ? p.contract : { wage: draftWage(p), years: 3 },
  }));
  return { squad, money: draftBudget(country).budget - draftCost(picked) };
}

export const draftPrice = (p: Player) => roundMoney(playerValue(p) * 0.65);
export const draftWage = (p: Player) => wageDemand(p);

/** Positions still missing before the squad can start: per line, plus the total. */
export function draftNeeds(squad: Player[]) {
  const lines = (Object.keys(LINE_MIN) as Line[]).map((line) => {
    const have = squad.filter((p) => LINE_OF[p.positions[0]] === line).length;
    return { line, have, need: LINE_MIN[line] };
  });
  const missing = Math.max(
    SQUAD_MIN - squad.length,
    lines.reduce((sum, l) => sum + Math.max(0, l.need - l.have), 0),
  );
  return { lines, missing, ready: missing === 0 };
}

/** Free academy youngsters for whatever is still missing. */
export function academyForDraft(squad: Player[], seed: number) {
  return academyFill(squad, createRng(seed), 1).players.map((p, i) => ({ ...p, id: `a${seed}-${i}` }));
}
