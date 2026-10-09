import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { challengeScore, createChallenge, todayKey } from '../game/challenge';
import { compTable, USER_ID, userClub } from '../game/game';
import { currentStreak } from '../game/meta';
import type { GameState } from '../game/types';
import { useCareer, useGame } from '../state/GameContext';
import { Bar, Button, Card, ClubCrest, Icon, Row, Sheet, Tag, Text } from '../ui/components';
import { FadeIn, haptic, Pop } from '../ui/motion';
import { DISPLAY } from '../ui/text';
import { colors, ordinal, radius } from '../ui/theme';

/** Entry to today's Daily Challenge, with the streak. Opens a preview first. */
export function DailyCard() {
  const { meta } = useGame();
  const [open, setOpen] = useState(false);
  const today = todayKey();
  const done = meta.results[today];
  const streak = currentStreak(meta, today);
  return (
    <>
      <Pressable
        onPress={() => {
          haptic();
          setOpen(true);
        }}
        accessibilityRole="button"
        accessibilityLabel="Daily challenge"
        style={({ pressed }) => [s.daily, pressed && { opacity: 0.85 }]}
      >
        <View style={s.dailyIcon}>
          <Icon name="target" size={24} color={colors.gold} />
        </View>
        <View style={s.dailyMain}>
          <Text style={s.dailyTitle}>Daily challenge</Text>
          <Text style={s.dailyText} numberOfLines={1}>
            {done
              ? `${done.success ? 'Completed' : 'Missed'} · ${done.score} pts · new one tomorrow`
              : 'New club, new goal, half a season'}
          </Text>
        </View>
        <View style={s.streak}>
          <View style={s.streakLine}>
            <Icon name="fire" size={18} color={streak ? colors.orange : colors.nightMuted} />
            <Text style={s.streakValue}>{streak}</Text>
          </View>
          <Text style={s.streakLabel}>STREAK</Text>
        </View>
      </Pressable>
      {open ? <ChallengePreview onClose={() => setOpen(false)} /> : null}
    </>
  );
}

/** Today's club and goal, before anything changes. The career stays saved. */
function ChallengePreview({ onClose }: { onClose: () => void }) {
  const { meta, openChallenge, state: current, slot } = useGame();
  const today = todayKey();
  const done = meta.results[today];
  const [game, setGame] = useState<GameState | null>(null);
  const [busy, setBusy] = useState(false);
  // Building the challenge plays half a season; let the sheet open first.
  useEffect(() => {
    const t = setTimeout(() => setGame(createChallenge(today)), 60);
    return () => clearTimeout(t);
  }, [today]);
  const c = game?.challenge;
  const club = game ? userClub(game) : null;
  const career = slot === 'career' && current ? userClub(current).name : null;
  return (
    <Sheet visible title="Daily challenge" subtitle={today} onClose={onClose}>
      {!game || !c || !club ? (
        <View style={s.loading}>
          <ActivityIndicator color={colors.ink} />
          <Text style={s.loadingText}>Preparing today’s club…</Text>
        </View>
      ) : (
        <FadeIn>
          <Card style={s.preview}>
            <View style={s.previewHead}>
              <ClubCrest club={club} size={48} />
              <View style={s.flex}>
                <Text style={s.previewClub} numberOfLines={1}>
                  {club.name}
                </Text>
                <Text style={s.previewLeague} numberOfLines={1}>
                  {c.league} · {ordinal(c.startPosition)} at mid-season
                </Text>
              </View>
            </View>
            <View style={s.goal}>
              <Tag label="Goal" tone="gold" />
              <Text style={s.goalTitle}>{c.title}</Text>
              <Text style={s.goalText}>{c.text}</Text>
            </View>
            <Row icon="swap-horizontal" label="One transfer window" value="now" />
            <Row icon="calendar-range" label="Matches left" value="second half" />
            <Row icon="refresh" label="Tries" value="one per day" />
          </Card>
        </FadeIn>
      )}
      <Text style={s.note}>
        {career ? `${career} stays saved. Switch back any time from the bar at the top.` : 'Leave any time from the bar at the top.'}
      </Text>
      <Button
        label={busy ? 'Opening…' : done ? 'See today’s result' : 'Play today’s challenge'}
        icon={done ? 'flag-checkered' : 'play'}
        size="lg"
        disabled={!game || busy}
        onPress={() => {
          setBusy(true);
          openChallenge(game ?? undefined).finally(onClose);
        }}
      />
    </Sheet>
  );
}

