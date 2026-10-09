import { AI_SQUAD, LINE_MIN, LINE_OF, MARKET, SQUAD_MAX, SQUAD_MIN } from './constants';
import {
  clamp,
  develop,
  makePlayer,
  marketWage,
  playerValue,
  positionsForLine,
  roundMoney,
  wageDemand,
} from './players';
import { DEFAULT_COUNTRY, packPlayersFor, type PackPlayer } from './leagues';
import { scoutCost } from './staff';
import type { Rng } from './rng';
import { autoPick, teamStrength } from './team';
import type { Club, GameState, Line, Offer, Player, Position, Style } from './types';

export const USER_ID = 'user';
export const STYLE_IDS: Style[] = ['attack', 'bus', 'possession'];

// Squad template for generated clubs: 11 starters, then the bench.
const TEMPLATE: Position[] = [
  'GK', 'LB', 'CB', 'CB', 'RB', 'LM', 'CM', 'CM', 'RM', 'ST', 'ST',
  'GK', 'CB', 'LB', 'CDM', 'CAM', 'RW', 'LW', 'ST', 'CM',
];

export function canTrade(state: GameState) {
  return state.phase === 'window';
}

/** Cheap deterministic 0–1 hash, so hidden prices don't need stored state. */
function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10000) / 10000;
}

// ---------------------------------------------------------------- world setup

export function makeClubSquad(rng: Rng, clubId: string, level: number, nextId: () => string): Player[] {
  return TEMPLATE.slice(0, AI_SQUAD).map((position, i) =>
    makePlayer(rng, nextId(), {
      position,
      rating: i < 11 ? level + rng.int(-4, 3) : level - 8 + rng.int(-4, 3),
      age: rng.int(19, 33),
      seasonsAtClub: rng.int(0, 4),
      clubId,
    }),
  );
}

/** A player from the league data file, with generated contract and hidden traits. */
function fromPack(rng: Rng, id: string, pp: PackPlayer, clubId: string): Player {
  const base = makePlayer(rng, id, {
    position: pp.positions[0],
    rating: pp.rating,
    age: pp.age,
    seasonsAtClub: rng.int(0, 4),
    clubId,
  });
  return {
    ...base,
    name: pp.name,
    flag: pp.flag,
    positions: pp.positions,
    potential: pp.potential ?? base.potential,
  };
}

/**
 * A club's squad: its real players from the league data, topped up to `size`
 * with generated players that fill whichever lines are short.
 */
export function clubSquad(
  rng: Rng,
  clubId: string,
  country: string,
  short: string,
  level: number,
  nextId: () => string,
  size = AI_SQUAD,
): Player[] {
  const real = packPlayersFor(country, short).map((pp) => fromPack(rng, nextId(), pp, clubId));
  if (real.length >= size) return real;
  // Fill gaps as squad players when the real XI is already there.
  const fillLevel = real.length >= 11 ? level - 6 : level;
  const target: Record<Line, number> = { GK: 2, DF: 6, MD: 7, AT: 5 };
  const have = (line: Line) => real.filter((p) => LINE_OF[p.positions[0]] === line).length;
  const fillers: Player[] = [];
  const add = (position: Position) =>
    fillers.push(
      makePlayer(rng, nextId(), {
        position,
        rating: fillLevel + rng.int(-4, 3),
        age: rng.int(19, 32),
        seasonsAtClub: rng.int(0, 4),
        clubId,
      }),
    );
  for (const line of Object.keys(target) as Line[]) {
    for (let i = have(line); i < target[line] && real.length + fillers.length < size; i++) {
      add(rng.pick(positionsForLine(line)));
    }
  }
  while (real.length + fillers.length < size) add(rng.pick(positionsForLine('ALL')));
  return [...real, ...fillers];
}

