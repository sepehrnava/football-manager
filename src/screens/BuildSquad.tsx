import { StyleSheet, Text, View } from 'react-native';

import { SQUAD_MIN } from '../game/constants';
import { newClubBudget, userComp } from '../game/game';
import { squadNeeds } from '../game/market';
import type { Line } from '../game/types';
import { useCareer } from '../state/GameContext';
import { Bar, Button, Card } from '../ui/components';
import { colors, formatMoney } from '../ui/theme';

const LINE_NAME: Record<Line, string> = { GK: 'GK', DF: 'DEF', MD: 'MID', AT: 'ATT' };

/** Shown until the squad is complete: what is missing, the budget advice, and the ways to fill it. */
export function BuildSquadCard({ onFindPlayers }: { onFindPlayers: () => void }) {
  const { state, dispatch } = useCareer();
  const needs = squadNeeds(state.squad);
  if (needs.ready) return null;
  const firstWindow = state.history.length === 0 && state.round === 0;
  const plan = newClubBudget(userComp(state).country);
  const spent = Math.max(0, plan.budget - state.money);
  const over = spent > plan.suggested;
  return (
    <Card style={s.card}>
      <Text style={s.title}>Build your squad</Text>
      <Text style={s.text}>
        You need {SQUAD_MIN} players (11 starters and 7 substitutes) before you can kick off: at least 2 GK, 5 DEF,
        5 MID and 3 ATT. Find, scout and buy them in Transfers.
      </Text>
      <View style={s.needs}>
        <View style={[s.need, state.squad.length >= SQUAD_MIN && s.needDone]}>
          <Text style={[s.needText, state.squad.length >= SQUAD_MIN && s.needTextDone]}>
            {state.squad.length}/{SQUAD_MIN} players
          </Text>
        </View>
        {needs.lines.map((l) => (
          <View key={l.line} style={[s.need, l.have >= l.need && s.needDone]}>
            <Text style={[s.needText, l.have >= l.need && s.needTextDone]}>
              {LINE_NAME[l.line]} {l.have}/{l.need}
            </Text>
          </View>
        ))}
      </View>
      {firstWindow ? (
        <View style={s.money}>
          <View style={s.moneyRow}>
            <Text style={s.moneyLabel}>Spent on players</Text>
            <Text style={[s.moneyValue, over && { color: colors.orange }]}>
              {formatMoney(spent)} / {formatMoney(plan.suggested)} suggested
            </Text>
          </View>
          <Bar value={(spent / plan.suggested) * 100} color={over ? colors.orange : colors.green} />
          <Text style={s.hint}>
            Spend about {formatMoney(plan.suggested)} on players (around {formatMoney(plan.suggested / SQUAD_MIN)} each)
            and keep the rest of your {formatMoney(plan.budget)} for wages and running costs.
            {over ? ' You are above the suggestion: money will be tight.' : ''}
          </Text>
        </View>
      ) : null}
      <View style={s.buttons}>
        <Button label="FIND PLAYERS" variant="green" small style={s.flex} onPress={onFindPlayers} />
        <Button
          label={`+${needs.missing} ACADEMY (FREE)`}
          variant="light"
          small
          style={s.flex}
          onPress={() => dispatch({ type: 'fillAcademy' })}
        />
      </View>
    </Card>
  );
}

const s = StyleSheet.create({
  card: { gap: 10, backgroundColor: '#FFF8E6', borderColor: '#F6DFA6' },
  title: { fontSize: 20, fontWeight: '900', color: colors.ink },
  text: { fontSize: 14, fontWeight: '600', color: colors.ink, lineHeight: 20 },
  needs: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  need: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, backgroundColor: '#FFFFFF' },
  needDone: { backgroundColor: '#E1F4E8' },
  needText: { fontSize: 12, fontWeight: '900', color: colors.muted },
  needTextDone: { color: colors.green },
  money: { gap: 6 },
  moneyRow: { flexDirection: 'row', justifyContent: 'space-between' },
  moneyLabel: { fontSize: 13, fontWeight: '800', color: colors.ink },
  moneyValue: { fontSize: 13, fontWeight: '900', color: colors.ink },
  hint: { fontSize: 12, fontWeight: '600', color: colors.muted, lineHeight: 17 },
  buttons: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
});
