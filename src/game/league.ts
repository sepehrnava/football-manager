import { FORMATIONS, SCORING_WEIGHT } from './constants';
import { poisson, type Rng } from './rng';
import { starters } from './team';
import type { Club, Fixture, FormationId, Player } from './types';

/** Double round robin (circle method); second half mirrors the first. */
export function makeFixtures(rng: Rng, clubIds: string[]): Fixture[] {
  const ids = [...clubIds];
  for (let i = ids.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  const n = ids.length;
  const half: Fixture[] = [];
  for (let round = 0; round < n - 1; round++) {
    for (let i = 0; i < n / 2; i++) {
      const a = ids[i];
      const b = ids[n - 1 - i];
      const flip = (round + i) % 2 === 0;
      half.push({ round, homeId: flip ? a : b, awayId: flip ? b : a });
    }
    ids.splice(1, 0, ids.pop()!);
  }
  const second = half.map((f) => ({ round: f.round + n - 1, homeId: f.awayId, awayId: f.homeId }));
  return [...half, ...second];
}

export function expectedGoals(attack: number, defense: number, home: boolean) {
  const lambda = 1.3 * Math.exp((attack - defense) / 20) * (home ? 1.12 : 0.92);
  return Math.max(0.15, Math.min(4.5, lambda));
}

export interface Side {
  attack: number;
  defense: number;
}

export function playMatch(rng: Rng, home: Side, away: Side) {
  return {
    home: poisson(rng, expectedGoals(home.attack, away.defense, true)),
    away: poisson(rng, expectedGoals(away.attack, home.defense, false)),
  };
}

/** Pick scorers from the XI, weighted by position. */
export function pickScorers(
  rng: Rng,
  squad: Player[],
  lineup: (string | null)[],
  formationId: FormationId,
  goals: number,
): Player[] {
  const slots = FORMATIONS[formationId].slots;
  const xi = starters(squad, lineup);
  const pool: { p: Player; w: number }[] = [];
  xi.forEach((p, i) => {
    if (p) pool.push({ p, w: SCORING_WEIGHT[slots[i].pos] });
  });
  const total = pool.reduce((s, x) => s + x.w, 0);
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

export interface TableRow {
  clubId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  points: number;
  form: ('W' | 'D' | 'L')[];
}

export function leagueTable(clubs: Club[], fixtures: Fixture[]): TableRow[] {
  const rows = new Map<string, TableRow>(
    clubs.map((c) => [
      c.id,
      { clubId: c.id, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0, form: [] },
    ]),
  );
  for (const f of fixtures) {
    // Skip unplayed games, and games of clubs that have since changed division.
    const h = rows.get(f.homeId);
    const a = rows.get(f.awayId);
    if (!f.result || !h || !a) continue;
    const { home, away } = f.result;
    h.played++;
    a.played++;
    h.gf += home;
    h.ga += away;
    a.gf += away;
    a.ga += home;
    if (home > away) {
      h.won++;
      a.lost++;
      h.points += 3;
      h.form.push('W');
      a.form.push('L');
    } else if (home < away) {
      a.won++;
      h.lost++;
      a.points += 3;
      h.form.push('L');
      a.form.push('W');
    } else {
      h.drawn++;
      a.drawn++;
      h.points++;
      a.points++;
      h.form.push('D');
      a.form.push('D');
    }
  }
  const name = new Map(clubs.map((c) => [c.id, c.name]));
  return [...rows.values()].sort(
    (x, y) =>
      y.points - x.points ||
      y.gf - y.ga - (x.gf - x.ga) ||
      y.gf - x.gf ||
      name.get(x.clubId)!.localeCompare(name.get(y.clubId)!),
  );
}
