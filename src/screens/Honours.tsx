import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ACHIEVEMENTS, trophies } from '../game/achievements';
import { todayKey } from '../game/challenge';
import { currentStreak } from '../game/meta';
import { useGame } from '../state/GameContext';
import { Card, SectionTitle, Sheet } from '../ui/components';
import { FadeIn } from '../ui/motion';
import { colors, seasonLabel } from '../ui/theme';

/** Trophy cabinet for this career, plus achievements and daily stats. */
export function HonoursSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { state, meta } = useGame();
  if (!visible) return null;
  const won = state && !state.challenge ? trophies(state) : [];
  const earned = ACHIEVEMENTS.filter((a) => meta.achievements[a.id]).length;
  return (
    <Sheet visible title="Honours" onClose={onClose}>
      {state && !state.challenge ? (
        <>
          <SectionTitle>TROPHY CABINET</SectionTitle>
          <Card style={s.cabinet}>
            {won.length === 0 ? (
              <Text style={s.empty}>No trophies yet. Win a title, promotion or cup to fill this shelf.</Text>
            ) : (
              won.map((t, i) => (
                <View key={`${t.season}-${t.title}`} style={[s.trophy, i > 0 && s.divider]}>
                  <Text style={s.trophyTitle}>{t.title}</Text>
                  <Text style={s.trophySeason}>{seasonLabel(t.season)}</Text>
                </View>
              ))
            )}
          </Card>
        </>
      ) : null}

      <SectionTitle>{`ACHIEVEMENTS · ${earned}/${ACHIEVEMENTS.length}`}</SectionTitle>
      <View>
        {ACHIEVEMENTS.map((a, i) => {
          const got = Boolean(meta.achievements[a.id]);
          return (
            <View key={a.id} style={[s.badge, i > 0 && s.divider]}>
              <View style={s.badgeMain}>
                <Text style={[s.badgeTitle, !got && s.locked]}>{a.title}</Text>
                <Text style={s.badgeText}>{a.text}</Text>
              </View>
              {got ? <Text style={s.tick}>✓</Text> : null}
            </View>
          );
        })}
      </View>

      <SectionTitle>DAILY CHALLENGE</SectionTitle>
      <View style={s.stats}>
        <MiniStat value={String(currentStreak(meta, todayKey()))} label="STREAK" />
        <MiniStat value={String(meta.best)} label="BEST STREAK" />
        <MiniStat value={`${meta.wins}/${meta.played}`} label="WON" />
      </View>
    </Sheet>
  );
}

function MiniStat({ value, label }: { value: string; label: string }) {
  return (
    <Card style={s.stat}>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </Card>
  );
}

/**
 * Announces a newly earned achievement at the top of the screen. The provider
 * dismisses it after a few seconds, so a copy inside a modal is safe.
 */
export function AchievementToast() {
  const { meta, seenAchievement } = useGame();
  const insets = useSafeAreaInsets();
  const a = ACHIEVEMENTS.find((x) => x.id === meta.fresh[0]);
  if (!a) return null;
  return (
    <View pointerEvents="box-none" style={[s.toastWrap, { top: insets.top + 8 }]}>
      <FadeIn key={a.id} from="scale" duration={300}>
        <Pressable onPress={seenAchievement} style={s.toast} accessibilityRole="alert">
          <View style={s.toastMain}>
            <Text style={s.toastKicker}>ACHIEVEMENT UNLOCKED</Text>
            <Text style={s.toastTitle}>{a.title}</Text>
          </View>
        </Pressable>
      </FadeIn>
    </View>
  );
}

const s = StyleSheet.create({
  cabinet: { paddingVertical: 6 },
  empty: { fontSize: 14, fontWeight: '700', color: colors.muted, paddingVertical: 8 },
  trophy: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  trophyTitle: { flex: 1, fontSize: 15, fontWeight: '900', color: colors.ink },
  trophySeason: { fontSize: 13, fontWeight: '800', color: colors.muted },
  badge: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  badgeMain: { flex: 1, gap: 1 },
  tick: { fontSize: 18, fontWeight: '900', color: colors.green },
  locked: { color: colors.muted },
  badgeTitle: { fontSize: 14, fontWeight: '900', color: colors.ink },
  badgeText: { fontSize: 12, fontWeight: '600', color: colors.muted },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, alignItems: 'center', paddingVertical: 10, gap: 2 },
  statValue: { fontSize: 18, fontWeight: '900', color: colors.ink },
  statLabel: { fontSize: 9, fontWeight: '900', color: colors.muted, letterSpacing: 1 },
  toastWrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.ink,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  toastMain: { gap: 1 },
  toastKicker: { fontSize: 10, fontWeight: '900', color: colors.gold, letterSpacing: 1 },
  toastTitle: { fontSize: 16, fontWeight: '900', color: '#FFFFFF' },
});
