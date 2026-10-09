import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { clubById, compTable, USER_ID, userComp } from '../game/game';
import { compKey, compName, COMPS, divisionsIn, flagOf, PROMOTION_SPOTS, zoneOf, type Comp } from '../game/leagues';
import { leagueStats } from '../game/stats';
import type { Club, Fixture } from '../game/types';
import { useCareer } from '../state/GameContext';
import { Card, ClubCrest, Pill, SectionTitle } from '../ui/components';
import { CupCard } from './CupCard';
import { colors, seasonLabel } from '../ui/theme';

export function LeagueScreen() {
  const { state } = useCareer();
  const myComp = userComp(state);
  const [comp, setComp] = useState<Comp>(myComp);
  const table = compTable(state, comp);
  const isMine = compKey(comp) === compKey(myComp);
  const deepest = divisionsIn(comp.country);
  const mine = state.fixtures.filter((f) => f.homeId === USER_ID || f.awayId === USER_ID);

  return (
    <ScrollView contentContainerStyle={s.content}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.divisions}>
        {COMPS.map((c) => (
          <Pill
            key={compKey(c)}
            label={`${flagOf(c.country)} ${divisionsIn(c.country) > 1 ? `Div ${c.division}` : ''}`.trim()}
            active={compKey(c) === compKey(comp)}
            onPress={() => setComp(c)}
          />
        ))}
      </ScrollView>
      <Text style={s.title}>
        {flagOf(comp.country)} {compName(comp)}
      </Text>
      <Text style={s.subtitle}>
        Season {seasonLabel(state.season)} ·{' '}
        {deepest > 1
          ? [
              comp.division > 1 ? `top ${PROMOTION_SPOTS} promoted` : null,
              comp.division < deepest ? `bottom ${PROMOTION_SPOTS} relegated` : null,
            ]
              .filter(Boolean)
              .join(' · ')
          : 'prize money is paid by final position'}
      </Text>

      <Card style={s.table}>
        <View style={[s.tr, s.th]}>
          <Text style={[s.pos, s.head]}>#</Text>
          <Text style={[s.club, s.head]}>CLUB</Text>
          {['P', 'W', 'D', 'L', 'GD'].map((h) => (
            <Text key={h} style={[s.num, s.head]}>
              {h}
            </Text>
          ))}
          <Text style={[s.pts, s.head]}>PTS</Text>
        </View>
        {table.map((r, i) => {
          const c = clubById(state, r.clubId);
          const me = r.clubId === USER_ID;
          return (
            <View key={r.clubId} style={[s.tr, me && s.me, i < table.length - 1 && !me && s.border]}>
              <View
                style={[
                  s.zone,
                  zoneOf(i, table.length, comp) === 'up' && { backgroundColor: colors.green },
                  zoneOf(i, table.length, comp) === 'down' && { backgroundColor: colors.red },
                ]}
              />
              <Text style={[s.pos, i === 0 && { color: colors.gold }]}>{i + 1}</Text>
              <View style={s.club}>
                <ClubCrest club={c} size={20} />
                <Text style={[s.name, me && s.bold]} numberOfLines={1}>
                  {c.name}
                </Text>
              </View>
              <Text style={s.num}>{r.played}</Text>
              <Text style={s.num}>{r.won}</Text>
              <Text style={s.num}>{r.drawn}</Text>
              <Text style={s.num}>{r.lost}</Text>
              <Text style={s.num}>{r.gf - r.ga}</Text>
              <Text style={s.pts}>{r.points}</Text>
            </View>
          );
        })}
      </Card>

      {isMine ? <LeagueStats /> : null}

      {isMine ? (
        <>
          <SectionTitle>YOUR MATCHES</SectionTitle>
          <Card style={s.list}>
            {mine.map((f, i) => (
              <FixtureRow key={i} fixture={f} next={f.round === state.round && state.phase !== 'summary'} />
            ))}
          </Card>
        </>
      ) : null}

      {state.cups?.length ? (
        <>
          <SectionTitle>EUROPEAN CUPS</SectionTitle>
          {state.cups.map((cup) => (
            <CupCard key={cup.id} cup={cup} />
          ))}
        </>
      ) : null}

    </ScrollView>
  );
}

