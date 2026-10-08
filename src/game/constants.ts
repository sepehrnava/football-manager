import type { FormationId, Line, Position, Tactic } from './types';

export const LEAGUE_SIZE = 10;
export const ROUNDS = (LEAGUE_SIZE - 1) * 2;
/** The mid-season window opens after this many rounds. */
export const MID_WINDOW_ROUND = LEAGUE_SIZE - 1;
export const FIRST_SEASON = 2026;

export const SQUAD_MIN = 11;
export const SQUAD_MAX = 25;
export const SQUAD_TOPUP = 16;
export const RETIRE_AGE = 35;

// Economy, all in dollars per season. Tuned so the starting club loses money.
export const ECONOMY = {
  startMoney: 10_000_000,
  startFans: 400_000,
  fixedCosts: 4_000_000,
  stakeholderCashout: 2_000_000,
  revenuePerFan: 4,
  /** Prize money by final position, 1st first. */
  prize: [20, 15, 12, 10, 8.5, 7, 6, 5, 4, 3.5].map((m) => m * 1_000_000),
  /** Share of the wage bill paid as bonuses for a top-3 finish. */
  topFinishBonus: [0.15, 0.1, 0.05],
  /** The board sacks you when money ends a season below this. */
  sackedBelow: -5_000_000,
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
