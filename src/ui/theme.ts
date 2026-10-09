import type { Line } from '../game/types';

/**
 * Design tokens. Light, calm surfaces; green is the one action colour; gold marks
 * quality and rewards; the live match screen uses the dark "night" set.
 */
export const colors = {
  bg: '#F2F3EF',
  card: '#FFFFFF',
  inset: '#F6F7F3',
  border: '#E3E5DF',
  borderDark: '#CDD1C8',
  ink: '#121614',
  ink2: '#3A423C',
  muted: '#7A817B',
  faint: '#EDEFEA',

  green: '#1F9D55',
  greenDark: '#167A41',
  greenSoft: '#E3F4E9',
  gold: '#F2B33D',
  goldDark: '#C98C14',
  goldInk: '#8A5E07',
  goldSoft: '#FFF4DB',
  red: '#E5484D',
  redDark: '#B9363A',
  redSoft: '#FDEBEC',
  orange: '#EE8A1A',
  orangeSoft: '#FFF0DF',
  blue: '#2F6FE4',
  blueSoft: '#E6EEFD',
  draw: '#9AA09B',

  night: '#0D1712',
  night2: '#15231B',
  night3: '#1F3127',
  nightLine: '#2A4034',
  nightMuted: '#8FA597',

  pitch: '#2F8A48',
  pitchDark: '#287A3E',
  pitchStripe: '#33924D',
  pitchLine: 'rgba(255,255,255,0.65)',
};

export const radius = { sm: 10, md: 14, lg: 18, xl: 24 };

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };

/** Soft elevation for cards and floating elements. */
export const shadow = {
  card: {
    shadowColor: '#1B2A20',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  float: {
    shadowColor: '#0B140F',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
};

export const lineColors: Record<Line, string> = {
  GK: '#6B7280',
  DF: '#E5821A',
  MD: '#1F9D55',
  AT: '#E5484D',
};

/** FIFA-style card tiers: gold, silver, bronze. */
export function ratingTier(rating: number) {
  if (rating >= 75) return { bg: colors.gold, fg: '#3D2A04', ring: colors.goldDark };
  if (rating >= 65) return { bg: '#C9CFD3', fg: '#22292D', ring: '#A7AFB4' };
  return { bg: '#D49A6A', fg: '#3A2210', ring: '#B37A4C' };
}

export const CREST_COLORS = [
  '#C8102E',
  '#E85D04',
  '#F2B544',
  '#2B9348',
  '#00553E',
  '#6CABDD',
  '#1D428A',
  '#6A1B9A',
  '#111111',
  '#FFFFFF',
];

export function formatMoney(n: number) {
  const sign = n < 0 ? '-' : '';
  const a = Math.abs(n);
  if (a >= 1_000_000) {
    const m = a / 1_000_000;
    return `${sign}$${m >= 100 ? m.toFixed(0) : m.toFixed(1)}M`;
  }
  if (a >= 1_000) return `${sign}$${Math.round(a / 1_000)}K`;
  return `${sign}$${a}`;
}

export function formatFans(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  return `${Math.round(n / 1_000)}K`;
}

export function seasonLabel(season: number) {
  return `${season}/${String((season + 1) % 100).padStart(2, '0')}`;
}

export function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}
