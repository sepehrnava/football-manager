import {
  ECONOMY,
  FIRST_SEASON,
  MID_WINDOW_ROUND,
  RETIRE_AGE,
  ROUNDS,
  SQUAD_MAX,
  SQUAD_MIN,
  SQUAD_TOPUP,
} from './constants';
import { leagueTable, makeFixtures, pickScorers, playMatch } from './league';
import { AI_CLUBS } from './names';
import {
  clamp,
  develop,
  makePlayer,
  playerValue,
  positionsForLine,
  ratingForValue,
  type PlayerSpec,
} from './players';
import { createRng, type Rng } from './rng';
import { autoPick, remapLineup, userStrength, wageBill } from './team';
import type {
  Club,
  Crest,
  FormationId,
  GameState,
  Line,
  Player,
  Position,
  SeasonSummary,
  Tactic,
} from './types';

export const USER_ID = 'user';

export function userClub(state: GameState) {
  return state.clubs.find((c) => c.id === USER_ID)!;
}

export function clubById(state: GameState, id: string) {
  return state.clubs.find((c) => c.id === id)!;
}

export type Action =
  | { type: 'new'; name: string; short: string; crest: Crest; seed: number }
  | { type: 'load'; state: GameState }
  | { type: 'reset' }
  | { type: 'formation'; formation: FormationId }
  | { type: 'tactic'; tactic: Tactic }
  | { type: 'assign'; slot: number; playerId: string | null }
  | { type: 'autoPick' }
  | { type: 'captain'; playerId: string }
  | { type: 'scout'; maxPrice: number; line: Line | 'ALL' }
  | { type: 'buy'; playerId: string }
  | { type: 'sell'; playerId: string }
  | { type: 'startSeason' }
  | { type: 'playRound' }
  | { type: 'simToStop' }
  | { type: 'nextSeason' };

const STARTING_SQUAD: [Position, number, number][] = [
  // position, rating, age
  ['GK', 66, 31],
  ['GK', 57, 20],
  ['CB', 65, 29],
  ['CB', 63, 33],
  ['CB', 58, 21],
  ['LB', 62, 26],
  ['RB', 60, 24],
  ['CDM', 64, 30],
  ['CM', 66, 27],
  ['CM', 59, 19],
  ['CAM', 63, 23],
  ['LM', 61, 25],
  ['RM', 60, 22],
  ['LW', 62, 28],
  ['RW', 58, 18],
  ['ST', 67, 32],
  ['ST', 60, 21],
  ['CM', 57, 34],
];

const AI_POWER = [80, 77, 75, 72, 70, 68, 66, 64, 62];

export function createGame(action: Extract<Action, { type: 'new' }>): GameState {
  const rng = createRng(action.seed);
  let nextId = 1;
  const id = () => `p${nextId++}`;
  const squad = STARTING_SQUAD.map(([position, rating, age]) =>
    makePlayer(rng, id(), { position, rating, age, seasonsAtClub: rng.int(0, 4) }),
  );
  const user: Club = {
    id: USER_ID,
    name: action.name.trim() || 'My Club',
    short: action.short.trim().toUpperCase() || 'FC',
    crest: action.crest,
    attack: 0,
    defense: 0,
  };
  const ai: Club[] = AI_CLUBS.map((c, i) => {
    const power = AI_POWER[i] + rng.int(-2, 2);
    const tilt = rng.int(-4, 4);
    return {
      id: `ai${i}`,
      name: c.name,
      short: c.short,
      crest: { primary: c.primary, secondary: c.secondary, pattern: rng.pick(PATTERNS) },
      attack: power + tilt,
      defense: power - tilt,
    };
  });
  const clubs = [user, ...ai];
  const formation: FormationId = '4-4-2';
  const state: GameState = {
    version: 1,
    seed: 0,
    season: FIRST_SEASON,
    phase: 'window',
    window: 'pre',
    round: 0,
    userClubId: USER_ID,
    clubs,
    squad,
    lineup: autoPick(squad, formation),
    formation,
    tactic: 'balanced',
    captainId: [...squad].sort((a, b) => b.seasonsAtClub - a.seasonsAtClub || b.rating - a.rating)[0]
      .id,
    fixtures: makeFixtures(
      rng,
      clubs.map((c) => c.id),
    ),
    money: ECONOMY.startMoney,
    fans: ECONOMY.startFans,
    market: [],
    nextId,
    summary: null,
    history: [],
  };
  return withSeed(scoutPlayers(state, rng, defaultScoutBudget(state.money), 'ALL'), rng);
}

const PATTERNS = ['solid', 'stripes', 'half', 'band'] as const;

function withSeed(state: GameState, rng: Rng): GameState {
  return { ...state, seed: rng.seed() };
}

export function defaultScoutBudget(money: number) {
  const steps = SCOUT_BUDGETS.filter((b) => b <= Math.max(money, SCOUT_BUDGETS[0]));
  return steps[steps.length - 1];
}

export const SCOUT_BUDGETS = [1, 2, 5, 10, 20, 40, 80].map((m) => m * 1_000_000);