/** A squad for every AI club. Every player in the world belongs to a club. */
export function buildWorld(rng: Rng, clubs: Club[], startId: number) {
  let nextId = startId;
  const id = () => `p${nextId++}`;
  const world: Player[] = [];
  for (const c of clubs) {
    if (c.id !== USER_ID) world.push(...clubSquad(rng, c.id, c.country ?? DEFAULT_COUNTRY, c.short, c.level, id));
  }
  return { world, nextId };
}

export function clubPlayers(state: Pick<GameState, 'world'>, clubId: string) {
  return state.world.filter((p) => p.clubId === clubId);
}

/** An AI club's attack and defense come from its best XI. */
export function withClubStrength(club: Club, players: Player[]): Club {
  if (club.id === USER_ID) return club;
  const lineup = autoPick(players, '4-4-2');
  const s = teamStrength(players, lineup, '4-4-2', 'balanced', null);
  return { ...club, attack: s.attack, defense: s.defense };
}

export function refreshClubs(state: GameState, only?: string): GameState {
  return {
    ...state,
    clubs: state.clubs.map((c) =>
      c.id === USER_ID || (only && c.id !== only) ? c : withClubStrength(c, clubPlayers(state, c.id)),
    ),
  };
}

// ---------------------------------------------------------------- prices

/** Fewer years left on a contract means a cheaper fee. */
export function contractFactor(years: number) {
  return years <= 1 ? 0.6 : years === 2 ? 0.85 : 1;
}

/**
 * Each club's best XI, cached per world snapshot: state updates replace the
 * world array, so a new array means a fresh cache.
 */
const keyPlayerCache = new WeakMap<Player[], Map<string, Set<string>>>();

function isKeyPlayer(state: GameState, p: Player) {
  if (!p.clubId) return false;
  let byClub = keyPlayerCache.get(state.world);
  if (!byClub) {
    byClub = new Map();
    keyPlayerCache.set(state.world, byClub);
  }
  let xi = byClub.get(p.clubId);
  if (!xi) {
    xi = new Set(autoPick(clubPlayers(state, p.clubId), '4-4-2').filter((id): id is string => id !== null));
    byClub.set(p.clubId, xi);
  }
  return xi.has(p.id);
}

/** The selling club's public asking price. */
export function askingPrice(state: GameState, p: Player) {
  if (!p.clubId) return 0;
  const key = isKeyPlayer(state, p) ? 1.25 : 1;
  return roundMoney(playerValue(p) * contractFactor(p.contract.years) * key);
}

/** What the club will actually accept: 90–115% of the asking price, hidden. */
function hiddenPrice(state: GameState, p: Player) {
  return askingPrice(state, p) * (0.9 + 0.25 * hash(`${p.id}:${state.season}:${state.window}`));
}

/** Winning makes players more expensive to keep. */
export function successFactor(state: GameState) {
  const last = state.history[state.history.length - 1]?.position;
  return last === undefined ? 1 : last <= 2 ? 1.25 : last <= 4 ? 1.12 : 1;
}

/** A renewed wage follows the player's current rating, so it falls as they decline. */
export function renewalDemand(state: GameState, p: Player) {
  return wageDemand(p, successFactor(state));
}

// ---------------------------------------------------------------- searching


export function scoutPlayer(state: GameState, playerId: string): GameState {
  const cost = scoutCost(state);
  if ((state.scouting[playerId] ?? 0) >= 1 || cost > state.money) return state;
  return {
    ...state,
    money: state.money - cost,
    scouting: { ...state.scouting, [playerId]: 1 },
  };
}

// ---------------------------------------------------------------- buying

function sign(state: GameState, p: Player, fee: number, years: number): GameState {
  const signed: Player = {
    ...p,
    clubId: USER_ID,
    seasonsAtClub: 0,
    goals: 0,
    contract: { wage: wageDemand(p), years },
  };
  const next: GameState = {
    ...state,
    money: state.money - fee,
    squad: [...state.squad, signed],
    world: state.world.filter((w) => w.id !== p.id),
    watch: (state.watch ?? []).filter((id) => id !== p.id),
    scouting: { ...state.scouting, [p.id]: 1 },
    talks: { ...state.talks, [p.id]: { attempts: 0, counter: null, last: 'accepted' } },
  };
  return p.clubId ? refreshClubs(next, p.clubId) : next;
}

