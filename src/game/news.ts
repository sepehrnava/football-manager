import { cupProgress } from './cups';
import { USER_ID } from './market';
import type { Club, Cup, Fixture, GameState, NewsItem } from './types';

/** How many news items a save keeps. */
const NEWS_KEPT = 20;

export function withNews(state: GameState, items: Omit<NewsItem, 'season'>[]): GameState {
  if (!items.length) return state;
  const added = items.map((n) => ({ ...n, season: state.season }));
  return { ...state, news: [...added.reverse(), ...(state.news ?? [])].slice(0, NEWS_KEPT) };
}

/**
 * Headlines from one played round: only notable moments, so the feed stays short.
 * `before` and `after` are the user's league positions around the round.
 */
export function roundNews(
  user: Club,
  played: Fixture | undefined,
  opponent: Club | undefined,
  before: number,
  after: number,
  cupsBefore: Cup[],
  cupsAfter: Cup[],
  round: number,
): Omit<NewsItem, 'season'>[] {
  const out: Omit<NewsItem, 'season'>[] = [];
  if (played?.result && opponent) {
    const home = played.homeId === USER_ID;
    const own = home ? played.result.home : played.result.away;
    const against = home ? played.result.away : played.result.home;
    const score = `${own}–${against}`;
    const counts = new Map<string, number>();
    for (const n of played.result.scorers ?? []) counts.set(n, (counts.get(n) ?? 0) + 1);
    const hatTrick = [...counts].find(([, c]) => c >= 3)?.[0];
    if (hatTrick) out.push({ round, icon: '⚽', text: `${hatTrick} scores a hat-trick against ${opponent.name}` });
    if (own - against >= 4) out.push({ round, icon: '💥', text: `${user.name} thrash ${opponent.name} ${score}` });
    else if (own > against && opponent.level - user.level >= 4) {
      out.push({ round, icon: '😮', text: `Shock win: ${user.name} beat ${opponent.name} ${score}` });
    } else if (against - own >= 4) out.push({ round, icon: '😓', text: `Heavy defeat at ${opponent.name}, ${score}` });
  }
  if (after === 1 && before !== 1 && round > 2) out.push({ round, icon: '🔝', text: `${user.name} go top of the table` });

  cupsAfter.forEach((cup, i) => {
    const was = cupsBefore[i] ? cupProgress(cupsBefore[i], USER_ID) : null;
    const now = cupProgress(cup, USER_ID);
    if (!now || !was || (now.wins === was.wins && now.out === was.out)) return;
    if (now.champion) out.push({ round, icon: '🏆', text: `${user.name} win the ${cup.name}!` });
    else if (now.out) out.push({ round, icon: '🌍', text: `Out of the ${cup.name} in the ${cup.stages[now.wins].name}` });
    else out.push({ round, icon: '🌍', text: `Into the ${cup.stages[now.wins].name} of the ${cup.name}` });
  });
  return out;
}
