import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LINE_OF, SQUAD_MAX, SQUAD_MIN } from '../game/constants';
import {
  academyForDraft,
  draftCost,
  draftNeeds,
  draftPlan,
  draftPrice,
  draftWage,
  isAcademy,
  signDraft,
} from '../game/draft';
import type { Crest as CrestData, Line, Player } from '../game/types';
import { useGame } from '../state/GameContext';
import { Bar, Button, Card, Crest, Pill, PosTags, RatingBadge } from '../ui/components';
import { FadeIn } from '../ui/motion';
import { colors, formatMoney } from '../ui/theme';

const LINES: { id: Line | 'ALL' | 'MINE'; label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'GK', label: 'Goalkeepers' },
  { id: 'DF', label: 'Defenders' },
  { id: 'MD', label: 'Midfielders' },
  { id: 'AT', label: 'Attackers' },
  { id: 'MINE', label: 'My squad' },
];

const LINE_NAME: Record<Line, string> = { GK: 'GK', DF: 'DEF', MD: 'MID', AT: 'ATT' };

/** A new club buys its first squad from a pool, within a budget, before the career starts. */
export function DraftScreen({
  name,
  short,
  crest,
  country,
  onBack,
}: {
  name: string;
  short: string;
  crest: CrestData;
  country: string;
  onBack: () => void;
}) {
  const { dispatch } = useGame();
  const insets = useSafeAreaInsets();
  const [seed] = useState(() => Date.now() % 2147483647);
  const plan = useMemo(() => draftPlan(country, seed), [country, seed]);
  const [picked, setPicked] = useState<Player[]>([]);
  const [filter, setFilter] = useState<(typeof LINES)[number]['id']>('ALL');

  const spent = draftCost(picked);
  const left = plan.budget - spent;
  const wages = picked.reduce((sum, p) => sum + (isAcademy(p) ? p.contract.wage : draftWage(p)), 0);
  const needs = draftNeeds(picked);
  const over = spent > plan.suggested;
  const full = picked.length >= SQUAD_MAX;

  const shown =
    filter === 'MINE'
      ? picked
      : plan.pool.filter((p) => filter === 'ALL' || LINE_OF[p.positions[0]] === filter);

  const toggle = (p: Player) =>
    setPicked((list) => (list.some((x) => x.id === p.id) ? list.filter((x) => x.id !== p.id) : [...list, p]));

  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={[s.content, { paddingTop: insets.top + 12 }]}>
        <Text style={s.back} onPress={onBack}>
          ‹ Back
        </Text>
        <View style={s.titleRow}>
          <Crest crest={crest} short={short || '???'} size={44} />
          <View style={s.flex}>
            <Text style={s.title}>Draft your squad</Text>
            <Text style={s.subtitle}>{name.trim() || 'Your club'}</Text>
          </View>
        </View>

        <Card style={s.budget}>
          <View style={s.budgetTop}>
            <View>
              <Text style={s.budgetLabel}>BUDGET LEFT</Text>
              <Text style={[s.budgetValue, left < 0 && { color: colors.red }]}>{formatMoney(left)}</Text>
            </View>
            <View style={s.right}>
              <Text style={s.budgetLabel}>SPENT ON PLAYERS</Text>
              <Text style={[s.spent, over && { color: colors.orange }]}>
                {formatMoney(spent)} <Text style={s.of}>/ {formatMoney(plan.suggested)} suggested</Text>
              </Text>
            </View>
          </View>
          <Bar value={(spent / plan.suggested) * 100} color={over ? colors.orange : colors.green} />
          <Text style={s.hint}>
            Total budget {formatMoney(plan.budget)}. Spend about {formatMoney(plan.suggested)} on players (around{' '}
            {formatMoney(plan.suggested / SQUAD_MIN)} each) and keep the rest for wages and running costs.
            {over ? ' You are above the suggestion: money will be tight.' : ''}
          </Text>
          <Text style={s.hint}>Wages for this squad: {formatMoney(wages)} per season.</Text>
        </Card>

        <View style={s.needs}>
          <View style={[s.need, picked.length >= SQUAD_MIN && s.needDone]}>
            <Text style={[s.needText, picked.length >= SQUAD_MIN && s.needTextDone]}>
              {picked.length}/{SQUAD_MIN} players
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

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.pills}>
          {LINES.map((l) => (
            <Pill
              key={l.id}
              label={l.id === 'MINE' ? `${l.label} · ${picked.length}` : l.label}
              active={filter === l.id}
              onPress={() => setFilter(l.id)}
            />
          ))}
        </ScrollView>

        {shown.length === 0 ? (
          <Text style={s.empty}>Nobody picked yet. Tap + next to a player to sign him.</Text>
        ) : null}
        <Card style={s.list}>
          {shown.map((p, i) => {
            const mine = picked.some((x) => x.id === p.id);
            const price = isAcademy(p) ? 0 : draftPrice(p);
            const cannot = !mine && (price > left || full);
            return (
              <FadeIn key={p.id} delay={Math.min(i, 10) * 20}>
                <Pressable
                  onPress={() => (cannot ? undefined : toggle(p))}
                  accessibilityRole="button"
                  accessibilityLabel={`${mine ? 'Remove' : 'Sign'} ${p.name}`}
                  accessibilityState={{ selected: mine, disabled: cannot }}
                  style={({ pressed }) => [
                    s.row,
                    i < shown.length - 1 && s.rowBorder,
                    mine && s.rowMine,
                    pressed && !cannot && { opacity: 0.7 },
                  ]}
                >
                  <RatingBadge value={p.rating} size={34} />
                  <View style={s.flex}>
                    <Text style={s.name} numberOfLines={1}>
                      {p.flag} {p.name}
                    </Text>
                    <View style={s.meta}>
                      <PosTags positions={p.positions} size={12} />
                      <Text style={s.small}>Age {p.age}</Text>
                      {isAcademy(p) ? <Text style={s.academy}>ACADEMY</Text> : null}
                    </View>
                  </View>
                  <View style={s.right}>
                    <Text style={[s.price, cannot && price > left && { color: colors.red }]}>
                      {price ? formatMoney(price) : 'Free'}
                    </Text>
                    <Text style={s.small}>{formatMoney(isAcademy(p) ? p.contract.wage : draftWage(p))}/yr</Text>
                  </View>
                  <View style={[s.add, mine && s.added, cannot && s.addOff]}>
                    <Text style={[s.addText, mine && { color: '#FFFFFF' }]}>{mine ? '✓' : '+'}</Text>
                  </View>
                </Pressable>
              </FadeIn>
            );
          })}
        </Card>
      </ScrollView>

      <View style={[s.footer, { paddingBottom: insets.bottom + 12 }]}>
        {needs.ready ? (
          <Button
            label="START CAREER"
            variant="green"
            onPress={() =>
              dispatch({ type: 'new', name, short, crest, seed, country, draft: signDraft(country, picked) })
            }
          />
        ) : (
          <>
            <Text style={s.footerText}>
              {needs.missing} more {needs.missing > 1 ? 'players' : 'player'} needed: 11 starters and 7 substitutes,
              with at least 2 GK, 5 DEF, 5 MID and 3 ATT.
            </Text>
            <Button
              label={`FILL ${needs.missing} WITH ACADEMY PLAYERS (FREE)`}
              variant="light"
              small
              onPress={() => {
                setPicked((list) => [...list, ...academyForDraft(list, seed + list.length)]);
                setFilter('MINE');
              }}
            />
          </>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 16, paddingBottom: 24, gap: 12, maxWidth: 640, width: '100%', alignSelf: 'center' },
  flex: { flex: 1 },
  back: { fontSize: 16, fontWeight: '800', color: colors.muted, paddingVertical: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { fontSize: 24, fontWeight: '900', color: colors.ink },
  subtitle: { fontSize: 14, fontWeight: '700', color: colors.muted },
  budget: { gap: 8 },
  budgetTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  budgetLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1, color: colors.muted },
  budgetValue: { fontSize: 28, fontWeight: '900', color: colors.ink },
  spent: { fontSize: 16, fontWeight: '900', color: colors.ink },
  of: { fontSize: 12, fontWeight: '700', color: colors.muted },
  right: { alignItems: 'flex-end' },
  hint: { fontSize: 13, fontWeight: '600', color: colors.muted, lineHeight: 18 },
  needs: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  need: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, backgroundColor: colors.faint },
  needDone: { backgroundColor: '#E1F4E8' },
  needText: { fontSize: 12, fontWeight: '900', color: colors.muted },
  needTextDone: { color: colors.green },
  pills: { gap: 8, paddingRight: 8 },
  empty: { textAlign: 'center', color: colors.muted, fontWeight: '700', marginVertical: 8 },
  list: { paddingVertical: 0, paddingHorizontal: 0, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 12 },
  rowBorder: { borderBottomWidth: 1.5, borderBottomColor: colors.faint },
  rowMine: { backgroundColor: '#FFF8E6' },
  name: { fontSize: 15, fontWeight: '800', color: colors.ink },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  small: { fontSize: 12, fontWeight: '700', color: colors.muted },
  academy: { fontSize: 10, fontWeight: '900', color: colors.green, letterSpacing: 0.5 },
  price: { fontSize: 15, fontWeight: '900', color: colors.ink },
  add: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  added: { backgroundColor: colors.green },
  addOff: { borderColor: colors.border, opacity: 0.5 },
  addText: { fontSize: 18, fontWeight: '900', color: colors.green, marginTop: -1 },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 8,
    backgroundColor: colors.card,
    borderTopWidth: 1.5,
    borderTopColor: colors.border,
  },
  footerText: { fontSize: 13, fontWeight: '700', color: colors.ink, textAlign: 'center' },
});