/**
 * The user offers a fee and contract length. The club accepts at its hidden
 * price, counters if close, rejects if not, and walks away if insulted or
 * after too many attempts.
 */
export function placeBid(state: GameState, playerId: string, fee: number, years: number): GameState {
  const p = state.world.find((w) => w.id === playerId);
  if (!p || !canTrade(state) || state.squad.length >= SQUAD_MAX || fee > state.money) return state;
  const talk = state.talks[p.id] ?? { attempts: 0, counter: null, last: null };
  if (talk.last === 'broken') return state;
  const price = hiddenPrice(state, p);
  if (!p.clubId) return state;
  if (fee >= price) return sign(state, p, fee, years);
  const attempts = talk.attempts + 1;
  const last =
    fee < price * MARKET.insultBelow || attempts >= MARKET.maxAttempts
      ? 'broken'
      : fee >= price * MARKET.counterAbove
        ? 'countered'
        : 'rejected';
  const counter = last === 'countered' ? Math.ceil(price / 50_000) * 50_000 : talk.counter;
  return { ...state, talks: { ...state.talks, [p.id]: { attempts, counter, last } } };
}

// ---------------------------------------------------------------- academy

/**
 * Academy youngsters for the user's club: first for any line below its
 * minimum, then up to a full matchday squad, and at least `atLeast`.
 */
export function academyFill(squad: Player[], rng: Rng, startId: number, atLeast = 0) {
  let nextId = startId;
  const needed: Position[] = [];
  for (const line of Object.keys(LINE_MIN) as Line[]) {
    const have = squad.filter((p) => LINE_OF[p.positions[0]] === line).length;
    for (let i = have; i < LINE_MIN[line]; i++) needed.push(rng.pick(positionsForLine(line)));
  }
  const count = Math.min(Math.max(atLeast, needed.length, SQUAD_MIN - squad.length), SQUAD_MAX - squad.length);
  const players: Player[] = [];
  for (let i = 0; i < count; i++) {
    const youth = makePlayer(rng, `p${nextId++}`, {
      position: needed[i] ?? rng.pick(positionsForLine('ALL')),
      rating: rng.int(48, 60),
      age: rng.int(16, 18),
      clubId: USER_ID,
    });
    youth.potential = clamp(youth.rating + rng.int(8, 28), youth.rating, 92);
    // Academy players sign cheap first contracts.
    youth.contract = { wage: 50_000, years: 3 };
    youth.seasonsAtClub = 1;
    players.push(youth);
  }
  return { players, nextId };
}

// ---------------------------------------------------------------- selling

/**
 * Why a player can't leave right now, or null if they can. Selling is always
 * allowed in a window: academy youngsters fill any gap it leaves.
 */
export function releaseBlocker(state: GameState, _p: Player): string | null {
  return canTrade(state) ? null : 'Players can only leave during a transfer window';
}

/** Will selling this player call up an academy youngster to fill the gap? */
export function needsCover(state: GameState, p: Player) {
  const line = LINE_OF[p.positions[0]];
  const inLine = state.squad.filter((m) => LINE_OF[m.positions[0]] === line).length;
  return state.squad.length <= SQUAD_MIN || inLine <= LINE_MIN[line];
}

function leave(state: GameState, rng: Rng, p: Player, clubId: string | null, fee: number): GameState {
  const moved: Player = {
    ...p,
    listed: false,
    clubId,
    seasonsAtClub: 0,
    goals: 0,
    contract: { wage: wageDemand(p), years: clubId ? 3 : 0 },
  };
  const remaining = state.squad.filter((m) => m.id !== p.id);
  const cover = academyFill(remaining, rng, state.nextId);
  const next: GameState = {
    ...state,
    money: state.money + fee,
    squad: [...remaining, ...cover.players],
    nextId: cover.nextId,
    world: [...state.world, moved],
    lineup: state.lineup.map((id) => (id === p.id ? null : id)),
    captainId: state.captainId === p.id ? null : state.captainId,
    offers: state.offers.filter((o) => o.playerId !== p.id),
  };
  return clubId ? refreshClubs(next, clubId) : next;
}

