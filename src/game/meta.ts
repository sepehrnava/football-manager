import { challengeScore } from './challenge';
import type { GameState } from './types';

/** A finished Daily Challenge. */
export interface ChallengeResult {
  club: string;
  goal: string;
  target: number;
  position: number;
  success: boolean;
  score: number;
}

/** Progress kept across careers and challenges (small, saved on its own). */
export interface Meta {
  version: 1;
  /** Days in a row with a finished challenge, and the best run so far. */
  streak: number;
  best: number;
  lastDay: string | null;
  played: number;
  wins: number;
  /** Finished challenges by day, most recent 30 kept. */
  results: Record<string, ChallengeResult>;
  /** Achievement id → day it was earned. */
  achievements: Record<string, string>;
  /** Earned but not yet announced. */
  fresh: string[];
}

export const EMPTY_META: Meta = {
  version: 1,
  streak: 0,
  best: 0,
  lastDay: null,
  played: 0,
  wins: 0,
  results: {},
  achievements: {},
  fresh: [],
};

/** Adds newly earned achievements (ones already held are ignored). */
export function unlock(meta: Meta, ids: string[], day: string): Meta {
  const fresh = ids.filter((id, i) => !meta.achievements[id] && ids.indexOf(id) === i);
  if (!fresh.length) return meta;
  return {
    ...meta,
    achievements: { ...meta.achievements, ...Object.fromEntries(fresh.map((id) => [id, day])) },
    fresh: [...meta.fresh, ...fresh],
  };
}

function dayBefore(day: string) {
  const [y, m, d] = day.split('-').map(Number);
  const date = new Date(y, m - 1, d - 1);
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((n, i) => (i ? String(n).padStart(2, '0') : String(n)))
    .join('-');
}

/** The streak as it stands today: it lapses once a whole day is missed. */
export function currentStreak(meta: Meta, today: string) {
  return meta.lastDay === today || meta.lastDay === dayBefore(today) ? meta.streak : 0;
}

/** Records a challenge the moment it is finished (once per day). */
export function recordChallenge(meta: Meta, game: GameState): Meta {
  const c = game.challenge;
  const result = challengeScore(game);
  if (!c || !result || meta.results[c.day]) return meta;
  const streak = meta.lastDay === dayBefore(c.day) ? meta.streak + 1 : 1;
  const days = [...Object.keys(meta.results), c.day].sort().slice(-30);
  const all: Record<string, ChallengeResult> = {
    ...meta.results,
    [c.day]: {
      club: game.clubs.find((x) => x.id === game.userClubId)?.name ?? '',
      goal: c.text,
      target: c.target,
      ...result,
    },
  };
  const next: Meta = {
    ...meta,
    streak,
    best: Math.max(meta.best, streak),
    lastDay: c.day,
    played: meta.played + 1,
    wins: meta.wins + (result.success ? 1 : 0),
    results: Object.fromEntries(days.map((d) => [d, all[d]])),
  };
  return unlock(next, [...(result.success ? ['daily_win'] : []), ...(streak >= 7 ? ['streak_7'] : [])], c.day);
}
