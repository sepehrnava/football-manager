import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BENCH_SIZE, FORMATION_IDS, FORMATIONS, SQUAD_MIN, TACTICS } from '../game/constants';
import { userClub } from '../game/game';
import { lineOf, ratingAt, surname, trend } from '../game/players';
import { benchFor, starters, userStrength } from '../game/team';
import type { Player, Position, Tactic } from '../game/types';
import { useCareer } from '../state/GameContext';
import {
  Button,
  Card,
  penaltyTone,
  Pill,
  PosTags,
  RatingBadge,
  SectionTitle,
  Stat,
  TrendTag,
} from '../ui/components';
import { animateNextLayout, FadeIn } from '../ui/motion';
import { colors, lineColors } from '../ui/theme';
import { ChemistrySheet, LinkLines } from './Chemistry';
import { PlayerSheet } from './PlayerSheet';
import { StaffCard, StaffSheet } from './StaffSheet';

const LINE_ORDER = { GK: 0, DF: 1, MD: 2, AT: 3 };

/** What the user tapped first: a position on the pitch or a player in a list. */
type Selection = { kind: 'slot'; index: number } | { kind: 'player'; id: string } | null;

function fitColor(drop: number) {
  return drop <= 0 ? colors.green : penaltyTone(drop) === 'red' ? colors.red : colors.orange;
}

