import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MID_WINDOW_ROUND, STYLES, TACTICS } from '../game/constants';
import { clubById, USER_ID, userClub } from '../game/game';
import { matchInsight, percent, userFixture } from '../game/insights';
import { surname } from '../game/players';
import { teamStrength } from '../game/team';
import type { Fixture, Tactic } from '../game/types';
import { useCareer } from '../state/GameContext';
import { Button, Card, ClubCrest, Sheet } from '../ui/components';
import { colors } from '../ui/theme';

/** Result of a played round, or a preview with "play to here" for an upcoming one. */
export function MatchSheet({
  round,
  onClose,
  onPlayTo,
}: {
  round: number | null;
  onClose: () => void;
  onPlayTo: (until: number) => void;
}) {
  const { state } = useCareer();
  if (round === null) return null;
  const fixture = userFixture(state, round);
  if (!fixture) return null;
  const played = !!fixture.result;
  const count = round - state.round + 1;
  // A transfer window in between stops the simulation there.
  const crossesWindow = state.round < MID_WINDOW_ROUND && round >= MID_WINDOW_ROUND && state.phase === 'season';
  const kickoff = state.phase === 'window';

  const footer = played ? undefined : (
    <View style={s.footer}>
      {crossesWindow ? (
        <Text style={s.note}>The simulation stops at the transfer window after matchday {MID_WINDOW_ROUND}.</Text>
      ) : null}
      <Button
        label={
          count === 1
            ? kickoff
              ? 'KICK OFF ▶'
              : 'PLAY THIS MATCH ▶'
            : `${kickoff ? 'KICK OFF & ' : ''}PLAY ${count} MATCHES ⏩`
        }
        variant="green"
        onPress={() => {
          onClose();
          onPlayTo(round + 1);
        }}
      />
    </View>
  );

  return (
    <Sheet visible title={`Matchday ${round + 1}`} onClose={onClose} footer={footer}>
      {played ? <PlayedMatch fixture={fixture} /> : <MatchPreview fixture={fixture} />}
    </Sheet>
  );
}

function PlayedMatch({ fixture }: { fixture: Fixture }) {
  const { state } = useCareer();
  const r = fixture.result!;
  const others = state.fixtures.filter((f) => f.round === fixture.round && f !== fixture);
  return (
    <View style={s.gap}>
      <ScoreCard fixture={fixture} />
      {r.scorers?.length ? <Text style={s.scorers}>⚽ {r.scorers.map(surname).join(', ')}</Text> : null}
      <Card style={s.others}>
        {others.map((f, i) => (
          <View key={i} style={s.result}>
            <Text style={[s.rname, s.right]} numberOfLines={1}>
              {clubById(state, f.homeId).name}
            </Text>
            <Text style={s.rscore}>
              {f.result?.home} – {f.result?.away}
            </Text>
            <Text style={s.rname} numberOfLines={1}>
              {clubById(state, f.awayId).name}
            </Text>
          </View>
        ))}
      </Card>
    </View>
  );
}

export function ScoreCard({ fixture }: { fixture: Fixture }) {
  const r = fixture.result!;
  const us = fixture.homeId === USER_ID ? r.home : r.away;
  const them = fixture.homeId === USER_ID ? r.away : r.home;
  const verdict = us > them ? 'WIN' : us < them ? 'LOSS' : 'DRAW';
  const color = us > them ? colors.green : us < them ? colors.red : colors.draw;
  return (
    <Card style={s.scoreCard}>
      <View style={[s.verdict, { backgroundColor: color }]}>
        <Text style={s.verdictText}>{verdict}</Text>
      </View>
      <View style={s.scoreRow}>
        <Side id={fixture.homeId} />
        <Text style={s.score}>
          {r.home} – {r.away}
        </Text>
        <Side id={fixture.awayId} />
      </View>
    </Card>
  );
}

function Side({ id }: { id: string }) {
  const { state } = useCareer();
  const c = clubById(state, id);
  return (
    <View style={s.team}>
      <ClubCrest club={c} size={52} />
      <Text style={s.teamName} numberOfLines={2}>
        {c.name}
      </Text>
    </View>
  );
}

