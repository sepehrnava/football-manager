import english from '../data/english.json';
import { AI_CLUBS } from './names';
import type { CrestPattern, Position } from './types';

export interface LeagueClub {
  short: string;
  name: string;
  primary: string;
  secondary: string;
  pattern: CrestPattern;
  /** Typical starter rating: from the data file, or the club's real players when present. */
  level: number;
}

export interface PackPlayer {
  club: string;
  name: string;
  positions: Position[];
  age: number;
  flag: string;
  rating: number;
  potential: number | null;
}

export interface LeaguePack {
  id: string;
  name: string;
  clubs: LeagueClub[];
  players: PackPlayer[];
}

const PATTERNS: CrestPattern[] = ['solid', 'stripes', 'half', 'band'];

const fictional: LeaguePack = {
  id: 'fictional',
  name: 'Pocket League',
  clubs: AI_CLUBS.map((c, i) => ({ ...c, pattern: PATTERNS[i % PATTERNS.length] })),
  players: [],
};

/** A club's level comes from its best 11 real players once the data has them. */
function withLevels(pack: LeaguePack): LeaguePack {
  const clubs = pack.clubs
    .map((c) => {
      const best = pack.players
        .filter((p) => p.club === c.short)
        .map((p) => p.rating)
        .sort((a, b) => b - a)
        .slice(0, 11);
      const level = best.length >= 11 ? Math.round(best.reduce((a, b) => a + b, 0) / 11) : c.level;
      return { ...c, level };
    })
    // Strongest first, so lists and "weakest club" make sense.
    .sort((a, b) => b.level - a.level || a.name.localeCompare(b.name));
  return { ...pack, clubs };
}

/** The league this build plays: the English pack when it has clubs, else the fictional one. */
export const LEAGUE: LeaguePack = withLevels(
  (english as LeaguePack).clubs.length >= 4 ? (english as LeaguePack) : fictional,
);

/** League average at which the economy (wages, fees, prizes, sponsors) was tuned. */
const ECONOMY_REFERENCE_LEVEL = 74.5;

/**
 * How many rating points stronger this league is than the economy reference.
 * Money is calculated on ratings minus this shift, so entering higher ratings for
 * a whole league doesn't make every club rich: only strength relative to the
 * league counts.
 */
export const ECONOMY_SHIFT = Math.max(
  0,
  LEAGUE.clubs.reduce((sum, c) => sum + c.level, 0) / LEAGUE.clubs.length - ECONOMY_REFERENCE_LEVEL,
);

/** A rating as the economy sees it. */
export function econRating(rating: number) {
  return rating - ECONOMY_SHIFT;
}

export function packPlayersFor(short: string) {
  return LEAGUE.players.filter((p) => p.club === short);
}

/**
 * Shown on the start screen and in Settings whenever real names are in use.
 * Names identify real clubs and players; nothing suggests an official link.
 */
export const DISCLAIMER =
  LEAGUE.id === 'fictional'
    ? null
    : 'Club and player names are used only to identify them and belong to their respective owners. ' +
      'Pocket Manager is not affiliated with, endorsed or sponsored by any club, league, players\' ' +
      'association or player. Ratings, values and all other game data are the game\'s own.';
