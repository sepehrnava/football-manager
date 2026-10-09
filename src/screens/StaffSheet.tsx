import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { canTrade } from '../game/game';
import { hireCost, ROLE_INFO, STAFF_ROLES, staffEffect } from '../game/staff';
import type { Staff, StaffRole } from '../game/types';
import { useCareer } from '../state/GameContext';
import { Button, Sheet } from '../ui/components';
import { colors, formatMoney } from '../ui/theme';

export function Stars({ n, size = 13 }: { n: number; size?: number }) {
  return (
    <Text style={{ fontSize: size, color: colors.gold, fontWeight: '900' }}>
      {'★'.repeat(n)}
      <Text style={{ color: colors.border }}>{'★'.repeat(5 - n)}</Text>
    </Text>
  );
}

/** Current staff per role and the candidates you can hire this window. */
export function StaffSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { state, dispatch } = useCareer();
  const [role, setRole] = useState<StaffRole>('coach');
  if (!visible) return null;
  const open = canTrade(state);
  const current = state.staff?.[role];
  const candidates = (state.staffMarket ?? []).filter((c) => c.role === role).sort((a, b) => b.stars - a.stars);

  return (
    <Sheet visible title="Staff" onClose={onClose}>
      <View style={s.tabs}>
        {STAFF_ROLES.map((r) => (
          <Pressable key={r} onPress={() => setRole(r)} style={[s.tab, role === r && s.tabOn]} accessibilityRole="tab">
            <Text style={[s.tabText, role === r && s.tabTextOn]}>
              {ROLE_INFO[r].title}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={s.what}>{ROLE_INFO[role].what}.</Text>

      <Text style={s.section}>YOUR {ROLE_INFO[role].title.toUpperCase()}</Text>
      {current ? <StaffRow staff={current} /> : <Text style={s.muted}>Nobody yet.</Text>}

      <Text style={s.section}>AVAILABLE {open ? '' : '(HIRE IN A TRANSFER WINDOW)'}</Text>
      {candidates.map((c) => {
        const cost = hireCost(state, c);
        return (
          <StaffRow key={c.id} staff={c}>
            <Button
              label={`HIRE ${formatMoney(cost)}`}
              variant="green"
              small
              disabled={!open || cost > state.money}
              onPress={() => dispatch({ type: 'hireStaff', staffId: c.id })}
            />
          </StaffRow>
        );
      })}
      <Text style={s.hint}>Hiring costs a season of wages up front.</Text>
    </Sheet>
  );
}

function StaffRow({ staff, children }: { staff: Staff; children?: ReactNode }) {
  return (
    <View style={s.row}>
      <View style={s.rowMain}>
        <Text style={s.name}>
          {staff.flag} {staff.name}
        </Text>
        <Stars n={staff.stars} size={14} />
        <Text style={s.effect}>{staffEffect(staff)}</Text>
        <Text style={s.muted}>{formatMoney(staff.wage)} per season</Text>
      </View>
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 12, alignItems: 'center', backgroundColor: colors.faint },
  tabOn: { backgroundColor: colors.ink },
  tabText: { fontSize: 12, fontWeight: '800', color: colors.muted },
  tabTextOn: { color: '#FFFFFF' },
  what: { fontSize: 14, fontWeight: '600', color: colors.muted, marginBottom: 6 },
  section: { fontSize: 11, fontWeight: '900', letterSpacing: 1.2, color: colors.muted, marginTop: 12, marginBottom: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowMain: { flex: 1, gap: 2 },
  name: { fontSize: 15, fontWeight: '900', color: colors.ink },
  effect: { fontSize: 13, fontWeight: '800', color: colors.green },
  muted: { fontSize: 12, fontWeight: '700', color: colors.muted },
  hint: { fontSize: 12, fontWeight: '600', color: colors.muted, marginTop: 8, lineHeight: 17 },
});
