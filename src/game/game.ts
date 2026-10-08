import {
  COUNTER_BONUS,
  ECONOMY,
  FIRST_SEASON,
  MID_WINDOW_ROUND,
  RETIRE_AGE,
  ROUNDS,
  LINE_MIN,
  LINE_OF,
  SQUAD_MAX,
  SQUAD_MIN,
  STYLES,
} from './constants';
import { leagueTable, makeFixtures, pickScorers, playMatch } from './league';
import {
  acceptOffer,
  advanceWorld,
  buildWorld,
  canTrade,
  makeOffers,
  placeBid,
  quickSale,
  refreshClubs,
  rejectOffer,
  renew,
  scoutPlayer,
  search,
  STYLE_IDS,
  topUpClubs,
  USER_ID,
} from './market';
import { AI_CLUBS } from './names';
import { clamp, develop, makePlayer, positionsForLine } from './players';
import { createRng, type Rng } from './rng';
import { autoPick, remapLineup, teamStrength, userStrength, wageBill } from './team';
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

export { canTrade, USER_ID };

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
  | { type: 'plan'; round: number; tactic: Tactic }
  | { type: 'assign'; slot: number; playerId: string | null }
  | { type: 'autoPick' }
  | { type: 'captain'; playerId: string }
  | { type: 'search'; maxFee: number; line: Line | 'ALL' }
  | { type: 'scoutPlayer'; playerId: string }
  | { type: 'bid'; playerId: string; fee: number; years: number }
  | { type: 'acceptOffer'; offerId: string }
  | { type: 'rejectOffer'; offerId: string }
  | { type: 'quickSale'; playerId: string }
  | { type: 'renew'; playerId: string; years: number }
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

/** Typical starter rating for each AI club, strongest first. */
const AI_LEVEL = [77, 75, 73, 71, 69, 67, 65, 63, 61];

const PATTERNS = ['solid', 'stripes', 'half', 'band'] as const;

export function createGame(action: Extract<Action, { type: 'new' }>): GameState {
  const rng = createRng(action.seed);
  let nextId = 1;
  const squad = STARTING_SQUAD.map(([position, rating, age]) =>
    makePlayer(rng, `p${nextId++}`, {
      position,
      rating,
      age,
      seasonsAtClub: rng.int(0, 4),
      clubId: USER_ID,
    }),
  );
  const user: Club = {
    id: USER_ID,
    name: action.name.trim() || 'My Club',
    short: action.short.trim().toUpperCase() || 'FC',
    crest: action.crest,
    attack: 0,
    defense: 0,
    style: 'possession',
    level: 64,
  };
  const ai: Club[] = AI_CLUBS.map((c, i) => ({
    id: `ai${i}`,
    name: c.name,
    short: c.short,
    crest: { primary: c.primary, secondary: c.secondary, pattern: rng.pick(PATTERNS) },
    attack: 0,
    defense: 0,
    style: rng.pick(STYLE_IDS),
    level: AI_LEVEL[i] + rng.int(-2, 2),
  }));
  const clubs = [user, ...ai];
  const built = buildWorld(rng, clubs, nextId);
  const formation: FormationId = '4-4-2';
  let state: GameState = {
    version: 2,
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
    world: built.world,
    search: [],
    scouting: {},
    talks: {},
    offers: [],
    knownStyles: [],
    plans: {},
    nextId: built.nextId,
    summary: null,
    history: [],
  };
  state = refreshClubs(state);
  state = makeOffers(state, rng);
  state = search(state, rng, defaultSearchBudget(state.money), 'ALL');
  return withSeed(state, rng);
}

function withSeed(state: GameState, rng: Rng): GameState {
  return { ...state, seed: rng.seed() };
}

/** Fee budgets offered in the search; 0 means free agents only. */
export const SEARCH_BUDGETS = [0, 1, 2, 5, 10, 20, 40].map((m) => m * 1_000_000);

export function defaultSearchBudget(money: number) {
  const steps = SEARCH_BUDGETS.filter((b) => b > 0 && b <= Math.max(money, SEARCH_BUDGETS[1]));
  return steps[steps.length - 1];
}

