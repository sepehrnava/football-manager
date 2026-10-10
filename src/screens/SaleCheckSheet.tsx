import { StyleSheet, Text, View } from 'react-native';

import { saleImpact } from '../game/insights';
import { ratingAt, surname } from '../game/players';
import { useCareer } from '../state/GameContext';
import { PosTags, RatingBadge, SectionTitle, Sheet } from '../ui/components';
import { colors } from '../ui/theme';

/** "Is he vital?": where a player to be sold plays, what the sale does to the XI, and who could replace him. */
export function SaleCheckSheet({ playerId, onClose }: { playerId: string | null; onClose: () => void }) {
  const { state } = useCareer();
  const p = playerId ? state.squad.find((m) => m.id === playerId) : undefined;
  const impact = p && saleImpact(state, p.id);
  if (!p || !impact) return null;
  const drop = impact.after - impact.before;
  const same = state.squad
    .filter((m) => m.id !== p.id && m.positions.some((pos) => p.positions.includes(pos)))
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 6);
  return (
    <Sheet visible title="Check squad" onClose={onClose}>
      <View style={s.top}>
        <View style={s.main}>
          <Text style={s.name}>{p.name}</Text>
          <PosTags positions={p.positions} />
        </View>
        <RatingBadge value={p.rating} size={40} />
      </View>
      <Text style={s.line}>
        {impact.slot ? `Starts at ${impact.slot} in your XI.` : 'Not in your XI: a substitute or reserve.'}
      </Text>
      <Text style={s.line}>
        XI power <Text style={s.strong}>{impact.before}</Text> → <Text style={s.strong}>{impact.after}</Text>{' '}
        <Text style={{ color: drop < 0 ? colors.red : colors.green, fontWeight: '900' }}>
          {drop === 0 ? '(no change)' : `(${drop > 0 ? '+' : ''}${drop})`}
        </Text>
      </Text>
      {impact.slot ? (
        <Text style={s.line}>
          {impact.cover
            ? `${surname(impact.cover.name)} (${ratingAt(impact.cover, impact.slot)} at ${impact.slot}) would take his place: ${p.rating - ratingAt(impact.cover, impact.slot)} lower than ${surname(p.name)}.`
            : 'Nobody is free to take his place: the slot would stay empty.'}
        </Text>
      ) : null}
      <SectionTitle>{`SAME POSITIONS · ${same.length}`}</SectionTitle>
      {same.length === 0 ? <Text style={s.empty}>No other player covers his positions.</Text> : null}
      {same.map((m) => (
        <View key={m.id} style={s.row}>
          <View style={s.main}>
            <Text style={s.rowName} numberOfLines={1}>
              {m.name}
            </Text>
            <Text style={s.small}>{state.lineup.includes(m.id) ? 'In your XI' : 'Bench or reserve'}</Text>
          </View>
          <PosTags positions={m.positions} size={12} />
          <RatingBadge value={m.rating} size={32} />
        </View>
      ))}
    </Sheet>
  );
}

const s = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  main: { flex: 1, minWidth: 0, gap: 3 },
  name: { fontSize: 20, fontWeight: '900', color: colors.ink },
  line: { fontSize: 15, fontWeight: '700', color: colors.ink, marginBottom: 8, lineHeight: 21 },
  strong: { fontWeight: '900' },
  empty: { fontSize: 14, fontWeight: '700', color: colors.muted, marginTop: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowName: { fontSize: 15, fontWeight: '800', color: colors.ink },
  small: { fontSize: 12, fontWeight: '700', color: colors.muted },
});
