import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { MID_WINDOW_ROUND } from '../game/constants';
import { canTrade, defaultScoutBudget, SCOUT_BUDGETS, seasonCosts } from '../game/game';
import { playerValue, playerWage } from '../game/players';
import type { Line } from '../game/types';
import { useCareer } from '../state/GameContext';
import { Button, Card, Pill, PosTags, RatingBadge, Row, SectionTitle } from '../ui/components';
import { colors, formatMoney, lineColors } from '../ui/theme';
import { PlayerSheet } from './PlayerSheet';

const LINES: (Line | 'ALL')[] = ['ALL', 'GK', 'DF', 'MD', 'AT'];

export function TransfersScreen() {
  const { state, dispatch } = useCareer();
  const [budget, setBudget] = useState(() => defaultScoutBudget(state.money));
  const [line, setLine] = useState<Line | 'ALL'>('ALL');
  const [detail, setDetail] = useState<string | null>(null);
  const open = canTrade(state);
  const costs = seasonCosts(state);

  return (
    <>
      <ScrollView contentContainerStyle={s.content}>
        <Card style={[s.banner, open ? s.bannerOpen : s.bannerClosed]}>
          <Text style={s.bannerTitle}>
            {open
              ? state.window === 'pre'
                ? 'Pre-season window is open'
                : 'Mid-season window is open'
              : 'Transfer window closed'}
          </Text>
          <Text style={s.bannerText}>
            {open
              ? 'Buy and sell now. The window closes when you kick off.'
              : state.round < MID_WINDOW_ROUND
                ? `Opens again after matchday ${MID_WINDOW_ROUND}.`
                : 'Opens again after the season ends.'}
          </Text>
        </Card>

        <Card>
          <Row label="Money" value={formatMoney(state.money)} bold />
          <Row label="Squad yearly cost" value={formatMoney(costs.wages)} />
          <Row label="Squad size" value={`${state.squad.length} players`} />
        </Card>

        {open ? (
          <>
            <SectionTitle>SCOUT BY BUDGET</SectionTitle>
            <Card style={s.scout}>
              <Text style={s.label}>Max price</Text>
              <View style={s.wrap}>
                {SCOUT_BUDGETS.map((b) => (
                  <Pressable
                    key={b}
                    onPress={() => setBudget(b)}
                    style={[s.chip, budget === b && s.chipActive]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: budget === b }}
                  >
                    <Text style={[s.chipText, budget === b && s.chipTextActive]}>{formatMoney(b)}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={s.label}>Position</Text>
              <View style={s.wrap}>
                {LINES.map((l) => (
                  <Pill
                    key={l}
                    label={l === 'ALL' ? 'All' : l}
                    active={line === l}
                    color={l === 'ALL' ? undefined : lineColors[l]}
                    onPress={() => setLine(l)}
                  />
                ))}
              </View>
              <Button
                label="SCOUT"
                style={s.scoutButton}
                onPress={() => dispatch({ type: 'scout', maxPrice: budget, line })}
              />
            </Card>

            <SectionTitle>{`SCOUTED PLAYERS · ${state.market.length}`}</SectionTitle>
            {state.market.length === 0 ? (
              <Text style={s.empty}>Nobody left on the list. Scout again.</Text>
            ) : null}
            {state.market.map((p) => {
              const price = playerValue(p);
              const affordable = price <= state.money;
              return (
                <Pressable
                  key={p.id}
                  onPress={() => setDetail(p.id)}
                  style={({ pressed }) => [s.player, pressed && s.pressed]}
                >
                  <View style={s.main}>
                    <Text style={s.name} numberOfLines={1}>
                      {p.flag} {p.name}
                    </Text>
                    <View style={s.meta}>
                      <PosTags positions={p.positions} size={12} />
                      <Text style={s.small}>Age {p.age}</Text>
                      <Text style={[s.small, { color: colors.green }]}>POT {p.potential}</Text>
                    </View>
                  </View>
                  <View style={s.price}>
                    <Text style={[s.priceText, !affordable && { color: colors.red }]}>
                      {formatMoney(price)}
                    </Text>
                    <Text style={s.small}>{formatMoney(playerWage(p))}/yr</Text>
                  </View>
                  <RatingBadge value={p.rating} size={38} />
                </Pressable>
              );
            })}
            <Text style={s.hint}>Sell players from the Squad tab by tapping them.</Text>
          </>
        ) : (
          <Text style={s.empty}>Scouting reports arrive when the next window opens.</Text>
        )}
      </ScrollView>
      <PlayerSheet
        player={state.market.find((p) => p.id === detail) ?? null}
        mode="market"
        onClose={() => setDetail(null)}
      />
    </>
  );
}

const s = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  banner: { gap: 4 },
  bannerOpen: { backgroundColor: colors.greenSoft, borderColor: '#BFE6CC', borderBottomColor: '#9ED6B1' },
  bannerClosed: { backgroundColor: colors.redSoft, borderColor: '#F6C9CA', borderBottomColor: '#EFA9AB' },
  bannerTitle: { fontSize: 18, fontWeight: '900', color: colors.ink },
  bannerText: { fontSize: 14, fontWeight: '600', color: colors.muted },
  scout: { gap: 8 },
  label: { fontWeight: '800', color: colors.ink, marginTop: 4 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.faint,
  },
  chipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { fontWeight: '800', color: colors.ink },
  chipTextActive: { color: '#FFFFFF' },
  scoutButton: { marginTop: 8 },
  empty: { textAlign: 'center', color: colors.muted, fontWeight: '700', paddingVertical: 12 },
  player: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.border,
    borderBottomWidth: 5,
    borderBottomColor: colors.borderDark,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  pressed: { opacity: 0.7 },
  main: { flex: 1, gap: 4 },
  name: { fontSize: 16, fontWeight: '800', color: colors.ink },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  small: { fontSize: 12, fontWeight: '700', color: colors.muted },
  price: { alignItems: 'flex-end' },
  priceText: { fontSize: 16, fontWeight: '900', color: colors.ink },
  hint: { textAlign: 'center', color: colors.muted, fontWeight: '600', fontSize: 13 },
});
