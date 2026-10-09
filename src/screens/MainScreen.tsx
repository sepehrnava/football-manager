import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SQUAD_MIN } from '../game/constants';
import { userClub } from '../game/game';
import { squadNeeds } from '../game/market';
import { DISCLAIMER } from '../game/leagues';
import { useCareer, useGame } from '../state/GameContext';
import { Button, ClubCrest, Sheet } from '../ui/components';
import { CoinIcon, CrestIcon, PlayIcon, ShirtIcon, TrophyIcon } from '../ui/icons';
import { useAccount } from '../cloud/AccountContext';
import { AccountSheet } from './AccountSheet';
import { FadeIn } from '../ui/motion';
import { colors, formatMoney, seasonLabel } from '../ui/theme';
import { ChallengeEndScreen } from './Challenge';
import { ClubScreen } from './ClubScreen';
import { HonoursSheet } from './Honours';
import { LeagueScreen } from './LeagueScreen';
import { SeasonEndScreen } from './SeasonEndScreen';
import { SimScreen } from './SimScreen';
import { SquadScreen } from './SquadScreen';
import { TransfersScreen } from './TransfersScreen';
import { useOffers } from './useOffers';

type Tab = 'club' | 'squad' | 'transfers' | 'league';

const TABS: { id: Tab; label: string }[] = [
  { id: 'club', label: 'Club' },
  { id: 'squad', label: 'Squad' },
  { id: 'transfers', label: 'Transfers' },
  { id: 'league', label: 'League' },
];

export function MainScreen() {
  const { state, dispatch } = useCareer();
  const insets = useSafeAreaInsets();
  // New tabs slide in from the side they sit on in the tab bar.
  // A new club with no players yet starts on the Squad tab, where it builds its team.
  const ready = squadNeeds(state.squad).ready;
  const [{ tab, from }, setNav] = useState<{ tab: Tab; from: 'left' | 'right' }>(() => ({
    tab: ready ? 'club' : 'squad',
    from: 'right',
  }));
  const setTab = (next: Tab) => {
    const order = TABS.map((t) => t.id);
    setNav({ tab: next, from: order.indexOf(next) < order.indexOf(tab) ? 'left' : 'right' });
  };
  const [sim, setSim] = useState<{ until?: number } | null>(null);
  const [settings, setSettings] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [honours, setHonours] = useState(false);

  if (!sim && (state.phase === 'summary' || state.phase === 'gameover')) {
    return state.challenge ? <ChallengeEndScreen /> : <SeasonEndScreen />;
  }

  const play = (until?: number) => {
    if (state.phase === 'window' && !ready) return setTab('squad');
    if (state.phase === 'window') dispatch({ type: 'startSeason' });
    setSim({ until });
  };
  const club = userClub(state);
  const locked = !ready && state.phase === 'window';

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.top}>
        <Pressable
          onPress={() => setHonours(true)}
          style={({ pressed }) => [s.club, pressed && { opacity: 0.6 }]}
          accessibilityRole="button"
          accessibilityLabel="Honours"
        >
          <ClubCrest club={club} size={26} />
          <Text style={s.money} numberOfLines={1}>
            <Text style={state.money < 0 ? { color: colors.red } : null}>{formatMoney(state.money)}</Text>
          </Text>
        </Pressable>
        <View style={s.spacer} />
        {state.phase === 'window' ? <View style={s.dot} /> : null}
        <Text style={[s.status, state.phase === 'window' && { color: colors.green }]}>
          {state.challenge
            ? 'Daily challenge'
            : state.phase === 'window'
              ? 'Transfer window'
              : seasonLabel(state.season)}
        </Text>
        <Pressable onPress={() => setSettings(true)} style={s.menu} accessibilityRole="button" accessibilityLabel="Settings">
          {[0, 1, 2].map((i) => (
            <View key={i} style={s.menuDot} />
          ))}
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
        {tab === 'squad' && <SquadScreen onFindPlayers={() => setTab('transfers')} />}
        {tab === 'transfers' && <TransfersScreen />}
        {tab === 'league' && <LeagueScreen />}
      </FadeIn>

      <View style={[s.tabs, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        {TABS.slice(0, 2).map((t) => (
          <TabButton key={t.id} {...t} active={tab === t.id} onPress={() => setTab(t.id)} />
        ))}
        <Pressable
          onPress={() => play()}
          style={({ pressed }) => [s.tab, pressed && { opacity: 0.7 }]}
          accessibilityRole="button"
          accessibilityLabel={state.phase === 'window' ? 'Kick off' : 'Play'}
        >
          <View style={s.tabInner}>
            <View style={s.iconBox}>
              <PlayIcon locked={locked} />
            </View>
            <Text style={[s.playText, locked && { color: colors.muted }]}>
              {state.phase !== 'window' ? 'Play' : ready ? 'Kick off' : `${state.squad.length}/${SQUAD_MIN}`}
            </Text>
          </View>
        </Pressable>
        {TABS.slice(2).map((t) => (
          <TabButton key={t.id} {...t} active={tab === t.id} onPress={() => setTab(t.id)} />
        ))}
      </View>

      {sim ? <SimScreen until={sim.until} onClose={() => setSim(null)} /> : null}
      <OfferToast top={insets.top} onPress={() => setTab('transfers')} />
      <SettingsSheet visible={settings} onClose={() => setSettings(false)} onAccount={() => setAccountOpen(true)} />
      <AccountSheet visible={accountOpen} onClose={() => setAccountOpen(false)} />
      <HonoursSheet visible={honours} onClose={() => setHonours(false)} />
    </View>
  );
}

