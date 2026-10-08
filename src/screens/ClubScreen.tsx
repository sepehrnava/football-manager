import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { MID_WINDOW_ROUND, ROUNDS } from '../game/constants';
import {
  clubById,
  projectedPosition,
  seasonCosts,
  seasonIncome,
  USER_ID,
  userClub,
} from '../game/game';
import { leagueTable } from '../game/league';
import { userStrength } from '../game/team';
import { useCareer, useGame } from '../state/GameContext';
import { Bar, Button, Card, ClubCrest, Row, SectionTitle } from '../ui/components';
import { colors, formatFans, formatMoney, ordinal, seasonLabel } from '../ui/theme';

export function ClubScreen({
  onPlay,
  onOpenTransfers,
}: {
  onPlay: (mode: 'fast' | 'step') => void;
  onOpenTransfers: () => void;
}) {
  const { state } = useCareer();
  const { resetCareer } = useGame();
  const [confirmReset, setConfirmReset] = useState(false);

  const club = userClub(state);
  const strength = userStrength(state);
  const table = leagueTable(state.clubs, state.fixtures);
  const myRow = table.find((r) => r.clubId === USER_ID)!;
  const livePos = table.indexOf(myRow) + 1;
  const projPos = myRow.played ? livePos : projectedPosition(state);
  const costs = seasonCosts(state);
  const income = seasonIncome(projPos, state.fans);
  const net = income.total - costs.total;
  const next = state.fixtures.find(
    (f) => f.round === state.round && (f.homeId === USER_ID || f.awayId === USER_ID),
  );
  const nextStop = state.round < MID_WINDOW_ROUND ? 'transfer window' : 'end of season';

  return (
    <ScrollView contentContainerStyle={s.content}>
      <View style={s.hero}>
        <ClubCrest club={club} size={64} />
        <View style={s.heroText}>
          <Text style={s.clubName} numberOfLines={1}>
            {club.name}
          </Text>
          <Text style={s.heroMeta}>
            Season {seasonLabel(state.season)} · Matchday {Math.min(state.round + 1, ROUNDS)}/{ROUNDS}
          </Text>
        </View>
      </View>

      {state.phase === 'window' ? (
        <Card style={s.windowCard}>
          <Text style={s.windowTitle}>
            {state.window === 'pre' ? 'Pre-season' : 'Mid-season'} transfer window
          </Text>
          <Text style={s.windowText}>
            Set your XI and make signings. Matches simulate quickly until the next window.
          </Text>
          <View style={s.buttons}>
            <Button label="TRANSFERS" variant="light" small style={s.flex} onPress={onOpenTransfers} />
            <Button label="KICK OFF ▶" variant="green" small style={s.flex} onPress={() => onPlay('fast')} />
          </View>
        </Card>
      ) : (
        <View style={s.buttons}>
          <Button label="NEXT MATCH" variant="light" style={s.flex} onPress={() => onPlay('step')} />
          <Button label={`SIM TO ${nextStop.toUpperCase()} ⏩`} style={s.flex2} onPress={() => onPlay('fast')} />
        </View>
      )}

      {next ? <NextMatch fixtureHome={next.homeId === USER_ID} opponentId={next.homeId === USER_ID ? next.awayId : next.homeId} power={strength.power} /> : null}

      <SectionTitle>STANDING</SectionTitle>
      <Card style={s.standing}>
        <View style={s.bigStat}>
          <Text style={s.bigValue}>{myRow.played ? ordinal(livePos) : '–'}</Text>
          <Text style={s.bigLabel}>POSITION</Text>
        </View>
        <View style={s.bigStat}>
          <Text style={s.bigValue}>{myRow.points}</Text>
          <Text style={s.bigLabel}>POINTS</Text>
        </View>
        <View style={[s.bigStat, s.formStat]}>
          <View style={s.form}>
            {myRow.form.slice(-5).map((r, i) => (
              <View
                key={i}
                style={[
                  s.formDot,
                  { backgroundColor: r === 'W' ? colors.green : r === 'L' ? colors.red : '#9A9A94' },
                ]}
              >
                <Text style={s.formText}>{r}</Text>
              </View>
            ))}
            {myRow.form.length === 0 ? <Text style={s.muted}>No games yet</Text> : null}
          </View>
          <Text style={s.bigLabel}>FORM</Text>
        </View>
      </Card>

      <SectionTitle>TEAM OVERVIEW</SectionTitle>
      <Card>
        <Row label="Money" value={formatMoney(state.money)} bold />
        <Row label="Fans" value={formatFans(state.fans)} />
        <View style={s.divider} />
        <Text style={s.group}>Costs per season</Text>
        <Row label="Fixed costs" value={formatMoney(costs.fixedCosts)} />
        <Row label="Players' yearly cost" value={formatMoney(costs.wages)} />
        <Row label="Stakeholder cashout" value={formatMoney(costs.stakeholder)} />
        <Row label="Total cost" value={formatMoney(costs.total)} bold />
        <View style={s.divider} />
        <Text style={s.group}>
          Income if you finish {ordinal(projPos)} {myRow.played ? '(current)' : '(projected)'}
        </Text>
        <Row label="Prize money" value={formatMoney(income.prize)} />
        <Row label="Fan revenue" value={formatMoney(income.fanIncome)} />
        <Row
          label="Season result"
          value={`${net >= 0 ? '+' : ''}${formatMoney(net)}`}
          color={net >= 0 ? colors.green : colors.red}
          bold
        />
        <Text style={s.note}>
          A top-3 finish also pays player bonuses (5–15% of yearly cost).
        </Text>
      </Card>

      {state.history.length ? (
        <>
          <SectionTitle>HISTORY</SectionTitle>
          <Card>
            {state.history
              .slice()
              .reverse()
              .map((h) => (
                <Row key={h.season} label={seasonLabel(h.season)} value={ordinal(h.position)} />
              ))}
          </Card>
        </>
      ) : null}

      <Button
        label={confirmReset ? 'TAP AGAIN TO DELETE THIS CAREER' : 'START A NEW CAREER'}
        variant={confirmReset ? 'red' : 'light'}
        small
        style={s.reset}
        onPress={() => (confirmReset ? resetCareer() : setConfirmReset(true))}
      />
    </ScrollView>
  );
}

