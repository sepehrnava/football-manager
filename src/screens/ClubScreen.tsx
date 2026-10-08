import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { MID_WINDOW_ROUND, ROUNDS } from '../game/constants';
import { seasonProjection, USER_ID, userClub } from '../game/game';
import { userFixture } from '../game/insights';
import { leagueTable } from '../game/league';
import { useCareer, useGame } from '../state/GameContext';
import { Button, Card, ClubCrest, Row, SectionTitle } from '../ui/components';
import { FadeIn } from '../ui/motion';
import { colors, formatFans, formatMoney, ordinal, seasonLabel } from '../ui/theme';
import { MatchPreview, MatchSheet } from './MatchSheet';
import { Roadmap } from './Roadmap';

/** Home: the season roadmap, what's next, and the club's finances. */
export function ClubScreen({
  onPlay,
  onOpenTransfers,
  onOpenLeague,
}: {
  /** Play until `state.round` reaches `until`; without it, play to the next stop. */
  onPlay: (until?: number) => void;
  onOpenTransfers: () => void;
  onOpenLeague: () => void;
}) {
  const { state } = useCareer();
  const { resetCareer } = useGame();
  const [confirmReset, setConfirmReset] = useState(false);
  const [sheetRound, setSheetRound] = useState<number | null>(null);

  const club = userClub(state);
  const table = leagueTable(state.clubs, state.fixtures);
  const myRow = table.find((r) => r.clubId === USER_ID)!;
  const livePos = table.indexOf(myRow) + 1;
  const proj = seasonProjection(state);
  const { costs, income, net } = proj;
  const projPos = proj.position;
  const expiring = state.squad.filter((p) => p.contract.years === 1).length;
  const desk = [
    state.offers.length
      ? { icon: '📨', text: `${state.offers.length} offer${state.offers.length > 1 ? 's' : ''} for your players`, tone: 'ok' }
      : null,
    expiring
      ? {
          icon: '✍️',
          text: `${expiring} contract${expiring > 1 ? 's' : ''} end this season`,
          tone: state.phase === 'window' ? 'warn' : 'ok',
        }
      : null,
    proj.risk !== 'ok'
      ? {
          icon: '⚠️',
          text:
            proj.risk === 'danger'
              ? `Board: on course for ${formatMoney(proj.moneyAfter)}. You will be sacked.`
              : `Board: heading for ${formatMoney(proj.moneyAfter)} at season end`,
          tone: 'bad',
        }
      : null,
  ].filter((d): d is { icon: string; text: string; tone: string } => d !== null);
  const next = userFixture(state, state.round);
  const stopName = state.round < MID_WINDOW_ROUND ? 'WINDOW' : 'END';

  return (
    <ScrollView contentContainerStyle={s.content}>
      <FadeIn style={s.hero}>
        <ClubCrest club={club} size={56} />
        <View style={s.heroText}>
          <Text style={s.clubName} numberOfLines={1}>
            {club.name}
          </Text>
          <Text style={s.heroMeta}>Season {seasonLabel(state.season)}</Text>
        </View>
        <View style={s.posBadge}>
          <Text style={s.posValue}>{myRow.played ? ordinal(livePos) : '–'}</Text>
          <Text style={s.posLabel}>{myRow.points} PTS</Text>
        </View>
      </FadeIn>

      <FadeIn delay={60}>
        <Card style={s.roadCard}>
          <View style={s.roadHead}>
            <Text style={s.roadTitle}>Season roadmap</Text>
            <Text style={s.roadMeta}>
              {Math.min(state.round, ROUNDS)}/{ROUNDS} played
            </Text>
          </View>
          <Roadmap onRound={setSheetRound} onWindow={onOpenTransfers} onFinish={onOpenLeague} />
          <Text style={s.roadHint}>Tap any match to see it, or to play up to it.</Text>
        </Card>
      </FadeIn>

      <FadeIn delay={120}>
        {state.phase === 'window' ? (
          <Card style={s.windowCard}>
            <Text style={s.windowTitle}>
              {state.window === 'pre' ? 'Pre-season' : 'Mid-season'} transfer window
            </Text>
            <Text style={s.windowText}>
              Buy, sell and set your XI. Kick-off closes the window; matches then run until the
              next stop, pausing for key games.
            </Text>
            <View style={s.buttons}>
              <Button label="TRANSFERS" variant="light" small style={s.flex} onPress={onOpenTransfers} />
              <Button label="KICK OFF ▶" variant="green" small style={s.flex} onPress={() => onPlay()} />
            </View>
          </Card>
        ) : (
          <View style={s.buttons}>
            <Button label="NEXT MATCH" variant="light" style={s.flex} onPress={() => onPlay(state.round + 1)} />
            <Button label={`PLAY TO ${stopName}`} style={s.flex2} onPress={() => onPlay()} />
          </View>
        )}
      </FadeIn>

      {desk.length ? (
        <FadeIn delay={150}>
          <Card style={s.desk}>
            {desk.map((d) => (
              <Text
                key={d.text}
                onPress={onOpenTransfers}
                style={[s.deskItem, d.tone === 'bad' && { color: colors.red }, d.tone === 'warn' && { color: colors.orange }]}
              >
                {d.icon} {d.text} ›
              </Text>
            ))}
          </Card>
        </FadeIn>
      ) : null}

      {next ? (
        <FadeIn delay={180}>
          <SectionTitle>{`NEXT · MATCHDAY ${next.round + 1}`}</SectionTitle>
          <MatchPreview fixture={next} />
        </FadeIn>
      ) : null}

      <FadeIn delay={240}>
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
          <Text style={s.note}>A top-3 finish also pays player bonuses (5–15% of yearly cost).</Text>
        </Card>
      </FadeIn>

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

      <MatchSheet round={sheetRound} onClose={() => setSheetRound(null)} onPlayTo={onPlay} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroText: { flex: 1 },
  clubName: { fontSize: 24, fontWeight: '900', color: colors.ink },
  heroMeta: { fontSize: 14, fontWeight: '700', color: colors.muted, marginTop: 2 },
  posBadge: {
    alignItems: 'center',
    backgroundColor: colors.ink,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  posValue: { color: '#FFFFFF', fontSize: 20, fontWeight: '900' },
  posLabel: { color: '#BDBDB6', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  roadCard: { paddingHorizontal: 0, paddingBottom: 12, gap: 10 },
  roadHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 16 },
  roadTitle: { fontSize: 18, fontWeight: '900', color: colors.ink },
  roadMeta: { fontSize: 13, fontWeight: '800', color: colors.muted },
  roadHint: { fontSize: 12, fontWeight: '700', color: colors.muted, textAlign: 'center' },
  windowCard: { backgroundColor: colors.greenSoft, borderColor: '#BFE6CC', borderBottomColor: '#9ED6B1', gap: 6 },
  windowTitle: { fontSize: 18, fontWeight: '900', color: colors.ink },
  windowText: { fontSize: 14, fontWeight: '600', color: colors.muted, marginBottom: 6 },
  buttons: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
  flex2: { flex: 1.3 },
  desk: { gap: 10, paddingVertical: 12 },
  deskItem: { fontSize: 15, fontWeight: '800', color: colors.ink },
  divider: { height: 2, backgroundColor: colors.faint, marginVertical: 8 },
  group: { fontSize: 12, fontWeight: '800', letterSpacing: 1, color: colors.muted, textTransform: 'uppercase' },
  note: { fontSize: 12, color: colors.muted, fontWeight: '600', marginTop: 4 },
  reset: { marginTop: 24 },
});
