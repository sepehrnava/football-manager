import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  canTrade,
  clubById,
  midWindowRound,
  MONEY_STATUS_TEXT,
  moneyStatus,
} from '../game/game';
import { askingPrice } from '../game/market';
import { DEFAULT_FINDER, findPlayers, type Finder, type FinderTab } from '../game/finder';
import { COUNTRIES } from '../game/leagues';
import { LINE_OF } from '../game/constants';
import { playerValue, ratingRange, trend, wageDemand } from '../game/players';
import type { Player, Position } from '../game/types';
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

const POSITIONS: (Position | 'ALL')[] = ['ALL', 'GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST'];
const PAGE = 12;
const FEES = [1, 2, 5, 10, 20, 40].map((m) => m * 1_000_000);

const TABS: { id: FinderTab; label: string }[] = [
  { id: 'foryou', label: '⭐ For you' },
  { id: 'wonder', label: '🌱 Wonderkids' },
  { id: 'experienced', label: '🎖️ Experienced' },
  { id: 'world', label: '🌍 World class' },
  { id: 'bargain', label: '🏷️ Bargains' },
  { id: 'browse', label: '🔎 Browse' },
  { id: 'watch', label: '☆ Watchlist' },
];

const TAB_HINT: Record<FinderTab, string> = {
  foryou: 'Players who would improve your starting XI, and that you can afford.',
  wonder: 'Players aged 21 or under who will grow the most. Potential is a rough range until you scout them.',
  experienced: 'Players aged 30 or over: high ratings for low fees, ready to play now.',
  world: 'The 50 best players in the game, whatever your budget. Something to save up for.',
  bargain: 'Players in the last year of their contract: the same quality for a lower fee.',
  browse: '',
  watch: 'Players you starred. Open a player and tap ☆ Watch.',
};

const EMPTY: Record<FinderTab, string> = {
  foryou: 'Nobody you can afford would improve your XI right now. Try Browse, or sell a player first.',
  wonder: 'No wonderkids found for this position.',
  experienced: 'No experienced players you can afford for this position.',
  world: 'Nobody found.',
  bargain: 'No bargains you can afford right now.',
  browse: 'No matches. Try other filters.',
  watch: 'Your watchlist is empty.',
};

export function TransfersScreen() {
  const { state, dispatch } = useCareer();
  const [finder, setFinder] = useState<Finder>(DEFAULT_FINDER);
  const [shown, setShown] = useState(PAGE);
  const [detail, setDetail] = useState<{ id: string; mode: 'squad' | 'market' } | null>(null);
  const open = canTrade(state);
  const status = moneyStatus(state);
  const change = (patch: Partial<Finder>) => {
    setFinder((f) => ({ ...f, ...patch }));
    setShown(PAGE);
  };
  const found = useMemo(
    () => findPlayers(state, finder),
    // Results depend on the market, your squad and your budget, not on every state change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.world, state.squad, state.lineup, state.formation, state.money, state.scouting, state.watch, finder],
  );

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
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabs}>
          {TABS.map((t) => (
            <Pill key={t.id} label={t.label} active={finder.tab === t.id} onPress={() => change({ tab: t.id })} />
          ))}
        </ScrollView>

        {finder.tab !== 'watch' ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.wrapRow}>
            {POSITIONS.map((pos) => (
              <Pill
                key={pos}
                label={pos === 'ALL' ? 'All positions' : pos}
                active={finder.position === pos}
                color={pos === 'ALL' ? undefined : lineColors[LINE_OF[pos]]}
                onPress={() => change({ position: pos })}
              />
            ))}
          </ScrollView>
        ) : null}

        {finder.tab === 'browse' ? (
          <Card style={s.searchCard}>
            <TextInput
              value={finder.text}
              onChangeText={(text) => change({ text })}
              placeholder="Search a player by name"
              placeholderTextColor={colors.muted}
              style={s.input}
              autoCapitalize="words"
              autoCorrect={false}
              accessibilityLabel="Search players by name"
            />
            <Text style={s.label}>League</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.wrapRow}>
              <Pill label="All" active={finder.country === 'ALL'} onPress={() => change({ country: 'ALL' })} />
              {COUNTRIES.map((c) => (
                <Pill key={c.id} label={c.flag} active={finder.country === c.id} onPress={() => change({ country: c.id })} />
              ))}
            </ScrollView>
            <Text style={s.label}>Max fee</Text>
            <View style={s.wrap}>
              {[null, ...FEES].map((b) => (
                <Pressable
                  key={String(b)}
                  onPress={() => change({ maxFee: b })}
                  style={[s.chip, finder.maxFee === b && s.chipActive]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: finder.maxFee === b }}
                >
                  <Text style={[s.chipText, finder.maxFee === b && s.chipTextActive]}>
                    {b === null ? 'Any' : formatMoney(b)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Card>
        ) : (
          <Text style={s.hint}>{TAB_HINT[finder.tab]}</Text>
        )}

        {found.length === 0 ? <Text style={s.empty}>{EMPTY[finder.tab]}</Text> : null}
        {found.slice(0, shown).map(({ player, note }, i) => (
          <FadeIn key={player.id} delay={Math.min(i, 8) * 25}>
            <MarketRow player={player} note={note} onPress={() => setDetail({ id: player.id, mode: 'market' })} />
          </FadeIn>
        ))}
        {found.length > shown ? (
          <Button label={`SHOW MORE (${found.length - shown} left)`} variant="light" onPress={() => setShown(shown + PAGE)} />
        ) : null}
        <Text style={s.hint}>Ratings are guesses until you scout a player.</Text>
      </ScrollView>

      <PlayerSheet playerId={detail?.id ?? null} mode={detail?.mode ?? 'market'} onClose={() => setDetail(null)} />
    </>
  );
}

function MarketRow({ player: p, note, onPress }: { player: Player; note?: string; onPress: () => void }) {
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
          {(state.watch ?? []).includes(p.id) ? <Text style={[s.small, { color: colors.gold }]}>★</Text> : null}
        </View>
        {note ? (
          <Text style={s.note} numberOfLines={1}>
            {note}
          </Text>
        ) : null}
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
  tabs: { gap: 8, paddingRight: 8 },
  wrapRow: { gap: 8, paddingRight: 8 },
  input: {
    backgroundColor: colors.faint,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
  },
  note: { fontSize: 12, fontWeight: '800', color: colors.green },
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
