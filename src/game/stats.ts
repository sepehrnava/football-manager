import { clubById, compOf, compTable, USER_ID, userComp } from './game';
import { compKey } from './leagues';
import type { GameState, Player } from './types';

/**
 * Season stats for the user's league: top scorers (all clubs) and team records.
 * Goals are counted for the user's league only, so stats show for that league.
 */
export function leagueStats(state: GameState) {
  const comp = userComp(state);
  const key = compKey(comp);
  const inLeague = new Set(state.clubs.filter((c) => compKey(compOf(c)) === key).map((c) => c.id));
  const everyone = [...state.squad.map((p) => ({ ...p, clubId: USER_ID })), ...state.world].filter(
    (p): p is Player & { clubId: string } => !!p.clubId && inLeague.has(p.clubId),
  );
  const top = (value: (p: Player) => number) =>
    everyone
      .filter((p) => value(p) > 0)
      .sort((a, b) => value(b) - value(a) || b.rating - a.rating)
      .slice(0, 10)
      .map((p) => ({ player: p, club: clubById(state, p.clubId) }));
  const scorers = top((p) => p.goals);
  const assists = top((p) => p.assists ?? 0);
  const contributions = top((p) => p.goals + (p.assists ?? 0));

  const table = compTable(state, comp).filter((r) => r.played > 0);
  const best = <T>(rows: T[], score: (r: T) => number) =>
    rows.length ? rows.reduce((a, b) => (score(b) > score(a) ? b : a)) : null;
  const attack = best(table, (r) => r.gf);
  const defence = best(table, (r) => -r.ga);
  const wins = best(table, (r) => r.won);

  const played = state.fixtures.filter((f) => f.result && inLeague.has(f.homeId) && inLeague.has(f.awayId));
  const biggest = best(played, (f) => Math.abs(f.result!.home - f.result!.away) * 100 + f.result!.home + f.result!.away);
  const goals = played.reduce((sum, f) => sum + f.result!.home + f.result!.away, 0);

  // Clean sheets and form (points from the last five matches) per club.
  const sheets = new Map<string, number>();
  const results = new Map<string, number[]>();
  for (const f of [...played].sort((a, b) => a.round - b.round)) {
    const { home, away } = f.result!;
    if (away === 0) sheets.set(f.homeId, (sheets.get(f.homeId) ?? 0) + 1);
    if (home === 0) sheets.set(f.awayId, (sheets.get(f.awayId) ?? 0) + 1);
    const pts = (us: number, them: number) => (us > them ? 3 : us === them ? 1 : 0);
    results.set(f.homeId, [...(results.get(f.homeId) ?? []), pts(home, away)]);
    results.set(f.awayId, [...(results.get(f.awayId) ?? []), pts(away, home)]);
  }
  const rank = (m: Map<string, number>) =>
    [...m.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, value]) => ({ club: clubById(state, id), value }));
  const form = new Map([...results.entries()].map(([id, r]) => [id, r.slice(-5).reduce((a, b) => a + b, 0)]));
  const lastFive = (id: string) => (results.get(id) ?? []).slice(-5);

  return {
    scorers,
    assists,
    contributions,
    cleanSheets: rank(sheets),
    form: rank(form).map((r) => ({ ...r, last: lastFive(r.club.id) })),
    attack: attack && { club: clubById(state, attack.clubId), value: attack.gf },
    defence: defence && { club: clubById(state, defence.clubId), value: defence.ga },
    wins: wins && { club: clubById(state, wins.clubId), value: wins.won },
    biggest: biggest && {
      home: clubById(state, biggest.homeId),
      away: clubById(state, biggest.awayId),
      score: `${biggest.result!.home}–${biggest.result!.away}`,
    },
    goalsPerGame: played.length ? goals / played.length : 0,
  };
}
