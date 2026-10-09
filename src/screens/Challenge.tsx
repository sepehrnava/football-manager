import { ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { challengeScore, todayKey } from '../game/challenge';
import { compTable, USER_ID, userClub } from '../game/game';
import { currentStreak } from '../game/meta';
import { useCareer, useGame } from '../state/GameContext';
import { Button, Card, ClubCrest } from '../ui/components';
import { FadeIn } from '../ui/motion';
import { colors, ordinal } from '../ui/theme';

/** The goal, shown at the top of the Club tab during a challenge. */
export function ChallengeBanner() {
  const { state } = useCareer();
  const c = state.challenge;
  if (!c) return null;
  const table = compTable(state);
  const position = table.findIndex((r) => r.clubId === USER_ID) + 1;
  const onTrack = position <= c.target;
  return (
    <Card style={s.banner}>
      <Text style={s.bannerKicker}>TODAY’S CHALLENGE</Text>
      <Text style={s.bannerTitle}>{c.title}</Text>
      <Text style={s.bannerText}>
        {c.text} · now {ordinal(position)}{' '}
        <Text style={{ color: onTrack ? colors.green : colors.red }}>{onTrack ? '(on track)' : '(not yet)'}</Text>
      </Text>
    </Card>
  );
}

export function ChallengeEndScreen() {
  const { state } = useCareer();
  const { meta, leaveChallenge } = useGame();
  const insets = useSafeAreaInsets();
  const c = state.challenge!;
  const result = challengeScore(state);
  if (!result) return null;
  const club = userClub(state);
  const streak = currentStreak(meta, todayKey());

  const share = () => {
    const line = `${result.success ? 'Won' : 'Missed'}: ${club.name}, ${c.title.toLowerCase()} (${ordinal(c.startPosition)} → ${ordinal(result.position)})`;
    Share.share({ message: `Top Squad · Daily ${c.day}\n${line}\n${result.score} pts · streak ${streak}` }).catch(() => {});
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={[s.end, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
    >
      <FadeIn>
        <Text style={s.kicker}>DAILY CHALLENGE · {c.day}</Text>
      </FadeIn>
      <FadeIn delay={300} style={s.center}>
        <Text style={s.headline}>{result.success ? 'Challenge complete!' : 'Not this time'}</Text>
        <View style={s.clubLine}>
          <ClubCrest club={club} size={28} />
          <Text style={s.clubName}>{club.name}</Text>
        </View>
        <Text style={s.sub}>
          {c.title}: {c.text.toLowerCase()}
        </Text>
        <Text style={s.sub}>
          {ordinal(c.startPosition)} at the window → finished {ordinal(result.position)}
        </Text>
      </FadeIn>

      <FadeIn delay={450}>
        <View style={s.stats}>
          <EndStat value={String(result.score)} label="POINTS" />
          <EndStat value={String(streak)} label="STREAK" />
          <EndStat value={`${meta.wins}/${meta.played}`} label="WON" />
        </View>
      </FadeIn>

      <View style={s.actions}>
        <Button label="SHARE RESULT" variant="green" onPress={share} />
        <Button label="DONE" variant="light" onPress={() => leaveChallenge()} />
        <Text style={s.next}>A new challenge arrives tomorrow.</Text>
      </View>
    </ScrollView>
  );
}

function EndStat({ value, label }: { value: string; label: string }) {
  return (
    <Card style={s.stat}>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </Card>
  );
}

const s = StyleSheet.create({
  banner: { gap: 3 },
  bannerKicker: { fontSize: 11, fontWeight: '900', color: colors.orange, letterSpacing: 1 },
  bannerTitle: { fontSize: 20, fontWeight: '900', color: colors.ink },
  bannerText: { fontSize: 14, fontWeight: '800', color: colors.ink },
  end: { paddingHorizontal: 16, gap: 8, maxWidth: 640, width: '100%', alignSelf: 'center' },
  center: { alignItems: 'center', gap: 4 },
  kicker: { textAlign: 'center', fontSize: 13, fontWeight: '800', letterSpacing: 2, color: colors.muted },
  headline: { textAlign: 'center', fontSize: 26, fontWeight: '900', color: colors.ink },
  clubLine: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  clubName: { fontSize: 17, fontWeight: '900', color: colors.ink },
  sub: { textAlign: 'center', fontSize: 15, fontWeight: '700', color: colors.muted },
  stats: { flexDirection: 'row', gap: 10, marginTop: 16 },
  stat: { flex: 1, alignItems: 'center', paddingVertical: 12, gap: 2 },
  statValue: { fontSize: 22, fontWeight: '900', color: colors.ink },
  statLabel: { fontSize: 10, fontWeight: '900', color: colors.muted, letterSpacing: 1 },
  actions: { marginTop: 20, gap: 10 },
  next: { textAlign: 'center', fontSize: 13, fontWeight: '700', color: colors.muted, marginTop: 4 },
});
