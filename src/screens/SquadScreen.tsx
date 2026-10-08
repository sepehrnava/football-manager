import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FORMATION_IDS, FORMATIONS, LINE_OF, TACTICS } from '../game/constants';
import { userClub } from '../game/game';
import { lineOf, ratingAt, surname } from '../game/players';
import { starters, userStrength } from '../game/team';
import type { Player, Tactic } from '../game/types';
import { useCareer } from '../state/GameContext';
import {
  Button,
  Card,
  penaltyTone,
  Pill,
  PosTags,
  RatingBadge,
  SectionTitle,
  Sheet,
  Stat,
} from '../ui/components';
import { colors, lineColors } from '../ui/theme';
import { PlayerSheet } from './PlayerSheet';

const LINE_ORDER = { GK: 0, DF: 1, MD: 2, AT: 3 };

export function SquadScreen() {
  const { state, dispatch } = useCareer();
  const [slot, setSlot] = useState<number | null>(null);
  const [detail, setDetail] = useState<string | null>(null);

  const strength = userStrength(state);
  const xi = starters(state.squad, state.lineup);
  const reserves = state.squad
    .filter((p) => !state.lineup.includes(p.id))
    .sort((a, b) => LINE_ORDER[lineOf(a)] - LINE_ORDER[lineOf(b)] || b.rating - a.rating);
  const formation = FORMATIONS[state.formation];
  const kit = userClub(state).crest;

  return (
    <>
      <ScrollView contentContainerStyle={s.content}>
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
          <Stat label="CHEMISTRY" value={strength.chemistry} color={colors.green} />
        </Card>

        <View style={s.pitch}>
          <View style={s.boxTop} />
          <View style={s.halfway} />
          <View style={s.circle} />
          <View style={s.boxBottom} />
          {formation.slots.map((sl, i) => {
            const p = xi[i];
            const r = p ? ratingAt(p, sl.pos) : 0;
            return (
              <Pressable
                key={i}
                onPress={() => setSlot(i)}
                accessibilityLabel={p ? `${sl.pos}: ${p.name}, ${r}` : `Empty ${sl.pos} slot`}
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
                        slot === i && s.selected,
                      ]}
                    >
                      <Text style={s.shirtPos}>{sl.pos}</Text>
                    </View>
                    <View style={s.tokenBadge}>
                      <RatingBadge value={r} size={24} tone={penaltyTone(p.rating - r)} />
                    </View>
                    {state.captainId === p.id ? <Text style={s.captain}>C</Text> : null}
                    <Text style={s.tokenName} numberOfLines={1}>
                      {surname(p.name)}
                    </Text>
                  </>
                ) : (
                  <>
                    <View style={[s.empty, slot === i && s.selected]}>
                      <Text style={s.emptyPos}>{sl.pos}</Text>
                    </View>
                    <Text style={s.tokenName}>Tap to pick</Text>
                  </>
                )}
              </Pressable>
            );
          })}
        </View>
        <Text style={s.legend}>
          Tap a position to pick a player. Orange or red rating = playing out of position.
        </Text>

        <Button label="AUTO-PICK BEST XI" variant="light" onPress={() => dispatch({ type: 'autoPick' })} />

        <SectionTitle>{`RESERVES · ${reserves.length}`}</SectionTitle>
        <Card style={s.list}>
          {reserves.length === 0 ? <Text style={s.emptyList}>No reserves. Buy players in Transfers.</Text> : null}
          {reserves.map((p, i) => (
            <PlayerRow key={p.id} player={p} last={i === reserves.length - 1} onPress={() => setDetail(p.id)} />
          ))}
        </Card>

        <SectionTitle>STARTING XI</SectionTitle>
        <Card style={s.list}>
          {xi.map((p, i) =>
            p ? (
              <PlayerRow
                key={p.id}
                player={p}
                captain={state.captainId === p.id}
                slotPos={formation.slots[i].pos}
                last={i === xi.length - 1}
                onPress={() => setDetail(p.id)}
              />
            ) : null,
          )}
        </Card>
      </ScrollView>

      <SlotPicker slot={slot} onClose={() => setSlot(null)} />
      <PlayerSheet
        player={state.squad.find((p) => p.id === detail) ?? null}
        mode="squad"
        onClose={() => setDetail(null)}
      />
    </>
  );
}

