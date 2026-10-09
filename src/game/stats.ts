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
  const scorers = [...state.squad.map((p) => ({ ...p, clubId: USER_ID })), ...state.world]
    .filter((p): p is Player & { clubId: string } => p.goals > 0 && !!p.clubId && inLeague.has(p.clubId))
    .sort((a, b) => b.goals - a.goals || b.rating - a.rating)
    .slice(0, 10)
    .map((p) => ({ player: p, club: clubById(state, p.clubId) }));

  const table = compTable(state, comp).filter((r) => r.played > 0);
  const best = <T>(rows: T[], score: (r: T) => number) =>
    rows.length ? rows.reduce((a, b) => (score(b) > score(a) ? b : a)) : null;
  const attack = best(table, (r) => r.gf);
  const defence = best(table, (r) => -r.ga);
  const wins = best(table, (r) => r.won);

  const played = state.fixtures.filter((f) => f.result && inLeague.has(f.homeId) && inLeague.has(f.awayId));
  const biggest = best(played, (f) => Math.abs(f.result!.home - f.result!.away) * 100 + f.result!.home + f.result!.away);
  const goals = played.reduce((sum, f) => sum + f.result!.home + f.result!.away, 0);

  return {
    scorers,
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
