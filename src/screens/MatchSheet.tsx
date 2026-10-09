import { StyleSheet, View } from 'react-native';

import { STYLES, TACTICS } from '../game/constants';
import { clubById, midWindowRound, USER_ID, userClub } from '../game/game';
import { matchInsight, userFixture } from '../game/insights';
import { surname } from '../game/players';
import { userTeam } from '../game/team';
import type { Fixture, Tactic } from '../game/types';
import { useCareer } from '../state/GameContext';
import { Button, Card, ClubCrest, Icon, OddsBar, Segmented, Sheet, Text, type IconName } from '../ui/components';
import { DISPLAY } from '../ui/text';
import { colors } from '../ui/theme';

export const TACTIC_ICONS: Record<Tactic, IconName> = {
  defensive: 'shield-half-full',
  balanced: 'scale-balance',
  attacking: 'sword',
};

export const TACTIC_OPTIONS = (Object.keys(TACTICS) as Tactic[]).map((t) => ({
  id: t,
  label: TACTICS[t].label,
  icon: TACTIC_ICONS[t],
}));

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
  const mid = midWindowRound(state);
  const crossesWindow = state.round < mid && round >= mid && state.phase === 'season';
  const kickoff = state.phase === 'window';
  const home = fixture.homeId === USER_ID;

  const footer = played ? undefined : (
    <>
      {crossesWindow ? (
        <Text style={s.note}>The simulation stops at the transfer window after matchday {mid}.</Text>
      ) : null}
      <Button
        label={count === 1 ? (kickoff ? 'Kick off' : 'Play this match') : `Play ${count} matches`}
        icon={count === 1 ? 'play' : 'fast-forward'}
        size="lg"
        onPress={() => {
          onClose();
          onPlayTo(round + 1);
        }}
      />
    </>
  );

  return (
    <Sheet
      visible
      title={`Matchday ${round + 1}`}
      subtitle={played ? 'Full time' : home ? 'Home match' : 'Away match'}
      onClose={onClose}
      footer={footer}
    >
      {played ? <PlayedMatch fixture={fixture} /> : <MatchPreview fixture={fixture} />}
    </Sheet>
  );
}

function PlayedMatch({ fixture }: { fixture: Fixture }) {
  const { state } = useCareer();
  // Only the same league's games: other leagues share round numbers.
  const others = state.fixtures.filter(
    (f) => f.round === fixture.round && f !== fixture && f.country === fixture.country && f.division === fixture.division,
  );
  return (
    <>
      <ScoreCard fixture={fixture} />
      {others.length ? (
        <Card style={s.others}>
          {others.map((f, i) => (
            <View key={i} style={s.result}>
              <Text style={[s.rname, s.right]} numberOfLines={1}>
                {clubById(state, f.homeId).name}
              </Text>
              <Text style={s.rscore}>
                {f.result?.home}–{f.result?.away}
              </Text>
              <Text style={s.rname} numberOfLines={1}>
                {clubById(state, f.awayId).name}
              </Text>
            </View>
          ))}
        </Card>
      ) : null}
    </>
  );
}

function ScoreCard({ fixture }: { fixture: Fixture }) {
  const { state } = useCareer();
  const r = fixture.result!;
  const us = fixture.homeId === USER_ID ? r.home : r.away;
  const them = fixture.homeId === USER_ID ? r.away : r.home;
  const verdict = us > them ? 'WIN' : us < them ? 'LOSS' : 'DRAW';
  const color = us > them ? colors.green : us < them ? colors.red : colors.draw;
  const home = clubById(state, fixture.homeId);
  const away = clubById(state, fixture.awayId);
  return (
    <Card style={s.scoreCard}>
      <View style={[s.verdict, { backgroundColor: color }]}>
        <Text style={s.verdictText}>{verdict}</Text>
      </View>
      <View style={s.scoreRow}>
        <View style={s.team}>
          <ClubCrest club={home} size={52} />
          <Text style={s.teamName} numberOfLines={2}>
            {home.name}
          </Text>
        </View>
        <Text style={s.score}>
          {r.home}–{r.away}
        </Text>
        <View style={s.team}>
          <ClubCrest club={away} size={52} />
          <Text style={s.teamName} numberOfLines={2}>
            {away.name}
          </Text>
        </View>
      </View>
      {r.scorers?.length ? (
        <View style={s.scorers}>
          <Icon name="soccer" size={15} color={colors.muted} />
          <Text style={s.scorersText}>{r.scorers.map(surname).join(', ')}</Text>
        </View>
      ) : null}
    </Card>
  );
}