function scoutPlayers(state: GameState, rng: Rng, maxPrice: number, line: Line | 'ALL'): GameState {
  let nextId = state.nextId;
  const positions = positionsForLine(line);
  const market: Player[] = [];
  for (let i = 0; i < 8; i++) {
    const age = rng.pick([18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32]);
    const target = maxPrice * (0.3 + rng.next() * 0.65);
    const spec: PlayerSpec = {
      position: rng.pick(positions),
      age,
      rating: clamp(Math.floor(ratingForValue(target, age)) - 1, 48, 92),
    };
    let p = makePlayer(rng, `p${nextId++}`, spec);
    // Potential raises value, so step down until the asking price fits.
    while (playerValue(p) > maxPrice && p.rating > 45) {
      p = { ...p, rating: p.rating - 1, potential: Math.max(p.rating - 1, p.potential - 1) };
    }
    market.push(p);
  }
  market.sort((a, b) => b.rating - a.rating);
  return { ...state, market, nextId };
}

export function canTrade(state: GameState) {
  return state.phase === 'window';
}

function ensureLineup(state: GameState): GameState {
  if (state.lineup.every((id) => id !== null)) return state;
  return { ...state, lineup: autoPick(state.squad, state.formation, state.lineup) };
}

function playRound(state: GameState, rng: Rng): GameState {
  if (state.phase !== 'season' || state.round >= ROUNDS) return state;
  const s = ensureLineup(state);
  const strength = userStrength(s);
  const side = (id: string) => {
    if (id === USER_ID) return { attack: strength.attack, defense: strength.defense };
    const c = s.clubs.find((club) => club.id === id)!;
    return { attack: c.attack, defense: c.defense };
  };
  const goals = new Map<string, number>();
  const fixtures = s.fixtures.map((f) => {
    if (f.round !== s.round) return f;
    const score = playMatch(rng, side(f.homeId), side(f.awayId));
    if (f.homeId !== USER_ID && f.awayId !== USER_ID) return { ...f, result: score };
    const own = f.homeId === USER_ID ? score.home : score.away;
    const scorers = pickScorers(rng, s.squad, s.lineup, s.formation, own);
    scorers.forEach((p) => goals.set(p.id, (goals.get(p.id) ?? 0) + 1));
    return { ...f, result: { ...score, scorers: scorers.map((p) => p.name) } };
  });
  const squad = goals.size
    ? s.squad.map((p) => (goals.has(p.id) ? { ...p, goals: p.goals + goals.get(p.id)! } : p))
    : s.squad;
  const round = s.round + 1;
  let next: GameState = { ...s, fixtures, squad, round };
  if (round === MID_WINDOW_ROUND) {
    next = { ...next, phase: 'window', window: 'mid' };
    next = scoutPlayers(next, rng, defaultScoutBudget(next.money), 'ALL');
  } else if (round === ROUNDS) {
    next = endSeason(next, rng);
  }
  return next;
}

export function projectedPosition(state: GameState) {
  const mine = userStrength(state).power;
  const above = state.clubs.filter(
    (c) => c.id !== USER_ID && (c.attack + c.defense) / 2 > mine,
  ).length;
  return above + 1;
}

export function seasonCosts(state: GameState) {
  const wages = wageBill(state.squad);
  return {
    wages,
    fixedCosts: ECONOMY.fixedCosts,
    stakeholder: ECONOMY.stakeholderCashout,
    total: wages + ECONOMY.fixedCosts + ECONOMY.stakeholderCashout,
  };
}

export function seasonIncome(position: number, fans: number) {
  const prize = ECONOMY.prize[position - 1] ?? 0;
  const fanIncome = Math.round(fans * ECONOMY.revenuePerFan);
  return { prize, fanIncome, total: prize + fanIncome };
}

