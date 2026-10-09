import type { FormationId, Line, Position, Style, Tactic } from './types';

export const FIRST_SEASON = 2026;

/** A full matchday squad: 11 starters plus a 7-player bench. */
export const XI_SIZE = 11;
export const BENCH_SIZE = 7;
export const SQUAD_MIN = XI_SIZE + BENCH_SIZE;
export const SQUAD_MAX = 25;
/** Fewest players per line, so every position (and its bench cover) can be filled. */
export const LINE_MIN: Record<Line, number> = { GK: 2, DF: 5, MD: 5, AT: 3 };
export const AI_SQUAD = 20;
/**
 * Chance a player decides, at the start of a season, to retire when it ends.
 * By age at that point; 37 and older always retire.
 */
export const RETIRE_CHANCE: Record<number, number> = { 34: 0.2, 35: 0.5, 36: 0.8 };
export const RETIRE_ALWAYS_AT = 37;

// Economy, all in dollars per season. Tuned so the starting club loses money.
export const ECONOMY = {
  startMoney: 10_000_000,
  startFans: 400_000,
  /** Running the club costs a base amount plus a little per fan: bigger clubs cost more. */
  // Starting staff wages (about $0.9M) are part of running a club, so the base is lower.
  runningCostBase: 1_100_000,
  runningCostPerFan: 8,
  /** Stakeholders take this share of a season's profit, and nothing in a loss. */
  stakeholderShare: 0.25,
  /** Loyal supporters who never leave, so income can't collapse to nothing. */
  fansFloor: 250_000,
  revenuePerFan: 5,
  /**
   * Sponsors pay bigger clubs more: scale × e^(0.14 × (size − 60)) − offset,
   * never below zero. A size-64 club (a new club) gets nothing.
   */
  sponsorScale: 1_000_000,
  sponsorOffset: 3_500_000,
  /**
   * TV money: competitions weaker than the strongest top division earn less prize
   * money, so they get TV money instead: the full amount once a competition's
   * average (economy) rating is tvGapForFull points below prizeTopLevel.
   */
  tvMax: 3_000_000,
  prizeTopLevel: 74.5,
  tvGapForFull: 6,
  /** Reference size for budgets and sponsors (a typical new club). */
  newClubSize: 64,
  /** A new user club starts this far below the league's weakest club. */
  newClubBelowWeakest: 1,
  /** A new club's founding investment, as a multiple of the weakest club's budget. */
  newClubInvestment: 1.5,
  /** A new club's player budget: the old ready-made squad's value times this (market prices, no chemistry yet). */
  newClubMarketFactor: 1.6,
  /** Prize money by final position, 1st first (fallback for a 10-club league). */
  prize: [20, 15, 12, 10, 9, 8, 7, 6, 5, 4].map((m) => m * 1_000_000),
  /** Prize money curve: champion and last place for a league of reference strength. */
  prizeFirst: 16_000_000,
  prizeLast: 3_000_000,
  /** Higher = more of the money goes to the top; mid-table roughly breaks even. */
  prizeCurve: 2.5,
  /** Average (economy) level at which last place earns exactly prizeLast. */
  prizeReferenceLevel: 68.5,
  /** Top-4 (economy) level at which the champion earns exactly prizeFirst. */
  prizeEliteReference: 73.4,
  /** Share of the wage bill paid as bonuses for a top-3 finish. */
  topFinishBonus: [0.15, 0.1, 0.05],
  /** Ending a season below this earns a final warning; twice in a row is the sack. */
  debtLimit: -5_000_000,
};

export const LINE_OF: Record<Position, Line> = {
  GK: 'GK',
  CB: 'DF',
  LB: 'DF',
  RB: 'DF',
  CDM: 'MD',
  CM: 'MD',
  CAM: 'MD',
  LM: 'MD',
  RM: 'MD',
  LW: 'AT',
  RW: 'AT',
  ST: 'AT',
};

