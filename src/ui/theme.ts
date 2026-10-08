import type { Line } from '../game/types';

export const colors = {
  bg: '#F4F4F1',
  card: '#FFFFFF',
  border: '#E2E2DE',
  borderDark: '#CACAC5',
  ink: '#141414',
  muted: '#85857F',
  faint: '#F0F0EC',
  pitch: '#3B8548',
  pitchDark: '#347A41',
  pitchLine: 'rgba(255,255,255,0.7)',
  gold: '#F2B544',
  green: '#25A55A',
  red: '#E5484D',
  redSoft: '#FDECEC',
  orange: '#F08C1B',
  blue: '#3D7BE0',
  greenSoft: '#E6F6EC',
};

export const lineColors: Record<Line, string> = {
  GK: '#6B7280',
  DF: '#F08C1B',
  MD: '#25A55A',
  AT: '#E5484D',
};

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
