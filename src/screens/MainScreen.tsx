import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { userClub } from '../game/game';
import { useCareer } from '../state/GameContext';
import { ClubCrest } from '../ui/components';
import { colors, formatMoney, seasonLabel } from '../ui/theme';
import { ClubScreen } from './ClubScreen';
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
  const [tab, setTab] = useState<Tab>('club');
  const [sim, setSim] = useState<'fast' | 'step' | null>(null);

  if (!sim && (state.phase === 'summary' || state.phase === 'gameover')) {
    return <SeasonEndScreen />;
  }

  const play = (mode: 'fast' | 'step') => {
    if (state.phase === 'window') dispatch({ type: 'startSeason' });
    setSim(mode);
  };
  const club = userClub(state);
  const playLabel = state.phase === 'window' ? 'KICK OFF' : 'PLAY';

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.top}>
        <View style={s.chip}>
          <ClubCrest club={club} size={22} />
          <Text style={s.chipText}>{club.short}</Text>
        </View>
        <View style={s.chip}>
          <Text style={[s.chipText, state.money < 0 && { color: colors.red }]}>
            💵 {formatMoney(state.money)}
          </Text>
        </View>
        <View style={[s.chip, state.phase === 'window' && s.chipOpen]}>
          <Text style={s.chipText}>
            {state.phase === 'window' ? '🔁 Window' : `📅 ${seasonLabel(state.season)}`}
          </Text>
        </View>
      </View>

      <View style={s.body}>
        {tab === 'club' && <ClubScreen onPlay={play} onOpenTransfers={() => setTab('transfers')} />}
        {tab === 'squad' && <SquadScreen />}
        {tab === 'transfers' && <TransfersScreen />}
        {tab === 'league' && <LeagueScreen />}
      </View>

      <View style={[s.tabs, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        {TABS.slice(0, 2).map((t) => (
          <TabButton key={t.id} {...t} active={tab === t.id} onPress={() => setTab(t.id)} />
        ))}
        <Pressable
          onPress={() => play('fast')}
          style={({ pressed }) => [s.play, pressed && { transform: [{ translateY: 2 }] }]}
          accessibilityRole="button"
          accessibilityLabel={playLabel}
        >
          <Text style={s.playIcon}>⚽</Text>
          <Text style={s.playText}>{playLabel}</Text>
        </Pressable>
        {TABS.slice(2).map((t) => (
          <TabButton key={t.id} {...t} active={tab === t.id} onPress={() => setTab(t.id)} />
        ))}
      </View>

      {sim ? <SimScreen mode={sim} onClose={() => setSim(null)} /> : null}
    </View>
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
  top: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
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
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipOpen: { backgroundColor: colors.greenSoft, borderColor: '#BFE6CC', borderBottomColor: '#9ED6B1' },
  chipText: { fontWeight: '900', fontSize: 15, color: colors.ink },
  body: { flex: 1 },
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
  play: {
    flex: 1.3,
    marginTop: -28,
    marginHorizontal: 4,
    backgroundColor: '#1A1A1A',
    borderRadius: 22,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    borderBottomWidth: 6,
    borderBottomColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  playIcon: { fontSize: 26 },
  playText: { color: '#FFFFFF', fontWeight: '900', fontSize: 15, fontStyle: 'italic', letterSpacing: 1 },
});
