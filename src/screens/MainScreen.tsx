import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { seasonRounds, userClub, userComp } from '../game/game';
import { compName, DISCLAIMER } from '../game/leagues';
import { useCareer, useGame } from '../state/GameContext';
import { Button, ClubCrest, CountBadge, Icon, IconButton, Sheet, Text, type IconName } from '../ui/components';
import { FadeIn, haptic, NATIVE, useCountUp } from '../ui/motion';
import { DISPLAY } from '../ui/text';
import { colors, formatMoney, radius } from '../ui/theme';
import { ChallengeEndScreen } from './Challenge';
import { ClubScreen } from './ClubScreen';
import { HonoursSheet } from './Honours';
import { LeagueScreen } from './LeagueScreen';
import { SeasonEndScreen } from './SeasonEndScreen';
import { SimScreen } from './SimScreen';
import { SquadScreen } from './SquadScreen';
import { TransfersScreen } from './TransfersScreen';

export type Tab = 'club' | 'squad' | 'transfers' | 'league';

const TABS: { id: Tab; icon: IconName; iconOn: IconName; label: string }[] = [
  { id: 'club', icon: 'home-variant-outline', iconOn: 'home-variant', label: 'Home' },
  { id: 'squad', icon: 'tshirt-crew-outline', iconOn: 'tshirt-crew', label: 'Squad' },
  { id: 'transfers', icon: 'swap-horizontal', iconOn: 'swap-horizontal-bold', label: 'Transfers' },
  { id: 'league', icon: 'trophy-outline', iconOn: 'trophy', label: 'League' },
];

export function MainScreen() {
  const { state, dispatch } = useCareer();
  const insets = useSafeAreaInsets();
  // New tabs slide in from the side they sit on in the tab bar.
  const [{ tab, from }, setNav] = useState<{ tab: Tab; from: 'left' | 'right' }>({ tab: 'club', from: 'right' });
  const setTab = (next: Tab) => {
    const order = TABS.map((t) => t.id);
    setNav({ tab: next, from: order.indexOf(next) < order.indexOf(tab) ? 'left' : 'right' });
  };
  const [sim, setSim] = useState<{ until?: number } | null>(null);
  const [settings, setSettings] = useState(false);
  const [honours, setHonours] = useState(false);

  if (!sim && (state.phase === 'summary' || state.phase === 'gameover')) {
    return state.challenge ? <ChallengeEndScreen /> : <SeasonEndScreen />;
  }

  const play = (until?: number) => {
    if (state.phase === 'window') dispatch({ type: 'startSeason' });
    setSim({ until });
  };
  const club = userClub(state);
  const inWindow = state.phase === 'window';
  const status = inWindow
      ? 'Transfer window open'
      : `Matchday ${state.round + 1} of ${seasonRounds(state)}`;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Pressable
          onPress={() => setHonours(true)}
          style={({ pressed }) => [s.identity, pressed && { opacity: 0.7 }]}
          accessibilityRole="button"
          accessibilityLabel="Honours"
        >
          <ClubCrest club={club} size={34} />
          <View style={s.identityText}>
            <Text style={s.clubName} numberOfLines={1}>
              {club.name}
            </Text>
            <View style={s.statusLine}>
              {inWindow ? <View style={s.liveDot} /> : null}
              <Text style={[s.status, inWindow && { color: colors.greenDark }]} numberOfLines={1}>
                {status}
              </Text>
            </View>
          </View>
        </Pressable>
        <Money value={state.money} onPress={() => setTab('transfers')} />
        <IconButton icon="cog-outline" label="Settings" onPress={() => setSettings(true)} size={38} />
      </View>
      {state.challenge ? <ChallengeBar /> : null}

      <FadeIn key={tab} from={from} distance={18} duration={200} style={s.body}>
        {tab === 'club' && <ClubScreen onPlay={play} onTab={setTab} />}
        {tab === 'squad' && <SquadScreen />}
        {tab === 'transfers' && <TransfersScreen />}
        {tab === 'league' && <LeagueScreen />}
      </FadeIn>

      <TabBar
        tab={tab}
        onTab={setTab}
        playLabel={inWindow ? 'Kick off' : 'Play'}
        onPlay={() => play()}
        offers={state.offers.length}
        bottom={Math.max(insets.bottom, 8)}
      />

      {sim ? <SimScreen until={sim.until} onClose={() => setSim(null)} /> : null}
      <SettingsSheet visible={settings} onClose={() => setSettings(false)} />
      <HonoursSheet visible={honours} onClose={() => setHonours(false)} />
    </View>
  );
}

