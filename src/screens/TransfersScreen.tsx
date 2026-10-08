import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { MID_WINDOW_ROUND } from '../game/constants';
import { canTrade, clubById, defaultSearchBudget, SEARCH_BUDGETS, seasonProjection } from '../game/game';
import { askingPrice, releaseBlocker, renewalDemand } from '../game/market';
import { playerValue, ratingRange, wageDemand } from '../game/players';
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
} from '../ui/components';
import { FadeIn } from '../ui/motion';
import { colors, formatMoney, lineColors, ordinal } from '../ui/theme';
import { PlayerSheet } from './PlayerSheet';

const LINES: (Line | 'ALL')[] = ['ALL', 'GK', 'DF', 'MD', 'AT'];

export function TransfersScreen() {
  const { state, dispatch } = useCareer();
  const [budget, setBudget] = useState(() => defaultSearchBudget(state.money));
  const [line, setLine] = useState<Line | 'ALL'>('ALL');
  const [detail, setDetail] = useState<{ id: string; mode: 'squad' | 'market' } | null>(null);
  const open = canTrade(state);
  const proj = seasonProjection(state);
  const expiring = state.squad.filter((p) => p.contract.years === 1).sort((a, b) => b.rating - a.rating);
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
              ? 'Bid, sell and renew now. The window closes when you kick off.'
              : `You can search and scout, but deals wait until ${
                  state.round < MID_WINDOW_ROUND ? `after matchday ${MID_WINDOW_ROUND}` : 'the season ends'
                }.`}
          </Text>
        </Card>

        <Card>
          <Row label="Money" value={formatMoney(state.money)} bold />
          <Row label="Wage bill per season" value={formatMoney(proj.costs.wages)} />
          <Row label="Squad size" value={`${state.squad.length} players`} />
          <Row
            label={`Money at season end (if ${ordinal(proj.position)})`}
            value={formatMoney(proj.moneyAfter)}
            color={proj.risk === 'ok' ? colors.green : colors.red}
            bold
          />
          {proj.risk !== 'ok' ? (
            <View style={[s.warning, proj.risk === 'danger' && s.danger]}>
              <Text style={s.warningText}>
                {proj.risk === 'danger'
                  ? '⚠️ The board will sack you if the season ends like this. Cut wages or sell.'
                  : '⚠️ The club is heading into debt. The board sacks managers below -$5M.'}
              </Text>
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
              const blocked = releaseBlocker(state, p);
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
                      disabled={!!blocked}
                      style={s.flex}
                      onPress={() => dispatch({ type: 'acceptOffer', offerId: o.id })}
                    />
                  </View>
                  {blocked ? <Text style={s.hint}>{blocked}</Text> : null}
                </Card>
              );
            })}
          </FadeIn>
        ) : null}

        {expiring.length ? (
          <>
            <SectionTitle>{`CONTRACTS ENDING THIS SEASON · ${expiring.length}`}</SectionTitle>
            <Card style={s.list}>
              {expiring.map((p, i) => (
                <Pressable
                  key={p.id}
                  onPress={() => setDetail({ id: p.id, mode: 'squad' })}
                  style={({ pressed }) => [s.row, i < expiring.length - 1 && s.rowBorder, pressed && s.pressed]}
                >
                  <View style={s.main}>
                    <Text style={s.name} numberOfLines={1}>
                      {p.name}
                    </Text>
                    <Text style={s.small}>
                      {formatMoney(p.contract.wage)} → wants{' '}
                      <Text style={{ color: colors.red }}>{formatMoney(renewalDemand(state, p))}</Text>/yr
                    </Text>
                  </View>
                  <RatingBadge value={p.rating} size={34} />
                </Pressable>
              ))}
            </Card>
            <Text style={s.hint}>Renew before the season ends, or they leave for free.</Text>
          </>
        ) : null}

        <SectionTitle>FIND PLAYERS</SectionTitle>
        <Card style={s.searchCard}>
          <Text style={s.label}>Max transfer fee</Text>
          <View style={s.wrap}>
            {SEARCH_BUDGETS.map((b) => (
              <Pressable
                key={b}
                onPress={() => setBudget(b)}
                style={[s.chip, budget === b && s.chipActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: budget === b }}
              >
                <Text style={[s.chipText, budget === b && s.chipTextActive]}>
                  {b === 0 ? 'Free agents' : formatMoney(b)}
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
                onPress={() => setLine(l)}
              />
            ))}
          </View>
          <Button label="SEARCH" style={s.searchButton} onPress={() => dispatch({ type: 'search', maxFee: budget, line })} />
          <Text style={s.hint}>
            Ratings are estimates until you scout a player. Players with one year left are cheaper.
          </Text>
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
      {club ? <ClubCrest club={club} size={26} /> : <Text style={s.freeTag}>FREE</Text>}
      <View style={s.main}>
        <Text style={s.name} numberOfLines={1}>
          {p.flag} {p.name}
        </Text>
        <View style={s.meta}>
          <PosTags positions={p.positions} size={12} />
          <Text style={s.small}>Age {p.age}</Text>
          {club && p.contract.years === 1 ? <Text style={[s.small, { color: colors.green }]}>1 yr left</Text> : null}
          {talk?.last === 'broken' ? <Text style={[s.small, { color: colors.red }]}>Talks off</Text> : null}
        </View>
      </View>
      <View style={s.price}>
        <Text style={[s.priceText, fee > state.money && { color: colors.red }]}>{club ? formatMoney(fee) : 'No fee'}</Text>
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
  list: { paddingVertical: 4, paddingHorizontal: 12 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 },
  rowBorder: { borderBottomWidth: 1.5, borderBottomColor: colors.faint },
  searchCard: { gap: 10 },
  label: { fontSize: 14, fontWeight: '800', color: colors.ink },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, backgroundColor: colors.faint, borderWidth: 2, borderColor: colors.border },
  chipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { fontWeight: '800', color: colors.ink },
  chipTextActive: { color: '#FFFFFF' },
  searchButton: { marginTop: 4 },
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
  freeTag: { fontSize: 10, fontWeight: '900', color: colors.green, width: 26, textAlign: 'center' },
  main: { flex: 1, gap: 3 },
  name: { fontSize: 15, fontWeight: '800', color: colors.ink },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  small: { fontSize: 12, fontWeight: '700', color: colors.muted },
  price: { alignItems: 'flex-end' },
  priceText: { fontSize: 15, fontWeight: '900', color: colors.ink },
  hint: { fontSize: 12, color: colors.muted, fontWeight: '600', textAlign: 'center' },
});
