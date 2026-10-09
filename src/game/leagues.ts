import world from '../data/leagues.json';
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
  /** 1 = top division of its country. */
  division: number;
  country: string;
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

interface CountryData {
  id: string;
  name: string;
  clubs: Omit<LeagueClub, 'country'>[];
  players: PackPlayer[];
}

/** A competition: one division of one country. */
export interface Comp {
  country: string;
  division: number;
}

const PATTERNS: CrestPattern[] = ['solid', 'stripes', 'half', 'band'];

const FICTIONAL: CountryData = {
  id: 'fictional',
  name: 'Pocket',
  clubs: AI_CLUBS.map((c, i) => ({ ...c, pattern: PATTERNS[i % PATTERNS.length], division: 1 })),
  players: [],
};

const DATA: CountryData[] = (world as { countries: CountryData[] }).countries.length
  ? (world as { countries: CountryData[] }).countries
  : [FICTIONAL];

const FLAGS: Record<string, string> = {
  english: '🇬🇧',
  spanish: '🇪🇸',
  german: '🇩🇪',
  italian: '🇮🇹',
  french: '🇫🇷',
  dutch: '🇳🇱',
};

/** Countries in display order. */
export const COUNTRIES = DATA.map((c) => ({ id: c.id, name: c.name, flag: FLAGS[c.id] ?? '🏳️' }));

export function flagOf(country: string) {
  return COUNTRIES.find((c) => c.id === country)?.flag ?? '🏳️';
}
export const DEFAULT_COUNTRY = COUNTRIES[0].id;

/** A club's level comes from its best 11 real players once the data has them. */
function levelOf(country: CountryData, club: Omit<LeagueClub, 'country'>) {
  const best = country.players
    .filter((p) => p.club === club.short)
    .map((p) => p.rating)
    .sort((a, b) => b - a)
    .slice(0, 11);
  return best.length >= 11 ? Math.round(best.reduce((a, b) => a + b, 0) / 11) : club.level;
}

/** Every club in the world: by country, then division, then strongest first. */
const ALL_CLUBS: LeagueClub[] = DATA.flatMap((country, order) =>
  country.clubs
    .map((c) => ({ ...c, division: c.division ?? 1, level: levelOf(country, c), country: country.id, order }))
    .sort((a, b) => a.division - b.division || b.level - a.level || a.name.localeCompare(b.name)),
).map(({ order: _order, ...c }) => c);

/** The whole world of clubs and real players this build plays with. */
export const LEAGUE = {
  id: DATA[0].id === 'fictional' ? 'fictional' : 'world',
  clubs: ALL_CLUBS,
  players: DATA.flatMap((c) => c.players.map((p) => ({ ...p, country: c.id }))),
};

export function packPlayersFor(country: string, short: string) {
  return LEAGUE.players.filter((p) => p.country === country && p.club === short);
}

/** Number of divisions in a country. */
export function divisionsIn(country: string) {
  return Math.max(1, ...ALL_CLUBS.filter((c) => c.country === country).map((c) => c.division));
}

/** All competitions: each country's divisions, top first. */
export const COMPS: Comp[] = COUNTRIES.flatMap((c) =>
  Array.from({ length: divisionsIn(c.id) }, (_, i) => ({ country: c.id, division: i + 1 })),
);

export function compKey(comp: Comp) {
  return `${comp.country}:${comp.division}`;
}

/** Generic names only: real competition names are trademarks. */
export function compName(comp: Comp) {
  const country = COUNTRIES.find((c) => c.id === comp.country)?.name ?? '';
  if (divisionsIn(comp.country) === 1) return `${country} League`;
  const tier = ['First', 'Second', 'Third', 'Fourth'][comp.division - 1] ?? `${comp.division}th`;
  return `${country} ${tier} Division`;
}

/** Clubs swapped between neighbouring divisions each season. */
export const PROMOTION_SPOTS = 3;

/** Where a table position sits: promotion (up), relegation (down) or neither. */
export function zoneOf(index: number, tableLength: number, comp: Comp): 'up' | 'down' | null {
  if (comp.division > 1 && index < PROMOTION_SPOTS) return 'up';
  if (comp.division < divisionsIn(comp.country) && index >= tableLength - PROMOTION_SPOTS) return 'down';
  return null;
}

/** League average at which the economy (wages, fees, prizes, sponsors) was tuned. */
const ECONOMY_REFERENCE_LEVEL = 74.5;

function average(levels: number[]) {
  return levels.reduce((a, b) => a + b, 0) / Math.max(1, levels.length);
}

/**
 * How many rating points the strongest top division sits above the economy
 * reference. Money is calculated on ratings minus this shift, so entering higher
 * ratings doesn't make every club rich: only strength relative to the world counts.
 */
export const ECONOMY_SHIFT = Math.max(
  0,
  ...COUNTRIES.map((c) => average(ALL_CLUBS.filter((x) => x.country === c.id && x.division === 1).map((x) => x.level))),
) - ECONOMY_REFERENCE_LEVEL;

/** A rating as the economy sees it. */
export function econRating(rating: number) {
  return rating - Math.max(0, ECONOMY_SHIFT);
}

/**
 * Shown on the start screen and in Settings whenever real names are in use.
 * Names identify real clubs and players; nothing suggests an official link.
 */
export const DISCLAIMER =
  LEAGUE.id === 'fictional'
    ? null
    : 'Pocket Manager is an independent game. Club and player names are used only to identify real ' +
      'clubs and players and belong to their respective owners. It is not licensed by, affiliated with, ' +
      'or endorsed by any club, league, players\' association or player. Crests are original simple ' +
      'designs, and all ratings, values and game data are created by the game, not taken from any real ' +
      'database or other game.';