/** Rarely used options, kept out of the way. */
function SettingsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { state, resetCareer, slot, leaveChallenge } = useGame();
  const [confirm, setConfirm] = useState(false);
  if (!visible || !state) return null;
  const close = () => {
    setConfirm(false);
    onClose();
  };
  const club = userClub(state);
  return (
    <Sheet visible title="Settings" subtitle={`${club.name} · ${compName(userComp(state))}`} onClose={close}>
      {slot === 'challenge' ? (
        <>
          <Text style={s.settingsText}>Your challenge is saved. Come back any time today to finish it.</Text>
          <Button label="Back to my career" icon="arrow-left" variant="secondary" onPress={() => leaveChallenge()} />
        </>
      ) : (
        <>
          <Text style={s.settingsText}>
            Starting a new career deletes this one. You can create a new club or take over another.
          </Text>
          <Button
            label={confirm ? 'Tap again to delete this career' : 'Start a new career'}
            icon={confirm ? 'alert-circle' : 'refresh'}
            variant={confirm ? 'danger' : 'secondary'}
            onPress={() => (confirm ? resetCareer() : setConfirm(true))}
          />
        </>
      )}
      {DISCLAIMER ? <Text style={s.disclaimer}>{DISCLAIMER}</Text> : null}
    </Sheet>
  );
}

/** Money in the header; it counts to its new value after a sale, wages or prize money. */
function Money({ value, onPress }: { value: number; onPress: () => void }) {
  const shown = useCountUp(value, 700);
  const debt = value < 0;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.money, pressed && { opacity: 0.6 }]}
      accessibilityRole="button"
      accessibilityLabel={`Money ${formatMoney(value)}`}
    >
      <Text style={s.moneyLabel}>{debt ? 'DEBT' : 'BUDGET'}</Text>
      <Text style={[s.moneyText, debt && { color: colors.red }]}>{formatMoney(shown)}</Text>
    </Pressable>
  );
}

/** While playing today's challenge: what it is, and a way straight back to the career. */
function ChallengeBar() {
  const { state } = useCareer();
  const { leaveChallenge, returnTo } = useGame();
  return (
    <FadeIn from="up" distance={6} style={s.challengeBar}>
      <Icon name="target" size={18} color={colors.gold} />
      <Text style={s.challengeText} numberOfLines={1}>
        <Text style={s.challengeKicker}>DAILY </Text>
        {state.challenge?.text}
      </Text>
      <Pressable
        onPress={() => {
          haptic();
          leaveChallenge();
        }}
        style={({ pressed }) => [s.challengeBack, pressed && { opacity: 0.7 }]}
        accessibilityRole="button"
        accessibilityLabel={returnTo ? `Back to ${returnTo}` : 'Leave challenge'}
      >
        <Icon name="arrow-u-left-top" size={16} color="#FFFFFF" />
        <Text style={s.challengeBackText} numberOfLines={1}>
          {returnTo ?? 'Leave'}
        </Text>
      </Pressable>
    </FadeIn>
  );
}

const SLOTS = ['club', 'squad', 'play', 'transfers', 'league'] as const;
const PLAY_FLEX = 1.5;

