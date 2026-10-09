import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { clubById, compTable, USER_ID, userComp } from '../game/game';
import {
  compKey,
  compName,
  COMPS,
  COUNTRIES,
  divisionsIn,
  flagOf,
  PROMOTION_SPOTS,
  zoneOf,
  type Comp,
} from '../game/leagues';
import type { Fixture } from '../game/types';
import { useCareer } from '../state/GameContext';
import {
  Card,
  ClubCrest,
  EmptyState,
  Icon,
  ListRow,
  Section,
  Segmented,
  Sheet,
  Tag,
  Text,
} from '../ui/components';
import { FadeIn, haptic, stagger } from '../ui/motion';
import { DISPLAY } from '../ui/text';
import { colors, radius, seasonLabel } from '../ui/theme';
import { CupCard } from './CupCard';

type Pane = 'table' | 'matches' | 'cups';

export function LeagueScreen() {
  const { state } = useCareer();
  const myComp = userComp(state);
  const [comp, setComp] = useState<Comp>(myComp);
  const [pane, setPane] = useState<Pane>('table');
  const [picking, setPicking] = useState(false);
  const cups = state.cups ?? [];

  return (
    <ScrollView contentContainerStyle={s.content}>
      <Pressable
        onPress={() => {
          haptic();
          setPicking(true);
        }}
        accessibilityRole="button"
        accessibilityLabel={`Competition ${compName(comp)}`}
        style={({ pressed }) => [s.picker, pressed && { backgroundColor: colors.faint }]}
      >
        <Text style={s.flag}>{flagOf(comp.country)}</Text>
        <View style={s.flex}>
          <Text style={s.pickerTitle} numberOfLines={1}>
            {compName(comp)}
          </Text>
          <Text style={s.pickerSub} numberOfLines={1}>
            {seasonLabel(state.season)} · {rulesOf(comp)}
          </Text>
        </View>
        <Icon name="chevron-down" size={24} color={colors.ink2} />
      </Pressable>

      <Segmented
        value={pane}
        onChange={setPane}
        options={[
          { id: 'table', label: 'Table', icon: 'format-list-numbered' },
          { id: 'matches', label: 'Matches', icon: 'calendar-month' },
          { id: 'cups', label: 'Cups', icon: 'trophy-outline' },
        ]}
      />

      {pane === 'table' ? (
        <FadeIn key={`table-${compKey(comp)}`} from="up" distance={8}>
          <LeagueTable comp={comp} />
        </FadeIn>
      ) : null}
      {pane === 'matches' ? (
        <FadeIn key="matches" from="up" distance={8} style={s.pane}>
          <Matches />
        </FadeIn>
      ) : null}
      {pane === 'cups' ? (
        <FadeIn key="cups" from="up" distance={8} style={s.pane}>
          {cups.length ? (
            cups.map((cup) => <CupCard key={cup.id} cup={cup} />)
          ) : (
            <Card>
              <EmptyState icon="trophy-outline" title="No cups this season" text="Finish near the top of a first division to qualify." />
            </Card>
          )}
        </FadeIn>
      ) : null}

      <Sheet visible={picking} title="Competitions" onClose={() => setPicking(false)}>
        {COUNTRIES.map((country) => (
          <View key={country.id} style={s.country}>
            <Text style={s.countryName}>
              {country.flag} {country.name}
            </Text>
            <Card style={s.list}>
              {COMPS.filter((c) => c.country === country.id).map((c, i, all) => {
                const on = compKey(c) === compKey(comp);
                return (
                  <ListRow
                    key={compKey(c)}
                    left={
                      <View style={[s.div, c.division === 1 && s.divTop]}>
                        <Text style={[s.divText, c.division === 1 && { color: colors.ink }]}>{c.division}</Text>
                      </View>
                    }
                    title={compName(c)}
                    right={
                      <View style={s.pickRight}>
                        {compKey(c) === compKey(myComp) ? <Tag label="You" tone="green" /> : null}
                        {on ? <Icon name="check" size={20} color={colors.green} /> : null}
                      </View>
                    }
                    selected={on}
                    onPress={() => {
                      setComp(c);
                      setPane('table');
                      setPicking(false);
                    }}
                    last={i === all.length - 1}
                  />
                );
              })}
            </Card>
          </View>
        ))}
      </Sheet>
    </ScrollView>
  );
}

function rulesOf(comp: Comp) {
  const deepest = divisionsIn(comp.country);
  if (deepest <= 1) return 'prize money by position';
  return [
    comp.division > 1 ? `top ${PROMOTION_SPOTS} up` : null,
    comp.division < deepest ? `bottom ${PROMOTION_SPOTS} down` : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

function LeagueTable({ comp }: { comp: Comp }) {
  const { state } = useCareer();
  const table = compTable(state, comp);
  return (
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
        const zone = zoneOf(i, table.length, comp);
        return (
          <FadeIn key={r.clubId} delay={stagger(i, 18, 20)} distance={6}>
            <View style={[s.tr, me && s.me, i < table.length - 1 && s.border]}>
              <View
                style={[
                  s.zone,
                  zone === 'up' && { backgroundColor: colors.green },
                  zone === 'down' && { backgroundColor: colors.red },
                ]}
              />
              <Text style={s.pos}>{i + 1}</Text>
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
          </FadeIn>
        );
      })}
    </Card>
  );
}