function ensureLineup(state: GameState): GameState {
  if (state.lineup.every((id) => id !== null)) return state;
  return { ...state, lineup: autoPick(state.squad, state.formation, state.lineup) };
}

/** The tactic the user plays in a given round. */
export function tacticFor(state: GameState, round: number): Tactic {
  return state.plans[round] ?? state.tactic;
}

/** +bonus for the right counter to a style, −bonus for the wrong one. */
export function counterEffect(tactic: Tactic, style: Club['style']) {
  const s = STYLES[style];
  return s.beatenBy === tactic ? COUNTER_BONUS : s.weakAgainst === tactic ? -COUNTER_BONUS : 0;
}

/** The user's attack/defense for a round, including the tactic counter. */
export function userSideFor(state: GameState, round: number, opponent: Club) {
  const tactic = tacticFor(state, round);
  const s = teamStrength(state.squad, state.lineup, state.formation, tactic, state.captainId);
  const c = counterEffect(tactic, opponent.style);
  return { attack: s.attack + c, defense: s.defense + c };
}

function playRound(state: GameState, rng: Rng): GameState {
  if (state.phase !== 'season' || state.round >= ROUNDS) return state;
  const s = ensureLineup(state);
  const goals = new Map<string, number>();
  let knownStyles = s.knownStyles;
  const fixtures = s.fixtures.map((f) => {
    if (f.round !== s.round) return f;
    const home = clubById(s, f.homeId);
    const away = clubById(s, f.awayId);
    const userHome = f.homeId === USER_ID;
    const userAway = f.awayId === USER_ID;
    const homeSide = userHome ? userSideFor(s, s.round, away) : home;
    const awaySide = userAway ? userSideFor(s, s.round, home) : away;
    const score = playMatch(rng, homeSide, awaySide);
    if (!userHome && !userAway) return { ...f, result: score };
    const opp = userHome ? away : home;
    if (!knownStyles.includes(opp.id)) knownStyles = [...knownStyles, opp.id];
    const own = userHome ? score.home : score.away;
    const scorers = pickScorers(rng, s.squad, s.lineup, s.formation, own);
    scorers.forEach((p) => goals.set(p.id, (goals.get(p.id) ?? 0) + 1));
    return { ...f, result: { ...score, scorers: scorers.map((p) => p.name) } };
  });
  const squad = goals.size
    ? s.squad.map((p) => (goals.has(p.id) ? { ...p, goals: p.goals + goals.get(p.id)! } : p))
    : s.squad;
  const round = s.round + 1;
  let next: GameState = { ...s, fixtures, squad, round, knownStyles };
  if (round === MID_WINDOW_ROUND) next = openWindow({ ...next, window: 'mid' }, rng);
  else if (round === ROUNDS) next = endSeason(next, rng);
  return next;
}

