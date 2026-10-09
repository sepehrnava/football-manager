import {
  COUNTER_BONUS,
  ECONOMY,
  FIRST_SEASON,
  STYLES,
} from './constants';
import { CUP_RULES, cupProgress, drawCups, playCupStages } from './cups';
import { leagueTable, makeFixtures, pickScorers, playMatch } from './league';
import {
  acceptOffer,
  advanceWorld,
  buildWorld,
  clubSquad,
  canTrade,
  academyFill,
  makeOffers,
  placeBid,
  renewalDemand,
  quickSale,
  refreshClubs,
  rejectOffer,
  scoutPlayer,
  setListed,
  STYLE_IDS,
  topUpClubs,
  USER_ID,
} from './market';
import { compKey, DEFAULT_COUNTRY, divisionsIn, econRating, LEAGUE, PROMOTION_SPOTS, type Comp } from './leagues';
import { develop, makePlayer, markRetirements } from './players';
import { createRng, type Rng } from './rng';
import { autoPick, remapLineup, teamStrength, userStrength, wageBill } from './team';
import type {
  BoardStatus,
  Club,
  Crest,
  Cup,
  Fixture,
  FormationId,
  GameState,
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
  | {
      type: 'new';
      name: string;
      short: string;
      crest: Crest;
      seed: number;
      takeOver?: number | null;
      /** Country a new club starts in (lowest division). */
      country?: string;
    }
  | { type: 'load'; state: GameState }
  | { type: 'reset' }
  | { type: 'formation'; formation: FormationId }
  | { type: 'tactic'; tactic: Tactic }
  | { type: 'plan'; round: number; tactic: Tactic }
  | { type: 'assign'; slot: number; playerId: string | null }
  | { type: 'autoPick' }
  | { type: 'captain'; playerId: string }
  | { type: 'watch'; playerId: string }
  | { type: 'scoutPlayer'; playerId: string }
  | { type: 'bid'; playerId: string; fee: number; years: number }
  | { type: 'acceptOffer'; offerId: string }
  | { type: 'rejectOffer'; offerId: string }
  | { type: 'quickSale'; playerId: string }
  | { type: 'list'; playerId: string; listed: boolean }
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

/** Each league club always has the same crest, so pickers can show it. */
export function clubCrest(index: number): Crest {
  const c = LEAGUE.clubs[index];
  return { primary: c.primary, secondary: c.secondary, pattern: c.pattern };
}

export function divisionOf(club: Pick<Club, 'division'>) {
  return club.division ?? 1;
}

/** The competition (country + division) a club plays in. */
export function compOf(club: Pick<Club, 'division' | 'country'>): Comp {
  return { country: club.country ?? DEFAULT_COUNTRY, division: club.division ?? 1 };
}

function fixtureComp(f: Fixture): Comp {
  return { country: f.country ?? DEFAULT_COUNTRY, division: f.division ?? 1 };
}

function sameComp(a: Comp, b: Comp) {
  return a.country === b.country && a.division === b.division;
}

/** The competition the user's club plays in this season. */
export function userComp(state: Pick<GameState, 'clubs'>) {
  return compOf(state.clubs.find((c) => c.id === USER_ID)!);
}

/** The division of the user's club (within its country). */
export function userDivision(state: Pick<GameState, 'clubs'>) {
  return userComp(state).division;
}

export function compClubs(state: Pick<GameState, 'clubs'>, comp: Comp = userComp(state)) {
  return state.clubs.filter((c) => sameComp(compOf(c), comp));
}

/** The table of one competition (the user's by default). */
export function compTable(state: Pick<GameState, 'clubs' | 'fixtures'>, comp: Comp = userComp(state)) {
  return leagueTable(
    compClubs(state, comp),
    state.fixtures.filter((f) => sameComp(fixtureComp(f), comp)),
  );
}

function roundsFor(clubCount: number) {
  return (clubCount - 1) * 2;
}

/** Matchdays in the user's season: everyone plays everyone home and away. */
export function seasonRounds(state: Pick<GameState, 'clubs'>) {
  return roundsFor(compClubs(state).length);
}

/** The mid-season window opens once the first half of the fixtures is played. */
export function midWindowRound(state: Pick<GameState, 'clubs'>) {
  return compClubs(state).length - 1;
}

/** A full season of fixtures for every competition. */
function allFixtures(rng: Rng, clubs: Club[]): Fixture[] {
  const comps = new Map<string, Comp>();
  clubs.forEach((c) => comps.set(compKey(compOf(c)), compOf(c)));
  return [...comps.values()].flatMap((comp) =>
    makeFixtures(
      rng,
      clubs.filter((c) => sameComp(compOf(c), comp)).map((c) => c.id),
    ).map((f) => ({ ...f, division: comp.division, country: comp.country })),
  );
}

/**
 * TV money per season for a competition: poorer competitions earn little prize
 * money, so the weaker a competition is, the more TV money it pays (up to the cap).
 */
export function tvFor(state: Pick<GameState, 'clubs'>, comp: Comp) {
  const levels = compClubs(state, comp).map((c) => (c.id === USER_ID ? (c.size ?? c.level) : c.level));
  const avg = econRating(levels.reduce((a, b) => a + b, 0) / Math.max(1, levels.length));
  const gap = (ECONOMY.prizeTopLevel - avg) / ECONOMY.tvGapForFull;
  return Math.round((Math.min(1, Math.max(0, gap)) * ECONOMY.tvMax) / 50_000) * 50_000;
}

/**
 * Each country's top division, best first: by final table when the season was
 * played, otherwise (a new career) by squad strength.
 */
function topRankings(state: GameState, byTable: boolean) {
  const rankings = new Map<string, string[]>();
  const countries = [...new Set(state.clubs.map((c) => compOf(c).country))];
  for (const country of countries) {
    const comp = { country, division: 1 };
    const mine = userStrength(state);
    const strength = (c: Club) => (c.id === USER_ID ? mine.attack + mine.defense : c.attack + c.defense);
    const ids = byTable
      ? compTable(state, comp).map((r) => r.clubId)
      : compClubs(state, comp)
          .slice()
          .sort((a, b) => strength(b) - strength(a))
          .map((c) => c.id);
    rankings.set(country, ids);
  }
  return rankings;
}

/** Cup prize money the user's club earns for entering and for each win so far. */
function cupMoney(cups: Cup[]) {
  return cups.reduce((sum, cup) => {
    const p = cupProgress(cup, USER_ID);
    if (!p) return sum;
    const prizes = CUP_RULES[cup.id].prizeMillions.slice(0, p.wins + 1);
    return sum + prizes.reduce((a, b) => a + b, 0) * 1_000_000;
  }, 0);
}

function withCups(state: GameState, rng: Rng, rankings: Map<string, string[]>): GameState {
  const cups = drawCups(rng, rankings, seasonRounds(state));
  return { ...state, cups, cupEarnings: cupMoney(cups) };
}

/** How the user's club did in each cup this season, for the summary. */
function cupResults(cups: Cup[]) {
  return cups.flatMap((cup) => {
    const p = cupProgress(cup, USER_ID);
    if (!p) return [];
    const reached = cup.stages[Math.min(p.wins, cup.stages.length - 1)].name;
    const result = p.champion ? 'Winners!' : p.out ? `Out in the ${reached}` : reached;
    return [{ name: cup.name, result }];
  });
}

/** Sponsor income per season for a club of this size. */
export function sponsorFor(size: number) {
  const raw = ECONOMY.sponsorScale * Math.exp(0.14 * (econRating(size) - 60)) - ECONOMY.sponsorOffset;
  return Math.max(0, Math.round(raw / 50_000) * 50_000);
}

/** Starting budget, fan base and sponsor income for a club of this size. */
export function clubEconomy(size: number) {
  const d = econRating(size) - ECONOMY.newClubSize;
  return {
    money: Math.round((ECONOMY.startMoney * Math.exp(0.06 * d)) / 500_000) * 500_000,
    fans: Math.round((ECONOMY.startFans * Math.exp(0.06 * d)) / 1000) * 1000,
    sponsor: sponsorFor(size),
  };
}

/**
 * New career: either a brand-new club with a modest squad (taking the place of
 * the league's weakest club), or `takeOver` one of the existing clubs, with its
 * squad, budget and expectations.
 */
export function createGame(action: Extract<Action, { type: 'new' }>): GameState {
  const rng = createRng(action.seed);
  let nextId = 1;
  const nextPlayerId = () => `p${nextId++}`;
  const league: Club[] = LEAGUE.clubs.map((c, i) => ({
    id: `ai${i}`,
    name: c.name,
    short: c.short,
    crest: clubCrest(i),
    attack: 0,
    defense: 0,
    style: rng.pick(STYLE_IDS),
    level: c.level + rng.int(-1, 1),
    division: c.division,
    country: c.country,
  }));

  const takeOver = action.takeOver ?? null;
  let user: Club;
  let squad: Player[];
  let ai: Club[];
  if (takeOver !== null && league[takeOver]) {
    const chosen = league[takeOver];
    user = { ...chosen, id: USER_ID, size: LEAGUE.clubs[takeOver].level };
    squad = clubSquad(rng, USER_ID, chosen.country ?? DEFAULT_COUNTRY, chosen.short, chosen.level, nextPlayerId);
    ai = league.filter((_, i) => i !== takeOver);
  } else {
    // A new club starts in the lowest division of the chosen country, replacing
    // its weakest club, just below that club's strength.
    const country = action.country ?? DEFAULT_COUNTRY;
    const lowest = divisionsIn(country);
    const replaced = league
      .filter((c) => c.country === country && divisionOf(c) === lowest)
      .sort((a, b) => a.level - b.level)[0];
    const size =
      LEAGUE.clubs.find((c) => c.country === country && c.short === replaced.short)!.level -
      ECONOMY.newClubBelowWeakest;
    const shift = size - ECONOMY.newClubSize;
    user = {
      id: USER_ID,
      name: action.name.trim() || 'My Club',
      short: action.short.trim().toUpperCase() || 'FC',
      crest: action.crest,
      attack: 0,
      defense: 0,
      style: 'possession',
      level: size,
      size,
      division: lowest,
      country,
    };
    squad = STARTING_SQUAD.map(([position, rating, age]) =>
      makePlayer(rng, nextPlayerId(), {
        position,
        rating: rating + shift,
        age,
        seasonsAtClub: rng.int(0, 4),
        clubId: USER_ID,
      }),
    );
    ai = league.filter((c) => c !== replaced);
  }
  const economy = clubEconomy(user.size ?? ECONOMY.newClubSize);
  if (takeOver === null) {
    // Founding investment: enough to compete with the clubs around you.
    const weakest = (user.size ?? ECONOMY.newClubSize) + ECONOMY.newClubBelowWeakest;
    economy.money = Math.round((clubEconomy(weakest).money * ECONOMY.newClubInvestment) / 500_000) * 500_000;
  }
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
    fixtures: allFixtures(rng, clubs),
    money: economy.money,
    fans: economy.fans,
    world: built.world,
    scouting: {},
    talks: {},
    offers: [],
    knownStyles: [],
    plans: {},
    nextId: built.nextId,
    summary: null,
    history: [],
  };
  state = { ...state, squad: markRetirements(rng, state.squad), world: markRetirements(rng, state.world) };
  state = refreshClubs(state);
  state = withCups(state, rng, topRankings(state, false));
  state = makeOffers(state, rng);
  return withSeed(state, rng);
}

