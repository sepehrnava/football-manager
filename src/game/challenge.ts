import { compTable, createGame, reducer, userComp, USER_ID } from './game';
import { compName, divisionsIn, LEAGUE, PROMOTION_SPOTS } from './leagues';
import type { ChallengeGoal, GameState } from './types';

/** Local calendar day, e.g. "2026-10-09": everyone gets the same challenge that day. */
export function todayKey(date = new Date()) {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * Today's challenge: a club picked from the date, the first half of its season
 * already played, and a goal that fits where it stands at the mid-season window.
 */
export function createChallenge(day = todayKey()): GameState {
  // The old app name stays in the seed so each day's challenge never changes.
  const seed = hash(`pocket-manager:${day}`);
  const takeOver = seed % LEAGUE.clubs.length;
  let s = createGame({ type: 'new', name: '', short: '', crest: { primary: '#000', secondary: '#fff', pattern: 'solid' }, seed, takeOver });
  // Play the first half: the season stops by itself at the mid-season window.
  s = reducer(reducer(s, { type: 'startSeason' }), { type: 'simToStop' })!;

  const comp = userComp(s);
  const table = compTable(s);
  const n = table.length;
  const position = table.findIndex((r) => r.clubId === USER_ID) + 1;
  const relegates = comp.division < divisionsIn(comp.country);
  const promotes = comp.division > 1;
  let goal: ChallengeGoal;
  if (relegates && position > n - PROMOTION_SPOTS - 2) {
    goal = { kind: 'survive', target: n - PROMOTION_SPOTS, title: 'Avoid relegation', text: `Finish ${n - PROMOTION_SPOTS}th or better` };
  } else if (position <= 3) {
    goal = { kind: 'title', target: 1, title: 'Win the league', text: 'Finish 1st' };
  } else if (promotes && position <= Math.ceil(n / 2)) {
    goal = { kind: 'promote', target: PROMOTION_SPOTS, title: 'Win promotion', text: `Finish in the top ${PROMOTION_SPOTS}` };
  } else {
    const target = Math.max(1, Math.min(position - 2, Math.floor(n / 2)));
    goal = { kind: 'climb', target, title: 'Climb the table', text: `Finish ${target}th or better` };
  }
  return { ...s, challenge: { day, ...goal, startPosition: position, league: compName(comp) } };
}

/** Score for a finished challenge: success counts most, then places climbed and points. */
export function challengeScore(state: GameState) {
  const c = state.challenge;
  const sum = state.summary;
  if (!c || !sum) return null;
  const success = sum.position <= c.target;
  const score = (success ? 500 : 0) + (c.startPosition - sum.position) * 30 + (sum.points ?? 0) * 5;
  return { success, score: Math.max(0, score), position: sum.position };
}
