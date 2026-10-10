import { useRef, useState, type ReactNode } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BENCH_SIZE, FORMATION_IDS, FORMATIONS, TACTICS } from '../game/constants';
import { userClub } from '../game/game';
import { lineOf, ratingAt, surname, trend } from '../game/players';
import { benchBonus, benchFor, starters, userStrength } from '../game/team';
import type { Player, Position, Tactic } from '../game/types';
import { useCareer } from '../state/GameContext';
import {
  OptionSheet,
  penaltyTone,
  PickerButton,
  PosTags,
  RatingBadge,
  RatingWithPotential,
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

/** What the user tapped first: a position on the pitch or a player on the bench. */
type Selection = { kind: 'slot'; index: number } | { kind: 'player'; id: string } | null;

const TACTIC_NOTE: Record<Tactic, string> = {
  defensive: 'Harder to beat, scores less',
  balanced: 'No change',
  attacking: 'Scores more, concedes more',
};


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
  const bench = benchFor(state.squad, state.lineup, BENCH_SIZE, state.bench);
  const depth = benchBonus(state);
  const depthText = `BENCH ${depth.rating} · ${depth.bonus >= 0 ? '+' : ''}${depth.bonus} POWER`;
  const reserves = state.squad
    .filter((p) => !state.lineup.includes(p.id) && !bench.includes(p))
    .sort((a, b) => LINE_ORDER[lineOf(a)] - LINE_ORDER[lineOf(b)] || b.rating - a.rating);
  const formation = FORMATIONS[state.formation];
  const kit = userClub(state).crest;

  const assign = (slot: number, playerId: string) => {
    animateNextLayout();
    dispatch({ type: 'assign', slot, playerId });
    setSel(null);
  };

  // The bench strip opens under the pitch once a position is picked: keep it in view.
  const onWrapLayout = (layout: { y: number; height: number }) => {
    view.current.wrap = layout;
    const { height, y } = view.current;
    if (sel?.kind === 'slot' && height) {
      const bottom = layout.y + layout.height + 12;
      if (bottom > y + height) scroller.current?.scrollTo({ y: bottom - height, animated: true });
    }
  };

  // Pitch: first tap selects; a second tap on another position swaps them,
  // and a tap on the bench brings that player on.
  const tapSlot = (i: number) => {
    if (sel?.kind === 'player') return assign(i, sel.id);
    if (sel?.kind === 'slot') {
      if (sel.index === i) return setSel(null);
      const from = state.lineup[sel.index];
      const to = state.lineup[i];
      if (from) return assign(i, from);
      if (to) return assign(sel.index, to);
    }
    setSel({ kind: 'slot', index: i });
  };

  // A substitute or reserve: after a pitch position, brings them on; after another non-starter
  // on the other list, swaps the two (sub <-> reserve); otherwise selects or deselects.
  const tapPlayer = (id: string) => {
    if (sel?.kind === 'slot') return assign(sel.index, id);
    if (sel?.kind === 'player' && sel.id !== id) {
      const isSub = (pid: string) => bench.some((p) => p.id === pid);
      if (isSub(sel.id) !== isSub(id)) {
        animateNextLayout();
        dispatch({ type: 'benchSwap', a: sel.id, b: id });
        return setSel(null);
      }
    }
    setSel(sel?.kind === 'player' && sel.id === id ? null : { kind: 'player', id });
  };

  const targetPos: Position | undefined = sel?.kind === 'slot' ? formation.slots[sel.index].pos : undefined;
  const selectedSlot = sel?.kind === 'slot' ? sel.index : null;
  const slotPlayer = selectedSlot !== null ? xi[selectedSlot] : null;
  const benchPlayer = sel?.kind === 'player' ? state.squad.find((p) => p.id === sel.id) : null;

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
          <Stat compact label="POWER" value={strength.power} />
          <Stat compact label="ATTACK" value={strength.attack} color={lineColors.AT} />
          <Stat compact label="DEFENSE" value={strength.defense} color={lineColors.DF} />
          <Pressable
            onPress={() => setChemOpen(true)}
            style={({ pressed }) => [s.chemStat, pressed && { opacity: 0.6 }]}
            accessibilityRole="button"
            accessibilityLabel="How chemistry works"
          >
            <Stat compact label="CHEMISTRY" value={strength.chemistry} color={colors.green} />
            <Text style={s.chemHow}>
              {chemBonus >= 0 ? '+' : ''}
              {chemBonus} power ›
            </Text>
          </Pressable>
          <View style={s.chemStat}>
            <Stat compact label="BENCH" value={depth.rating} color={colors.blue} />
            <Text style={[s.chemHow, { color: depth.bonus < 0 ? colors.red : colors.blue }]}>
              {depth.bonus >= 0 ? '+' : ''}
              {depth.bonus} power
            </Text>
          </View>
        </View>
        <ChemistrySheet visible={chemOpen} onClose={() => setChemOpen(false)} />

        <View style={s.pitchWrap} onLayout={(e) => onWrapLayout(e.nativeEvent.layout)}>
        <View style={s.pitch} onLayout={(e) => setPitch({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
          {/* Empty grass: a tap clears the selection. Players sit above it and get their own taps. */}
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setSel(null)}
            disabled={!sel}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          />
          <View pointerEvents="none" style={s.boxTop} />
          <View pointerEvents="none" style={s.halfway} />
          <View pointerEvents="none" style={s.circle} />
          <View pointerEvents="none" style={s.boxBottom} />
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
                    ? `${sl.pos}: ${p.name}, ${r}${p.rating > r ? `, out of position −${p.rating - r}` : ', natural position'}${p.retiring ? ', retiring after this season' : ''}`
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
          {selectedSlot !== null && slotPlayer ? (
            <DetailsChip
              x={formation.slots[selectedSlot].x}
              y={formation.slots[selectedSlot].y}
              below={!slotPlayer.retiring}
              onPress={() => setDetail(slotPlayer.id)}
            />
          ) : null}
        </View>
        {/* Subs and reserves show here only while choosing: the lists below hold them otherwise. */}
        {sel ? (
          <BenchStrip
            players={[...bench, ...reserves]}
            benchCount={bench.length}
            target={targetPos}
            selectedId={sel?.kind === 'player' ? sel.id : null}
            onPress={tapPlayer}
            header={
              <View style={s.benchHead}>
                <Text style={s.benchHint} numberOfLines={1}>
                  {benchPlayer
                    ? `${surname(benchPlayer.name)}: tap a position, or swap below`
                    : slotPlayer
                      ? `Swap ${surname(slotPlayer.name)} (${targetPos}): best options first`
                      : `Fill ${targetPos}: best options first`}
                </Text>
                {benchPlayer ? (
                  <Pressable onPress={() => setDetail(benchPlayer.id)} style={s.benchBtn} accessibilityRole="button">
                    <Text style={s.benchBtnText}>Details</Text>
                  </Pressable>
                ) : null}
                <Pressable onPress={() => setSel(null)} style={s.benchBtn} accessibilityRole="button" accessibilityLabel="Cancel">
                  <Text style={s.benchBtnText}>✕</Text>
                </Pressable>
              </View>
            }
          />
        ) : null}
        </View>

        {[
          { title: `SUBSTITUTES · ${depthText}`, group: bench, sub: true },
          { title: `RESERVES · ${reserves.length}`, group: reserves, sub: false },
        ]
          .filter((g) => g.group.length)
          .map((g) => (
            <View key={g.title}>
              <SectionTitle>{g.title}</SectionTitle>
              {g.sub ? (
                <Text style={s.depthHint}>A bench close to your starters adds up to +3 power; a thin one costs some.</Text>
              ) : null}
              {benchPlayer && bench.includes(benchPlayer) !== g.sub ? (
                <Text style={s.listHint}>
                  Tap one here to swap with {surname(benchPlayer.name)}, or tap a position on the pitch.
                </Text>
              ) : null}
              {g.group.map((p, i) => (
                <BenchRow
                  key={p.id}
                  player={p}
                  last={i === g.group.length - 1}
                  selected={sel?.kind === 'player' && sel.id === p.id}
                  onPress={() => tapPlayer(p.id)}
                  onDetails={() => setDetail(p.id)}
                />
              ))}
            </View>
          ))}
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

/** A small "Details" button next to the selected pitch player (above them near the bottom edge). */
function DetailsChip({ x, y, below, onPress }: { x: number; y: number; below: boolean; onPress: () => void }) {
  const under = below && y < 0.82;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Player details"
      style={({ pressed }) => [
        s.detailsChip,
        { left: `${x * 100}%`, top: `${y * 100}%`, marginTop: under ? 42 : -62 },
        pressed && { opacity: 0.7 },
      ]}
    >
      <Text style={s.detailsChipText}>Details</Text>
    </Pressable>
  );
}

/**
 * Subs and reserves in one row under the pitch. With a pitch position selected, everyone is
 * shown with their rating there and sorted best-first, so the best options come first.
 */
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
  const bench = new Set(players.slice(0, benchCount).map((p) => p.id));
  const shown = target
    ? [...players].sort((a, b) => ratingAt(b, target) - ratingAt(a, target) || b.rating - a.rating)
    : players;
  return (
    <View style={s.bench}>
      {header}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.benchRowStrip}>
        {shown.map((p, i) => {
          const r = target ? ratingAt(p, target) : p.rating;
          const drop = p.rating - r;
          const on = selectedId === p.id;
          return (
            <View key={p.id} style={s.benchItem}>
              {!target && i === benchCount ? <View style={s.benchDivider} /> : null}
              <Pressable
                onPress={() => onPress(p.id)}
                accessibilityRole="button"
                accessibilityLabel={`Bench ${p.name}${p.retiring ? ', retiring after this season' : ''}`}
                accessibilityState={{ selected: on }}
                style={s.benchToken}
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
                <Text style={s.benchRole}>{bench.has(p.id) ? 'SUB' : 'RESERVE'}</Text>
                {p.retiring ? <Text style={s.retiring}>LAST SEASON</Text> : null}
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

/** A substitute or reserve under the pitch: tap to select (then swap), Details for the full card. */
function BenchRow({
  player,
  last,
  selected,
  onPress,
  onDetails,
}: {
  player: Player;
  last?: boolean;
  selected?: boolean;
  onPress: () => void;
  onDetails: () => void;
}) {
  return (
    <View style={[s.benchRow, !last && s.benchRowLine, selected && s.benchRowOn]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Squad player ${player.name}`}
        accessibilityState={{ selected: !!selected }}
        style={({ pressed }) => [s.benchRowMain, pressed && s.rowPressed]}
      >
        <RatingWithPotential
          badge={<RatingBadge value={player.rating} size={34} />}
          rating={player.rating}
          potential={[player.potential, player.potential]}
        />
        <View style={s.rowMain}>
          <Text style={s.benchName} numberOfLines={1}>
            {player.flag} {player.name}
          </Text>
          <View style={s.benchMeta}>
            <PosTags positions={player.positions} size={12} />
            <Text style={s.benchAge}>{player.age}</Text>
            <TrendTag trend={trend(player)} />
            {player.listed ? <Text style={s.benchSale}>FOR SALE</Text> : null}
          </View>
        </View>
      </Pressable>
      <Pressable
        onPress={onDetails}
        accessibilityRole="button"
        accessibilityLabel={`Details for ${player.name}`}
        style={({ pressed }) => [s.rowDetails, pressed && s.rowPressed]}
      >
        <Text style={s.rowDetailsText}>Details</Text>
      </Pressable>
    </View>
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
  benchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  benchRowLine: { borderBottomWidth: 1, borderBottomColor: colors.border },
  benchName: { fontSize: 15, fontWeight: '800', color: colors.ink },
  benchMeta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 10, rowGap: 2, marginTop: 2 },
  benchAge: { fontSize: 12, fontWeight: '700', color: colors.muted },
  benchSale: { fontSize: 11, fontWeight: '900', color: colors.blue },
  benchRowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  benchRowOn: { backgroundColor: '#FFF1CC', borderRadius: 12, marginHorizontal: -8, paddingHorizontal: 8 },
  rowDetails: { backgroundColor: colors.card, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  rowDetailsText: { fontSize: 12, fontWeight: '900', color: colors.ink },
  depthHint: { fontSize: 12, fontWeight: '600', color: colors.muted, marginTop: -4, marginBottom: 4 },
  listHint: { fontSize: 13, fontWeight: '700', color: colors.orange, marginBottom: 4 },
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
  benchShirt: { width: 40, height: 40, borderRadius: 20 },
  bench: { backgroundColor: colors.pitchDark, paddingTop: 8, paddingBottom: 10 },
  benchHead: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, minHeight: 30 },
  benchHint: { flex: 1, color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  benchBtn: { paddingHorizontal: 10, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center' },
  benchBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  benchRowStrip: { paddingHorizontal: 6, paddingTop: 10, gap: 2 },
  benchItem: { flexDirection: 'row', alignItems: 'stretch' },
  benchToken: { width: 72, alignItems: 'center' },
  benchFit: { top: 24, left: 4 },
  benchDivider: { width: 2, marginHorizontal: 6, marginVertical: 4, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 1 },
  benchRole: { color: 'rgba(255,255,255,0.6)', fontSize: 8, fontWeight: '900', letterSpacing: 0.8, marginTop: 1 },
  detailsChip: {
    position: 'absolute',
    width: 72,
    marginLeft: -36,
    alignItems: 'center',
    backgroundColor: colors.ink,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    paddingVertical: 4,
    zIndex: 5,
  },
  detailsChipText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
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
  rowPressed: { opacity: 0.6 },
  rowMain: { flex: 1, gap: 3 },
});