/** Club bids arrive when a window opens and can be accepted until it closes. */
export function acceptOffer(state: GameState, rng: Rng, offerId: string): GameState {
  const offer = state.offers.find((o) => o.id === offerId);
  const p = offer && state.squad.find((m) => m.id === offer.playerId);
  if (!offer || !p || !canTrade(state)) return state;
  return leave(state, rng, p, offer.clubId, offer.fee);
}

export function rejectOffer(state: GameState, offerId: string): GameState {
  return { ...state, offers: state.offers.filter((o) => o.id !== offerId) };
}

export function quickSalePrice(p: Player) {
  return roundMoney(playerValue(p) * contractFactor(p.contract.years) * MARKET.quickSale);
}

/** Sell right now to whoever pays: fast, but well below value. */
export function quickSale(state: GameState, rng: Rng, playerId: string): GameState {
  const p = state.squad.find((m) => m.id === playerId);
  if (!p || releaseBlocker(state, p)) return state;
  const buyer = rng.pick(state.clubs.filter((c) => c.id !== USER_ID));
  return leave(state, rng, p, buyer.id, quickSalePrice(p));
}

/** 1–2 fair bids (85–110% of value) for a listed player: certainty, not a premium. */
function listedOffers(state: GameState, rng: Rng, p: Player, startId: number) {
  let n = startId;
  const clubs = state.clubs.filter((c) => c.id !== USER_ID);
  const keen = clubs.filter((c) => c.level >= p.rating - 8);
  const pool = keen.length ? keen : clubs;
  const offers: Offer[] = [];
  for (let i = 0; i < rng.int(1, 2); i++) {
    const club = rng.pick(pool);
    if (offers.some((o) => o.clubId === club.id)) continue;
    const fee = roundMoney(playerValue(p) * contractFactor(p.contract.years) * (0.85 + rng.next() * 0.25));
    offers.push({ id: `o${n++}`, playerId: p.id, clubId: club.id, fee });
  }
  return { offers, nextId: n };
}

/** Put a player on (or take them off) the transfer list. Listing in a window brings bids at once. */
export function setListed(state: GameState, rng: Rng, playerId: string, listed: boolean): GameState {
  const p = state.squad.find((m) => m.id === playerId);
  if (!p) return state;
  const squad = state.squad.map((m) => (m.id === playerId ? { ...m, listed } : m));
  const next = { ...state, squad };
  if (!listed || !canTrade(state) || state.offers.some((o) => o.playerId === playerId)) return next;
  const extra = listedOffers(next, rng, p, state.nextId);
  return { ...next, offers: [...state.offers, ...extra.offers], nextId: extra.nextId };
}

/**
 * When a window opens: listed players get fair bids for sure, and AI clubs may
 * also bid (sometimes generously) for the user's most attractive players.
 */
export function makeOffers(state: GameState, rng: Rng): GameState {
  const appeal = (p: Player) => p.rating + (p.potential - p.rating) * 0.6 + (p.age <= 23 ? 3 : 0);
  const targets = [...state.squad]
    .filter((p) => !p.listed)
    .sort((a, b) => appeal(b) - appeal(a))
    .slice(0, 6);
  const offers: Offer[] = [];
  let n = state.nextId;
  for (const p of state.squad.filter((m) => m.listed)) {
    const extra = listedOffers(state, rng, p, n);
    offers.push(...extra.offers);
    n = extra.nextId;
  }
  for (const p of targets) {
    if (offers.filter((o) => !state.squad.find((m) => m.id === o.playerId)?.listed).length >= 3 || !rng.chance(0.4)) continue;
    const buyers = state.clubs.filter((c) => c.id !== USER_ID && c.level >= p.rating - 6);
    if (!buyers.length) continue;
    const club = rng.pick(buyers);
    const fee = roundMoney(playerValue(p) * contractFactor(p.contract.years) * (0.85 + rng.next() * 0.55));
    offers.push({ id: `o${n++}`, playerId: p.id, clubId: club.id, fee });
  }
  return { ...state, offers, nextId: n };
}