function Matches() {
  const { state } = useCareer();
  const mine = state.fixtures.filter((f) => f.homeId === USER_ID || f.awayId === USER_ID);
  const scorers = state.squad
    .filter((p) => p.goals > 0)
    .sort((a, b) => b.goals - a.goals)
    .slice(0, 5);
  return (
    <>
      <Card style={s.list}>
        {mine.map((f, i) => (
          <FixtureRow
            key={i}
            fixture={f}
            next={f.round === state.round && state.phase !== 'summary'}
            last={i === mine.length - 1}
          />
        ))}
      </Card>
      {scorers.length ? (
        <>
          <Section title="Top scorers" />
          <Card style={s.list}>
            {scorers.map((p, i) => (
              <ListRow
                key={p.id}
                left={<Text style={s.rank}>{i + 1}</Text>}
                title={`${p.flag} ${p.name}`}
                right={
                  <View style={s.goals}>
                    <Text style={s.goalsValue}>{p.goals}</Text>
                    <Icon name="soccer" size={16} color={colors.muted} />
                  </View>
                }
                last={i === scorers.length - 1}
              />
            ))}
          </Card>
        </>
      ) : null}
    </>
  );
}

function FixtureRow({ fixture, next, last }: { fixture: Fixture; next: boolean; last: boolean }) {
  const { state } = useCareer();
  const home = fixture.homeId === USER_ID;
  const opp = clubById(state, home ? fixture.awayId : fixture.homeId);
  const r = fixture.result;
  let tag: { text: string; bg: string } | null = next ? { text: 'NEXT', bg: colors.ink } : null;
  if (r) {
    const us = home ? r.home : r.away;
    const them = home ? r.away : r.home;
    tag =
      us > them
        ? { text: 'W', bg: colors.green }
        : us < them
          ? { text: 'L', bg: colors.red }
          : { text: 'D', bg: colors.draw };
  }
  return (
    <View style={[s.fixture, !last && s.border, next && s.nextRow]}>
      <Text style={s.md}>{fixture.round + 1}</Text>
      <Text style={s.ha}>{home ? 'H' : 'A'}</Text>
      <ClubCrest club={opp} size={20} />
      <Text style={s.fname} numberOfLines={1}>
        {opp.name}
      </Text>
      <Text style={s.score}>{r ? (home ? `${r.home}–${r.away}` : `${r.away}–${r.home}`) : ''}</Text>
      {tag ? (
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
  flex: { flex: 1 },
  pane: { gap: 12 },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  flag: { fontSize: 26 },
  pickerTitle: { fontSize: 24, fontFamily: DISPLAY, fontWeight: '800', color: colors.ink },
  pickerSub: { fontSize: 12, fontWeight: '600', color: colors.muted, marginTop: -2 },
  country: { gap: 6 },
  countryName: { fontSize: 13, fontWeight: '800', color: colors.ink2 },
  div: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    backgroundColor: colors.faint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divTop: { backgroundColor: colors.gold },
  divText: { fontSize: 18, fontFamily: DISPLAY, fontWeight: '800', color: colors.muted },
  pickRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  table: { paddingHorizontal: 0, paddingVertical: 2, overflow: 'hidden' },
  tr: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingRight: 10 },
  th: { borderBottomWidth: 1, borderBottomColor: colors.border },
  border: { borderBottomWidth: 1, borderBottomColor: colors.faint },
  me: { backgroundColor: colors.goldSoft },
  zone: { width: 3, alignSelf: 'stretch', marginRight: 8, backgroundColor: 'transparent' },
  head: { fontSize: 11, color: colors.muted, fontWeight: '800' },
  pos: { width: 24, fontSize: 16, fontFamily: DISPLAY, fontWeight: '800', color: colors.ink },
  club: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0 },
  name: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.ink },
  bold: { fontWeight: '800' },
  num: { width: 26, textAlign: 'center', fontSize: 13, fontWeight: '600', color: colors.muted },
  pts: { width: 32, textAlign: 'right', fontSize: 18, fontFamily: DISPLAY, fontWeight: '800', color: colors.ink },
  list: { padding: 0, overflow: 'hidden' },
  fixture: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9, paddingHorizontal: 12 },
  nextRow: { backgroundColor: colors.goldSoft },
  md: { width: 22, fontSize: 15, fontFamily: DISPLAY, fontWeight: '800', color: colors.muted },
  ha: { width: 14, fontSize: 12, fontWeight: '800', color: colors.muted },
  fname: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.ink },
  score: { fontSize: 18, fontFamily: DISPLAY, fontWeight: '800', color: colors.ink },
  tag: { minWidth: 24, height: 22, borderRadius: 3, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  tagSpace: { width: 24 },
  tagText: { color: '#FFFFFF', fontFamily: DISPLAY, fontWeight: '800', fontSize: 14 },
  rank: { width: 20, fontSize: 18, fontFamily: DISPLAY, fontWeight: '800', color: colors.muted },
  goals: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  goalsValue: { fontSize: 22, fontFamily: DISPLAY, fontWeight: '800', color: colors.ink },
});