/** Top scorers across the league and the season's team records. */
function LeagueStats() {
  const { state } = useCareer();
  const st = leagueStats(state);
  if (!st.scorers.length && !st.attack) {
    return (
      <>
        <SectionTitle>LEAGUE STATS</SectionTitle>
        <Text style={s.statsEmpty}>Stats appear once the season starts.</Text>
      </>
    );
  }
  return (
    <>
      <SectionTitle>LEAGUE STATS</SectionTitle>
      <View style={s.records}>
        {st.attack ? <Record label="BEST ATTACK" club={st.attack.club} value={`${st.attack.value} goals`} /> : null}
        {st.defence ? (
          <Record label="BEST DEFENCE" club={st.defence.club} value={`${st.defence.value} conceded`} />
        ) : null}
        {st.wins ? <Record label="MOST WINS" club={st.wins.club} value={`${st.wins.value} wins`} /> : null}
      </View>
      {st.biggest ? (
        <Card style={s.biggest}>
          <Text style={s.recordLabel}>BIGGEST WIN</Text>
          <View style={s.biggestRow}>
            <ClubCrest club={st.biggest.home} size={22} />
            <Text style={s.biggestName} numberOfLines={1}>
              {st.biggest.home.name}
            </Text>
            <Text style={s.biggestScore}>{st.biggest.score}</Text>
            <Text style={[s.biggestName, s.right]} numberOfLines={1}>
              {st.biggest.away.name}
            </Text>
            <ClubCrest club={st.biggest.away} size={22} />
          </View>
          <Text style={s.statsEmpty}>{st.goalsPerGame.toFixed(1)} goals per game this season</Text>
        </Card>
      ) : null}
      {st.scorers.length ? (
        <>
          <SectionTitle>TOP SCORERS</SectionTitle>
          <Card style={s.list}>
            {st.scorers.map(({ player, club }, i) => {
              const ours = club.id === USER_ID;
              return (
                <View key={player.id} style={[s.fixture, ours && s.ours]}>
                  <Text style={s.rank}>{i + 1}</Text>
                  <ClubCrest club={club} size={20} />
                  <View style={s.flexText}>
                    <Text style={[s.fname, ours && s.bold]} numberOfLines={1}>
                      {player.flag} {player.name}
                    </Text>
                    <Text style={s.scorerClub} numberOfLines={1}>
                      {club.name}
                    </Text>
                  </View>
                  <Text style={s.goals}>{player.goals}</Text>
                </View>
              );
            })}
          </Card>
        </>
      ) : null}
    </>
  );
}

function Record({ label, club, value }: { label: string; club: Club; value: string }) {
  return (
    <Card style={s.record}>
      <Text style={s.recordLabel}>{label}</Text>
      <ClubCrest club={club} size={30} />
      <Text style={s.recordClub} numberOfLines={1}>
        {club.short}
      </Text>
      <Text style={s.recordValue}>{value}</Text>
    </Card>
  );
}