/** The goal and how it is going, at the top of Home during a challenge. */
export function ChallengeBanner() {
  const { state } = useCareer();
  const c = state.challenge;
  if (!c) return null;
  const table = compTable(state);
  const position = table.findIndex((r) => r.clubId === USER_ID) + 1;
  const onTrack = position <= c.target;
  return (
    <Card style={s.banner}>
      <View style={s.bannerTop}>
        <Tag label="Today’s challenge" tone="gold" />
        <Tag label={onTrack ? 'On track' : 'Not yet'} tone={onTrack ? 'green' : 'red'} />
      </View>
      <Text style={s.bannerTitle}>{c.title}</Text>
      <View style={s.bannerLine}>
        <Text style={s.bannerText}>{c.text}</Text>
        <Text style={s.bannerNow}>
          now <Text style={{ color: onTrack ? colors.greenDark : colors.red }}>{ordinal(position)}</Text>
        </Text>
      </View>
      <Bar
        value={(100 * (table.length - position + 1)) / table.length}
        color={onTrack ? colors.green : colors.orange}
        height={5}
      />
    </Card>
  );
}

export function ChallengeEndScreen() {
  const { state } = useCareer();
  const { meta, leaveChallenge, returnTo } = useGame();
  const insets = useSafeAreaInsets();
  const c = state.challenge!;
  const result = challengeScore(state);
  if (!result) return null;
  const club = userClub(state);
  const streak = currentStreak(meta, todayKey());

  const share = () => {
    const line = `${result.success ? 'Done' : 'Missed'}: ${club.name}, ${c.title.toLowerCase()} (${ordinal(c.startPosition)} → ${ordinal(result.position)})`;
    Share.share({ message: `Pocket Manager · Daily ${c.day}\n${line}\n${result.score} pts · streak ${streak}` }).catch(() => {});
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.night }}
      contentContainerStyle={[s.end, { paddingTop: insets.top + 28, paddingBottom: insets.bottom + 24 }]}
    >
      <FadeIn>
        <Text style={s.kicker}>DAILY CHALLENGE · {c.day}</Text>
      </FadeIn>
      <FadeIn from="scale" delay={120} duration={420} style={s.center}>
        <View style={[s.badge, { backgroundColor: result.success ? colors.green : colors.red }]}>
          <Icon name={result.success ? 'check-bold' : 'close-thick'} size={44} color="#FFFFFF" />
        </View>
      </FadeIn>
      <FadeIn delay={260} style={s.center}>
        <Text style={s.headline}>{result.success ? 'Challenge complete' : 'Not this time'}</Text>
        <View style={s.clubLine}>
          <ClubCrest club={club} size={28} />
          <Text style={s.clubName}>{club.name}</Text>
        </View>
        <Text style={s.sub}>
          {c.title} · {ordinal(c.startPosition)} → {ordinal(result.position)}
        </Text>
      </FadeIn>

      <FadeIn delay={420}>
        <View style={s.stats}>
          <EndStat value={result.score} label="POINTS" />
          <EndStat value={streak} label="STREAK" icon="fire" />
          <EndStat value={`${meta.wins}/${meta.played}`} label="WON" />
        </View>
      </FadeIn>

      <FadeIn delay={520} style={s.actions}>
        <Button label="Share result" icon="share-variant" size="lg" onPress={share} />
        <Button
          label={returnTo ? `Back to ${returnTo}` : 'Done'}
          icon="arrow-u-left-top"
          variant="secondary"
          onPress={() => leaveChallenge()}
        />
        <Text style={s.next}>A new challenge arrives tomorrow.</Text>
      </FadeIn>
    </ScrollView>
  );
}

