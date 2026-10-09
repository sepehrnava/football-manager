import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { LINE_OF } from '../game/constants';
import { DEFAULT_FINDER, findPlayers, type Finder, type FinderTab } from '../game/finder';
import { canTrade, clubById, midWindowRound, MONEY_STATUS_TEXT, moneyStatus } from '../game/game';
import { COUNTRIES } from '../game/leagues';
import { askingPrice } from '../game/market';
import { playerValue, ratingRange, trend, wageDemand } from '../game/players';
import { wageBill } from '../game/team';
import type { Player, Position } from '../game/types';
import { useCareer } from '../state/GameContext';
import {
  Button,
  Card,
  Chip,
  ChipScroll,
  ClubCrest,
  EmptyState,
  Icon,
  ListRow,
  PosTags,
  RangeBadge,
  RatingBadge,
  Section,
  Segmented,
  Tag,
  Text,
  TrendTag,
  type IconName,
} from '../ui/components';
import { FadeIn, stagger, useCountUp } from '../ui/motion';
import { DISPLAY } from '../ui/text';
import { colors, formatMoney, lineColors, radius } from '../ui/theme';
import { PlayerSheet } from './PlayerSheet';

const POSITIONS: (Position | 'ALL')[] = ['ALL', 'GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST'];
const PAGE = 12;
const FEES = [1, 2, 5, 10, 20, 40].map((m) => m * 1_000_000);

const TABS: { id: FinderTab; label: string; icon: IconName }[] = [
  { id: 'foryou', label: 'For you', icon: 'star-four-points' },
  { id: 'wonder', label: 'Wonderkids', icon: 'sprout' },
  { id: 'experienced', label: 'Experienced', icon: 'medal' },
  { id: 'world', label: 'World class', icon: 'earth' },
  { id: 'bargain', label: 'Bargains', icon: 'tag' },
  { id: 'browse', label: 'Browse', icon: 'magnify' },
  { id: 'watch', label: 'Watchlist', icon: 'star' },
];

const TAB_HINT: Record<FinderTab, string> = {
  foryou: 'Would improve your XI, and you can afford them.',
  wonder: '21 or under, growing fastest. Potential is a guess until scouted.',
  experienced: '30 or over: high ratings, low fees.',
  world: 'The 50 best players in the game.',
  bargain: 'Last contract year: same quality, lower fee.',
  browse: '',
  watch: 'Players you starred.',
};

const EMPTY: Record<FinderTab, string> = {
  foryou: 'Nobody you can afford would improve your XI. Try Browse, or sell first.',
  wonder: 'No wonderkids for this position.',
  experienced: 'Nobody you can afford for this position.',
  world: 'Nobody found.',
  bargain: 'No bargains you can afford right now.',
  browse: 'No matches. Try other filters.',
  watch: 'Open a player and tap Watch to keep them here.',
};

type Pane = 'find' | 'offers';