/** Positions a player can cover with only a small rating penalty. */
export const RELATED: Record<Position, Position[]> = {
  GK: [],
  CB: ['CDM'],
  LB: ['LM', 'CB'],
  RB: ['RM', 'CB'],
  CDM: ['CB', 'CM'],
  CM: ['CDM', 'CAM'],
  CAM: ['CM', 'ST', 'LW', 'RW'],
  LM: ['LW', 'LB', 'CM'],
  RM: ['RW', 'RB', 'CM'],
  LW: ['LM', 'ST', 'RW'],
  RW: ['RM', 'ST', 'LW'],
  ST: ['LW', 'RW', 'CAM'],
};

export const PENALTY = { related: 3, sameLine: 8, otherLine: 18, goalkeeper: 40 };

export interface Slot {
  pos: Position;
  /** 0 = left edge, 1 = right edge. */
  x: number;
  /** 0 = opponent goal, 1 = own goal. */
  y: number;
}

export interface Formation {
  id: FormationId;
  slots: Slot[];
  /** Small shape effect on attack and defense. */
  bias: { attack: number; defense: number };
}

const GK: Slot = { pos: 'GK', x: 0.5, y: 0.92 };
const back4: Slot[] = [
  { pos: 'LB', x: 0.12, y: 0.72 },
  { pos: 'CB', x: 0.37, y: 0.76 },
  { pos: 'CB', x: 0.63, y: 0.76 },
  { pos: 'RB', x: 0.88, y: 0.72 },
];
const back3: Slot[] = [
  { pos: 'CB', x: 0.22, y: 0.75 },
  { pos: 'CB', x: 0.5, y: 0.77 },
  { pos: 'CB', x: 0.78, y: 0.75 },
];
const back5: Slot[] = [
  { pos: 'LB', x: 0.1, y: 0.66 },
  { pos: 'CB', x: 0.3, y: 0.76 },
  { pos: 'CB', x: 0.5, y: 0.78 },
  { pos: 'CB', x: 0.7, y: 0.76 },
  { pos: 'RB', x: 0.9, y: 0.66 },
];
const twoUp: Slot[] = [
  { pos: 'ST', x: 0.35, y: 0.12 },
  { pos: 'ST', x: 0.65, y: 0.12 },
];
const frontThree: Slot[] = [
  { pos: 'LW', x: 0.15, y: 0.17 },
  { pos: 'ST', x: 0.5, y: 0.1 },
  { pos: 'RW', x: 0.85, y: 0.17 },
];

export const FORMATIONS: Record<FormationId, Formation> = {
  '4-4-2': {
    id: '4-4-2',
    slots: [
      GK,
      ...back4,
      { pos: 'LM', x: 0.12, y: 0.42 },
      { pos: 'CM', x: 0.37, y: 0.47 },
      { pos: 'CM', x: 0.63, y: 0.47 },
      { pos: 'RM', x: 0.88, y: 0.42 },
      ...twoUp,
    ],
    bias: { attack: 0, defense: 0 },
  },
  '4-3-3': {
    id: '4-3-3',
    slots: [
      GK,
      ...back4,
      { pos: 'CM', x: 0.25, y: 0.44 },
      { pos: 'CDM', x: 0.5, y: 0.53 },
      { pos: 'CM', x: 0.75, y: 0.44 },
      ...frontThree,
    ],
    bias: { attack: 2, defense: -1 },
  },
  '4-2-3-1': {
    id: '4-2-3-1',
    slots: [
      GK,
      ...back4,
      { pos: 'CDM', x: 0.35, y: 0.54 },
      { pos: 'CDM', x: 0.65, y: 0.54 },
      { pos: 'LW', x: 0.15, y: 0.3 },
      { pos: 'CAM', x: 0.5, y: 0.33 },
      { pos: 'RW', x: 0.85, y: 0.3 },
      { pos: 'ST', x: 0.5, y: 0.1 },
    ],
    bias: { attack: 1, defense: 1 },
  },
  '3-5-2': {
    id: '3-5-2',
    slots: [
      GK,
      ...back3,
      { pos: 'LM', x: 0.08, y: 0.42 },
      { pos: 'CM', x: 0.3, y: 0.42 },
      { pos: 'CDM', x: 0.5, y: 0.53 },
      { pos: 'CM', x: 0.7, y: 0.42 },
      { pos: 'RM', x: 0.92, y: 0.42 },
      ...twoUp,
    ],
    bias: { attack: 2, defense: -2 },
  },
  '5-3-2': {
    id: '5-3-2',
    slots: [
      GK,
      ...back5,
      { pos: 'CM', x: 0.25, y: 0.42 },
      { pos: 'CM', x: 0.5, y: 0.47 },
      { pos: 'CM', x: 0.75, y: 0.42 },
      ...twoUp,
    ],
    bias: { attack: -2, defense: 3 },
  },
  '3-4-3': {
    id: '3-4-3',
    slots: [
      GK,
      ...back3,
      { pos: 'LM', x: 0.1, y: 0.45 },
      { pos: 'CM', x: 0.37, y: 0.5 },
      { pos: 'CM', x: 0.63, y: 0.5 },
      { pos: 'RM', x: 0.9, y: 0.45 },
      ...frontThree,
    ],
    bias: { attack: 3, defense: -3 },
  },
};

