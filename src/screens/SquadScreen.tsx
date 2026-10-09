import { useRef, useState, type ReactNode } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BENCH_SIZE, FORMATION_IDS, FORMATIONS, TACTICS } from '../game/constants';
import { userClub } from '../game/game';
import { lineOf, ratingAt, surname, trend } from '../game/players';
import { benchFor, starters, userStrength } from '../game/team';
import type { Player, Position, Tactic } from '../game/types';
import { useCareer } from '../state/GameContext';
import {
  OptionSheet,
  penaltyTone,
  PickerButton,
  PosTags,
  RatingBadge,
  SectionTitle,
  Stat,
  TrendTag,
} from '../ui/components';
import { animateNextLayout, usePulse } from '../ui/motion';
import { colors, lineColors } from '../ui/theme';
import { BuildSquadCard } from './BuildSquad';
import { ChemistrySheet, LinkLines } from './Chemistry';
import { PlayerSheet } from './PlayerSheet';

const LINE_ORDER = { GK: 0, DF: 1, MD: 2, AT: 3 };

const TACTIC_NOTE: Record<Tactic, string> = {
  defensive: 'Harder to beat, scores less',
  balanced: 'No change',
  attacking: 'Scores more, concedes more',
};

/** What the user tapped first: a position on the pitch or a player in a list. */
type Selection = { kind: 'slot'; index: number } | { kind: 'player'; id: string } | null;

function fitColor(drop: number) {
  return drop <= 0 ? colors.green : penaltyTone(drop) === 'red' ? colors.red : colors.orange;
}

