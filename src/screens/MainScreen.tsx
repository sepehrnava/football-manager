import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { seasonRounds, userClub, userComp } from '../game/game';
import { compName, DISCLAIMER } from '../game/leagues';
import { useCareer, useGame } from '../state/GameContext';
import { Button, ClubCrest, CountBadge, Icon, IconButton, Sheet, Text, type IconName } from '../ui/components';
import { FadeIn, haptic } from '../ui/motion';
import { DISPLAY } from '../ui/text';
import { colors, formatMoney, shadow } from '../ui/theme';
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
  const status = state.challenge
    ? `Daily challenge · ${state.challenge.title}`
    : inWindow
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
        <Pressable
          onPress={() => setTab('transfers')}
          style={[s.money, state.money < 0 && s.moneyDebt]}
          accessibilityRole="button"
          accessibilityLabel={`Money ${formatMoney(state.money)}`}
        >
          <Icon name="cash" size={17} color={state.money < 0 ? colors.red : colors.green} />
          <Text style={[s.moneyText, state.money < 0 && { color: colors.red }]}>{formatMoney(state.money)}</Text>
        </Pressable>
        <IconButton icon="cog-outline" label="Settings" onPress={() => setSettings(true)} size={38} />
      </View>

      <FadeIn key={tab} from={from} distance={18} duration={200} style={s.body}>
        {tab === 'club' && <ClubScreen onPlay={play} onTab={setTab} />}
        {tab === 'squad' && <SquadScreen />}
        {tab === 'transfers' && <TransfersScreen />}
        {tab === 'league' && <LeagueScreen />}
      </FadeIn>

      <View style={[s.tabs, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        {TABS.slice(0, 2).map((t) => (
          <TabButton key={t.id} {...t} active={tab === t.id} onPress={() => setTab(t.id)} />
        ))}
        <View style={s.playSlot}>
          <Pressable
            onPress={() => {
              haptic();
              play();
            }}
            style={({ pressed }) => [s.play, pressed && s.playPressed]}
            accessibilityRole="button"
            accessibilityLabel={inWindow ? 'Kick off' : 'Play'}
          >
            <Icon name="play" size={30} color="#FFFFFF" />
          </Pressable>
          <Text style={s.playLabel}>{inWindow ? 'Kick off' : 'Play'}</Text>
        </View>
        {TABS.slice(2).map((t) => (
          <TabButton
            key={t.id}
            {...t}
            badge={t.id === 'transfers' ? state.offers.length : 0}
            active={tab === t.id}
            onPress={() => setTab(t.id)}
          />
        ))}
      </View>

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
      style={s.tab}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
    >
      <View style={[s.tabIcon, active && s.tabIconOn]}>
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
  money: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 38,
    paddingHorizontal: 12,
    borderRadius: 19,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  moneyDebt: { backgroundColor: colors.redSoft, borderColor: '#F6CACC' },
  moneyText: { fontSize: 19, fontFamily: DISPLAY, fontWeight: '800', color: colors.ink },
  body: { flex: 1 },
  tabs: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 6,
    paddingHorizontal: 6,
  },
  tab: { flex: 1, alignItems: 'center', gap: 2 },
  tabIcon: { width: 52, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  tabIconOn: { backgroundColor: colors.faint },
  tabBadge: { position: 'absolute', top: -4, right: 6 },
  tabText: { fontSize: 11, fontWeight: '600', color: colors.muted },
  tabTextOn: { color: colors.ink, fontWeight: '800' },
  playSlot: { flex: 1, alignItems: 'center', gap: 2 },
  play: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginTop: -26,
    backgroundColor: colors.green,
    borderWidth: 4,
    borderColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.float,
  },
  playPressed: { transform: [{ scale: 0.94 }], backgroundColor: colors.greenDark },
  playLabel: { fontSize: 11, fontWeight: '800', color: colors.greenDark },
  settingsText: { fontSize: 15, fontWeight: '500', color: colors.ink2, lineHeight: 21 },
  disclaimer: { fontSize: 11, fontWeight: '500', color: colors.muted, lineHeight: 16, marginTop: 8 },
});