/** Opponent strength, win/draw/loss odds and a one-tap tactic for this match. */
function MatchPreview({ fixture }: { fixture: Fixture }) {
  const { state, dispatch } = useCareer();
  const report = matchInsight(state, fixture);
  const opp = clubById(state, report.opponentId);
  const me = userClub(state);
  const base = userTeam(state, report.tactic);
  const mine = { attack: base.attack + report.effect, defense: base.defense + report.effect };
  const style = report.style ? STYLES[report.style] : null;
  const verdict =
    report.effect > 0
      ? { text: `${TACTICS[report.tactic].label} counters their style`, color: colors.green, icon: 'check-circle' as IconName }
      : report.effect < 0
        ? { text: `${TACTICS[report.tactic].label} plays into their hands`, color: colors.red, icon: 'alert-circle' as IconName }
        : null;

  return (
    <>
      <Card style={s.vsCard}>
        <View style={s.vsRow}>
          <View style={s.team}>
            <ClubCrest club={me} size={48} />
            <Text style={s.teamName} numberOfLines={1}>
              {me.name}
            </Text>
          </View>
          <Text style={s.vsText}>VS</Text>
          <View style={s.team}>
            <ClubCrest club={opp} size={48} />
            <Text style={s.teamName} numberOfLines={1}>
              {opp.name}
            </Text>
          </View>
        </View>
        <CompareRow label="Attack" mine={mine.attack} theirs={opp.attack} />
        <CompareRow label="Defense" mine={mine.defense} theirs={opp.defense} />
        <OddsBar {...report.odds} />
      </Card>

      <Card style={s.tactic}>
        <Text style={s.tacticTitle}>Tactic for this match</Text>
        <Segmented
          options={TACTIC_OPTIONS}
          value={report.tactic}
          onChange={(t) => dispatch({ type: 'plan', round: fixture.round, tactic: t })}
        />
        <View style={s.styleLine}>
          <Icon name="binoculars" size={18} color={colors.muted} />
          <Text style={s.styleText}>
            {style ? (
              <>
                <Text style={s.styleName}>{opp.short} play {style.label.toLowerCase()}. </Text>
                {style.text}
              </>
            ) : (
              'You learn how a club plays after facing them once.'
            )}
          </Text>
        </View>
        {verdict ? (
          <View style={s.styleLine}>
            <Icon name={verdict.icon} size={18} color={verdict.color} />
            <Text style={[s.styleText, { color: verdict.color, fontWeight: '700' }]}>{verdict.text}</Text>
          </View>
        ) : null}
      </Card>
    </>
  );
}

function CompareRow({ label, mine, theirs }: { label: string; mine: number; theirs: number }) {
  return (
    <View style={s.cmp}>
      <Text style={[s.cmpValue, mine > theirs && { color: colors.green }]}>{mine}</Text>
      <Text style={s.cmpLabel}>{label}</Text>
      <Text style={[s.cmpValue, s.right, theirs > mine && { color: colors.red }]}>{theirs}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  note: { textAlign: 'center', color: colors.muted, fontWeight: '600', fontSize: 13 },
  scoreCard: { alignItems: 'center', gap: 10 },
  verdict: { paddingHorizontal: 12, paddingVertical: 3, borderRadius: 8 },
  verdictText: { color: '#FFFFFF', fontWeight: '800', letterSpacing: 1.5, fontSize: 12 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  team: { flex: 1, alignItems: 'center', gap: 6 },
  teamName: { fontSize: 13, fontWeight: '700', color: colors.ink, textAlign: 'center' },
  score: { fontSize: 52, fontFamily: DISPLAY, fontWeight: '800', color: colors.ink, paddingHorizontal: 6 },
  scorers: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8 },
  scorersText: { fontSize: 13, fontWeight: '600', color: colors.muted, flexShrink: 1, textAlign: 'center' },
  others: { paddingVertical: 8, gap: 2 },
  result: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 3 },
  rname: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.ink },
  right: { textAlign: 'right' },
  rscore: { width: 40, textAlign: 'center', fontSize: 16, fontFamily: DISPLAY, fontWeight: '800', color: colors.ink },
  vsCard: { gap: 10 },
  vsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  vsText: { fontSize: 26, fontFamily: DISPLAY, fontStyle: 'italic', color: colors.muted },
  cmp: { flexDirection: 'row', alignItems: 'center' },
  cmpValue: { width: 48, fontSize: 26, fontFamily: DISPLAY, fontWeight: '800', color: colors.ink },
  cmpLabel: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '700', letterSpacing: 1, color: colors.muted, textTransform: 'uppercase' },
  tactic: { gap: 10 },
  tacticTitle: { fontSize: 15, fontWeight: '800', color: colors.ink },
  styleLine: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  styleText: { flex: 1, fontSize: 14, fontWeight: '500', color: colors.ink2, lineHeight: 20 },
  styleName: { fontWeight: '800', color: colors.ink },
});
