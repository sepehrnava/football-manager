import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FORMATIONS } from '../game/constants';
import { canTrade } from '../game/game';
import { DEFAULT_FINDER, findPlayers } from '../game/finder';
import { ratingAt, ratingRange } from '../game/players';
import type { Found } from '../game/finder';
import { useCareer } from '../state/GameContext';
import { Button, Sheet } from '../ui/components';
import { colors } from '../ui/theme';
import { PlayerSheet } from './PlayerSheet';
import { MarketRow } from './TransfersScreen';

const SHOWN = 15;

/**
 * Players for one pitch position, opened from the Squad tab so buying doesn't mean leaving the
 * lineup. "Better than my XI" first, or everyone by rating. After a signing the sheet closes.
 */
export function SlotMarketSheet({ slot, onClose }: { slot: number | null; onClose: () => void }) {
  const { state } = useCareer();
  const position = slot === null ? null : FORMATIONS[state.formation].slots[slot].pos;
  const [all, setAll] = useState(false);
  const [detail, setDetail] = useState<string | null>(null);
  const found = useMemo((): Found[] => {
    if (!position || slot === null) return [];
    const starter = state.squad.find((p) => p.id === state.lineup[slot]);
    const current = starter ? ratingAt(starter, position) : 25;
    // What a player is sure to add in this slot: the bottom of his rating range, as everywhere in the finder.
    const gain = (p: Found['player']) =>
      Math.round(ratingAt({ positions: p.positions, rating: ratingRange(p, state.scouting[p.id] ?? 0)[0] }, position) - current);
    const list = findPlayers(state, { ...DEFAULT_FINDER, tab: all ? 'browse' : 'foryou', position }).map(({ player }) => ({
      player,
      gain: gain(player),
    }));
    const kept = all ? list : list.filter((f) => f.gain >= 1).sort((a, b) => b.gain - a.gain);
    return kept.map(({ player, gain: g }) => ({ player, note: g >= 1 ? `At least +${g} at ${position}` : undefined }));
  },
    // Results depend on the market, your squad and your budget, not on every state change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.world, state.squad, state.lineup, state.formation, state.money, state.scouting, slot, position, all],
  );
  if (!position) return null;
  const closeDetail = () => {
    // A player who just joined is in the squad now: done here, back to the lineup to place him.
    const signed = detail && state.squad.some((p) => p.id === detail);
    setDetail(null);
    if (signed) onClose();
  };
  return (
    <>
      <Sheet visible={!detail} title={`Find ${position}`} onClose={onClose}>
        <View style={s.tabs}>
          <Button label="IMPROVES MY XI" variant={all ? 'light' : 'dark'} small style={s.flex} onPress={() => setAll(false)} />
          <Button label="ALL, BY RATING" variant={all ? 'dark' : 'light'} small style={s.flex} onPress={() => setAll(true)} />
        </View>
        {!canTrade(state) ? <Text style={s.note}>Window closed: you can look, but deals wait.</Text> : null}
        {found.length === 0 ? (
          <Text style={s.empty}>
            {all ? `Nobody found for ${position}.` : `Nobody you can afford would improve your XI at ${position}. Try All, by rating.`}
          </Text>
        ) : null}
        {found.slice(0, SHOWN).map(({ player, note }) => (
          <MarketRow key={player.id} player={player} note={note} onPress={() => setDetail(player.id)} />
        ))}
      </Sheet>
      <PlayerSheet playerId={detail} mode="market" onClose={closeDetail} />
    </>
  );
}

const s = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  flex: { flex: 1 },
  note: { fontSize: 13, fontWeight: '700', color: colors.red, marginBottom: 8 },
  empty: { textAlign: 'center', color: colors.muted, fontWeight: '700', marginVertical: 12 },
});