function endSeason(state: GameState, rng: Rng): GameState {
  const table = leagueTable(state.clubs, state.fixtures);
  const position = table.findIndex((r) => r.clubId === USER_ID) + 1;
  const champion = state.clubs.find((c) => c.id === table[0].clubId)!;
  const costs = seasonCosts(state);
  const income = seasonIncome(position, state.fans);
  const bonuses = Math.round(costs.wages * (ECONOMY.topFinishBonus[position - 1] ?? 0));
  const net = income.total - costs.total - bonuses;
  const money = state.money + net;
  const fansFactor = 1 + (5.5 - position) * 0.04 + (position === 1 ? 0.1 : 0);
  const fans = Math.max(50_000, Math.round((state.fans * fansFactor) / 1000) * 1000);

  // Development, retirements and academy graduates.
  const changes: SeasonSummary['changes'] = [];
  const retired: string[] = [];
  let squad: Player[] = [];
  for (const p of state.squad) {
    if (p.age + 1 >= RETIRE_AGE && rng.chance(0.7)) {
      retired.push(p.name);
      continue;
    }
    const grown = develop(rng, p);
    if (grown.rating !== p.rating) changes.push({ name: p.name, from: p.rating, to: grown.rating });
    squad.push(grown);
  }
  let nextId = state.nextId;
  const academy: string[] = [];
  const academyCount = Math.max(1, SQUAD_TOPUP - squad.length);
  for (let i = 0; i < academyCount && squad.length < SQUAD_MAX; i++) {
    const youth = makePlayer(rng, `p${nextId++}`, {
      position: rng.pick(positionsForLine('ALL')),
      rating: rng.int(48, 60),
      age: rng.int(16, 18),
    });
    youth.potential = clamp(youth.rating + rng.int(8, 28), youth.rating, 92);
    squad.push(youth);
    academy.push(youth.name);
  }
  changes.sort((a, b) => b.to - b.from - (a.to - a.from));

  const summary: SeasonSummary = {
    season: state.season,
    position,
    championName: champion.name,
    prize: income.prize,
    fanIncome: income.fanIncome,
    wages: costs.wages,
    fixedCosts: costs.fixedCosts,
    stakeholder: costs.stakeholder,
    bonuses,
    net,
    moneyBefore: state.money,
    moneyAfter: money,
    fansBefore: state.fans,
    fansAfter: fans,
    changes,
    retired,
    academy,
  };
  const keep = new Set(squad.map((p) => p.id));
  return {
    ...state,
    phase: money < ECONOMY.sackedBelow ? 'gameover' : 'summary',
    squad,
    lineup: state.lineup.map((id) => (id && keep.has(id) ? id : null)),
    captainId: state.captainId && keep.has(state.captainId) ? state.captainId : null,
    money,
    fans,
    nextId,
    summary,
    history: [...state.history, { season: state.season, position }],
  };
}

function nextSeason(state: GameState, rng: Rng): GameState {
  // AI clubs drift a little, pulled toward the middle of the league.
  const clubs = state.clubs.map((c) => {
    if (c.id === USER_ID) return c;
    const pull = (70 - (c.attack + c.defense) / 2) * 0.15;
    return {
      ...c,
      attack: clamp(Math.round(c.attack + pull + rng.int(-3, 3)), 55, 90),
      defense: clamp(Math.round(c.defense + pull + rng.int(-3, 3)), 55, 90),
    };
  });
  const next: GameState = {
    ...state,
    season: state.season + 1,
    phase: 'window',
    window: 'pre',
    round: 0,
    clubs,
    fixtures: makeFixtures(
      rng,
      clubs.map((c) => c.id),
    ),
    summary: null,
  };
  return scoutPlayers(next, rng, defaultScoutBudget(next.money), 'ALL');
}

export function reducer(state: GameState | null, action: Action): GameState | null {
  if (action.type === 'new') return createGame(action);
  if (action.type === 'load') return action.state;
  if (action.type === 'reset') return null;
  if (!state) return state;
  const rng = createRng(state.seed);
  const done = (s: GameState) => withSeed(s, rng);

  switch (action.type) {
    case 'formation':
      return {
        ...state,
        formation: action.formation,
        lineup: remapLineup(state.squad, state.lineup, action.formation),
      };
    case 'tactic':
      return { ...state, tactic: action.tactic };
    case 'assign': {
      const lineup = [...state.lineup];
      if (action.playerId) {
        const from = lineup.indexOf(action.playerId);
        if (from >= 0) lineup[from] = lineup[action.slot];
      }
      lineup[action.slot] = action.playerId;
      return { ...state, lineup };
    }
    case 'autoPick':
      return { ...state, lineup: autoPick(state.squad, state.formation) };
    case 'captain':
      return { ...state, captainId: action.playerId };
    case 'scout':
      if (!canTrade(state)) return state;
      return done(scoutPlayers(state, rng, action.maxPrice, action.line));
    case 'buy': {
      const p = state.market.find((m) => m.id === action.playerId);
      if (!p || !canTrade(state) || state.squad.length >= SQUAD_MAX) return state;
      const price = playerValue(p);
      if (price > state.money) return state;
      return {
        ...state,
        money: state.money - price,
        squad: [...state.squad, { ...p, seasonsAtClub: 0, goals: 0 }],
        market: state.market.filter((m) => m.id !== p.id),
      };
    }
    case 'sell': {
      const p = state.squad.find((m) => m.id === action.playerId);
      if (!p || !canTrade(state) || state.squad.length <= SQUAD_MIN) return state;
      return {
        ...state,
        money: state.money + playerValue(p),
        squad: state.squad.filter((m) => m.id !== p.id),
        lineup: state.lineup.map((id) => (id === p.id ? null : id)),
        captainId: state.captainId === p.id ? null : state.captainId,
      };
    }
    case 'startSeason':
      if (state.phase !== 'window') return state;
      return ensureLineup({ ...state, phase: 'season', market: [] });
    case 'playRound':
      return done(playRound(state, rng));
    case 'simToStop': {
      let s = state;
      while (s.phase === 'season') s = playRound(s, rng);
      return done(s);
    }
    case 'nextSeason':
      if (state.phase !== 'summary') return state;
      return done(nextSeason(state, rng));
  }
}
