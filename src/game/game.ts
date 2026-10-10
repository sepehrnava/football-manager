import {
  BENCH_SIZE,
  COUNTER_BONUS,
  ECONOMY,
  FIRST_SEASON,
  SCORING_WEIGHT,
  ASSIST_CHANCE,
  ASSIST_WEIGHT,
  FORMATIONS,
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
  academyCallUp,
  academyFill,
  makeOffers,
  placeBid,
  renewalDemand,
  quickSale,
  refreshClubs,
  rejectOffer,
  scoutPlayer,
  setListed,
  squadNeeds,
  STYLE_IDS,
  topUpClubs,
  USER_ID,
} from './market';
import { roundNews, withNews } from './news';
import { hireStaff, staffMarket, staffWages, startingStaff, youthBoostChance } from './staff';
import { compKey, compName, DEFAULT_COUNTRY, divisionsIn, econRating, LEAGUE, PROMOTION_SPOTS, type Comp } from './leagues';
import { develop, makePlayer, markRetirements, playerValue, roundMoney, withExtraPositions } from './players';
import { createRng, type Rng } from './rng';
import { autoPick, benchFor, remapLineup, userStrength, userTeam, wageBill } from './team';
import type {
  BoardStatus,
  Club,
  Crest,
  CrestShape,
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
  | { type: 'fillAcademy' }
  /** One academy youngster joins the squad (once per window). */
  | { type: 'academyCallUp' }
  | { type: 'load'; state: GameState }
  | { type: 'reset' }
  | { type: 'formation'; formation: FormationId }
  | { type: 'tactic'; tactic: Tactic }
  | { type: 'plan'; round: number; tactic: Tactic }
  | { type: 'assign'; slot: number; playerId: string | null }
  /** Swap a substitute and a reserve (either order). */
  | { type: 'benchSwap'; a: string; b: string }
  | { type: 'autoPick' }
  | { type: 'captain'; playerId: string }
  | { type: 'watch'; playerId: string }
  | { type: 'hireStaff'; staffId: string }
  | { type: 'scoutPlayer'; playerId: string; free?: boolean }
  | { type: 'adBonus' }
  | { type: 'bid'; playerId: string; fee: number; years: number }
  | { type: 'acceptOffer'; offerId: string }
  | { type: 'rejectOffer'; offerId: string }
  | { type: 'quickSale'; playerId: string }
  | { type: 'list'; playerId: string; listed: boolean; now?: number }
  | { type: 'startSeason' }
  | { type: 'playRound' }
  | { type: 'simToStop' }
  | { type: 'nextSeason' };

export const STARTING_SQUAD: [Position, number, number][] = [
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
/** About half the clubs keep the classic shield; the rest get a steady shape from their code. */
const SHAPES: CrestShape[] = ['shield', 'shield', 'shield', 'round', 'round', 'square', 'oval'];

export function crestShapeFor(short: string): CrestShape {
  const code = [...short].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
  return SHAPES[code % SHAPES.length];
}

export function clubCrest(index: number): Crest {
  const c = LEAGUE.clubs[index];
  return { primary: c.primary, secondary: c.secondary, pattern: c.pattern, shape: crestShapeFor(c.short) };
}

/** Saves from before crest shapes: give the other clubs theirs; the user's own crest stays as designed. */
function withCrestShapes(state: GameState): GameState {
  if (state.clubs.every((c) => c.id === USER_ID || c.crest.shape)) return state;
  return {
    ...state,
    clubs: state.clubs.map((c) =>
      c.id === USER_ID || c.crest.shape ? c : { ...c, crest: { ...c.crest, shape: crestShapeFor(c.short) } },
    ),
  };
}

/** Saves from before extra positions: give one-position players theirs (same rule as new players). */
function withPositions(state: GameState): GameState {
  const fix = (p: Player) => {
    if (p.positions.length > 1) return p;
    const positions = withExtraPositions(p.positions, p.name);
    return positions.length > 1 ? { ...p, positions } : p;
  };
  const squad = state.squad.map(fix);
  const world = state.world.map(fix);
  if (squad.every((p, i) => p === state.squad[i]) && world.every((p, i) => p === state.world[i])) return state;
  return { ...state, squad, world };
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

/** Clubs move division as soon as a season ends; until the next season starts, the season summary keeps the finished one. */
type CompState = Pick<GameState, 'clubs'> & { summary?: GameState['summary'] };

/** The competition the user's club plays in this season (the finished one while its summary is shown). */
export function userComp(state: CompState): Comp {
  const sum = state.summary;
  if (sum?.division) return { country: sum.country ?? DEFAULT_COUNTRY, division: sum.division };
  return compOf(state.clubs.find((c) => c.id === USER_ID)!);
}

/** The division of the user's club (within its country). */
export function userDivision(state: CompState) {
  return userComp(state).division;
}

export function compClubs(state: CompState, comp: Comp = userComp(state)) {
  return state.clubs.filter((c) => sameComp(compOf(c), comp));
}

/**
 * The table of one competition (the user's by default). Its clubs are the ones in its fixtures,
 * so a finished season's table stays right after clubs have moved division.
 */
export function compTable(state: CompState & Pick<GameState, 'fixtures'>, comp: Comp = userComp(state)) {
  const fixtures = state.fixtures.filter((f) => sameComp(fixtureComp(f), comp));
  const ids = new Set(fixtures.flatMap((f) => [f.homeId, f.awayId]));
  const clubs = ids.size ? state.clubs.filter((c) => ids.has(c.id)) : compClubs(state, comp);
  return leagueTable(clubs, fixtures);
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

/**
 * The ad sponsor bonus: small on purpose and sized to the club, 1% of the season's wage bill
 * (at least $10K). Ads are unlimited in a window, so each one stays hardly noticeable.
 */
export function adBonusAmount(state: GameState) {
  return Math.max(10_000, roundMoney(wageBill(state.squad) * 0.01));
}

/** Any number of times while a transfer window is open (user's choice), outside the Daily Challenge. */
export function canTakeAdBonus(state: GameState) {
  return state.phase === 'window' && !state.challenge;
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

/** Strength of a brand-new club: just below the weakest club of the country's lowest division. */
export function newClubSize(country: string) {
  const lowest = divisionsIn(country);
  const weakest = Math.min(
    ...LEAGUE.clubs.filter((c) => c.country === country && c.division === lowest).map((c) => c.level),
  );
  return weakest - ECONOMY.newClubBelowWeakest;
}

/**
 * A new club starts with no players. Its budget is the founding money plus a
 * player budget: what a squad like the old ready-made one costs on the market.
 * `suggested` is that player budget, shown as advice.
 */
export function newClubBudget(country: string) {
  const size = newClubSize(country);
  const founding =
    Math.round((clubEconomy(size + ECONOMY.newClubBelowWeakest).money * ECONOMY.newClubInvestment) / 500_000) *
    500_000;
  const rng = createRng(1);
  const shift = size - ECONOMY.newClubSize;
  const squadValue = STARTING_SQUAD.reduce(
    (sum, [position, rating, age]) => sum + playerValue(makePlayer(rng, 'x', { position, rating: rating + shift, age })),
    0,
  );
  const suggested = Math.round((squadValue * ECONOMY.newClubMarketFactor) / 100_000) * 100_000;
  return { founding, suggested, budget: founding + suggested };
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
    // The user builds the squad in the pre-season window (see newClubBudget).
    squad = [];
    ai = league.filter((c) => c !== replaced);
  }
  const economy = clubEconomy(user.size ?? ECONOMY.newClubSize);
  if (takeOver === null) {
    // Founding investment plus a budget to buy the first squad.
    economy.money = newClubBudget(action.country ?? DEFAULT_COUNTRY).budget;
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
    captainId: [...squad].sort((a, b) => b.seasonsAtClub - a.seasonsAtClub || b.rating - a.rating)[0]?.id ?? null,
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
  let staffNext = state.nextId;
  const staffId = () => `s${staffNext++}`;
  state = { ...state, staff: startingStaff(rng, staffId), staffMarket: staffMarket(rng, staffId) };
  state = { ...state, nextId: staffNext };
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
  const s = userTeam(state, tactic);
  const c = counterEffect(tactic, opponent.style);
  return { attack: s.attack + c, defense: s.defense + c };
}

/** Who scores an AI club's goals: its stronger players, attackers most often. */
function clubScorers(rng: Rng, players: Player[], goals: number): Player[] {
  if (!goals || !players.length) return [];
  const pool = [...players]
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 14)
    .map((p) => ({ p, w: SCORING_WEIGHT[p.positions[0]] * Math.exp((p.rating - 70) / 9) }));
  const total = pool.reduce((sum, x) => sum + x.w, 0);
  const result: Player[] = [];
  for (let g = 0; g < goals && total > 0; g++) {
    let roll = rng.next() * total;
    for (const x of pool) {
      roll -= x.w;
      if (roll <= 0) {
        result.push(x.p);
        break;
      }
    }
  }
  return result;
}

/** Who set up each goal, if anyone: creative players most often, never the scorer. */
function pickAssists(rng: Rng, candidates: { p: Player; pos: Position }[], scorers: Player[]): Player[] {
  const result: Player[] = [];
  for (const scorer of scorers) {
    if (!rng.chance(ASSIST_CHANCE)) continue;
    const pool = candidates
      .filter((c) => c.p.id !== scorer.id)
      .map((c) => ({ p: c.p, w: ASSIST_WEIGHT[c.pos] * Math.exp((c.p.rating - 70) / 12) }));
    const total = pool.reduce((sum, x) => sum + x.w, 0);
    let roll = rng.next() * total;
    for (const x of pool) {
      roll -= x.w;
      if (roll <= 0) {
        result.push(x.p);
        break;
      }
    }
  }
  return result;
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
  // Players of the clubs in the user's competition, for the league's scorer stats.
  const leagueSquads = new Map<string, Player[]>(
    s.clubs.filter((c) => c.id !== USER_ID && compKey(compOf(c)) === mine).map((c) => [c.id, []]),
  );
  for (const p of s.world) if (p.clubId) leagueSquads.get(p.clubId)?.push(p);
  const worldGoals = new Map<string, number>();
  const assists = new Map<string, number>();
  const credit = (players: Player[]) => players.forEach((p) => assists.set(p.id, (assists.get(p.id) ?? 0) + 1));
  const fixtures = s.fixtures.map((f) => {
    if (f.result || !playsNow(f)) return f;
    const home = clubById(s, f.homeId);
    const away = clubById(s, f.awayId);
    const userHome = f.homeId === USER_ID;
    const userAway = f.awayId === USER_ID;
    const homeSide = userHome ? userSideFor(s, s.round, away) : home;
    const awaySide = userAway ? userSideFor(s, s.round, home) : away;
    const score = playMatch(rng, homeSide, awaySide);
    if (!userHome && !userAway) {
      if (compKey(fixtureComp(f)) === mine) {
        for (const [clubId, n] of [
          [f.homeId, score.home],
          [f.awayId, score.away],
        ] as const) {
          const players = leagueSquads.get(clubId) ?? [];
          const scored = clubScorers(rng, players, n);
          for (const p of scored) worldGoals.set(p.id, (worldGoals.get(p.id) ?? 0) + 1);
          const regulars = [...players].sort((a, b) => b.rating - a.rating).slice(0, 14);
          credit(pickAssists(rng, regulars.map((p) => ({ p, pos: p.positions[0] })), scored));
        }
      }
      return { ...f, result: score };
    }
    const opp = userHome ? away : home;
    if (!knownStyles.includes(opp.id)) knownStyles = [...knownStyles, opp.id];
    const own = userHome ? score.home : score.away;
    const scorers = pickScorers(rng, s.squad, s.lineup, s.formation, own);
    scorers.forEach((p) => goals.set(p.id, (goals.get(p.id) ?? 0) + 1));
    const slots = FORMATIONS[s.formation].slots;
    const xi = s.lineup
      .map((id, i) => ({ p: s.squad.find((m) => m.id === id), pos: slots[i].pos }))
      .filter((c): c is { p: Player; pos: Position } => !!c.p);
    credit(pickAssists(rng, xi, scorers));
    return { ...f, result: { ...score, scorers: scorers.map((p) => p.name) } };
  });
  const tally = (p: Player, g: Map<string, number>) =>
    g.has(p.id) || assists.has(p.id)
      ? { ...p, goals: p.goals + (g.get(p.id) ?? 0), assists: (p.assists ?? 0) + (assists.get(p.id) ?? 0) }
      : p;
  const squad = goals.size || assists.size ? s.squad.map((p) => tally(p, goals)) : s.squad;
  const world = worldGoals.size || assists.size ? s.world.map((p) => tally(p, worldGoals)) : s.world;
  const round = s.round + 1;
  let next: GameState = { ...s, fixtures, squad, world, round, knownStyles };
  if (next.cups?.length) {
    const cups = playCupStages(rng, next.cups, round, (id, oppId) =>
      id === USER_ID ? userSideFor(next, s.round, clubById(next, oppId)) : clubById(next, id),
    );
    next = { ...next, cups, cupEarnings: cupMoney(cups) };
  }
  const position = (st: GameState) => compTable(st).findIndex((r) => r.clubId === USER_ID) + 1;
  const mineNow = fixtures.find((f) => f.round === s.round && (f.homeId === USER_ID || f.awayId === USER_ID) && sameComp(fixtureComp(f), userComp(s)));
  const oppId = mineNow ? (mineNow.homeId === USER_ID ? mineNow.awayId : mineNow.homeId) : null;
  next = withNews(
    next,
    roundNews(userClub(s), mineNow, oppId ? clubById(s, oppId) : undefined, position(s), position(next), s.cups ?? [], next.cups ?? [], round),
  );
  if (round === midWindowRound(next)) next = openWindow({ ...next, window: 'mid' }, rng);
  else if (round === seasonRounds(next)) next = endSeason(next, rng);
  return next;
}

function openWindow(state: GameState, rng: Rng): GameState {
  let nextId = state.nextId;
  const market = staffMarket(rng, () => `s${nextId++}`);
  let s: GameState = { ...state, phase: 'window', talks: {}, staffMarket: market, nextId };
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
  const staff = staffWages(state.staff);
  const fixedCosts = Math.round(ECONOMY.runningCostBase + state.fans * ECONOMY.runningCostPerFan);
  return { wages, staff, fixedCosts, total: wages + staff + fixedCosts };
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

/** The season's books for a final position: the same sums at season end and in the forecast. */
function settlement(state: GameState, position: number) {
  const costs = seasonCosts(state);
  const income = seasonIncome(
    position,
    state.fans,
    sponsorFor(userClub(state).size ?? ECONOMY.newClubSize),
    compClubs(state),
    tvFor(state, userComp(state)),
    state.cupEarnings ?? 0,
  );
  const bonuses = Math.round(costs.wages * (ECONOMY.topFinishBonus[position - 1] ?? 0));
  const profit = income.total - costs.total - bonuses;
  const stakeholder = stakeholderShare(profit);
  return { costs, income, bonuses, stakeholder, net: profit - stakeholder };
}

/** Matches played before the table, not squad strength, predicts the finish. */
const FORECAST_FROM_TABLE = 5;

/**
 * Where the money is heading: today's balance plus this season's expected income and costs
 * (wages are paid at season end). Early on the finish comes from squad strength, later from
 * the table. "Safe to spend" keeps both today and the season end out of debt.
 */
export function seasonForecast(state: GameState) {
  const table = compTable(state);
  const mine = table.find((r) => r.clubId === USER_ID);
  const position =
    mine && mine.played >= FORECAST_FROM_TABLE ? table.indexOf(mine) + 1 : Math.min(projectedPosition(state), table.length);
  const books = settlement(state, position);
  const end = state.money + books.net;
  return { ...books, position, now: state.money, end, safeToSpend: Math.max(0, Math.min(state.money, end)) };
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
  const cupsWon = (state.cups ?? []).filter((c) => cupProgress(c, USER_ID)?.champion).map((c) => c.name);
  const { costs, income, bonuses, stakeholder, net } = settlement(state, position);
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
    history: [...state.history, { season: state.season, position, division, country: comp.country, cups: cupsWon }],
  };
  for (const p of state.squad) {
    if (p.retiring) {
      retired.push(p.name);
      continue;
    }
    const grown = develop(rng, p, youthBoostChance(state.staff));
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
    staffWages: costs.staff,
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
    points: table[position - 1].points,
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
    history: [...state.history, { season: state.season, position, division, country: comp.country, cups: cupsWon }],
    // Next season's cup places come from this season's final tables.
    cupRankings: Object.fromEntries(topRankings(state, true)),
    clubs: state.clubs.map((c) => ({ ...c, division: moves.get(c.id) })),
  };
  const headlines = [
    {
      round: state.round,
      icon: position === 1 ? '🏆' : '🏁',
      text: position === 1 ? `${userClub(state).name} are champions!` : `${champion.name} win the ${compName(comp)}`,
    },
    ...(movement === 'promoted' ? [{ round: state.round, icon: '⬆️', text: `${userClub(state).name} win promotion` }] : []),
    ...(movement === 'relegated' ? [{ round: state.round, icon: '⬇️', text: `${userClub(state).name} are relegated` }] : []),
    ...(state.cups ?? []).flatMap((cup) => {
      const winner = cup.stages.at(-1)?.ties[0]?.winnerId;
      return winner && winner !== USER_ID
        ? [{ round: state.round, icon: '🌍', text: `${clubById(state, winner).name} win the ${cup.name}` }]
        : [];
    }),
    ...retired.map((name) => ({ round: state.round, icon: '👋', text: `${name} retires` })),
  ];
  // The rest of the world ages too.
  return advanceWorld(withNews(next, headlines), rng);
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
  const next = step(state, action);
  if (!next || !state || next.squad.length <= state.squad.length) return next;
  // Someone joined: put them in any empty place in the XI, and name a captain if there is none.
  const lineup = next.lineup.some((id) => id === null) ? autoPick(next.squad, next.formation, next.lineup) : next.lineup;
  const captainId = next.captainId ?? [...next.squad].sort((a, b) => b.rating - a.rating)[0].id;
  return { ...next, lineup, captainId };
}

function step(state: GameState | null, action: Action): GameState | null {
  if (action.type === 'new') return createGame(action);
  if (action.type === 'load') return withPositions(withCrestShapes(action.state));
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
      const bench = benchFor(state.squad, state.lineup, BENCH_SIZE, state.bench).map((p) => p.id);
      const leaving = state.lineup[action.slot];
      if (action.playerId) {
        const from = lineup.indexOf(action.playerId);
        if (from >= 0) lineup[from] = lineup[action.slot];
      }
      lineup[action.slot] = action.playerId;
      // A substitute coming on leaves his bench place to the starter he replaces.
      const spot = action.playerId ? bench.indexOf(action.playerId) : -1;
      if (spot >= 0 && leaving && !lineup.includes(leaving)) bench[spot] = leaving;
      return { ...state, lineup, bench };
    }
    case 'benchSwap': {
      const bench = benchFor(state.squad, state.lineup, BENCH_SIZE, state.bench).map((p) => p.id);
      const [inB, outB] = bench.includes(action.a) ? [action.a, action.b] : [action.b, action.a];
      const spot = bench.indexOf(inB);
      const valid = spot >= 0 && !bench.includes(outB) && !state.lineup.includes(outB) && state.squad.some((p) => p.id === outB);
      if (!valid) return state;
      bench[spot] = outB;
      return { ...state, bench };
    }
    case 'autoPick':
      return { ...state, lineup: autoPick(state.squad, state.formation) };
    case 'captain':
      return { ...state, captainId: action.playerId };
    case 'hireStaff':
      return hireStaff(state, action.staffId);
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
      return scoutPlayer(state, action.playerId, action.free);
    case 'adBonus':
      return canTakeAdBonus(state)
        ? { ...state, money: state.money + adBonusAmount(state) }
        : state;
    case 'bid':
      return placeBid(state, action.playerId, action.fee, action.years);
    case 'acceptOffer':
      return done(acceptOffer(state, rng, action.offerId));
    case 'rejectOffer':
      return rejectOffer(state, action.offerId);
    case 'list':
      return done(setListed(state, rng, action.playerId, action.listed, action.now));
    case 'quickSale':
      return done(quickSale(state, rng, action.playerId));
    case 'fillAcademy': {
      if (state.phase !== 'window') return state;
      const fill = academyFill(state.squad, rng, state.nextId);
      return done({ ...state, squad: [...state.squad, ...fill.players], nextId: fill.nextId });
    }
    case 'academyCallUp':
      return done(academyCallUp(state, rng));
    case 'startSeason': {
      // A team needs a full matchday squad before it can kick off.
      if (state.phase !== 'window' || !squadNeeds(state.squad).ready) return state;
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