export function TransfersScreen() {
  const { state, dispatch } = useCareer();
  const [pane, setPane] = useState<Pane>(state.offers.length ? 'offers' : 'find');
  const [finder, setFinder] = useState<Finder>(DEFAULT_FINDER);
  const [shown, setShown] = useState(PAGE);
  const [detail, setDetail] = useState<{ id: string; mode: 'squad' | 'market' } | null>(null);
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
  const listed = state.squad.filter((p) => p.listed);

  return (
    <>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <WindowStrip />
        {status !== 'ok' ? (
          <Card tone={status === 'warning' ? 'red' : 'gold'} style={s.warning}>
            <Icon name="alert-circle" size={18} color={status === 'warning' ? colors.red : colors.goldDark} />
            <Text style={s.warningText}>{MONEY_STATUS_TEXT[status]}</Text>
          </Card>
        ) : null}

        <Segmented
          value={pane}
          onChange={setPane}
          options={[
            { id: 'find', label: 'Find', icon: 'magnify' },
            { id: 'offers', label: 'Offers', icon: 'handshake', badge: state.offers.length },
          ]}
        />

        {pane === 'offers' ? (
          <FadeIn key="offers" from="right" distance={12} style={s.pane}>
            {state.offers.length ? (
              state.offers.map((o, i) => {
                const p = state.squad.find((m) => m.id === o.playerId);
                if (!p) return null;
                const diff = o.fee - playerValue(p);
                const club = clubById(state, o.clubId);
                return (
                  <FadeIn key={o.id} delay={stagger(i, 50)}>
                    <Card style={s.offer}>
                      <ListRow
                        left={<RatingBadge value={p.rating} />}
                        title={p.name}
                        subtitle={
                          <View style={s.meta}>
                            <ClubCrest club={club} size={18} />
                            <Text style={s.small} numberOfLines={1}>
                              {club.name} · value {formatMoney(playerValue(p))}
                            </Text>
                          </View>
                        }
                        right={
                          <View style={s.price}>
                            <Text style={s.priceText}>{formatMoney(o.fee)}</Text>
                            <Text style={[s.small, { color: diff >= 0 ? colors.greenDark : colors.red }]}>
                              {diff >= 0 ? '+' : ''}
                              {formatMoney(diff)}
                            </Text>
                          </View>
                        }
                        onPress={() => setDetail({ id: p.id, mode: 'squad' })}
                        last
                      />
                      <View style={s.offerButtons}>
                        <Button
                          label="Reject"
                          variant="secondary"
                          small
                          style={s.flex}
                          onPress={() => dispatch({ type: 'rejectOffer', offerId: o.id })}
                        />
                        <Button
                          label={`Sell ${formatMoney(o.fee)}`}
                          small
                          style={s.flex}
                          onPress={() => dispatch({ type: 'acceptOffer', offerId: o.id })}
                        />
                      </View>
                    </Card>
                  </FadeIn>
                );
              })
            ) : (
              <Card>
                <EmptyState
                  icon="handshake-outline"
                  title="No offers right now"
                  text="Clubs bid for your players during the season. Listing a player brings more offers."
                />
              </Card>
            )}

            <Section title={`Your transfer list · ${listed.length}`} />
            {listed.length ? (
              <Card style={s.list}>
                {listed.map((p, i) => (
                  <ListRow
                    key={p.id}
                    left={<RatingBadge value={p.rating} />}
                    title={p.name}
                    subtitle={
                      <View style={s.meta}>
                        <PosTags positions={p.positions} size={11} />
                        <Text style={s.small}>Age {p.age}</Text>
                      </View>
                    }
                    right={
                      <View style={s.price}>
                        <Text style={s.priceText}>{formatMoney(playerValue(p))}</Text>
                        <Text style={s.small}>value</Text>
                      </View>
                    }
                    onPress={() => setDetail({ id: p.id, mode: 'squad' })}
                    last={i === listed.length - 1}
                  />
                ))}
              </Card>
            ) : (
              <Text style={s.hint}>Open one of your players and tap “Put on the transfer list”.</Text>
            )}
          </FadeIn>
        ) : (
          <FadeIn key="find" from="left" distance={12} style={s.pane}>
            <ChipScroll>
              {TABS.map((tb) => (
                <Chip
                  key={tb.id}
                  label={tb.label}
                  icon={tb.icon}
                  active={finder.tab === tb.id}
                  onPress={() => change({ tab: tb.id })}
                />
              ))}
            </ChipScroll>
            {finder.tab !== 'watch' ? (
              <ChipScroll>
                {POSITIONS.map((pos) => (
                  <Chip
                    key={pos}
                    label={pos === 'ALL' ? 'All' : pos}
                    active={finder.position === pos}
                    color={pos === 'ALL' ? undefined : lineColors[LINE_OF[pos]]}
                    onPress={() => change({ position: pos })}
                  />
                ))}
              </ChipScroll>
            ) : null}

            {finder.tab === 'browse' ? (
              <Card style={s.searchCard}>
                <View style={s.search}>
                  <Icon name="magnify" size={20} color={colors.muted} />
                  <TextInput
                    value={finder.text}
                    onChangeText={(text) => change({ text })}
                    placeholder="Search by name"
                    placeholderTextColor={colors.muted}
                    style={s.input}
                    autoCapitalize="words"
                    autoCorrect={false}
                    accessibilityLabel="Search players by name"
                  />
                </View>
                <Text style={s.label}>League</Text>
                <ChipScroll>
                  <Chip label="All" active={finder.country === 'ALL'} onPress={() => change({ country: 'ALL' })} />
                  {COUNTRIES.map((c) => (
                    <Chip key={c.id} label={c.flag} active={finder.country === c.id} onPress={() => change({ country: c.id })} />
                  ))}
                </ChipScroll>
                <Text style={s.label}>Max fee</Text>
                <ChipScroll>
                  {[null, ...FEES].map((b) => (
                    <Chip
                      key={String(b)}
                      label={b === null ? 'Any' : formatMoney(b)}
                      active={finder.maxFee === b}
                      onPress={() => change({ maxFee: b })}
                    />
                  ))}
                </ChipScroll>
              </Card>
            ) : (
              <Text style={s.hint}>{TAB_HINT[finder.tab]}</Text>
            )}

            {found.length === 0 ? (
              <Card>
                <EmptyState icon={finder.tab === 'watch' ? 'star-outline' : 'account-search'} title="Nobody here" text={EMPTY[finder.tab]} />
              </Card>
            ) : (
              <Card style={s.list}>
                {found.slice(0, shown).map(({ player, note }, i) => (
                  <FadeIn key={`${finder.tab}-${finder.position}-${player.id}`} delay={stagger(i % PAGE)}>
                    <MarketRow
                      player={player}
                      note={note}
                      last={i === Math.min(shown, found.length) - 1}
                      onPress={() => setDetail({ id: player.id, mode: 'market' })}
                    />
                  </FadeIn>
                ))}
              </Card>
            )}
            {found.length > shown ? (
              <Button
                label={`Show more · ${found.length - shown}`}
                variant="secondary"
                onPress={() => setShown(shown + PAGE)}
              />
            ) : null}
            {found.length ? <Text style={s.hint}>Dashed ratings are guesses until you scout a player.</Text> : null}
          </FadeIn>
        )}
      </ScrollView>

      <PlayerSheet playerId={detail?.id ?? null} mode={detail?.mode ?? 'market'} onClose={() => setDetail(null)} />
    </>
  );
}