export function SquadScreen() {
  const { state, dispatch } = useCareer();
  const [sel, setSel] = useState<Selection>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [staffOpen, setStaffOpen] = useState(false);
  const [chemOpen, setChemOpen] = useState(false);
  const [pitch, setPitch] = useState({ w: 0, h: 0 });

  const strength = userStrength(state);
  const chemBonus = Math.round((strength.chemistry - 50) / 10);
  const xi = starters(state.squad, state.lineup);
  const bench = benchFor(state.squad, state.lineup, BENCH_SIZE);
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

  // Pitch: first tap selects; a second tap on another position swaps them,
  // and a tap after picking a substitute brings that player on.
  const tapSlot = (i: number) => {
    if (sel?.kind === 'player') return assign(i, sel.id);
    if (sel?.kind === 'slot') {
      if (sel.index === i) return setSel(null);
      const from = state.lineup[sel.index];
      const to = state.lineup[i];
      if (from) return assign(i, from);
      if (to) return assign(sel.index, to);
      return setSel({ kind: 'slot', index: i });
    }
    setSel({ kind: 'slot', index: i });
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
      <ScrollView contentContainerStyle={[s.content, sel && s.contentWithBar]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.pills}>
          {FORMATION_IDS.map((id) => (
            <Pill
              key={id}
              label={id}
              active={state.formation === id}
              onPress={() => dispatch({ type: 'formation', formation: id })}
            />
          ))}
        </ScrollView>

        <View style={s.tactics}>
          {(Object.keys(TACTICS) as Tactic[]).map((t) => (
            <Pressable
              key={t}
              onPress={() => dispatch({ type: 'tactic', tactic: t })}
              style={[s.tactic, state.tactic === t && s.tacticActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: state.tactic === t }}
            >
              <Text style={[s.tacticText, state.tactic === t && s.tacticTextActive]}>
                {TACTICS[t].label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Card style={s.stats}>
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
              {chemBonus} · how? ›
            </Text>
          </Pressable>
        </Card>
        <ChemistrySheet visible={chemOpen} onClose={() => setChemOpen(false)} />

        <StaffCard onPress={() => setStaffOpen(true)} />

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
                    <View
                      style={[
                        s.fit,
                        { backgroundColor: fitColor(p.rating - r) },
                      ]}
                    >
                      <Text style={s.fitText}>{p.rating > r ? `−${p.rating - r}` : '✓'}</Text>
                    </View>
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
        <Text style={s.legend}>
          Tap a player, then another position or a substitute below to swap. ✓ = natural position; −N =
          rating lost out of position.
        </Text>

        <Button label="AUTO-PICK BEST XI" variant="light" onPress={() => dispatch({ type: 'autoPick' })} />

        <SectionTitle>{`SUBSTITUTES · ${bench.length}/${BENCH_SIZE}`}</SectionTitle>
        <Card style={s.list}>
          {bench.map((p, i) => (
            <PlayerRow
              key={p.id}
              player={p}
              last={i === bench.length - 1}
              target={targetPos}
              selected={sel?.kind === 'player' && sel.id === p.id}
              onPress={() => tapPlayer(p.id)}
            />
          ))}
        </Card>
        <Text style={s.legend}>
          {`You always have at least ${SQUAD_MIN} players (11 starters + ${BENCH_SIZE} subs). Sell someone and an academy youngster fills the gap.`}
        </Text>

        {reserves.length ? (
          <>
            <SectionTitle>{`OUTSIDE MATCHDAY SQUAD · ${reserves.length}`}</SectionTitle>
            <Card style={s.list}>
              {reserves.map((p, i) => (
                <PlayerRow
                  key={p.id}
                  player={p}
                  last={i === reserves.length - 1}
                  target={targetPos}
                  selected={sel?.kind === 'player' && sel.id === p.id}
                  onPress={() => tapPlayer(p.id)}
                />
              ))}
            </Card>
          </>
        ) : null}

      </ScrollView>

      {sel ? (
        <FadeIn key={sel.kind === 'slot' ? `s${sel.index}` : sel.id} style={s.bar} distance={20} duration={180}>
          <Text style={s.barText} numberOfLines={2}>
            {sel.kind === 'player'
              ? `Bring on ${surname(selectedPlayer?.name ?? '')}: tap a position on the pitch`
              : selectedPlayer
                ? `Swap ${surname(selectedPlayer.name)} (${targetPos}): tap a substitute or another position`
                : `Fill ${targetPos}: tap a substitute below`}
          </Text>
          <View style={s.barButtons}>
            {selectedPlayer ? (
              <Button label="DETAILS" variant="light" small onPress={() => setDetail(selectedPlayer.id)} />
            ) : null}
            <Button label="CANCEL" variant="light" small onPress={() => setSel(null)} />
          </View>
        </FadeIn>
      ) : null}

      <PlayerSheet playerId={detail} mode="squad" onClose={() => setDetail(null)} />
      <StaffSheet visible={staffOpen} onClose={() => setStaffOpen(false)} />
    </View>
  );
}

function PlayerRow({
  player,
  onPress,
  last,
  target,
  selected,
}: {
  player: Player;
  onPress: () => void;
  last?: boolean;
  /** When a pitch position is selected, preview the rating there. */
  target?: Position;
  selected?: boolean;
}) {
  const r = target ? ratingAt(player, target) : player.rating;
  const drop = player.rating - r;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Squad player ${player.name}`}
      accessibilityState={{ selected: !!selected }}
      style={({ pressed }) => [s.row, !last && s.rowBorder, selected && s.rowSelected, pressed && s.rowPressed]}
    >
      <View style={s.rowMain}>
        <Text style={s.rowName} numberOfLines={1}>
          {player.flag} {player.name}
        </Text>
        <View style={s.rowMeta}>
          <PosTags positions={player.positions} size={12} />
          <Text style={s.rowAge}>Age {player.age}</Text>
          <TrendTag trend={trend(player)} />
          {player.listed ? <Text style={s.forSale}>FOR SALE</Text> : null}
        </View>
      </View>
      {target ? (
        <View style={[s.rowFit, { backgroundColor: fitColor(drop) }]}>
          <Text style={s.fitText}>{drop > 0 ? `−${drop}` : '✓'}</Text>
        </View>
      ) : null}
      <RatingBadge value={r} size={34} tone={target ? penaltyTone(drop) : 'gold'} />
    </Pressable>
  );
}

const TOKEN_W = 76;

const s = StyleSheet.create({
  chemStat: { flex: 1 },
  chemHow: { textAlign: 'center', fontSize: 11, fontWeight: '800', color: colors.green, marginTop: 2 },
  screen: { flex: 1 },
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  contentWithBar: { paddingBottom: 140 },
  bar: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    backgroundColor: colors.ink,
    borderRadius: 20,
    padding: 14,
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  barText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  barButtons: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
  pills: { gap: 8, paddingRight: 8 },
  tactics: {
    flexDirection: 'row',
    backgroundColor: colors.faint,
    borderRadius: 16,
    padding: 4,
    borderWidth: 2,
    borderColor: colors.border,
  },
  tactic: { flex: 1, paddingVertical: 9, borderRadius: 12, alignItems: 'center' },
  tacticActive: { backgroundColor: colors.ink },
  tacticText: { fontWeight: '800', color: colors.muted },
  tacticTextActive: { color: '#FFFFFF' },
  stats: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 4 },
  pitch: {
    backgroundColor: colors.pitch,
    borderRadius: 22,
    aspectRatio: 0.8,
    width: '100%',
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: colors.pitchDark,
  },
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
  selected: { borderColor: colors.gold, transform: [{ scale: 1.08 }] },
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
  rowBorder: { borderBottomWidth: 1.5, borderBottomColor: colors.faint },
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

