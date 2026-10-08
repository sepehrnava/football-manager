import { AI_SQUAD, LINE_MIN, LINE_OF, MARKET, RETIRE_AGE, SQUAD_MAX, SQUAD_MIN } from './constants';
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
import type { Rng } from './rng';
import { autoPick, teamStrength } from './team';
import type { Club, GameState, Line, Player, Position, Style } from './types';

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

function makeClubSquad(rng: Rng, clubId: string, level: number, nextId: () => string): Player[] {
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

function makeFreeAgent(rng: Rng, id: string): Player {
  const young = rng.chance(0.3);
  const p = makePlayer(rng, id, {
    position: rng.pick(positionsForLine('ALL')),
    rating: young ? rng.int(50, 62) : rng.int(56, 74),
    age: young ? rng.int(18, 20) : rng.int(28, 34),
    clubId: null,
  });
  // Free agents know they cost no fee, so they ask for more wage.
  return { ...p, greed: 1.15 + rng.next() * 0.35 };
}

/** AI squads plus a pool of free agents. */
export function buildWorld(rng: Rng, clubs: Club[], startId: number) {
  let nextId = startId;
  const id = () => `p${nextId++}`;
  const world: Player[] = [];
  for (const c of clubs) {
    if (c.id !== USER_ID) world.push(...makeClubSquad(rng, c.id, c.level, id));
  }
  for (let i = 0; i < MARKET.freeAgents; i++) world.push(makeFreeAgent(rng, id()));
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

function isKeyPlayer(state: GameState, p: Player) {
  if (!p.clubId) return false;
  const squad = clubPlayers(state, p.clubId);
  return autoPick(squad, '4-4-2').includes(p.id);
}

/** The selling club's public asking price. Free agents cost no fee. */
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

export function renewalDemand(state: GameState, p: Player) {
  return Math.max(p.contract.wage, wageDemand(p, successFactor(state)));
}

// ---------------------------------------------------------------- searching

/** Up to ten players matching a fee budget and position line. */
export function search(state: GameState, rng: Rng, maxFee: number, line: Line | 'ALL'): GameState {
  const freeOnly = maxFee === 0;
  const candidates = state.world.filter((p) => {
    if (line !== 'ALL' && LINE_OF[p.positions[0]] !== line) return false;
    if (freeOnly) return p.clubId === null;
    if (!p.clubId) return false;
    const price = askingPrice(state, p);
    return price <= maxFee && price >= maxFee * 0.15;
  });
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  const ids = candidates.slice(0, MARKET.searchSize).map((p) => p.id);
  return { ...state, search: ids };
}

export function scoutPlayer(state: GameState, playerId: string): GameState {
  const level = state.scouting[playerId] ?? 0;
  if (level >= 2) return state;
  const cost = MARKET.scoutCost[level];
  if (cost > state.money) return state;
  return {
    ...state,
    money: state.money - cost,
    scouting: { ...state.scouting, [playerId]: level + 1 },
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
    search: state.search.filter((id) => id !== p.id),
    scouting: { ...state.scouting, [p.id]: 2 },
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
  if (!p.clubId || fee >= price) return sign(state, p, fee, years);
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

// ---------------------------------------------------------------- selling

/**
 * Why a player can't leave right now, or null if they can. The squad must keep
 * a full matchday squad and enough cover in every line.
 */
export function releaseBlocker(state: GameState, p: Player): string | null {
  if (!canTrade(state)) return 'Players can only leave during a transfer window';
  if (state.squad.length <= SQUAD_MIN) {
    return `You need ${SQUAD_MIN} players: 11 starters and a full bench. Sign someone first.`;
  }
  const line = LINE_OF[p.positions[0]];
  const inLine = state.squad.filter((m) => LINE_OF[m.positions[0]] === line).length;
  if (inLine <= LINE_MIN[line]) {
    const name = { GK: 'goalkeepers', DF: 'defenders', MD: 'midfielders', AT: 'attackers' }[line];
    return `You need at least ${LINE_MIN[line]} ${name}. Sign a replacement first.`;
  }
  return null;
}

function leave(state: GameState, p: Player, clubId: string | null, fee: number): GameState {
  const moved: Player = {
    ...p,
    clubId,
    seasonsAtClub: 0,
    goals: 0,
    contract: { wage: wageDemand(p), years: clubId ? 3 : 0 },
  };
  const next: GameState = {
    ...state,
    money: state.money + fee,
    squad: state.squad.filter((m) => m.id !== p.id),
    world: [...state.world, moved],
    lineup: state.lineup.map((id) => (id === p.id ? null : id)),
    captainId: state.captainId === p.id ? null : state.captainId,
    offers: state.offers.filter((o) => o.playerId !== p.id),
  };
  return clubId ? refreshClubs(next, clubId) : next;
}

export function acceptOffer(state: GameState, offerId: string): GameState {
  const offer = state.offers.find((o) => o.id === offerId);
  const p = offer && state.squad.find((m) => m.id === offer.playerId);
  if (!offer || !p || releaseBlocker(state, p)) return state;
  return leave(state, p, offer.clubId, offer.fee);
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
  return leave(state, p, buyer.id, quickSalePrice(p));
}

/** AI clubs bid for the user's most attractive players when a window opens. */
export function makeOffers(state: GameState, rng: Rng): GameState {
  const appeal = (p: Player) => p.rating + (p.potential - p.rating) * 0.6 + (p.age <= 23 ? 3 : 0);
  const targets = [...state.squad].sort((a, b) => appeal(b) - appeal(a)).slice(0, 6);
  const offers = [];
  let n = state.nextId;
  for (const p of targets) {
    if (offers.length >= 3 || !rng.chance(0.4)) continue;
    const buyers = state.clubs.filter((c) => c.id !== USER_ID && c.level >= p.rating - 6);
    if (!buyers.length) continue;
    const club = rng.pick(buyers);
    const fee = roundMoney(playerValue(p) * contractFactor(p.contract.years) * (0.85 + rng.next() * 0.55));
    offers.push({ id: `o${n++}`, playerId: p.id, clubId: club.id, fee });
  }
  return { ...state, offers, nextId: n };
}

// ---------------------------------------------------------------- contracts

export function renew(state: GameState, playerId: string, years: number): GameState {
  const p = state.squad.find((m) => m.id === playerId);
  if (!p || !canTrade(state) || p.contract.years > 1) return state;
  const wage = renewalDemand(state, p);
  return {
    ...state,
    squad: state.squad.map((m) => (m.id === p.id ? { ...m, contract: { wage, years } } : m)),
  };
}

// ---------------------------------------------------------------- season end

/**
 * Ages, develops and re-contracts every AI and free-agent player, refills AI
 * squads, refreshes the free-agent pool and recomputes club strength.
 */
export function advanceWorld(state: GameState, rng: Rng): GameState {
  let nextId = state.nextId;
  const id = () => `p${nextId++}`;
  const world: Player[] = [];
  for (const p of state.world) {
    if (p.age + 1 >= RETIRE_AGE && rng.chance(0.7)) continue;
    const grown = develop(rng, p);
    const years = p.contract.years - 1;
    if (!p.clubId) {
      world.push(grown);
    } else if (years > 0) {
      world.push({ ...grown, contract: { ...p.contract, years } });
    } else if (rng.chance(0.7)) {
      world.push({ ...grown, contract: { wage: marketWage(grown), years: rng.int(1, 3) } });
    } else {
      world.push({ ...grown, clubId: null, seasonsAtClub: 0 });
    }
  }

  const clubs = state.clubs.map((c) => {
    if (c.id === USER_ID) return c;
    const pull = (70 - c.level) * 0.1;
    const style = rng.chance(0.25) ? rng.pick(STYLE_IDS) : c.style;
    return { ...c, level: clamp(Math.round(c.level + pull + rng.int(-2, 2)), 58, 84), style };
  });

  // Keep every AI squad at its size: sign replacements around the club level,
  // release the weakest extras.
  for (const c of clubs) {
    if (c.id === USER_ID) continue;
    const squad = world.filter((p) => p.clubId === c.id).sort((a, b) => b.rating - a.rating);
    for (const extra of squad.slice(AI_SQUAD + 2)) extra.clubId = null;
    for (let i = squad.length; i < AI_SQUAD; i++) {
      world.push(
        makePlayer(rng, id(), {
          position: TEMPLATE[i % TEMPLATE.length],
          rating: c.level - 3 + rng.int(-5, 3),
          age: rng.int(18, 30),
          clubId: c.id,
        }),
      );
    }
  }

  const free = world.filter((p) => !p.clubId).length;
  for (let i = free; i < MARKET.freeAgents; i++) world.push(makeFreeAgent(rng, id()));

  const changedStyle = new Set(
    clubs.filter((c, i) => c.style !== state.clubs[i].style).map((c) => c.id),
  );
  return refreshClubs({
    ...state,
    clubs,
    world,
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
