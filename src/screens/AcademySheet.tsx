import { StyleSheet, Text, View } from 'react-native';

import { academyCallUpBlocker, ACADEMY_WAGE } from '../game/market';
import { staffEffect } from '../game/staff';
import { useCareer } from '../state/GameContext';
import { Button, PosTags, RatingBadge, RatingWithPotential, Sheet } from '../ui/components';
import { FadeIn } from '../ui/motion';
import { colors, formatMoney } from '../ui/theme';
import { Stars } from './StaffSheet';

/** The club's academy: youth coach, academy players in the squad, and one call-up per window. */
export function AcademySheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { state, dispatch } = useCareer();
  if (!visible) return null;
  const coach = state.staff?.youth;
  // Newest first, so a fresh call-up appears at the top.
  const youth = state.squad.filter((p) => p.fromAcademy).reverse();
  const blocker = academyCallUpBlocker(state);

  const footer = (
    <View style={s.footer}>
      {blocker ? <Text style={s.blocker}>{blocker}</Text> : null}
      <Button
        label={`CALL UP A YOUNGSTER · ${formatMoney(ACADEMY_WAGE)} WAGE`}
        variant="green"
        disabled={!!blocker}
        onPress={() => dispatch({ type: 'academyCallUp' })}
      />
    </View>
  );

  return (
    <Sheet visible title="Academy" onClose={onClose} footer={footer}>
      <Text style={s.what}>
        Youngsters aged 16–18. One graduates every season end, and they fill gaps when you sell.
      </Text>

      <Text style={s.section}>YOUTH COACH</Text>
      {coach ? (
        <View style={s.row}>
          <View style={s.rowMain}>
            <Text style={s.name}>
              {coach.flag} {coach.name}
            </Text>
            <Text style={s.effect}>{staffEffect(coach)}</Text>
          </View>
          <Stars n={coach.stars} size={14} />
        </View>
      ) : (
        <Text style={s.muted}>Nobody yet. Hire one under Staff.</Text>
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
                  <Text style={s.muted}>{p.age}</Text>
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
  footer: { gap: 8 },
  blocker: { textAlign: 'center', fontSize: 13, fontWeight: '800', color: colors.muted },
});
