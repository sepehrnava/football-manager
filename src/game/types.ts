export type Position =
  | 'GK'
  | 'CB'
  | 'LB'
  | 'RB'
  | 'CDM'
  | 'CM'
  | 'CAM'
  | 'LM'
  | 'RM'
  | 'LW'
  | 'RW'
  | 'ST';

export type Line = 'GK' | 'DF' | 'MD' | 'AT';

export type FormationId = '4-4-2' | '4-3-3' | '4-2-3-1' | '3-5-2' | '5-3-2' | '3-4-3';

export type Tactic = 'defensive' | 'balanced' | 'attacking';

export type CrestPattern = 'solid' | 'stripes' | 'half' | 'band';

export interface Crest {
  primary: string;
  secondary: string;
  pattern: CrestPattern;
}

export interface Player {
  id: string;
  name: string;
  flag: string;
  age: number;
  positions: Position[];
  rating: number;
  potential: number;
  seasonsAtClub: number;
  goals: number;
}

export interface Club {
  id: string;
  name: string;
  short: string;
  crest: Crest;
  /** AI clubs only; the user's strength comes from the lineup. */
  attack: number;
  defense: number;
}

export interface MatchResult {
  home: number;
  away: number;
  /** Scorer names for the user's club, in order. */
  scorers?: string[];
}

export interface Fixture {
  round: number;
  homeId: string;
  awayId: string;
  result?: MatchResult;
}

export type Phase = 'window' | 'season' | 'summary' | 'gameover';

export interface PlayerChange {
  name: string;
  from: number;
  to: number;
}

export interface SeasonSummary {
  season: number;
  position: number;
  championName: string;
  prize: number;
  fanIncome: number;
  wages: number;
  fixedCosts: number;
  stakeholder: number;
  bonuses: number;
  net: number;
  moneyBefore: number;
  moneyAfter: number;
  fansBefore: number;
  fansAfter: number;
  changes: PlayerChange[];
  retired: string[];
  academy: string[];
}

export interface GameState {
  version: 1;
  seed: number;
  season: number;
  phase: Phase;
  window: 'pre' | 'mid';
  /** Index of the next round to play, 0-based. */
  round: number;
  userClubId: string;
  clubs: Club[];
  squad: Player[];
  lineup: (string | null)[];
  formation: FormationId;
  tactic: Tactic;
  captainId: string | null;
  fixtures: Fixture[];
  money: number;
  fans: number;
  market: Player[];
  nextId: number;
  summary: SeasonSummary | null;
  history: { season: number; position: number }[];
}
