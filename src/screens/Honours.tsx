import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ACHIEVEMENTS, trophies } from '../game/achievements';
import { todayKey } from '../game/challenge';
import { currentStreak } from '../game/meta';
import { useGame } from '../state/GameContext';
import { Card, EmptyState, Icon, ListRow, Section, Sheet, Tag, Text, type IconName } from '../ui/components';
import { FadeIn, stagger } from '../ui/motion';
import { DISPLAY } from '../ui/text';
import { colors, radius, seasonLabel, shadow } from '../ui/theme';

/** Achievements store an emoji for sharing; the UI shows an icon. */
const ACHIEVEMENT_ICONS: Record<string, IconName> = {
  first_win: 'soccer',
  signing: 'draw-pen',
  big_sale: 'cash-multiple',
  elite_coach: 'clipboard-text',
  wonderkid: 'star-shooting',
  profit: 'chart-line',
  promoted: 'arrow-up-bold',
  champion: 'trophy',
  cup: 'earth',
  five_seasons: 'calendar-check',
  daily_win: 'target',
  streak_7: 'fire',
};

const TROPHY_ICONS: Record<string, { icon: IconName; color: string }> = {
  '🏆': { icon: 'trophy', color: colors.goldDark },
  '⬆️': { icon: 'arrow-up-bold-circle', color: colors.green },
  '🌍': { icon: 'earth', color: colors.blue },
};

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
          <Section title="Trophy cabinet" />
          <Card style={s.list}>
            {won.length === 0 ? (
              <EmptyState icon="trophy-outline" title="An empty shelf" text="Win a title, promotion or cup to fill it." />
            ) : (
              won.map((t, i) => {
                const look = TROPHY_ICONS[t.icon] ?? { icon: 'trophy' as IconName, color: colors.goldDark };
                return (
                  <ListRow
                    key={`${t.season}-${t.title}`}
                    left={<Icon name={look.icon} size={24} color={look.color} />}
                    title={t.title}
                    right={<Text style={s.season}>{seasonLabel(t.season)}</Text>}
                    last={i === won.length - 1}
                  />
                );
              })
            )}
          </Card>
        </>
      ) : null}

      <Section title={`Achievements · ${earned}/${ACHIEVEMENTS.length}`} />
      <View style={s.grid}>
        {ACHIEVEMENTS.map((a, i) => {
          const got = Boolean(meta.achievements[a.id]);
          return (
            <FadeIn key={a.id} delay={stagger(i, 25, 12)} style={s.cell}>
              <Card tone={got ? 'gold' : 'default'} style={s.badge}>
                <View style={[s.badgeIcon, got ? s.badgeIconGot : s.badgeIconLocked]}>
                  <Icon name={got ? (ACHIEVEMENT_ICONS[a.id] ?? 'star') : 'lock'} size={18} color={got ? colors.ink : colors.muted} />
                </View>
                <Text style={[s.badgeTitle, !got && s.locked]}>{a.title}</Text>
                <Text style={s.badgeText}>{a.text}</Text>
              </Card>
            </FadeIn>
          );
        })}
      </View>

      <Section title="Daily challenge" />
      <Card style={s.stats}>
        <MiniStat value={currentStreak(meta, todayKey())} label="Streak" icon="fire" />
        <MiniStat value={meta.best} label="Best streak" />
        <MiniStat value={`${meta.wins}/${meta.played}`} label="Won" last />
      </Card>
    </Sheet>
  );
}

function MiniStat({ value, label, icon, last }: { value: string | number; label: string; icon?: IconName; last?: boolean }) {
  return (
    <View style={[s.stat, !last && s.statRule]}>
      <View style={s.statLine}>
        {icon ? <Icon name={icon} size={18} color={colors.orange} /> : null}
        <Text style={s.statValue}>{value}</Text>
      </View>
      <Text style={s.statLabel}>{label}</Text>
    </View>
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
      <FadeIn key={a.id} from="up" distance={-24} duration={320}>
        <Pressable onPress={seenAchievement} style={s.toast} accessibilityRole="alert">
          <View style={s.toastIcon}>
            <Icon name={ACHIEVEMENT_ICONS[a.id] ?? 'star'} size={22} color={colors.night} />
          </View>
          <View style={s.toastMain}>
            <Tag label="Achievement unlocked" tone="gold" />
            <Text style={s.toastTitle}>{a.title}</Text>
          </View>
        </Pressable>
      </FadeIn>
    </View>
  );
}

const s = StyleSheet.create({
  list: { padding: 0, overflow: 'hidden' },
  season: { fontSize: 18, fontFamily: DISPLAY, fontWeight: '800', color: colors.muted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell: { width: '48.5%', flexGrow: 1 },
  badge: { gap: 3, padding: 12, flex: 1 },
  badgeIcon: { width: 32, height: 32, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  badgeIconGot: { backgroundColor: colors.gold },
  badgeIconLocked: { backgroundColor: colors.faint },
  badgeTitle: { fontSize: 18, fontFamily: DISPLAY, fontWeight: '800', color: colors.ink },
  locked: { color: colors.muted },
  badgeText: { fontSize: 12, fontWeight: '500', color: colors.muted },
  stats: { flexDirection: 'row', padding: 0 },
  stat: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  statRule: { borderRightWidth: 1, borderRightColor: colors.faint },
  statLine: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  statValue: { fontSize: 28, fontFamily: DISPLAY, fontWeight: '800', color: colors.ink },
  statLabel: { fontSize: 10, fontWeight: '700', color: colors.muted, letterSpacing: 0.6, textTransform: 'uppercase' },
  toastWrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.night,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.gold,
    paddingLeft: 10,
    paddingRight: 18,
    paddingVertical: 10,
    ...shadow.float,
  },
  toastIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastMain: { gap: 3, alignItems: 'flex-start' },
  toastTitle: { fontSize: 20, fontFamily: DISPLAY, fontWeight: '800', color: '#FFFFFF' },
});
