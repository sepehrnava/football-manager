import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { userClub } from '../game/game';
import { DISCLAIMER } from '../game/leagues';
import { useCareer, useGame } from '../state/GameContext';
import { Button, ClubCrest, Sheet } from '../ui/components';
import { FadeIn } from '../ui/motion';
import { colors, formatMoney, seasonLabel } from '../ui/theme';
import { ChallengeEndScreen } from './Challenge';
import { ClubScreen } from './ClubScreen';
import { FacesPreview } from './FacesPreview';
import { HonoursSheet } from './Honours';
import { LeagueScreen } from './LeagueScreen';
import { SeasonEndScreen } from './SeasonEndScreen';
import { SimScreen } from './SimScreen';
import { SquadScreen } from './SquadScreen';
import { TransfersScreen } from './TransfersScreen';

type Tab = 'club' | 'squad' | 'transfers' | 'league';

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: 'club', icon: '🏟️', label: 'CLUB' },
  { id: 'squad', icon: '👕', label: 'SQUAD' },
  { id: 'transfers', icon: '💰', label: 'TRANSFERS' },
  { id: 'league', icon: '🏆', label: 'LEAGUE' },
];

export function MainScreen() {
  const { state, dispatch } = useCareer();
  const insets = useSafeAreaInsets();
  // New tabs slide in from the side they sit on in the tab bar.
  const [{ tab, from }, setNav] = useState<{ tab: Tab; from: 'left' | 'right' }>({
    tab: 'club',
    from: 'right',
  });
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

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.top}>
        <Pressable
          onPress={() => setHonours(true)}
          style={({ pressed }) => [s.chip, pressed && { opacity: 0.8 }]}
          accessibilityRole="button"
          accessibilityLabel="Honours"
        >
          <ClubCrest club={club} size={22} />
          <Text style={s.chipText}>{club.short}</Text>
          <Text style={s.chipCup}>🏆</Text>
        </Pressable>
        <View style={s.chip}>
          <Text style={[s.chipText, state.money < 0 && { color: colors.red }]}>
            💵 {formatMoney(state.money)}
          </Text>
        </View>
        <View style={[s.chip, state.phase === 'window' && s.chipOpen]}>
          <Text style={s.chipText}>
            {state.challenge
              ? '🎯 Daily'
              : state.phase === 'window'
                ? '🔁 Window'
                : `📅 ${seasonLabel(state.season)}`}
          </Text>
        </View>
        <View style={s.spacer} />
        <Pressable onPress={() => setSettings(true)} style={s.gear} accessibilityLabel="Settings">
          <Text style={s.gearText}>⚙️</Text>
        </Pressable>
      </View>

      <FadeIn key={tab} from={from} distance={24} duration={220} style={s.body}>
        {tab === 'club' && (
          <ClubScreen
            onPlay={play}
            onOpenTransfers={() => setTab('transfers')}
            onOpenLeague={() => setTab('league')}
            onOpenSquad={() => setTab('squad')}
          />
        )}
        {tab === 'squad' && <SquadScreen />}
        {tab === 'transfers' && <TransfersScreen />}
        {tab === 'league' && <LeagueScreen />}
      </FadeIn>

      <View style={[s.tabs, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        {TABS.slice(0, 2).map((t) => (
          <TabButton key={t.id} {...t} active={tab === t.id} onPress={() => setTab(t.id)} />
        ))}
        <Pressable
          onPress={() => play()}
          style={({ pressed }) => [s.play, pressed && { opacity: 0.85 }]}
          accessibilityRole="button"
          accessibilityLabel={state.phase === 'window' ? 'Kick off' : 'Play'}
        >
          <Text style={s.playIcon}>▶</Text>
          <Text style={s.playText}>{state.phase === 'window' ? 'KICK OFF' : 'PLAY'}</Text>
        </Pressable>
        {TABS.slice(2).map((t) => (
          <TabButton key={t.id} {...t} active={tab === t.id} onPress={() => setTab(t.id)} />
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
  const { resetCareer, slot, leaveChallenge } = useGame();
  const [confirm, setConfirm] = useState(false);
  const [faces, setFaces] = useState(false);
  if (!visible) return null;
  const close = () => {
    setConfirm(false);
    onClose();
  };
  if (slot === 'challenge') {
    return (
      <Sheet visible title="Daily challenge" onClose={close}>
        <Text style={s.settingsText}>
          Your challenge is saved. Come back any time today to finish it.
        </Text>
        <Button label="BACK TO MY CAREER" variant="light" onPress={() => leaveChallenge()} />
        {DISCLAIMER ? <Text style={s.disclaimer}>{DISCLAIMER}</Text> : null}
      </Sheet>
    );
  }
  return (
    <Sheet visible title="Settings" onClose={close}>
      <Text style={s.settingsText}>
        Starting a new career deletes this one. You can create a new club or manage another one.
      </Text>
      <Button
        label={confirm ? 'TAP AGAIN TO DELETE THIS CAREER' : 'START A NEW CAREER'}
        variant={confirm ? 'red' : 'light'}
        onPress={() => (confirm ? resetCareer() : setConfirm(true))}
      />
      <Button label="PLAYER FACES (PREVIEW)" variant="light" onPress={() => setFaces(true)} />
      {DISCLAIMER ? <Text style={s.disclaimer}>{DISCLAIMER}</Text> : null}
      <FacesPreview visible={faces} onClose={() => setFaces(false)} />
    </Sheet>
  );
}

function TabButton({
  icon,
  label,
  active,
  onPress,
}: {
  icon: string;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={s.tab}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
    >
      <Text style={[s.tabIcon, !active && s.inactive]}>{icon}</Text>
      <Text style={[s.tabText, active && s.tabTextActive]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  top: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.border,
    borderBottomWidth: 4,
    borderBottomColor: colors.borderDark,
    paddingHorizontal: 9,
    paddingVertical: 6,
    flexShrink: 1,
  },
  chipOpen: { backgroundColor: colors.greenSoft, borderColor: '#BFE6CC', borderBottomColor: '#9ED6B1' },
  chipText: { fontWeight: '900', fontSize: 14, color: colors.ink },
  chipCup: { fontSize: 12 },
  body: { flex: 1 },
  spacer: { flex: 1 },
  gear: { width: 34, height: 38, alignItems: 'center', justifyContent: 'center' },
  gearText: { fontSize: 20, opacity: 0.6 },
  play: {
    flex: 1.15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.green,
    borderRadius: 16,
    marginHorizontal: 4,
    marginBottom: 2,
    paddingVertical: 6,
    gap: 1,
  },
  playIcon: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  playText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  disclaimer: { fontSize: 11, fontWeight: '600', color: colors.muted, lineHeight: 15, marginTop: 20 },
  settingsText: { fontSize: 14, fontWeight: '600', color: colors.muted, marginBottom: 14, lineHeight: 20 },
  tabs: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.card,
    borderTopWidth: 2,
    borderTopColor: colors.border,
    paddingTop: 6,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 4, gap: 2 },
  tabIcon: { fontSize: 24 },
  inactive: { opacity: 0.45 },
  tabText: { fontSize: 10, fontWeight: '900', color: colors.muted, letterSpacing: 0.5 },
  tabTextActive: { color: colors.ink },
});
