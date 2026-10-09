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

/** How an AI club plays. Each style is beaten by one of the user's tactics. */
export type Style = 'attack' | 'bus' | 'possession';

export type CrestPattern = 'solid' | 'stripes' | 'half' | 'band';

export interface Crest {
  primary: string;
  secondary: string;
  pattern: CrestPattern;
}

export interface Contract {
  /** Fixed yearly wage in dollars. */
  wage: number;
  /** Seasons left, including the current one. */
  years: number;
}

export interface Player {
  id: string;
  /** Owning club id, or null for a free agent. */
  clubId: string | null;
  name: string;
  flag: string;
  age: number;
  positions: Position[];
  rating: number;
  potential: number;
  seasonsAtClub: number;
  goals: number;
  contract: Contract;
  /** 0–1: where the true rating sits inside a scouting range. */
  scoutBias: number;
  /** Wage demand multiplier: how greedy the player is (0.9–1.4). */
  greed: number;
  /** Decided at the start of a season: this player retires when it ends. */
  retiring?: boolean;
  /** On the user's transfer list: clubs make offers when a window is open. */
  listed?: boolean;
}

export interface Club {
  id: string;
  name: string;
  short: string;
  crest: Crest;
  /** AI clubs: derived from their best XI. The user's comes from the lineup. */
  attack: number;
  defense: number;
  style: Style;
  /** Typical rating of the club's starters; guides who it signs. */
  level: number;
  /** User club only: how big the club is, which sets sponsor income. */
  size?: number;
  /** 1 = top division. Missing in older saves (treated as 1). */
  division?: number;
  /** Country (league data id). Missing in older saves (treated as the first country). */
  country?: string;
}

export interface MatchResult {
  home: number;
  away: number;
  /** Scorer names for the user's club, in order. */
  scorers?: string[];
}

export interface Fixture {
  /** Round within the fixture's own division. */
  round: number;
  division?: number;
  country?: string;
  homeId: string;
  awayId: string;
  result?: MatchResult;
}

export type StaffRole = 'coach' | 'youth' | 'scout';

export interface Staff {
  id: string;
  name: string;
  flag: string;
  role: StaffRole;
  /** 1–5 stars. */
  stars: number;
  /** Head coaches only. */
  style?: 'attacking' | 'defensive' | 'balanced';
  wage: number;
}

export type CupId = 'champions' | 'europa';

export interface CupTie {
  homeId: string;
  awayId: string;
  result?: MatchResult & { pens?: boolean };
  winnerId?: string;
}

export interface CupStage {
  name: string;
  /** Played right after this many of the user's league matchdays. */
  afterRound: number;
  ties: CupTie[];
}

export interface Cup {
  id: CupId;
  name: string;
  stages: CupStage[];
}

export type Phase = 'window' | 'season' | 'summary' | 'gameover';

export interface PlayerChange {
  name: string;
  from: number;
  to: number;
}

/** An AI club's bid for one of the user's players. */
export interface Offer {
  id: string;
  playerId: string;
  clubId: string;
  fee: number;
}

/** The state of the user's talks with a selling club this window. */
export interface Talk {
  attempts: number;
  counter: number | null;
  last: 'accepted' | 'countered' | 'rejected' | 'broken' | null;
}

export interface SeasonSummary {
  season: number;
  position: number;
  championName: string;
  prize: number;
  fanIncome: number;
  /** Sponsor income (bigger clubs earn more). Missing in older saves. */
  sponsor?: number;
  /** TV money for lower divisions. Missing in older saves. */
  tv?: number;
  /** Cup prize money and how far the club went in each cup it entered. */
  cupPrize?: number;
  cupResults?: { name: string; result: string }[];
  wages: number;
  /** Staff wages. Missing in older saves. */
  staffWages?: number;
  fixedCosts: number;
  /** Stakeholders' share of the profit (0 in a loss-making season). */
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
  /** The board's verdict after this season. */
  board: BoardStatus;
  /** The division played this season, and whether the club moves up or down. */
  division?: number;
  country?: string;
  movement?: 'promoted' | 'relegated' | null;
  /** League points this season. Missing in older saves. */
  points?: number;
}

/** A headline in the club's news feed. */
export interface NewsItem {
  season: number;
  /** The user's matchday it happened after (rounds played). */
  round: number;
  icon: string;
  text: string;
}

/** What a Daily Challenge asks for: finish at `target` or better. */
export interface ChallengeGoal {
  kind: 'survive' | 'promote' | 'title' | 'climb';
  target: number;
  title: string;
  text: string;
}

/** A Daily Challenge game: one club, half a season, one goal. */
export interface Challenge extends ChallengeGoal {
  /** Calendar day it belongs to, e.g. "2026-10-09". */
  day: string;
  startPosition: number;
  league: string;
}

/** ok: money ≥ 0 · debt: below 0 · warning: final warning · sacked: game over. */
export type BoardStatus = 'ok' | 'debt' | 'warning' | 'sacked';

export interface GameState {
  version: 2;
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
  /** Every player not in the user's squad: AI squads and free agents. */
  world: Player[];
  /** Players the user is keeping an eye on. Missing in older saves. */
  watch?: string[];
  /** Scouting level per player id: 0 rough, 1 good, 2 exact. */
  scouting: Record<string, number>;
  talks: Record<string, Talk>;
  offers: Offer[];
  /** AI clubs whose style the user has seen. */
  knownStyles: string[];
  /** Tactic planned for a round (by round index); falls back to `tactic`. */
  plans: Record<number, Tactic>;
  nextId: number;
  summary: SeasonSummary | null;
  history: {
    season: number;
    position: number;
    division?: number;
    country?: string;
    /** European cups won that season. */
    cups?: string[];
  }[];
  /** The user's staff and the candidates available this window. Missing in older saves. */
  staff?: Partial<Record<StaffRole, Staff>>;
  staffMarket?: Staff[];
  /** This season's European cups. Missing in older saves. */
  cups?: Cup[];
  /** Cup prize money earned this season, paid at the season end. */
  cupEarnings?: number;
  /** Final top-division order per country, used to draw next season's cups. */
  cupRankings?: Record<string, string[]>;
  /** Money at the season end that earned a final warning; null when there is none. */
  warning?: number | null;
  /** Latest headlines, newest first. Missing in older saves. */
  news?: NewsItem[];
  /** Set only in a Daily Challenge game. */
  challenge?: Challenge;
}