function openWindow(state: GameState, rng: Rng): GameState {
  let s: GameState = { ...state, phase: 'window', talks: {} };
  s = makeOffers(s, rng);
  return search(s, rng, defaultSearchBudget(s.money), 'ALL');
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

/**
 * Money at season end if the club finishes where it stands now (or where its
 * strength projects before a ball is kicked), plus how worried the board is.
 */
export function seasonProjection(state: GameState) {
  const table = leagueTable(state.clubs, state.fixtures);
  const row = table.find((r) => r.clubId === USER_ID)!;
  const position = row.played ? table.indexOf(row) + 1 : projectedPosition(state);
  const costs = seasonCosts(state);
  const income = seasonIncome(position, state.fans);
  const net = income.total - costs.total;
  const moneyAfter = state.money + net;
  const risk: 'ok' | 'warning' | 'danger' =
    moneyAfter < ECONOMY.sackedBelow ? 'danger' : moneyAfter < 0 ? 'warning' : 'ok';
  return { position, current: row.played > 0, costs, income, net, moneyAfter, risk };
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

  // Development, expiring contracts, retirements and academy graduates.
  const changes: SeasonSummary['changes'] = [];
  const retired: string[] = [];
  const expired: string[] = [];
  const leavers: Player[] = [];
  const squad: Player[] = [];
  for (const p of state.squad) {
    if (p.age + 1 >= RETIRE_AGE && rng.chance(0.7)) {
      retired.push(p.name);
      continue;
    }
    const grown = develop(rng, p);
    if (grown.rating !== p.rating) changes.push({ name: p.name, from: p.rating, to: grown.rating });
    const years = p.contract.years - 1;
    if (years <= 0) {
      expired.push(p.name);
      leavers.push({ ...grown, clubId: null, seasonsAtClub: 0, contract: { ...p.contract, years: 0 } });
      continue;
    }
    squad.push({ ...grown, contract: { ...p.contract, years } });
  }
  let nextId = state.nextId;
  const academy: string[] = [];
  // Graduates fill any line that is short first, then the squad up to a full
  // matchday squad. At least one graduate joins every season.
  const needed: Position[] = [];
  for (const line of Object.keys(LINE_MIN) as (keyof typeof LINE_MIN)[]) {
    const have = squad.filter((p) => LINE_OF[p.positions[0]] === line).length;
    for (let i = have; i < LINE_MIN[line]; i++) needed.push(rng.pick(positionsForLine(line)));
  }
  const academyCount = Math.max(1, needed.length, SQUAD_MIN - squad.length);
  for (let i = 0; i < academyCount && squad.length < SQUAD_MAX; i++) {
    const youth = makePlayer(rng, `p${nextId++}`, {
      position: needed[i] ?? rng.pick(positionsForLine('ALL')),
      rating: rng.int(48, 60),
      age: rng.int(16, 18),
      clubId: USER_ID,
    });
    youth.potential = clamp(youth.rating + rng.int(8, 28), youth.rating, 92);
    // Academy players sign cheap first contracts.
    youth.contract = { wage: 50_000, years: 3 };
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
    expired,
  };
  const keep = new Set(squad.map((p) => p.id));
  const scouting = { ...state.scouting };
  for (const p of squad) scouting[p.id] = 2;
  const next: GameState = {
    ...state,
    phase: money < ECONOMY.sackedBelow ? 'gameover' : 'summary',
    squad,
    world: [...state.world, ...leavers],
    lineup: state.lineup.map((id) => (id && keep.has(id) ? id : null)),
    captainId: state.captainId && keep.has(state.captainId) ? state.captainId : null,
    money,
    fans,
    nextId,
    scouting,
    summary,
    plans: {},
    history: [...state.history, { season: state.season, position }],
  };
  // The rest of the world ages too (the leavers are already aged).
  const leaverIds = new Set(leavers.map((p) => p.id));
  const aged = advanceWorld({ ...next, world: next.world.filter((p) => !leaverIds.has(p.id)) }, rng);
  return { ...aged, world: [...aged.world, ...leavers] };
}

function nextSeason(state: GameState, rng: Rng): GameState {
  const next: GameState = {
    ...state,
    season: state.season + 1,
    window: 'pre',
    round: 0,
    fixtures: makeFixtures(
      rng,
      state.clubs.map((c) => c.id),
    ),
    summary: null,
  };
  return openWindow(next, rng);
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
    case 'plan':
      return { ...state, plans: { ...state.plans, [action.round]: action.tactic } };
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
    case 'search':
      return done(search(state, rng, action.maxFee, action.line));
    case 'scoutPlayer':
      return scoutPlayer(state, action.playerId);
    case 'bid':
      return placeBid(state, action.playerId, action.fee, action.years);
    case 'acceptOffer':
      return acceptOffer(state, action.offerId);
    case 'rejectOffer':
      return rejectOffer(state, action.offerId);
    case 'quickSale':
      return done(quickSale(state, rng, action.playerId));
    case 'renew':
      return renew(state, action.playerId, action.years);
    case 'startSeason': {
      if (state.phase !== 'window') return state;
      const topped = topUpClubs(state, rng);
      return done(ensureLineup({ ...topped, phase: 'season', offers: [], talks: {} }));
    }
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