function PlayerRow({
  player,
  onPress,
  last,
  captain,
  slotPos,
}: {
  player: Player;
  onPress: () => void;
  last?: boolean;
  captain?: boolean;
  slotPos?: Player['positions'][number];
}) {
  const r = slotPos ? ratingAt(player, slotPos) : player.rating;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.row, !last && s.rowBorder, pressed && s.rowPressed]}>
      {slotPos ? (
        <Text style={[s.rowSlot, { color: lineColors[LINE_OF[slotPos]] }]}>{slotPos}</Text>
      ) : null}
      <View style={s.rowMain}>
        <Text style={s.rowName} numberOfLines={1}>
          {player.flag} {player.name}
          {captain ? '  Ⓒ' : ''}
        </Text>
        <View style={s.rowMeta}>
          <PosTags positions={player.positions} size={12} />
          <Text style={s.rowAge}>Age {player.age}</Text>
        </View>
      </View>
      <RatingBadge value={r} size={34} tone={penaltyTone(player.rating - r)} />
    </Pressable>
  );
}

function SlotPicker({ slot, onClose }: { slot: number | null; onClose: () => void }) {
  const { state, dispatch } = useCareer();
  if (slot === null) return null;
  const pos = FORMATIONS[state.formation].slots[slot].pos;
  const current = state.lineup[slot];
  const options = [...state.squad].sort((a, b) => ratingAt(b, pos) - ratingAt(a, pos));
  const slotOf = (id: string) => state.lineup.indexOf(id);
  const assign = (playerId: string | null) => {
    dispatch({ type: 'assign', slot, playerId });
    onClose();
  };

  return (
    <Sheet
      visible
      title={`Pick a player for ${pos}`}
      onClose={onClose}
      footer={
        current ? (
          <Button label="REMOVE FROM XI" variant="light" small onPress={() => assign(null)} />
        ) : undefined
      }
    >
      {options.map((p) => {
        const r = ratingAt(p, pos);
        const at = slotOf(p.id);
        const isHere = p.id === current;
        const where =
          at >= 0 ? `In XI as ${FORMATIONS[state.formation].slots[at].pos}` : 'Reserve';
        return (
          <Pressable
            key={p.id}
            disabled={isHere}
            onPress={() => assign(p.id)}
            style={({ pressed }) => [s.option, isHere && s.optionHere, pressed && s.rowPressed]}
          >
            <View style={s.rowMain}>
              <Text style={s.rowName} numberOfLines={1}>
                {p.name}
              </Text>
              <View style={s.rowMeta}>
                <PosTags positions={p.positions} size={12} />
                <Text style={s.rowAge}>{isHere ? 'Playing here' : where}</Text>
              </View>
            </View>
            {p.rating !== r ? <Text style={s.drop}>−{p.rating - r}</Text> : null}
            <RatingBadge value={r} size={34} tone={penaltyTone(p.rating - r)} />
          </Pressable>
        );
      })}
    </Sheet>
  );
}

const TOKEN_W = 76;

const s = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40, gap: 12 },
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
  rowSlot: { width: 38, fontWeight: '900', fontSize: 13 },
  rowMain: { flex: 1, gap: 3 },
  rowName: { fontSize: 16, fontWeight: '800', color: colors.ink },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowAge: { fontSize: 12, color: colors.muted, fontWeight: '700' },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.border,
    borderBottomWidth: 4,
    borderBottomColor: colors.borderDark,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  optionHere: { borderColor: colors.gold, borderBottomColor: colors.gold, backgroundColor: '#FFF8E6' },
  drop: { color: colors.red, fontWeight: '900', fontSize: 13 },
});