function EndStat({ value, label, icon }: { value: string | number; label: string; icon?: 'fire' }) {
  return (
    <View style={s.stat}>
      <Pop trigger={value} style={s.statLine}>
        {icon ? <Icon name={icon} size={22} color={colors.orange} /> : null}
        <Text style={s.statValue}>{value}</Text>
      </Pop>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  daily: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.night,
    borderRadius: radius.lg,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  dailyIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.nightLine,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dailyMain: { flex: 1, gap: 1 },
  dailyTitle: { fontSize: 20, fontFamily: DISPLAY, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.3, textTransform: 'uppercase' },
  dailyText: { fontSize: 13, fontWeight: '600', color: colors.nightMuted },
  streak: { alignItems: 'center' },
  streakLine: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  streakValue: { fontSize: 24, fontFamily: DISPLAY, fontWeight: '800', color: '#FFFFFF' },
  streakLabel: { fontSize: 9, fontWeight: '800', color: colors.nightMuted, letterSpacing: 1 },
  loading: { alignItems: 'center', gap: 10, paddingVertical: 36 },
  loadingText: { fontSize: 14, fontWeight: '600', color: colors.muted },
  preview: { gap: 4 },
  previewHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 },
  previewClub: { fontSize: 24, fontFamily: DISPLAY, fontWeight: '800', color: colors.ink },
  previewLeague: { fontSize: 13, fontWeight: '600', color: colors.muted },
  goal: {
    gap: 2,
    padding: 12,
    marginBottom: 4,
    borderRadius: radius.md,
    backgroundColor: colors.goldSoft,
    alignItems: 'flex-start',
  },
  goalTitle: { fontSize: 22, fontFamily: DISPLAY, fontWeight: '800', color: colors.ink, marginTop: 4 },
  goalText: { fontSize: 14, fontWeight: '700', color: colors.goldInk },
  note: { fontSize: 13, fontWeight: '500', color: colors.muted, textAlign: 'center' },
  banner: { gap: 6, borderLeftWidth: 4, borderLeftColor: colors.gold },
  bannerTop: { flexDirection: 'row', justifyContent: 'space-between' },
  bannerTitle: { fontSize: 24, fontFamily: DISPLAY, fontWeight: '800', color: colors.ink },
  bannerLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: -4 },
  bannerText: { fontSize: 14, fontWeight: '700', color: colors.ink2 },
  bannerNow: { fontSize: 14, fontWeight: '700', color: colors.muted },
  end: { paddingHorizontal: 16, gap: 10, maxWidth: 640, width: '100%', alignSelf: 'center' },
  center: { alignItems: 'center', gap: 6 },
  kicker: { textAlign: 'center', fontSize: 15, fontFamily: DISPLAY, fontWeight: '800', letterSpacing: 1.5, color: colors.nightMuted },
  badge: { width: 84, height: 84, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center', marginVertical: 10 },
  headline: { textAlign: 'center', fontSize: 40, fontFamily: DISPLAY, fontWeight: '800', color: '#FFFFFF', textTransform: 'uppercase' },
  clubLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  clubName: { fontSize: 17, fontWeight: '800', color: '#FFFFFF' },
  sub: { textAlign: 'center', fontSize: 15, fontWeight: '600', color: colors.nightMuted },
  stats: {
    flexDirection: 'row',
    marginTop: 18,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.nightLine,
    paddingVertical: 14,
  },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statLine: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  statValue: { fontSize: 36, fontFamily: DISPLAY, fontWeight: '800', color: '#FFFFFF' },
  statLabel: { fontSize: 10, fontWeight: '800', color: colors.nightMuted, letterSpacing: 1 },
  actions: { marginTop: 22, gap: 10 },
  next: { textAlign: 'center', fontSize: 13, fontWeight: '600', color: colors.nightMuted, marginTop: 4 },
});