/** Rarely used options, kept out of the way. */
function SettingsSheet({
  visible,
  onClose,
  onAccount,
}: {
  visible: boolean;
  onClose: () => void;
  onAccount: () => void;
}) {
  const { resetCareer, slot, leaveChallenge } = useGame();
  const { provider } = useAccount();
  const [confirm, setConfirm] = useState(false);
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
      {provider ? (
        <View style={s.account}>
          <Button
            label="ACCOUNT AND BACKUP"
            variant="light"
            onPress={() => {
              close();
              onAccount();
            }}
          />
        </View>
      ) : null}
      <Text style={s.settingsText}>
        Starting a new career deletes this one. You can create a new club or manage another one.
      </Text>
      <Button
        label={confirm ? 'TAP AGAIN TO DELETE THIS CAREER' : 'START A NEW CAREER'}
        variant={confirm ? 'red' : 'light'}
        onPress={() => (confirm ? resetCareer() : setConfirm(true))}
      />
      {DISCLAIMER ? <Text style={s.disclaimer}>{DISCLAIMER}</Text> : null}
    </Sheet>
  );
}

/** A short notice when a bid for a listed player arrives; tap to open Transfers. */
function OfferToast({ top, onPress }: { top: number; onPress: () => void }) {
  const { state } = useCareer();
  const { offers } = useOffers();
  const key = offers.map((o) => o.id).join(',');
  const seen = useRef<Set<string> | null>(null);
  const [shown, setShown] = useState<{ id: string; text: string } | null>(null);
  useEffect(() => {
    // The first render only remembers what is already there.
    if (!seen.current) {
      seen.current = new Set(offers.map((o) => o.id));
      return;
    }
    const fresh = offers.find((o) => o.at && !seen.current!.has(o.id));
    offers.forEach((o) => seen.current!.add(o.id));
    if (!fresh) return;
    const player = state.squad.find((p) => p.id === fresh.playerId);
    const club = state.clubs.find((c) => c.id === fresh.clubId);
    setShown({ id: fresh.id, text: `${club?.name ?? 'A club'} bids ${formatMoney(fresh.fee)} for ${player?.name ?? 'your player'}` });
    const t = setTimeout(() => setShown(null), 4000);
    return () => clearTimeout(t);
    // Runs when the set of arrived offers changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  if (!shown) return null;
  return (
    <View pointerEvents="box-none" style={[s.toastWrap, { top: top + 56 }]}>
      <FadeIn key={shown.id} from="scale" duration={260}>
        <Pressable
          onPress={() => {
            setShown(null);
            onPress();
          }}
          accessibilityRole="alert"
          style={s.toast}
        >
          <Text style={s.toastKicker}>NEW OFFER</Text>
          <Text style={s.toastText}>{shown.text}</Text>
        </Pressable>
      </FadeIn>
    </View>
  );
}

/** Colourful vector tab icons: your crest, your shirt, a coin and a trophy. */
function TabIcon({ tab }: { tab: Tab }) {
  const { state } = useCareer();
  const club = userClub(state);
  const crest = club.crest;
  if (tab === 'club') return <CrestIcon crest={crest} short={club.short} size={24} />;
  if (tab === 'squad') return <ShirtIcon primary={crest.primary} secondary={crest.secondary} />;
  if (tab === 'transfers') return <CoinIcon />;
  return <TrophyIcon />;
}

function TabButton({
  id,
  label,
  active,
  onPress,
}: {
  id: Tab;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={s.tab} accessibilityRole="tab" accessibilityState={{ selected: active }}>
      <View style={[s.tabInner, active && s.tabActive]}>
        <View style={s.iconBox}>
          <TabIcon tab={id} />
        </View>
        <Text style={[s.tabText, active && s.tabTextActive]}>{label}</Text>
      </View>
    </Pressable>
  );
}

const ICON = 28;

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  toastWrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  toast: { backgroundColor: colors.ink, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 10, gap: 2 },
  toastKicker: { fontSize: 10, fontWeight: '900', letterSpacing: 1, color: colors.gold },
  toastText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  club: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  money: { fontWeight: '900', fontSize: 18, color: colors.ink },
  status: { fontWeight: '800', fontSize: 14, color: colors.muted },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.green },
  body: { flex: 1 },
  spacer: { flex: 1 },
  menu: { flexDirection: 'row', gap: 3, alignItems: 'center', justifyContent: 'center', height: 36, paddingLeft: 12 },
  menuDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: colors.ink },
  disclaimer: { fontSize: 11, fontWeight: '600', color: colors.muted, lineHeight: 15, marginTop: 20 },
  account: { marginBottom: 18 },
  settingsText: { fontSize: 14, fontWeight: '600', color: colors.muted, marginBottom: 14, lineHeight: 20 },
  tabs: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 6,
    paddingHorizontal: 6,
  },
  tab: { flex: 1, alignItems: 'center' },
  tabInner: { alignItems: 'center', gap: 3, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 16, minWidth: 64 },
  tabActive: { backgroundColor: '#FFF1CC' },
  iconBox: { width: ICON + 4, height: ICON, alignItems: 'center', justifyContent: 'center' },
  tabText: { fontSize: 12, fontWeight: '800', color: colors.ink },
  tabTextActive: { fontWeight: '900' },
  playText: { fontSize: 12, fontWeight: '900', color: colors.green },
});