function FixtureRow({ fixture, next }: { fixture: Fixture; next: boolean }) {
  const { state } = useCareer();
  const home = fixture.homeId === USER_ID;
  const opp = clubById(state, home ? fixture.awayId : fixture.homeId);
  const r = fixture.result;
  let tag = { text: next ? 'NEXT' : '', bg: next ? colors.ink : 'transparent' };
  if (r) {
    const us = home ? r.home : r.away;
    const them = home ? r.away : r.home;
    tag =
      us > them
        ? { text: 'W', bg: colors.green }
        : us < them
          ? { text: 'L', bg: colors.red }
          : { text: 'D', bg: '#9A9A94' };
  }
  return (
    <View style={[s.fixture, next && s.nextRow]}>
      <Text style={s.md}>MD{fixture.round + 1}</Text>
      <Text style={s.ha}>{home ? 'H' : 'A'}</Text>
      <ClubCrest club={opp} size={20} />
      <Text style={s.fname} numberOfLines={1}>
        {opp.name}
      </Text>
      <Text style={s.score}>{r ? (home ? `${r.home}–${r.away}` : `${r.away}–${r.home}`) : ''}</Text>
      {tag.text ? (
        <View style={[s.tag, { backgroundColor: tag.bg }]}>
          <Text style={s.tagText}>{tag.text}</Text>
        </View>
      ) : (
        <View style={s.tagSpace} />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  title: { fontSize: 26, fontWeight: '900', color: colors.ink },
  divisions: { flexDirection: 'row', gap: 8, paddingRight: 8 },
  zone: { width: 4, alignSelf: 'stretch', borderRadius: 2, marginRight: 6, backgroundColor: 'transparent' },
  subtitle: { color: colors.muted, fontWeight: '600', marginTop: -6 },
  table: { paddingHorizontal: 8, paddingVertical: 6 },
  tr: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, paddingHorizontal: 4 },
  th: { borderBottomWidth: 2, borderBottomColor: colors.faint },
  border: { borderBottomWidth: 1.5, borderBottomColor: colors.faint },
  me: { borderWidth: 2.5, borderColor: colors.ink, borderRadius: 12, backgroundColor: colors.faint },
  head: { fontSize: 11, color: colors.muted, fontWeight: '800' },
  pos: { width: 24, fontWeight: '900', color: colors.ink, fontSize: 15 },
  club: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0 },
  name: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.ink },
  bold: { fontWeight: '900' },
  num: { width: 26, textAlign: 'center', fontSize: 13, fontWeight: '700', color: colors.muted },
  pts: { width: 34, textAlign: 'right', fontSize: 15, fontWeight: '900', color: colors.ink },
  list: { paddingVertical: 4, paddingHorizontal: 12 },
  fixture: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  nextRow: { backgroundColor: colors.faint, borderRadius: 10, marginHorizontal: -6, paddingHorizontal: 6 },
  md: { width: 40, fontSize: 12, fontWeight: '800', color: colors.muted },
  ha: { width: 14, fontSize: 12, fontWeight: '900', color: colors.muted },
  fname: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.ink },
  score: { fontSize: 15, fontWeight: '900', color: colors.ink },
  tag: { minWidth: 26, height: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  tagSpace: { width: 26 },
  tagText: { color: '#FFFFFF', fontWeight: '900', fontSize: 11 },
  goals: { fontWeight: '900', color: colors.ink, fontSize: 18, minWidth: 24, textAlign: 'right' },
  rank: { width: 20, fontSize: 14, fontWeight: '900', color: colors.muted },
  flexText: { flex: 1, minWidth: 0 },
  scorerClub: { fontSize: 12, fontWeight: '600', color: colors.muted },
  ours: { backgroundColor: '#FFF8E6', borderRadius: 10, marginHorizontal: -6, paddingHorizontal: 6 },
  statsEmpty: { fontSize: 13, fontWeight: '600', color: colors.muted },
  records: { flexDirection: 'row', gap: 8 },
  record: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 12, paddingHorizontal: 6 },
  recordLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1, color: colors.muted },
  recordClub: { fontSize: 15, fontWeight: '900', color: colors.ink },
  recordValue: { fontSize: 12, fontWeight: '700', color: colors.muted },
  biggest: { gap: 8 },
  biggestRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  biggestName: { flex: 1, fontSize: 14, fontWeight: '800', color: colors.ink },
  right: { textAlign: 'right' },
  biggestScore: { fontSize: 20, fontWeight: '900', color: colors.ink },
});
