import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  canTrade,
  clubById,
  defaultSearchBudget,
  midWindowRound,
  MONEY_STATUS_TEXT,
  moneyStatus,
  SEARCH_BUDGETS,
} from '../game/game';
import { askingPrice } from '../game/market';
import { playerValue, ratingRange, trend, wageDemand } from '../game/players';
import type { Line, Player } from '../game/types';
import { useCareer } from '../state/GameContext';
import {
  Button,
  Card,
  ClubCrest,
  Pill,
  PosTags,
  RangeBadge,
  RatingBadge,
  Row,
  SectionTitle,
  TrendTag,
} from '../ui/components';
import { FadeIn } from '../ui/motion';
import { colors, formatMoney, lineColors } from '../ui/theme';
import { wageBill } from '../game/team';
import { PlayerSheet } from './PlayerSheet';

const LINES: (Line | 'ALL')[] = ['ALL', 'GK', 'DF', 'MD', 'AT'];

export function TransfersScreen() {
  const { state, dispatch } = useCareer();
  const [budget, setBudget] = useState(() => defaultSearchBudget(state.money));
  const [line, setLine] = useState<Line | 'ALL'>('ALL');
  const [detail, setDetail] = useState<{ id: string; mode: 'squad' | 'market' } | null>(null);
  const open = canTrade(state);
  const status = moneyStatus(state);
  const find = (maxFee: number, l: Line | 'ALL') => {
    setBudget(maxFee);
    setLine(l);
    dispatch({ type: 'search', maxFee, line: l });
  };
  const results = state.search
    .map((id) => state.world.find((p) => p.id === id))
    .filter((p): p is Player => !!p);

  return (
    <>
      <ScrollView contentContainerStyle={s.content}>
        <Card style={[s.banner, open ? s.bannerOpen : s.bannerClosed]}>
          <Text style={s.bannerTitle}>
            {open
              ? `${state.window === 'pre' ? 'Pre-season' : 'Mid-season'} window is open`
              : 'Transfer window closed'}
          </Text>
          <Text style={s.bannerText}>
            {open
              ? 'Buy and sell now. The window closes when you kick off.'
              : `You can look around, but deals wait until ${
                  state.round < midWindowRound(state) ? `after matchday ${midWindowRound(state)}` : 'the season ends'
                }.`}
          </Text>
        </Card>

        <Card>
          <Row label="Money" value={formatMoney(state.money)} color={state.money < 0 ? colors.red : undefined} bold />
          <Row label="Wages per season" value={formatMoney(wageBill(state.squad))} />
          {status !== 'ok' ? (
            <View style={[s.warning, status === 'warning' && s.danger]}>
              <Text style={s.warningText}>{MONEY_STATUS_TEXT[status]}</Text>
            </View>
          ) : null}
        </Card>

        {state.offers.length ? (
          <FadeIn>
            <SectionTitle>{`OFFERS FOR YOUR PLAYERS · ${state.offers.length}`}</SectionTitle>
            {state.offers.map((o) => {
              const p = state.squad.find((m) => m.id === o.playerId);
              if (!p) return null;
              const diff = o.fee - playerValue(p);
              const club = clubById(state, o.clubId);
              return (
                <Card key={o.id} style={s.offer}>
                  <Pressable style={s.offerTop} onPress={() => setDetail({ id: p.id, mode: 'squad' })}>
                    <ClubCrest club={club} size={34} />
                    <View style={s.main}>
                      <Text style={s.name} numberOfLines={1}>
                        {club.name} want {p.name}
                      </Text>
                      <Text style={s.small}>
                        Value {formatMoney(playerValue(p))} ·{' '}
                        <Text style={{ color: diff >= 0 ? colors.green : colors.red }}>
                          {diff >= 0 ? '+' : ''}
                          {formatMoney(diff)} vs value
                        </Text>
                      </Text>
                    </View>
                    <RatingBadge value={p.rating} size={34} />
                  </Pressable>
                  <View style={s.offerButtons}>
                    <Button label="REJECT" variant="light" small style={s.flex} onPress={() => dispatch({ type: 'rejectOffer', offerId: o.id })} />
                    <Button
                      label={`SELL ${formatMoney(o.fee)}`}
                      variant="green"
                      small
                      style={s.flex}
                      onPress={() => dispatch({ type: 'acceptOffer', offerId: o.id })}
                    />
                  </View>
                </Card>
              );
            })}
          </FadeIn>
        ) : null}

        <SectionTitle>FIND PLAYERS</SectionTitle>
        <Card style={s.searchCard}>
          <Text style={s.label}>Max transfer fee</Text>
          <View style={s.wrap}>
            {SEARCH_BUDGETS.map((b) => (
              <Pressable
                key={b}
                onPress={() => find(b, line)}
                style={[s.chip, budget === b && s.chipActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: budget === b }}
              >
                <Text style={[s.chipText, budget === b && s.chipTextActive]}>
                  {formatMoney(b)}
                </Text>
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
                onPress={() => find(budget, l)}
              />
            ))}
          </View>
          <Text style={s.hint}>Ratings are guesses until you scout a player.</Text>
        </Card>

        {results.length === 0 ? <Text style={s.empty}>No matches. Try another budget or position.</Text> : null}
        {results.map((p, i) => (
          <FadeIn key={p.id} delay={i * 30}>
            <MarketRow player={p} onPress={() => setDetail({ id: p.id, mode: 'market' })} />
          </FadeIn>
        ))}
      </ScrollView>

      <PlayerSheet playerId={detail?.id ?? null} mode={detail?.mode ?? 'market'} onClose={() => setDetail(null)} />
    </>
  );
}