export function SquadScreen({ onFindPlayers }: { onFindPlayers: () => void }) {
  const { state, dispatch } = useCareer();
  const [sel, setSel] = useState<Selection>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [chemOpen, setChemOpen] = useState(false);
  const [picker, setPicker] = useState<'formation' | 'tactic' | null>(null);
  const [pitch, setPitch] = useState({ w: 0, h: 0 });
  const scroller = useRef<ScrollView>(null);
  const view = useRef<{ y: number; height: number; wrap?: { y: number; height: number } }>({ y: 0, height: 0 });

  const strength = userStrength(state);
  const chemBonus = Math.round((strength.chemistry - 50) / 10);
  const xi = starters(state.squad, state.lineup);
  const bench = benchFor(state.squad, state.lineup, BENCH_SIZE);
  const reserves = state.squad
    .filter((p) => !state.lineup.includes(p.id) && !bench.includes(p))
    .sort((a, b) => LINE_ORDER[lineOf(a)] - LINE_ORDER[lineOf(b)] || b.rating - a.rating);
  const formation = FORMATIONS[state.formation];
  const allPlayers = [...state.squad].sort(
    (a, b) => LINE_ORDER[lineOf(a)] - LINE_ORDER[lineOf(b)] || b.rating - a.rating,
  );
  const kit = userClub(state).crest;

  const assign = (slot: number, playerId: string) => {
    animateNextLayout();
    dispatch({ type: 'assign', slot, playerId });
    setSel(null);
  };

  // Pitch: first tap selects; a second tap on another position swaps them,
  // and a tap after picking a substitute brings that player on.
  const select = (next: Selection) => {
    setSel(next);
    // Keep the bench in view after picking someone on the pitch.
    const { wrap, height, y } = view.current;
    if (next?.kind === 'slot' && wrap && height) {
      const bottom = wrap.y + wrap.height + 12;
      if (bottom > y + height) scroller.current?.scrollTo({ y: bottom - height, animated: true });
    }
  };

  const tapSlot = (i: number) => {
    if (sel?.kind === 'player') return assign(i, sel.id);
    if (sel?.kind === 'slot') {
      if (sel.index === i) return setSel(null);
      const from = state.lineup[sel.index];
      const to = state.lineup[i];
      if (from) return assign(i, from);
      if (to) return assign(sel.index, to);
      return select({ kind: 'slot', index: i });
    }
    select({ kind: 'slot', index: i });
  };

  const tapPlayer = (id: string) => {
    if (sel?.kind === 'slot') return assign(sel.index, id);
    setSel(sel?.kind === 'player' && sel.id === id ? null : { kind: 'player', id });
  };

  const targetPos: Position | undefined = sel?.kind === 'slot' ? formation.slots[sel.index].pos : undefined;
  const selectedSlot = sel?.kind === 'slot' ? sel.index : null;
  const selectedPlayer =
    sel?.kind === 'player'
      ? state.squad.find((p) => p.id === sel.id)
      : sel?.kind === 'slot'
        ? xi[sel.index]
        : null;

  return (
    <View style={s.screen}>
      <ScrollView
        ref={scroller}
        contentContainerStyle={s.content}
        onLayout={(e) => (view.current.height = e.nativeEvent.layout.height)}
        onScroll={(e) => (view.current.y = e.nativeEvent.contentOffset.y)}
        scrollEventThrottle={32}
      >
        <BuildSquadCard onFindPlayers={onFindPlayers} />
        <View style={s.controls}>
          <PickerButton label="FORMATION" value={state.formation} onPress={() => setPicker('formation')} style={s.flex} />
          <PickerButton label="TACTIC" value={TACTICS[state.tactic].label} onPress={() => setPicker('tactic')} style={s.flex} />
          <Pressable
            onPress={() => dispatch({ type: 'autoPick' })}
            accessibilityRole="button"
            style={({ pressed }) => [s.best, pressed && { opacity: 0.6 }]}
          >
            <Text style={s.bestText}>Best XI</Text>
          </Pressable>
        </View>
        <OptionSheet
          visible={picker === 'formation'}
          title="Formation"
          options={FORMATION_IDS.map((id) => ({ id, label: id }))}
          value={state.formation}
          onPick={(id) => dispatch({ type: 'formation', formation: id })}
          onClose={() => setPicker(null)}
        />
        <OptionSheet
          visible={picker === 'tactic'}
          title="Tactic"
          options={(Object.keys(TACTICS) as Tactic[]).map((id) => ({ id, label: TACTICS[id].label, note: TACTIC_NOTE[id] }))}
          value={state.tactic}
          onPick={(id) => dispatch({ type: 'tactic', tactic: id })}
          onClose={() => setPicker(null)}
        />

        <View style={s.stats}>
          <Stat label="POWER" value={strength.power} />
          <Stat label="ATTACK" value={strength.attack} color={lineColors.AT} />
          <Stat label="DEFENSE" value={strength.defense} color={lineColors.DF} />
          <Pressable
            onPress={() => setChemOpen(true)}
            style={({ pressed }) => [s.chemStat, pressed && { opacity: 0.6 }]}
            accessibilityRole="button"
            accessibilityLabel="How chemistry works"
          >
            <Stat label="CHEMISTRY" value={strength.chemistry} color={colors.green} />
            <Text style={s.chemHow}>
              {chemBonus >= 0 ? '+' : ''}
              {chemBonus} power ›
            </Text>
          </Pressable>
        </View>
        <ChemistrySheet visible={chemOpen} onClose={() => setChemOpen(false)} />

        <View style={s.pitchWrap} onLayout={(e) => (view.current.wrap = e.nativeEvent.layout)}>
        <View style={s.pitch} onLayout={(e) => setPitch({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
          <View style={s.boxTop} />
          <View style={s.halfway} />
          <View style={s.circle} />
          <View style={s.boxBottom} />
          <LinkLines xi={xi} formation={state.formation} width={pitch.w} height={pitch.h} />
          {formation.slots.map((sl, i) => {
            const p = xi[i];
            const r = p ? ratingAt(p, sl.pos) : 0;
            return (
              <Pressable
                key={i}
                onPress={() => tapSlot(i)}
                accessibilityLabel={
                  p
                    ? `${sl.pos}: ${p.name}, ${r}${p.rating > r ? `, out of position −${p.rating - r}` : ', natural position'}`
                    : `Empty ${sl.pos} slot`
                }
                style={[s.token, { left: `${sl.x * 100}%`, top: `${sl.y * 100}%` }]}
              >
                {selectedSlot === i ? <SelectRing /> : null}
                {p ? (
                  <>
                    <View
                      style={[
                        s.shirt,
                        {
                          backgroundColor: kit.primary,
                          borderColor: kit.secondary,
                        },
                        selectedSlot === i && s.selected,
                      ]}
                    >
                      <Text style={s.shirtPos}>{sl.pos}</Text>
                    </View>
                    <View style={s.tokenBadge}>
                      <RatingBadge value={r} size={24} tone={penaltyTone(p.rating - r)} />
                    </View>
                    {state.captainId === p.id ? <Text style={s.captain}>C</Text> : null}
                    {p.rating > r ? (
                      <View style={[s.fit, { backgroundColor: fitColor(p.rating - r) }]}>
                        <Text style={s.fitText}>−{p.rating - r}</Text>
                      </View>
                    ) : null}
                    <Text style={s.tokenName} numberOfLines={1}>
                      {surname(p.name)}
                    </Text>
                    {p.retiring ? <Text style={s.retiring}>LAST SEASON</Text> : null}
                  </>
                ) : (
                  <>
                    <View style={[s.empty, selectedSlot === i && s.selected]}>
                      <Text style={s.emptyPos}>{sl.pos}</Text>
                    </View>
                    <Text style={s.tokenName}>Empty</Text>
                  </>
                )}
              </Pressable>
            );
          })}
        </View>
        <BenchStrip
          players={[...bench, ...reserves]}
          benchCount={bench.length}
          target={targetPos}
          selectedId={sel?.kind === 'player' ? sel.id : null}
          onPress={tapPlayer}
          header={
            sel ? (
              <View style={s.benchHead}>
                <Text style={s.benchHint} numberOfLines={2}>
                  {sel.kind === 'player'
                    ? `Bring on ${surname(selectedPlayer?.name ?? '')}: tap a position`
                    : selectedPlayer
                      ? `Swap ${surname(selectedPlayer.name)} (${targetPos}): tap a bench player or a position`
                      : `Fill ${targetPos}: tap a bench player`}
                </Text>
                {selectedPlayer ? (
                  <Pressable onPress={() => setDetail(selectedPlayer.id)} style={s.benchBtn} accessibilityRole="button">
                    <Text style={s.benchBtnText}>Details</Text>
                  </Pressable>
                ) : null}
                <Pressable
                  onPress={() => setSel(null)}
                  style={s.benchBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel"
                >
                  <Text style={s.benchBtnText}>✕</Text>
                </Pressable>
              </View>
            ) : (
              <Text style={s.benchTitle}>BENCH · TAP TO SWAP</Text>
            )
          }
        />
        </View>
        <SectionTitle>{`PLAYERS · ${state.squad.length}`}</SectionTitle>
        <View>
          {allPlayers.map((p, i) => (
            <PlayerRow
              key={p.id}
              player={p}
              role={state.lineup.includes(p.id) ? 'XI' : bench.includes(p) ? 'Sub' : undefined}
              last={i === allPlayers.length - 1}
              onPress={() => setDetail(p.id)}
            />
          ))}
        </View>

      </ScrollView>

      <PlayerSheet playerId={detail} mode="squad" onClose={() => setDetail(null)} />
    </View>
  );
}

/** A soft gold ring that pulses around the selected player. */
function SelectRing() {
  const pulse = usePulse(true, 1200);
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.9, 0.35] });
  return <Animated.View pointerEvents="none" style={[s.ring, { opacity, transform: [{ scale }] }]} />;
}

/** Subs and reserves on a bench under the pitch: tap one to swap with the selected position. */
function BenchStrip({
  players,
  benchCount,
  target,
  selectedId,
  onPress,
  header,
}: {
  header: ReactNode;
  players: Player[];
  benchCount: number;
  target?: Position;
  selectedId: string | null;
  onPress: (id: string) => void;
}) {
  const { state } = useCareer();
  const kit = userClub(state).crest;
  return (
    <View style={s.bench}>
      {header}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.benchRow}>
        {players.map((p, i) => {
          const r = target ? ratingAt(p, target) : p.rating;
          const drop = p.rating - r;
          const on = selectedId === p.id;
          return (
            <View key={p.id} style={s.benchItem}>
              {i === benchCount ? <View style={s.benchDivider} /> : null}
              <Pressable
                onPress={() => onPress(p.id)}
                accessibilityRole="button"
                accessibilityLabel={`Bench ${p.name}`}
                accessibilityState={{ selected: on }}
                style={[s.benchToken, i >= benchCount && s.reserve]}
              >
                {on ? <SelectRing /> : null}
                <View style={[s.shirt, s.benchShirt, { backgroundColor: kit.primary, borderColor: kit.secondary }, on && s.selected]}>
                  <Text style={s.shirtPos}>{p.positions[0]}</Text>
                </View>
                <View style={s.tokenBadge}>
                  <RatingBadge value={r} size={22} tone={target ? penaltyTone(drop) : 'gold'} />
                </View>
                {drop > 0 ? (
                  <View style={[s.fit, s.benchFit, { backgroundColor: fitColor(drop) }]}>
                    <Text style={s.fitText}>−{drop}</Text>
                  </View>
                ) : null}
                <Text style={s.tokenName} numberOfLines={1}>
                  {surname(p.name)}
                </Text>
                {i === benchCount ? <Text style={s.reserveLabel}>RESERVES</Text> : null}
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

/** One squad player; tapping opens their details. */
function PlayerRow({
  player,
  role,
  onPress,
  last,
}: {
  player: Player;
  /** In the starting XI or on the bench. */
  role?: 'XI' | 'Sub';
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Squad player ${player.name}`}
      style={({ pressed }) => [s.row, !last && s.rowBorder, pressed && s.rowPressed]}
    >
      <View style={s.rowMain}>
        <Text style={s.rowName} numberOfLines={1}>
          {player.flag} {player.name}
        </Text>
        <View style={s.rowMeta}>
          <PosTags positions={player.positions} size={12} />
          <Text style={s.rowAge}>{player.age}</Text>
          <TrendTag trend={trend(player)} />
          {player.listed ? <Text style={s.forSale}>FOR SALE</Text> : null}
        </View>
      </View>
      {role ? <Text style={s.role}>{role}</Text> : null}
      <RatingBadge value={player.rating} size={34} />
    </Pressable>
  );
}

const TOKEN_W = 76;

const s = StyleSheet.create({
  chemStat: { flex: 1 },
  chemHow: { textAlign: 'center', fontSize: 11, fontWeight: '800', color: colors.green, marginTop: 2 },
  screen: { flex: 1 },
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  controls: { flexDirection: 'row', gap: 8, alignItems: 'stretch' },
  flex: { flex: 1 },
  best: { backgroundColor: colors.ink, borderRadius: 14, paddingHorizontal: 14, justifyContent: 'center' },
  bestText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  stats: { flexDirection: 'row', paddingVertical: 4 },
  role: { fontSize: 12, fontWeight: '900', color: colors.muted, width: 28, textAlign: 'right' },
  pitchWrap: { borderRadius: 22, overflow: 'hidden', borderWidth: 3, borderColor: colors.pitchDark },
  pitch: {
    backgroundColor: colors.pitch,
    aspectRatio: 0.8,
    width: '100%',
    overflow: 'hidden',
  },
  ring: {
    position: 'absolute',
    top: -6,
    left: '50%',
    marginLeft: -28,
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 4,
    borderColor: colors.gold,
    backgroundColor: 'rgba(242,181,68,0.25)',
  },
  bench: { backgroundColor: colors.pitchDark, paddingTop: 8, paddingBottom: 10 },
  benchHead: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, minHeight: 30 },
  benchHint: { flex: 1, color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  benchBtn: { paddingHorizontal: 10, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center' },
  benchBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  benchTitle: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '900', letterSpacing: 1.2, paddingHorizontal: 12 },
  benchRow: { paddingHorizontal: 6, paddingTop: 10, gap: 2 },
  benchItem: { flexDirection: 'row', alignItems: 'stretch' },
  benchToken: { width: 72, alignItems: 'center' },
  benchShirt: { width: 40, height: 40, borderRadius: 20 },
  benchFit: { top: 24, left: 4 },
  benchDivider: { width: 2, marginHorizontal: 6, marginVertical: 4, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 1 },
  reserve: { opacity: 0.8 },
  reserveLabel: { position: 'absolute', top: -12, color: 'rgba(255,255,255,0.6)', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  boxTop: {
    position: 'absolute',
    top: -3,
    left: '28%',
    right: '28%',
    height: '13%',
    borderWidth: 2.5,
    borderColor: colors.pitchLine,
  },
  boxBottom: {
    position: 'absolute',
    bottom: -3,
    left: '28%',
    right: '28%',
    height: '13%',
    borderWidth: 2.5,
    borderColor: colors.pitchLine,
  },
  halfway: { position: 'absolute', top: '50%', left: 0, right: 0, height: 2.5, backgroundColor: colors.pitchLine },
  circle: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 96,
    height: 96,
    marginLeft: -48,
    marginTop: -48,
    borderRadius: 48,
    borderWidth: 2.5,
    borderColor: colors.pitchLine,
  },
  token: { position: 'absolute', width: TOKEN_W, marginLeft: -TOKEN_W / 2, marginTop: -26, alignItems: 'center' },
  shirt: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  shirtPos: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 11,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowRadius: 2,
    textShadowOffset: { width: 0, height: 1 },
  },
  selected: { borderColor: colors.gold, borderWidth: 4, transform: [{ scale: 1.15 }] },
  tokenBadge: { position: 'absolute', top: -6, right: 6 },
  captain: {
    position: 'absolute',
    top: -4,
    left: 8,
    backgroundColor: colors.ink,
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 11,
    width: 20,
    height: 20,
    lineHeight: 20,
    textAlign: 'center',
    borderRadius: 10,
    overflow: 'hidden',
  },
  fit: {
    position: 'absolute',
    top: 28,
    left: 6,
    minWidth: 22,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fitText: { color: '#FFFFFF', fontWeight: '900', fontSize: 10 },
  retiring: {
    marginTop: 2,
    backgroundColor: colors.red,
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '900',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
    overflow: 'hidden',
  },
  tokenName: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
    marginTop: 3,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowRadius: 2,
    textShadowOffset: { width: 0, height: 1 },
  },
  empty: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPos: { color: '#FFFFFF', fontWeight: '900', fontSize: 11 },
  legend: { color: colors.muted, fontWeight: '600', fontSize: 13, textAlign: 'center' },
  list: { paddingVertical: 4, paddingHorizontal: 12 },
  emptyList: { color: colors.muted, fontWeight: '700', paddingVertical: 12, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  rowPressed: { opacity: 0.6 },
  rowSelected: {
    backgroundColor: '#FFF3D6',
    borderRadius: 12,
    marginHorizontal: -8,
    paddingHorizontal: 8,
  },
  rowFit: {
    minWidth: 26,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowMain: { flex: 1, gap: 3 },
  rowName: { fontSize: 16, fontWeight: '800', color: colors.ink },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowAge: { fontSize: 12, color: colors.muted, fontWeight: '700' },
  forSale: { fontSize: 11, color: colors.blue, fontWeight: '900' },
});