function withSeed(state: GameState, rng: Rng): GameState {
  return { ...state, seed: rng.seed() };
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
  if (state.phase !== 'season' || state.round >= seasonRounds(state)) return state;
  const s = ensureLineup(state);
  const goals = new Map<string, number>();
  let knownStyles = s.knownStyles;
  // Other competitions keep pace: their (possibly longer) seasons end with ours.
  const mine = compKey(userComp(s));
  const myRounds = seasonRounds(s);
  const sizes = new Map<string, number>();
  s.clubs.forEach((c) => sizes.set(compKey(compOf(c)), (sizes.get(compKey(compOf(c))) ?? 0) + 1));
  const playsNow = (f: Fixture) => {
    const key = compKey(fixtureComp(f));
    if (key === mine) return f.round === s.round;
    const rounds = roundsFor(sizes.get(key) ?? 2);
    const from = Math.floor((s.round * rounds) / myRounds);
    const to = Math.floor(((s.round + 1) * rounds) / myRounds);
    return f.round >= from && f.round < to;
  };
  const fixtures = s.fixtures.map((f) => {
    if (f.result || !playsNow(f)) return f;
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
  if (next.cups?.length) {
    const cups = playCupStages(rng, next.cups, round, (id, oppId) =>
      id === USER_ID ? userSideFor(next, s.round, clubById(next, oppId)) : clubById(next, id),
    );
    next = { ...next, cups, cupEarnings: cupMoney(cups) };
  }
  if (round === midWindowRound(next)) next = openWindow({ ...next, window: 'mid' }, rng);
  else if (round === seasonRounds(next)) next = endSeason(next, rng);
  return next;
}

function openWindow(state: GameState, rng: Rng): GameState {
  let s: GameState = { ...state, phase: 'window', talks: {} };
  s = makeOffers(s, rng);
  return s;
}

export function projectedPosition(state: GameState) {
  const mine = userStrength(state).power;
  const above = compClubs(state).filter(
    (c) => c.id !== USER_ID && (c.attack + c.defense) / 2 > mine,
  ).length;
  return above + 1;
}

export function seasonCosts(state: GameState) {
  const wages = wageBill(state.squad);
  const fixedCosts = Math.round(ECONOMY.runningCostBase + state.fans * ECONOMY.runningCostPerFan);
  return { wages, fixedCosts, total: wages + fixedCosts };
}

/** Stakeholders share in profit only, so a loss is never made worse by them. */
export function stakeholderShare(profit: number) {
  return Math.round(Math.max(0, profit) * ECONOMY.stakeholderShare);
}

/** Where the club stands with the board right now, in one word. */
export function moneyStatus(state: GameState): 'ok' | 'debt' | 'warning' {
  if (state.warning != null) return 'warning';
  return state.money < 0 ? 'debt' : 'ok';
}

/** Plain-language explanation for the money status. */
export const MONEY_STATUS_TEXT = {
  ok: null,
  debt: 'You are in debt, so you cannot pay transfer fees. Sell players to get back above $0.',
  warning: `Final warning! Finish this season above -$${-ECONOMY.debtLimit / 1_000_000}M or the board sacks you. Sell players to raise money.`,
} as const;

/** The board's verdict on a season ending with `moneyAfter`: two in a row below the limit is the sack. */
export function boardVerdict(state: GameState, moneyAfter: number): BoardStatus {
  if (moneyAfter >= 0) return 'ok';
  if (moneyAfter >= ECONOMY.debtLimit) return 'debt';
  return state.warning != null ? 'sacked' : 'warning';
}

/**
 * Prize money by final position: from the champion's share down to last place,
 * scaled to the league's size and to how strong (and so how rich) it is.
 */
export function prizeFor(position: number, clubs: Pick<Club, 'level' | 'size' | 'id'>[]) {
  const n = clubs.length;
  const levels = clubs.map((c) => (c.id === USER_ID ? (c.size ?? c.level) : c.level));
  const avg = levels.reduce((a, b) => a + b, 0) / n;
  // The top of the table is paid by the league's elite (big clubs draw the money),
  // the bottom by its average strength.
  const top4 = [...levels].sort((a, b) => b - a).slice(0, 4);
  const elite = top4.reduce((a, b) => a + b, 0) / top4.length;
  const bottomPrize = ECONOMY.prizeLast * Math.exp(0.14 * (econRating(avg) - ECONOMY.prizeReferenceLevel));
  const topPrize = ECONOMY.prizeFirst * Math.exp(0.14 * (econRating(elite) - ECONOMY.prizeEliteReference));
  const share = Math.pow((n - position) / (n - 1), ECONOMY.prizeCurve);
  const prize = bottomPrize + (Math.max(topPrize, bottomPrize) - bottomPrize) * share;
  return Math.round(prize / 50_000) * 50_000;
}

export function seasonIncome(
  position: number,
  fans: number,
  sponsor = 0,
  clubs?: Pick<Club, 'level' | 'size' | 'id'>[],
  tv = 0,
  cups = 0,
) {
  const prize = clubs ? prizeFor(position, clubs) : (ECONOMY.prize[position - 1] ?? 0);
  const fanIncome = Math.round(fans * ECONOMY.revenuePerFan);
  return { prize, fanIncome, sponsor, tv, cups, total: prize + fanIncome + sponsor + tv + cups };
}

/**
 * Promotion and relegation within each country: the bottom clubs of a division
 * swap places with the top clubs of the division below. Returns new divisions.
 */
function movements(state: GameState) {
  const next = new Map(state.clubs.map((c) => [c.id, divisionOf(c)]));
  const countries = [...new Set(state.clubs.map((c) => compOf(c).country))];
  for (const country of countries)
  for (let d = 1; d < divisionsIn(country); d++) {
    const upper = compTable(state, { country, division: d });
    const lower = compTable(state, { country, division: d + 1 });
    const spots = Math.min(PROMOTION_SPOTS, Math.floor(upper.length / 4), Math.floor(lower.length / 4));
    upper.slice(-spots).forEach((r) => next.set(r.clubId, d + 1));
    lower.slice(0, spots).forEach((r) => next.set(r.clubId, d));
  }
  return next;
}

function endSeason(state: GameState, rng: Rng): GameState {
  const comp = userComp(state);
  const division = comp.division;
  const table = compTable(state);
  const position = table.findIndex((r) => r.clubId === USER_ID) + 1;
  const champion = state.clubs.find((c) => c.id === table[0].clubId)!;
  const moves = movements(state);
  const newDivision = moves.get(USER_ID)!;
  const movement = newDivision < division ? 'promoted' : newDivision > division ? 'relegated' : null;
  const costs = seasonCosts(state);
  const income = seasonIncome(
    position,
    state.fans,
    sponsorFor(userClub(state).size ?? ECONOMY.newClubSize),
    compClubs(state),
    tvFor(state, comp),
    state.cupEarnings ?? 0,
  );
  const bonuses = Math.round(costs.wages * (ECONOMY.topFinishBonus[position - 1] ?? 0));
  const profit = income.total - costs.total - bonuses;
  const stakeholder = stakeholderShare(profit);
  const net = profit - stakeholder;
  const money = state.money + net;
  const board = boardVerdict(state, money);
  // Fans follow the finish relative to the table, plus a swing for moving divisions.
  const rel = (position - 1) / Math.max(1, table.length - 1);
  const fansFactor =
    1 + (0.5 - rel) * 0.36 + (position === 1 ? 0.1 : 0) + (movement === 'promoted' ? 0.1 : movement === 'relegated' ? -0.1 : 0);
  const fans = Math.max(ECONOMY.fansFloor, Math.round((state.fans * fansFactor) / 1000) * 1000);

  // Development, expiring contracts, retirements and academy graduates.
  const changes: SeasonSummary['changes'] = [];
  const retired: string[] = [];
  const squad: Player[] = [];
  // Raises reflect this season's finish, so count it before renewing.
  const withResult = {
    ...state,
    history: [...state.history, { season: state.season, position, division, country: comp.country }],
  };
  for (const p of state.squad) {
    if (p.retiring) {
      retired.push(p.name);
      continue;
    }
    const grown = develop(rng, p);
    if (grown.rating !== p.rating) changes.push({ name: p.name, from: p.rating, to: grown.rating });
    // Contracts renew automatically; the player's (possibly higher) demand applies.
    const years = p.contract.years - 1;
    squad.push({
      ...grown,
      contract: years > 0 ? { ...p.contract, years } : { wage: renewalDemand(withResult, grown), years: 2 },
    });
  }
  // At least one academy graduate joins every season, more if the squad is short.
  const graduates = academyFill(squad, rng, state.nextId, 1);
  squad.push(...graduates.players);
  const nextId = graduates.nextId;
  const academy = graduates.players.map((p) => p.name);
  changes.sort((a, b) => b.to - b.from - (a.to - a.from));

  const summary: SeasonSummary = {
    season: state.season,
    position,
    championName: champion.name,
    prize: income.prize,
    fanIncome: income.fanIncome,
    sponsor: income.sponsor,
    tv: income.tv,
    cupPrize: income.cups,
    cupResults: cupResults(state.cups ?? []),
    wages: costs.wages,
    fixedCosts: costs.fixedCosts,
    stakeholder,
    bonuses,
    net,
    moneyBefore: state.money,
    moneyAfter: money,
    fansBefore: state.fans,
    fansAfter: fans,
    changes,
    retired,
    academy,
    board,
    division,
    country: comp.country,
    movement,
  };
  const keep = new Set(squad.map((p) => p.id));
  const scouting = { ...state.scouting };
  for (const p of squad) scouting[p.id] = 1;
  const next: GameState = {
    ...state,
    phase: board === 'sacked' ? 'gameover' : 'summary',
    // A warning stands until a season ends above the debt limit.
    warning: board === 'warning' || board === 'sacked' ? money : null,
    squad,
    lineup: state.lineup.map((id) => (id && keep.has(id) ? id : null)),
    captainId: state.captainId && keep.has(state.captainId) ? state.captainId : null,
    money,
    fans,
    nextId,
    scouting,
    summary,
    plans: {},
    history: [...state.history, { season: state.season, position, division, country: comp.country }],
    // Next season's cup places come from this season's final tables.
    cupRankings: Object.fromEntries(topRankings(state, true)),
    clubs: state.clubs.map((c) => ({ ...c, division: moves.get(c.id) })),
  };
  // The rest of the world ages too.
  return advanceWorld(next, rng);
}

function nextSeason(state: GameState, rng: Rng): GameState {
  const next: GameState = {
    ...state,
    squad: markRetirements(rng, state.squad),
    world: markRetirements(rng, state.world),
    season: state.season + 1,
    window: 'pre',
    round: 0,
    fixtures: allFixtures(rng, state.clubs),
    summary: null,
  };
  const rankings = state.cupRankings
    ? new Map(Object.entries(state.cupRankings))
    : topRankings(next, false);
  return openWindow(withCups(next, rng, rankings), rng);
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
    case 'watch': {
      const watch = state.watch ?? [];
      return {
        ...state,
        watch: watch.includes(action.playerId)
          ? watch.filter((id) => id !== action.playerId)
          : [...watch, action.playerId],
      };
    }
    case 'scoutPlayer':
      return scoutPlayer(state, action.playerId);
    case 'bid':
      return placeBid(state, action.playerId, action.fee, action.years);
    case 'acceptOffer':
      return done(acceptOffer(state, rng, action.offerId));
    case 'rejectOffer':
      return rejectOffer(state, action.offerId);
    case 'list':
      return done(setListed(state, rng, action.playerId, action.listed));
    case 'quickSale':
      return done(quickSale(state, rng, action.playerId));
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