function MarketRow({ player: p, onPress }: { player: Player; onPress: () => void }) {
  const { state } = useCareer();
  const level = state.scouting[p.id] ?? 0;
  const fee = askingPrice(state, p);
  const club = p.clubId ? clubById(state, p.clubId) : null;
  const talk = state.talks[p.id];
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Player ${p.name}`}
      style={({ pressed }) => [s.player, pressed && s.pressed]}
    >
      {club ? <ClubCrest club={club} size={26} /> : null}
      <View style={s.main}>
        <Text style={s.name} numberOfLines={1}>
          {p.flag} {p.name}
        </Text>
        <View style={s.meta}>
          <PosTags positions={p.positions} size={12} />
          <Text style={s.small}>Age {p.age}</Text>
          {trend(p) === 'declining' || trend(p) === 'retiring' ? <TrendTag trend={trend(p)} /> : null}
          {club && p.contract.years === 1 ? <Text style={[s.small, { color: colors.green }]}>Bargain</Text> : null}
          {talk?.last === 'broken' ? <Text style={[s.small, { color: colors.red }]}>Talks off</Text> : null}
        </View>
      </View>
      <View style={s.price}>
        <Text style={[s.priceText, fee > state.money && { color: colors.red }]}>{formatMoney(fee)}</Text>
        <Text style={s.small}>{formatMoney(wageDemand(p))}/yr</Text>
      </View>
      <RangeBadge range={ratingRange(p, level)} size={36} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  banner: { gap: 4 },
  bannerOpen: { backgroundColor: colors.greenSoft, borderColor: '#BFE6CC', borderBottomColor: '#9ED6B1' },
  bannerClosed: { backgroundColor: colors.faint },
  bannerTitle: { fontSize: 18, fontWeight: '900', color: colors.ink },
  bannerText: { fontSize: 14, fontWeight: '600', color: colors.muted },
  warning: { backgroundColor: '#FFF4E5', borderRadius: 12, padding: 10, marginTop: 6 },
  danger: { backgroundColor: colors.redSoft },
  warningText: { fontSize: 13, fontWeight: '800', color: colors.ink },
  offer: { gap: 10, paddingVertical: 12 },
  offerTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  offerButtons: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
  searchCard: { gap: 10 },
  label: { fontSize: 14, fontWeight: '800', color: colors.ink },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, backgroundColor: colors.faint, borderWidth: 2, borderColor: colors.border },
  chipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { fontWeight: '800', color: colors.ink },
  chipTextActive: { color: '#FFFFFF' },
  empty: { textAlign: 'center', color: colors.muted, fontWeight: '700', marginVertical: 8 },
  player: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.border,
    borderBottomWidth: 4,
    borderBottomColor: colors.borderDark,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  pressed: { opacity: 0.7 },
  main: { flex: 1, gap: 3 },
  name: { fontSize: 15, fontWeight: '800', color: colors.ink },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  small: { fontSize: 12, fontWeight: '700', color: colors.muted },
  price: { alignItems: 'flex-end' },
  priceText: { fontSize: 15, fontWeight: '900', color: colors.ink },
  hint: { fontSize: 12, color: colors.muted, fontWeight: '600', textAlign: 'center' },
});