/** Whether deals can be done now, and what there is to spend. */
function WindowStrip() {
  const { state } = useCareer();
  const open = canTrade(state);
  const money = useCountUp(state.money, 700);
  return (
    <Card style={s.strip}>
      <View style={s.stripMain}>
        <View style={s.stripStatus}>
          <View style={[s.dot, { backgroundColor: open ? colors.green : colors.borderDark }]} />
          <Text style={[s.stripTitle, { color: open ? colors.greenDark : colors.ink2 }]}>
            {open ? `${state.window === 'pre' ? 'Pre-season' : 'Mid-season'} window open` : 'Window closed'}
          </Text>
        </View>
        <Text style={s.small} numberOfLines={1}>
          {open
            ? 'Closes when you kick off'
            : `Opens ${state.round < midWindowRound(state) ? `after matchday ${midWindowRound(state)}` : 'after the season'}`}
        </Text>
      </View>
      <View style={s.stripMoney}>
        <Text style={[s.stripValue, state.money < 0 && { color: colors.red }]}>{formatMoney(money)}</Text>
        <Text style={s.small}>wages {formatMoney(wageBill(state.squad))}/yr</Text>
      </View>
    </Card>
  );
}

function MarketRow({
  player: p,
  note,
  last,
  onPress,
}: {
  player: Player;
  note?: string;
  last?: boolean;
  onPress: () => void;
}) {
  const { state } = useCareer();
  const level = state.scouting[p.id] ?? 0;
  const fee = askingPrice(state, p);
  const club = p.clubId ? clubById(state, p.clubId) : null;
  const talk = state.talks[p.id];
  const tr = trend(p);
  return (
    <ListRow
      onPress={onPress}
      accessibilityLabel={`Player ${p.name}`}
      left={<RangeBadge range={ratingRange(p, level)} size={36} />}
      title={
        <Text style={s.name} numberOfLines={1}>
          {p.flag} {p.name}
          {(state.watch ?? []).includes(p.id) ? <Text style={{ color: colors.goldDark }}> ★</Text> : null}
        </Text>
      }
      subtitle={
        <View style={s.sub}>
          <View style={s.meta}>
            <PosTags positions={p.positions} size={11} />
            <Text style={s.small}>{p.age}y</Text>
            {club ? <ClubCrest club={club} size={16} /> : <Tag label="Free" tone="green" />}
            {tr === 'declining' || tr === 'retiring' ? <TrendTag trend={tr} size={10} /> : null}
            {club && p.contract.years === 1 ? <Tag label="Bargain" tone="green" /> : null}
            {talk?.last === 'broken' ? <Tag label="Talks off" tone="red" /> : null}
          </View>
          {note ? (
            <Text style={s.note} numberOfLines={1}>
              {note}
            </Text>
          ) : null}
        </View>
      }
      right={
        <View style={s.price}>
          <Text style={[s.priceText, fee > state.money && { color: colors.red }]}>{formatMoney(fee)}</Text>
          <Text style={s.small}>{formatMoney(wageDemand(p))}/yr</Text>
        </View>
      }
      last={last}
    />
  );
}

const s = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  pane: { gap: 12 },
  flex: { flex: 1 },
  strip: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  stripMain: { flex: 1, gap: 1 },
  stripStatus: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  stripTitle: { fontSize: 18, fontFamily: DISPLAY, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.3 },
  stripMoney: { alignItems: 'flex-end' },
  stripValue: { fontSize: 26, fontFamily: DISPLAY, fontWeight: '800', color: colors.ink, marginBottom: -2 },
  warning: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
  warningText: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.ink },
  offer: { padding: 0, overflow: 'hidden' },
  offerButtons: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingBottom: 12 },
  list: { padding: 0, overflow: 'hidden' },
  searchCard: { gap: 8 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.inset,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
  },
  input: { flex: 1, paddingVertical: 10, fontSize: 16, fontWeight: '600', color: colors.ink },
  label: { fontSize: 12, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  sub: { gap: 3 },
  note: { fontSize: 12, fontWeight: '700', color: colors.greenDark },
  name: { fontSize: 15, fontWeight: '700', color: colors.ink },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  small: { fontSize: 12, fontWeight: '600', color: colors.muted },
  price: { alignItems: 'flex-end' },
  priceText: { fontSize: 20, fontFamily: DISPLAY, fontWeight: '800', color: colors.ink },
  hint: { fontSize: 12, color: colors.muted, fontWeight: '500', textAlign: 'center' },
});
