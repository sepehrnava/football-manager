import { StyleSheet, Text, View } from 'react-native';

import { prospectRange, YOUTH_CONTRACT } from '../game/academy';
import { SQUAD_MAX } from '../game/constants';
import { useCareer } from '../state/GameContext';
import { Button, PosTags, RatingBadge, RatingWithPotential, Sheet } from '../ui/components';
import { colors, formatMoney } from '../ui/theme';
import { Stars } from './StaffSheet';

/** The pre-season academy intake: promote one prospect for free; the others leave at kick-off. */
export function AcademySheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { state, dispatch } = useCareer();
  const intake = state.academy?.prospects ?? [];
  if (!visible || !intake.length) return null;
  const stars = state.staff?.youth?.stars ?? 1;
  const full = state.squad.length >= SQUAD_MAX;
  return (
    <Sheet visible title="Academy intake" onClose={onClose}>
      <Text style={s.text}>
        Promote one for free on a {formatMoney(YOUTH_CONTRACT.wage)} youth wage. The others leave at kick-off.
      </Text>
      <View style={s.coach}>
        <Text style={s.coachText}>Your youth coach judges their potential</Text>
        <Stars n={stars} size={13} />
      </View>
      {intake.map((p, i) => (
        <View key={p.id} style={[s.row, i > 0 && s.line]}>
          <RatingWithPotential
            badge={<RatingBadge value={p.rating} size={38} />}
            rating={p.rating}
            potential={prospectRange(p, stars)}
          />
          <View style={s.main}>
            <Text style={s.name} numberOfLines={1}>
              {p.flag} {p.name}
            </Text>
            <View style={s.meta}>
              <PosTags positions={p.positions} size={12} />
              <Text style={s.age}>Age {p.age}</Text>
            </View>
          </View>
          <Button
            label="PROMOTE"
            variant="green"
            small
            disabled={full}
            onPress={() => {
              dispatch({ type: 'promoteProspect', playerId: p.id });
              onClose();
            }}
          />
        </View>
      ))}
      {full ? <Text style={s.full}>Your squad is full ({SQUAD_MAX}). Sell a player to make room.</Text> : null}
    </Sheet>
  );
}

const s = StyleSheet.create({
  text: { fontSize: 14, fontWeight: '600', color: colors.muted, lineHeight: 20, marginBottom: 10 },
  coach: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  coachText: { fontSize: 13, fontWeight: '800', color: colors.ink },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  line: { borderTopWidth: 1, borderTopColor: colors.border },
  main: { flex: 1, gap: 3 },
  name: { fontSize: 16, fontWeight: '900', color: colors.ink },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  age: { fontSize: 12, fontWeight: '700', color: colors.muted },
  full: { fontSize: 13, fontWeight: '700', color: colors.red, marginTop: 8 },
});