/** Opponent strength, win/draw/loss odds and a one-tap tactic suggestion. */
export function MatchPreview({ fixture, compact }: { fixture: Fixture; compact?: boolean }) {
  const { state, dispatch } = useCareer();
  const report = matchInsight(state, fixture);
  const opp = clubById(state, report.opponentId);
  const me = userClub(state);
  const base = teamStrength(state.squad, state.lineup, state.formation, report.tactic, state.captainId);
  const mine = { attack: base.attack + report.effect, defense: base.defense + report.effect };
  const style = report.style ? STYLES[report.style] : null;
  const { win, draw, loss } = report.odds;

  return (
    <View style={s.gap}>
      {compact ? null : (
        <Card style={s.vsCard}>
          <View style={s.team}>
            <ClubCrest club={me} size={44} />
            <Text style={s.teamName} numberOfLines={1}>
              {me.name}
            </Text>
          </View>
          <View style={s.vs}>
            <Text style={s.vsText}>VS</Text>
            <Text style={s.muted}>{report.home ? 'Home' : 'Away'}</Text>
          </View>
          <View style={s.team}>
            <ClubCrest club={opp} size={44} />
            <Text style={s.teamName} numberOfLines={1}>
              {opp.name}
            </Text>
          </View>
        </Card>
      )}

      <Card style={s.compare}>
        <CompareRow label="Attack" mine={mine.attack} theirs={opp.attack} />
        <CompareRow label="Defense" mine={mine.defense} theirs={opp.defense} />
        <View style={s.odds}>
          <View style={[s.oddsSeg, { flex: Math.max(win, 0.04), backgroundColor: colors.green }]} />
          <View style={[s.oddsSeg, { flex: Math.max(draw, 0.04), backgroundColor: colors.draw }]} />
          <View style={[s.oddsSeg, { flex: Math.max(loss, 0.04), backgroundColor: colors.red }]} />
        </View>
        <View style={s.oddsLabels}>
          <Text style={[s.oddsText, { color: colors.green }]}>Win {percent(win)}</Text>
          <Text style={[s.oddsText, { color: colors.muted }]}>Draw {percent(draw)}</Text>
          <Text style={[s.oddsText, { color: colors.red }]}>Loss {percent(loss)}</Text>
        </View>
      </Card>

      <View style={s.tip}>
        <Text style={s.tipTitle}>
          {style ? `Style: ${style.label}` : 'Style: unknown'}
        </Text>
        <Text style={s.tipText}>
          {style
            ? `${style.text} ${
                report.effect > 0
                  ? `${TACTICS[report.tactic].label} counters it.`
                  : report.effect < 0
                    ? `${TACTICS[report.tactic].label} plays into their hands.`
                    : `${TACTICS[report.tactic].label} is neutral here.`
              }`
            : 'You learn how a club plays after facing them once.'}
        </Text>
        <Text style={s.planLabel}>
          Tactic for this match
        </Text>
        <View style={s.tactics}>
          {(Object.keys(TACTICS) as Tactic[]).map((t) => (
            <Pressable
              key={t}
              onPress={() => dispatch({ type: 'plan', round: fixture.round, tactic: t })}
              style={[s.tactic, report.tactic === t && s.tacticOn]}
              accessibilityRole="button"
              accessibilityState={{ selected: report.tactic === t }}
            >
              <Text style={[s.tacticText, report.tactic === t && s.tacticTextOn]}>{TACTICS[t].label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

function CompareRow({ label, mine, theirs }: { label: string; mine: number; theirs: number }) {
  const better = mine > theirs;
  const worse = mine < theirs;
  return (
    <View style={s.cmp}>
      <Text style={[s.cmpValue, better && { color: colors.green }]}>{mine}</Text>
      <Text style={s.cmpLabel}>{label}</Text>
      <Text style={[s.cmpValue, s.right, worse && { color: colors.red }]}>{theirs}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  gap: { gap: 12, paddingBottom: 4 },
  footer: { gap: 8, paddingTop: 8 },
  note: { textAlign: 'center', color: colors.muted, fontWeight: '700', fontSize: 13 },
  scoreCard: { alignItems: 'center', gap: 10 },
  verdict: { paddingHorizontal: 14, paddingVertical: 4, borderRadius: 10 },
  verdictText: { color: '#FFFFFF', fontWeight: '900', letterSpacing: 2 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  team: { flex: 1, alignItems: 'center', gap: 6 },
  teamName: { fontSize: 14, fontWeight: '800', color: colors.ink, textAlign: 'center' },
  score: { fontSize: 40, fontWeight: '900', color: colors.ink, paddingHorizontal: 8 },
  scorers: { fontSize: 14, fontWeight: '700', color: colors.muted, textAlign: 'center' },
  others: { paddingVertical: 8 },
  result: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  rname: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.ink },
  right: { textAlign: 'right' },
  rscore: { width: 50, textAlign: 'center', fontWeight: '900', color: colors.ink },
  vsCard: { flexDirection: 'row', alignItems: 'center' },
  vs: { alignItems: 'center', paddingHorizontal: 8 },
  vsText: { fontSize: 22, fontWeight: '900', fontStyle: 'italic', color: colors.ink },
  muted: { color: colors.muted, fontWeight: '700', fontSize: 13 },
  compare: { gap: 8 },
  cmp: { flexDirection: 'row', alignItems: 'center' },
  cmpValue: { width: 44, fontSize: 20, fontWeight: '900', color: colors.ink },
  cmpLabel: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '800', letterSpacing: 1.2, color: colors.muted, textTransform: 'uppercase' },
  odds: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', gap: 2, marginTop: 4 },
  oddsSeg: { height: 12 },
  oddsLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  oddsText: { fontWeight: '900', fontSize: 13 },
  tip: { backgroundColor: '#FFF8E6', borderRadius: 18, borderWidth: 2, borderColor: '#F6DFA6', padding: 14, gap: 6 },
  tipTitle: { fontSize: 15, fontWeight: '900', color: colors.ink },
  tipText: { fontSize: 14, fontWeight: '600', color: colors.muted },
  tactics: { flexDirection: 'row', gap: 6, marginTop: 4 },
  tactic: { flex: 1, paddingVertical: 8, borderRadius: 12, alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: colors.border },
  tacticOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  planLabel: { fontSize: 12, fontWeight: '800', color: colors.muted, marginTop: 4 },
  tacticText: { fontWeight: '800', color: colors.muted, fontSize: 13 },
  tacticTextOn: { color: '#FFFFFF' },
});