/** Bottom bar: four tabs around the play button; a line slides to the open tab. */
function TabBar({
  tab,
  onTab,
  playLabel,
  onPlay,
  offers,
  bottom,
}: {
  tab: Tab;
  onTab: (tab: Tab) => void;
  playLabel: string;
  onPlay: () => void;
  offers: number;
  bottom: number;
}) {
  const [width, setWidth] = useState(0);
  const index = SLOTS.indexOf(tab);
  const [x] = useState(() => new Animated.Value(index));
  useEffect(() => {
    Animated.spring(x, { toValue: index, useNativeDriver: NATIVE, speed: 20, bounciness: 5 }).start();
  }, [x, index]);
  // Tabs are flex 1 and the play slot PLAY_FLEX: work out where each tab's centre is.
  const unit = (width - 8) / (4 + PLAY_FLEX);
  const centre = (i: number) => 4 + unit * (i < 2 ? i + 0.5 : i === 2 ? 2 + PLAY_FLEX / 2 : i - 0.5 + PLAY_FLEX);
  const lineWidth = 28;
  const left = x.interpolate({
    inputRange: [0, 1, 2, 3, 4],
    outputRange: [0, 1, 2, 3, 4].map((i) => centre(i) - lineWidth / 2),
  });
  const render = (id: Tab) => {
    const t = TABS.find((x2) => x2.id === id)!;
    return (
      <TabButton
        key={id}
        {...t}
        badge={id === 'transfers' ? offers : 0}
        active={tab === id}
        onPress={() => onTab(id)}
      />
    );
  };
  return (
    <View style={[s.tabs, { paddingBottom: bottom }]} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {render('club')}
      {render('squad')}
      <View style={s.playSlot}>
        <Pressable
          onPress={() => {
            haptic();
            onPlay();
          }}
          style={({ pressed }) => [s.play, pressed && s.playPressed]}
          accessibilityRole="button"
          accessibilityLabel={playLabel}
        >
          <Icon name="play" size={20} color="#FFFFFF" />
          <Text style={s.playLabel} numberOfLines={1}>
            {playLabel}
          </Text>
        </Pressable>
      </View>
      {render('transfers')}
      {render('league')}
      {width ? (
        <Animated.View pointerEvents="none" style={[s.tabLine, { width: lineWidth, transform: [{ translateX: left }] }]} />
      ) : null}
    </View>
  );
}

function TabButton({
  icon,
  iconOn,
  label,
  active,
  badge = 0,
  onPress,
}: {
  icon: IconName;
  iconOn: IconName;
  label: string;
  active: boolean;
  badge?: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        if (!active) haptic();
        onPress();
      }}
      style={({ pressed }) => [s.tab, pressed && { opacity: 0.6 }]}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
    >
      <View style={s.tabIcon}>
        <Icon name={active ? iconOn : icon} size={24} color={active ? colors.ink : colors.muted} />
        <CountBadge n={badge} style={s.tabBadge} />
      </View>
      <Text style={[s.tabText, active && s.tabTextOn]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 6, paddingBottom: 10 },
  identity: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 },
  identityText: { flex: 1, minWidth: 0 },
  clubName: { fontSize: 17, fontWeight: '800', color: colors.ink },
  statusLine: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 1 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.green },
  status: { fontSize: 12, fontWeight: '600', color: colors.muted, flexShrink: 1 },
  money: { alignItems: 'flex-end', paddingHorizontal: 4 },
  moneyLabel: { fontSize: 10, fontWeight: '700', color: colors.muted, letterSpacing: 0.6 },
  moneyText: { fontSize: 22, fontFamily: DISPLAY, fontWeight: '800', color: colors.ink, marginTop: -3 },
  body: { flex: 1 },
  tabs: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 6,
    paddingHorizontal: 4,
  },
  tabLine: { position: 'absolute', top: -1, left: 0, height: 3, borderRadius: 2, backgroundColor: colors.ink },
  tab: { flex: 1, alignItems: 'center', gap: 1, paddingVertical: 2 },
  tabIcon: { height: 28, justifyContent: 'center' },
  tabBadge: { position: 'absolute', top: -3, right: -12 },
  tabText: { fontSize: 11, fontWeight: '600', color: colors.muted },
  tabTextOn: { color: colors.ink, fontWeight: '800' },
  playSlot: { flex: PLAY_FLEX, alignItems: 'center', paddingHorizontal: 4 },
  play: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    alignSelf: 'stretch',
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.green,
  },
  playPressed: { backgroundColor: colors.greenDark },
  playLabel: { fontSize: 18, fontFamily: DISPLAY, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.6, textTransform: 'uppercase' },
  challengeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingLeft: 12,
    paddingRight: 4,
    paddingVertical: 4,
    borderRadius: radius.md,
    backgroundColor: colors.night,
  },
  challengeText: { flex: 1, fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  challengeKicker: { fontFamily: DISPLAY, fontSize: 14, color: colors.gold, letterSpacing: 0.5 },
  challengeBack: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, height: 32, borderRadius: radius.sm, backgroundColor: colors.night3 },
  challengeBackText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
  settingsText: { fontSize: 15, fontWeight: '500', color: colors.ink2, lineHeight: 21 },
  disclaimer: { fontSize: 11, fontWeight: '500', color: colors.muted, lineHeight: 16, marginTop: 8 },
});