export const FORMATION_IDS = Object.keys(FORMATIONS) as FormationId[];

export const TACTICS: Record<Tactic, { label: string; attack: number; defense: number }> = {
  defensive: { label: 'Defensive', attack: -3, defense: 3 },
  balanced: { label: 'Balanced', attack: 0, defense: 0 },
  attacking: { label: 'Attacking', attack: 3, defense: -3 },
};

/** How much each slot contributes to attack and defense. */
export const SLOT_WEIGHTS: Record<Position, { attack: number; defense: number }> = {
  GK: { attack: 0, defense: 3 },
  CB: { attack: 0.1, defense: 1.5 },
  LB: { attack: 0.4, defense: 1 },
  RB: { attack: 0.4, defense: 1 },
  CDM: { attack: 0.4, defense: 1 },
  CM: { attack: 0.7, defense: 0.7 },
  LM: { attack: 0.8, defense: 0.5 },
  RM: { attack: 0.8, defense: 0.5 },
  CAM: { attack: 1.2, defense: 0.3 },
  LW: { attack: 1.4, defense: 0.15 },
  RW: { attack: 1.4, defense: 0.15 },
  ST: { attack: 1.6, defense: 0.1 },
};

/** Relative chance of scoring from each slot. */
export const SCORING_WEIGHT: Record<Position, number> = {
  GK: 0,
  CB: 0.4,
  LB: 0.4,
  RB: 0.4,
  CDM: 0.8,
  CM: 1.5,
  LM: 2,
  RM: 2,
  CAM: 3,
  LW: 4,
  RW: 4,
  ST: 6,
};

/** AI club styles. Each has one tactic that beats it and one that plays into its hands. */
export const STYLES: Record<Style, { label: string; text: string; beatenBy: Tactic; weakAgainst: Tactic }> = {
  attack: {
    label: 'All-out attack',
    text: 'Throws everyone forward and leaves space behind.',
    beatenBy: 'defensive',
    weakAgainst: 'attacking',
  },
  bus: {
    label: 'Park the bus',
    text: 'Sits deep and waits for mistakes.',
    beatenBy: 'attacking',
    weakAgainst: 'defensive',
  },
  possession: {
    label: 'Possession',
    text: 'Keeps the ball and picks gaps when you overcommit.',
    beatenBy: 'balanced',
    weakAgainst: 'attacking',
  },
};

/** Attack and defense bonus for the right counter, penalty for the wrong one. */
export const COUNTER_BONUS = 3;

export const MARKET = {
  /** One scouting report reveals a player's exact rating and potential. */
  scoutCost: 250_000,
  /** Rating and potential range width before (0) and after (1) scouting. */
  ratingWidth: [10, 0],
  potentialWidth: [16, 0],
  /** Bids per player per window before the club stops talking. */
  maxAttempts: 3,
  /** An offer at or above this share of the hidden price gets a counter. */
  counterAbove: 0.8,
  /** Below this share the club is insulted and ends talks. */
  insultBelow: 0.55,
  /** A quick sale returns this share of value. */
  quickSale: 0.6,
  searchSize: 10,
};
