import { StyleSheet, Text, View } from 'react-native';

import { prospectRange, YOUTH_CONTRACT } from '../game/academy';
import { SQUAD_MAX } from '../game/constants';
import { staffEffect } from '../game/staff';
import { useCareer } from '../state/GameContext';
import { Button, PosTags, RatingBadge, RatingWithPotential, Sheet } from '../ui/components';
import { FadeIn } from '../ui/motion';
import { colors, formatMoney } from '../ui/theme';
import { Stars } from './StaffSheet';

/**
 * The club's academy, always open: the youth coach, this pre-season's intake (promote one for
 * free; the others leave at kick-off) and the academy players already in the squad.
 */
export function AcademySheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { state, dispatch } = useCareer();
  if (!visible) return null;
  const coach = state.staff?.youth;
  const stars = coach?.stars ?? 1;
  const intake = state.phase === 'window' && !state.challenge ? (state.academy?.prospects ?? []) : [];
  const full = state.squad.length >= SQUAD_MAX;
  // Newest first, so a fresh promotion appears at the top.
  const youth = state.squad.filter((p) => p.fromAcademy).reverse();

  return (
    <Sheet visible title="Academy" onClose={onClose}>
      <Text style={s.what}>
        Each pre-season, promote one prospect for free on a {formatMoney(YOUTH_CONTRACT.wage)} youth wage.
      </Text>

      <Text style={s.section}>YOUTH COACH</Text>
      {coach ? (
        <View style={s.row}>
          <View style={s.rowMain}>
            <Text style={s.name}>
              {coach.flag} {coach.name}
            </Text>
            <Text style={s.effect}>{staffEffect(coach)} · judges potential</Text>
          </View>
          <Stars n={coach.stars} size={14} />
        </View>
      ) : (
        <Text style={s.muted}>Nobody yet. Hire one under Staff.</Text>
      )}

      <Text style={s.section}>{intake.length ? 'INTAKE · PROMOTE 1' : 'INTAKE'}</Text>
      {intake.length ? (
        <>
          {intake.map((p) => (
            <View key={p.id} style={s.row}>
              <RatingWithPotential
                badge={<RatingBadge value={p.rating} size={34} />}
                rating={p.rating}
                potential={prospectRange(p, stars)}
              />
              <View style={s.rowMain}>
                <Text style={s.name} numberOfLines={1}>
                  {p.flag} {p.name}
                </Text>
                <View style={s.meta}>
                  <PosTags positions={p.positions} size={12} />
                  <Text style={s.muted}>Age {p.age}</Text>
                </View>
              </View>
              <Button
                label="PROMOTE"
                variant="green"
                small
                disabled={full}
                onPress={() => dispatch({ type: 'promoteProspect', playerId: p.id })}
              />
            </View>
          ))}
          <Text style={s.hint}>
            {full ? `Your squad is full (${SQUAD_MAX}). Sell a player to make room.` : 'The others leave at kick-off.'}
          </Text>
        </>
      ) : (
        <Text style={s.muted}>New prospects arrive next pre-season.</Text>
      )}

      <Text style={s.section}>ACADEMY PLAYERS · {youth.length}</Text>
      {youth.length ? (
        youth.map((p) => (
          <FadeIn key={p.id}>
            <View style={s.row}>
              <RatingWithPotential
                badge={<RatingBadge value={p.rating} size={34} />}
                rating={p.rating}
                potential={[p.potential, p.potential]}
              />
              <View style={s.rowMain}>
                <Text style={s.name} numberOfLines={1}>
                  {p.flag} {p.name}
                </Text>
                <View style={s.meta}>
                  <PosTags positions={p.positions} size={12} />
                  <Text style={s.muted}>Age {p.age}</Text>
                </View>
              </View>
            </View>
          </FadeIn>
        ))
      ) : (
        <Text style={s.muted}>None in your squad yet.</Text>
      )}
    </Sheet>
  );
}

const s = StyleSheet.create({
  what: { fontSize: 14, fontWeight: '600', color: colors.muted, lineHeight: 20 },
  section: { fontSize: 11, fontWeight: '900', letterSpacing: 1.2, color: colors.muted, marginTop: 14, marginBottom: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowMain: { flex: 1, minWidth: 0, gap: 3 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 8, rowGap: 2 },
  name: { fontSize: 15, fontWeight: '900', color: colors.ink },
  effect: { fontSize: 13, fontWeight: '800', color: colors.green },
  muted: { fontSize: 13, fontWeight: '700', color: colors.muted },
  hint: { fontSize: 12, fontWeight: '700', color: colors.muted, marginTop: 6 },
});
