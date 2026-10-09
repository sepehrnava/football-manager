import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { canTrade } from '../game/game';
import { hireCost, ROLE_INFO, STAFF_ROLES, staffEffect } from '../game/staff';
import type { Staff, StaffRole } from '../game/types';
import { useCareer } from '../state/GameContext';
import { Button, Card, Icon, Sheet, Text, type IconName } from '../ui/components';
import { colors, formatMoney } from '../ui/theme';

export const ROLE_ICONS: Record<StaffRole, IconName> = {
  coach: 'whistle',
  youth: 'sprout',
  scout: 'binoculars',
};

export function Stars({ n, size = 14 }: { n: number; size?: number }) {
  return (
    <View style={s.stars} accessibilityLabel={`${n} stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Icon key={i} name="star" size={size} color={i <= n ? colors.gold : colors.border} />
      ))}
    </View>
  );
}

/** The Staff view on the Squad tab: one card per role. */
export function StaffPanel({ onChange }: { onChange: (role: StaffRole) => void }) {
  const { state } = useCareer();
  const open = canTrade(state);
  return (
    <View style={s.panel}>
      {STAFF_ROLES.map((role) => {
        const st = state.staff?.[role];
        return (
          <Card key={role} style={s.roleCard}>
            <View style={s.roleHead}>
              <View style={s.roleIcon}>
                <Icon name={ROLE_ICONS[role]} size={22} color={colors.greenDark} />
              </View>
              <View style={s.flex}>
                <Text style={s.roleTitle}>{ROLE_INFO[role].title}</Text>
                <Text style={s.roleWhat}>{ROLE_INFO[role].what}</Text>
              </View>
            </View>
            {st ? (
              <View style={s.person}>
                <View style={s.flex}>
                  <Text style={s.name} numberOfLines={1}>
                    {st.flag} {st.name}
                  </Text>
                  <Stars n={st.stars} />
                  <Text style={s.effect}>{staffEffect(st)}</Text>
                </View>
                <View style={s.right}>
                  <Text style={s.wage}>{formatMoney(st.wage)}</Text>
                  <Text style={s.per}>per season</Text>
                </View>
              </View>
            ) : (
              <Text style={s.muted}>Nobody yet</Text>
            )}
            <Button label="See candidates" icon="account-search" variant="secondary" size="sm" onPress={() => onChange(role)} />
          </Card>
        );
      })}
      <Text style={s.hint}>
        {open ? 'The transfer window is open: you can hire staff now.' : 'You can hire staff during a transfer window.'}
      </Text>
    </View>
  );
}

/** Candidates for one role, with the cost of hiring each. */
export function StaffSheet({ role, onClose }: { role: StaffRole | null; onClose: () => void }) {
  const { state, dispatch } = useCareer();
  if (!role) return null;
  const open = canTrade(state);
  const current = state.staff?.[role];
  const candidates = (state.staffMarket ?? []).filter((c) => c.role === role).sort((a, b) => b.stars - a.stars);

  return (
    <Sheet visible title={ROLE_INFO[role].title} subtitle={ROLE_INFO[role].what} onClose={onClose}>
      {current ? (
        <>
          <Text style={s.section}>YOURS NOW</Text>
          <StaffRow staff={current} />
        </>
      ) : null}
      <Text style={s.section}>{open ? 'AVAILABLE' : 'AVAILABLE IN THE NEXT WINDOW'}</Text>
      {candidates.map((c) => {
        const cost = hireCost(state, c);
        return (
          <StaffRow key={c.id} staff={c}>
            <Button
              label={`Hire ${formatMoney(cost)}`}
              size="sm"
              disabled={!open || cost > state.money}
              onPress={() => dispatch({ type: 'hireStaff', staffId: c.id })}
            />
          </StaffRow>
        );
      })}
      <Text style={s.hint}>Hiring costs one season of wages up front, plus half a season to release the person you replace.</Text>
    </Sheet>
  );
}

function StaffRow({ staff, children }: { staff: Staff; children?: ReactNode }) {
  return (
    <Card style={s.row}>
      <View style={s.flex}>
        <Text style={s.name} numberOfLines={1}>
          {staff.flag} {staff.name}
        </Text>
        <Stars n={staff.stars} />
        <Text style={s.effect}>{staffEffect(staff)}</Text>
        <Text style={s.per}>{formatMoney(staff.wage)} per season</Text>
      </View>
      {children}
    </Card>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, minWidth: 0, gap: 3 },
  stars: { flexDirection: 'row', gap: 1 },
  panel: { gap: 12 },
  roleCard: { gap: 12 },
  roleHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  roleIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleTitle: { fontSize: 16, fontWeight: '800', color: colors.ink },
  roleWhat: { fontSize: 13, fontWeight: '500', color: colors.muted },
  person: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.inset, borderRadius: 12, padding: 12 },
  right: { alignItems: 'flex-end' },
  name: { fontSize: 15, fontWeight: '700', color: colors.ink },
  effect: { fontSize: 13, fontWeight: '700', color: colors.greenDark },
  wage: { fontSize: 15, fontWeight: '800', color: colors.ink },
  per: { fontSize: 12, fontWeight: '500', color: colors.muted },
  muted: { fontSize: 14, fontWeight: '600', color: colors.muted },
  section: { fontSize: 12, fontWeight: '800', letterSpacing: 1.2, color: colors.muted, marginBottom: -4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  hint: { fontSize: 13, fontWeight: '500', color: colors.muted, textAlign: 'center', lineHeight: 18 },
});
