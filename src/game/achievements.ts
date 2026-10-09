import { compTable, USER_ID, type Action } from './game';
import { compName, PROMOTION_SPOTS } from './leagues';
import type { GameState } from './types';

export interface Achievement {
  id: string;
  icon: string;
  title: string;
  text: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_win', icon: '⚽', title: 'First win', text: 'Win a league match' },
  { id: 'signing', icon: '✍️', title: 'New signing', text: 'Buy a player' },
  { id: 'big_sale', icon: '💰', title: 'Big sale', text: 'Sell a player for $30M or more' },
  { id: 'elite_coach', icon: '📋', title: 'Elite coach', text: 'Hire a 5-star head coach' },
  { id: 'wonderkid', icon: '🌟', title: 'Wonderkid', text: 'Have a player aged 21 or under rated 80+' },
  { id: 'profit', icon: '📈', title: 'Money maker', text: 'End a season $20M or more in profit' },
  { id: 'promoted', icon: '⬆️', title: 'Going up', text: 'Win promotion' },
  { id: 'champion', icon: '🏆', title: 'Champions', text: 'Win a league title' },
  { id: 'cup', icon: '🌍', title: 'European nights', text: 'Win a European cup' },
  { id: 'five_seasons', icon: '🗓️', title: 'Long service', text: 'Finish 5 seasons in one career' },
  { id: 'daily_win', icon: '🎯', title: 'Daily winner', text: 'Complete a daily challenge' },
  { id: 'streak_7', icon: '🔥', title: 'On fire', text: 'Play the daily challenge 7 days in a row' },
];

/**
 * Career achievements earned by one action. Each check runs only after the
 * actions that can change it, so ordinary taps stay cheap.
 */
export function careerAchievements(prev: GameState | null, next: GameState, action: Action): string[] {
  if (!prev || next.challenge) return [];
  const earned: string[] = [];
  const t = action.type;
  if (t === 'playRound' || t === 'simToStop') {
    const me = compTable(next).find((r) => r.clubId === USER_ID);
    if (me && me.won > 0) earned.push('first_win');
  }
  if (t === 'bid' && next.squad.length > prev.squad.length) earned.push('signing');
  if ((t === 'acceptOffer' || t === 'quickSale') && next.money - prev.money >= 30_000_000) earned.push('big_sale');
  if (t === 'hireStaff' && next.staff?.coach?.stars === 5) earned.push('elite_coach');
  if (next.squad !== prev.squad && next.squad.some((p) => p.age <= 21 && p.rating >= 80)) earned.push('wonderkid');
  const sum = next.summary;
  if (sum && sum !== prev.summary) {
    if (sum.net >= 20_000_000) earned.push('profit');
    if (sum.movement === 'promoted') earned.push('promoted');
    if (sum.position === 1) earned.push('champion');
    if (next.history.at(-1)?.cups?.length) earned.push('cup');
    if (next.history.length >= 5) earned.push('five_seasons');
  }
  return earned;
}

export interface Trophy {
  icon: string;
  title: string;
  season: number;
}

/** Honours won in this career, newest first. */
export function trophies(state: GameState): Trophy[] {
  return state.history
    .flatMap((h) => {
      const comp = h.country ? compName({ country: h.country, division: h.division ?? 1 }) : 'League';
      const won: Trophy[] = [];
      if (h.position === 1) won.push({ icon: '🏆', title: `${comp} champions`, season: h.season });
      else if ((h.division ?? 1) > 1 && h.position <= PROMOTION_SPOTS) {
        won.push({ icon: '⬆️', title: `Promoted from the ${comp}`, season: h.season });
      }
      for (const cup of h.cups ?? []) won.push({ icon: '🌍', title: `${cup} winners`, season: h.season });
      return won;
    })
    .reverse();
}