function NextMatch({
  fixtureHome,
  opponentId,
  power,
}: {
  fixtureHome: boolean;
  opponentId: string;
  power: number;
}) {
  const { state } = useCareer();
  const opp = clubById(state, opponentId);
  const me = userClub(state);
  const oppPower = Math.round((opp.attack + opp.defense) / 2);
  return (
    <>
      <SectionTitle>NEXT MATCH</SectionTitle>
      <Card style={s.match}>
        <View style={s.side}>
          <ClubCrest club={me} size={44} />
          <Text style={s.sideName} numberOfLines={1}>
            {me.name}
          </Text>
          <Text style={s.power}>{power}</Text>
        </View>
        <View style={s.vs}>
          <Text style={s.vsText}>VS</Text>
          <Text style={s.muted}>{fixtureHome ? 'Home' : 'Away'}</Text>
        </View>
        <View style={s.side}>
          <ClubCrest club={opp} size={44} />
          <Text style={s.sideName} numberOfLines={1}>
            {opp.name}
          </Text>
          <Text style={s.power}>{oppPower}</Text>
        </View>
      </Card>
      <View style={s.compare}>
        <Bar value={(power / (power + oppPower)) * 100} color={colors.green} />
        <Text style={s.compareText}>
          {power > oppPower + 2 ? 'You are favourites' : power < oppPower - 2 ? 'They are favourites' : 'Even match'}
        </Text>
      </View>
    </>
  );
}

const s = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  heroText: { flex: 1 },
  clubName: { fontSize: 26, fontWeight: '900', color: colors.ink },
  heroMeta: { fontSize: 14, fontWeight: '700', color: colors.muted, marginTop: 2 },
  windowCard: { backgroundColor: colors.greenSoft, borderColor: '#BFE6CC', borderBottomColor: '#9ED6B1', gap: 6 },
  windowTitle: { fontSize: 18, fontWeight: '900', color: colors.ink },
  windowText: { fontSize: 14, fontWeight: '600', color: colors.muted, marginBottom: 6 },
  buttons: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
  flex2: { flex: 1.6 },
  match: { flexDirection: 'row', alignItems: 'center' },
  side: { flex: 1, alignItems: 'center', gap: 6 },
  sideName: { fontSize: 14, fontWeight: '800', color: colors.ink },
  power: { fontSize: 24, fontWeight: '900', color: colors.ink },
  vs: { alignItems: 'center', paddingHorizontal: 8 },
  vsText: { fontSize: 22, fontWeight: '900', fontStyle: 'italic', color: colors.ink },
  compare: { gap: 6, paddingHorizontal: 4 },
  compareText: { textAlign: 'center', fontWeight: '700', color: colors.muted, fontSize: 13 },
  standing: { flexDirection: 'row', alignItems: 'center' },
  bigStat: { flex: 1, alignItems: 'center', gap: 4 },
  formStat: { flex: 1.6 },
  bigValue: { fontSize: 28, fontWeight: '900', color: colors.ink },
  bigLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, color: colors.muted },
  form: { flexDirection: 'row', gap: 4, minHeight: 34, alignItems: 'center' },
  formDot: { width: 24, height: 24, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  formText: { color: '#FFFFFF', fontWeight: '900', fontSize: 12 },
  muted: { color: colors.muted, fontWeight: '700', fontSize: 13 },
  divider: { height: 2, backgroundColor: colors.faint, marginVertical: 8 },
  group: { fontSize: 12, fontWeight: '800', letterSpacing: 1, color: colors.muted, textTransform: 'uppercase' },
  note: { fontSize: 12, color: colors.muted, fontWeight: '600', marginTop: 4 },
  reset: { marginTop: 24 },
});