// ---------------------------------------------------------------- season end

/**
 * Ages, develops and re-contracts every AI player, refills AI squads and
 * recomputes club strength. Players without a club (from older saves) leave.
 */
export function advanceWorld(state: GameState, rng: Rng): GameState {
  let nextId = state.nextId;
  const id = () => `p${nextId++}`;
  const world: Player[] = [];
  for (const p of state.world) {
    if (p.retiring || !p.clubId) continue;
    const years = p.contract.years - 1;
    // When a contract ends, most players renew; the rest leave the league
    // (they never become free agents). This turnover keeps clubs stable.
    if (years <= 0 && !rng.chance(0.7)) continue;
    const grown = develop(rng, p);
    world.push({
      ...grown,
      contract: years > 0 ? { ...p.contract, years } : { wage: marketWage(grown), years: rng.int(1, 3) },
    });
  }

  // Each AI club drifts a little toward its competition's average strength.
  const compOfClub = (c: Club) => `${c.country ?? DEFAULT_COUNTRY}:${c.division ?? 1}`;
  const avgLevel = (key: string) => {
    const inComp = state.clubs.filter((c) => c.id !== USER_ID && compOfClub(c) === key);
    return inComp.reduce((sum, c) => sum + c.level, 0) / Math.max(1, inComp.length);
  };
  const clubs = state.clubs.map((c) => {
    if (c.id === USER_ID) return c;
    const pull = (avgLevel(compOfClub(c)) - c.level) * 0.1;
    const style = rng.chance(0.25) ? rng.pick(STYLE_IDS) : c.style;
    return { ...c, level: clamp(Math.round(c.level + pull + rng.int(-2, 2)), 55, 92), style };
  });

  // Keep every AI squad at its size: sign replacements around the club level;
  // the weakest extras leave the league.
  const leaving = new Set<string>();
  for (const c of clubs) {
    if (c.id === USER_ID) continue;
    const squad = world.filter((p) => p.clubId === c.id).sort((a, b) => b.rating - a.rating);
    for (const extra of squad.slice(AI_SQUAD + 2)) leaving.add(extra.id);
    for (let i = squad.length; i < AI_SQUAD; i++) {
      world.push(
        makePlayer(rng, id(), {
          position: TEMPLATE[i % TEMPLATE.length],
          rating: c.level - 1 + rng.int(-4, 3),
          age: rng.int(18, 30),
          clubId: c.id,
        }),
      );
    }
  }


  const changedStyle = new Set(
    clubs.filter((c, i) => c.style !== state.clubs[i].style).map((c) => c.id),
  );
  return refreshClubs({
    ...state,
    clubs,
    world: world.filter((p) => !leaving.has(p.id)),
    nextId,
    knownStyles: state.knownStyles.filter((cid) => !changedStyle.has(cid)),
  });
}

/** Mid-window top-up so AI clubs that sold players can still field a team. */
export function topUpClubs(state: GameState, rng: Rng): GameState {
  let nextId = state.nextId;
  const world = [...state.world];
  for (const c of state.clubs) {
    if (c.id === USER_ID) continue;
    const count = world.filter((p) => p.clubId === c.id).length;
    for (let i = count; i < AI_SQUAD - 2; i++) {
      world.push(
        makePlayer(rng, `p${nextId++}`, {
          position: TEMPLATE[i % TEMPLATE.length],
          rating: c.level - 3 + rng.int(-5, 3),
          age: rng.int(19, 30),
          clubId: c.id,
        }),
      );
    }
  }
  return refreshClubs({ ...state, world, nextId });
}
