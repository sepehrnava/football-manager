import { StyleSheet, Text, View } from 'react-native';

import { seasonForecast } from '../game/game';
import { useCareer } from '../state/GameContext';
import { Row, SectionTitle, Sheet } from '../ui/components';
import { colors, formatMoney, ordinal } from '../ui/theme';

/** Where the season's money is heading: expected income and costs, and the balance at the end. */
export function MoneySheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { state } = useCareer();
  if (!visible) return null;
  const f = seasonForecast(state);
  const minus = (n: number) => (n ? `-${formatMoney(n)}` : formatMoney(0));
  return (
    <Sheet visible title="Season money" onClose={onClose}>
      <View style={s.top}>
        <Figure label="NOW" value={formatMoney(f.now)} />
        <Figure label="SEASON END" value={`~${formatMoney(f.end)}`} color={f.end < 0 ? colors.red : colors.ink} />
        <Figure label="SAFE TO SPEND" value={formatMoney(f.safeToSpend)} color={colors.green} />
      </View>

      <SectionTitle>{`INCOME · IF YOU FINISH ${ordinal(f.position).toUpperCase()}`}</SectionTitle>
      <Row label="Prize money" value={formatMoney(f.income.prize)} />
      <Row label="Fans" value={formatMoney(f.income.fanIncome)} />
      <Row label="Sponsors" value={formatMoney(f.income.sponsor)} />
      {f.income.tv ? <Row label="TV money" value={formatMoney(f.income.tv)} /> : null}
      {f.income.cups ? <Row label="Cups so far" value={formatMoney(f.income.cups)} /> : null}

      <SectionTitle>COSTS</SectionTitle>
      <Row label="Player wages" value={minus(f.costs.wages)} color={colors.red} />
      <Row label="Staff wages" value={minus(f.costs.staff)} color={colors.red} />
      <Row label="Running the club" value={minus(f.costs.fixedCosts)} color={colors.red} />
      {f.bonuses ? <Row label="Top-finish bonuses" value={minus(f.bonuses)} color={colors.red} /> : null}
      {f.stakeholder ? <Row label="Owners' share of profit" value={minus(f.stakeholder)} color={colors.red} /> : null}

      <View style={s.total}>
        <Row
          label="Season result"
          value={`${f.net >= 0 ? '+' : ''}${formatMoney(f.net)}`}
          color={f.net >= 0 ? colors.green : colors.red}
          bold
        />
      </View>
      <Text style={s.note}>
        Wages are paid at the end of the season. A new signing costs its fee now and its wage then.
      </Text>
    </Sheet>
  );
}

function Figure({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={s.figure}>
      <Text style={[s.figureValue, color ? { color } : null]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={s.figureLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  top: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: 16, paddingVertical: 14 },
  figure: { flex: 1, alignItems: 'center', gap: 2 },
  figureValue: { fontSize: 18, fontWeight: '900', color: colors.ink },
  figureLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1, color: colors.muted },
  total: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 6, paddingTop: 4 },
  note: { fontSize: 12, fontWeight: '600', color: colors.muted, marginTop: 8, lineHeight: 17 },
});
