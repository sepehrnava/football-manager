import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  adBonusAmount,
  canTakeAdBonus,
  canTrade,
  clubById,
  midWindowRound,
  MONEY_STATUS_TEXT,
  moneyStatus,
  seasonForecast,
} from '../game/game';
import { askingPrice } from '../game/market';
import { DEFAULT_FINDER, findPlayers, type Finder, type FinderTab } from '../game/finder';
import { COUNTRIES } from '../game/leagues';
import { playerValue, potentialRange, ratingRange, trend, wageDemand } from '../game/players';
import type { Player, Position } from '../game/types';
import { useAds } from '../ads/AdsContext';
import { useCareer } from '../state/GameContext';
import {
  Button,
  ClubCrest,
  OptionSheet,
  PickerButton,
  PosTags,
  RangeBadge,
  RatingBadge,
  RatingWithPotential,
  SectionTitle,
  TrendTag,
} from '../ui/components';
import { FadeIn } from '../ui/motion';
import { colors, formatMoney } from '../ui/theme';
import { wageBill } from '../game/team';
import { MoneySheet } from './MoneySheet';
import { useOffers } from './useOffers';
import { PlayerSheet } from './PlayerSheet';

const POSITIONS: (Position | 'ALL')[] = ['ALL', 'GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST'];
const PAGE = 12;
const FEES = [1, 2, 5, 10, 20, 40].map((m) => m * 1_000_000);

const TABS: { id: FinderTab; label: string; note: string }[] = [
  { id: 'foryou', label: 'For you', note: 'Would improve your XI, and you can afford them' },
  { id: 'wonder', label: 'Wonderkids', note: '21 or under, will grow the most' },
  { id: 'experienced', label: 'Experienced', note: '30 or over: good now, cheap' },
  { id: 'world', label: 'World class', note: 'The 50 best players in the game' },
  { id: 'bargain', label: 'Bargains', note: 'Last year of contract: lower fee' },
  { id: 'browse', label: 'Browse', note: 'Search by name, league and fee' },
  { id: 'watch', label: 'Watchlist', note: 'Players you starred' },
];

const EMPTY: Record<FinderTab, string> = {
  foryou: 'Nobody you can afford would improve your XI. Try Browse, or sell first.',
  wonder: 'No wonderkids for this position.',
  experienced: 'No experienced players you can afford here.',
  world: 'Nobody found.',
  bargain: 'No bargains you can afford right now.',
  browse: 'No matches. Try other filters.',
  watch: 'Your watchlist is empty. Open a player and tap Watch.',
};

type Picker = 'tab' | 'position' | 'country' | 'fee' | null;

export function TransfersScreen() {
  const { state, dispatch } = useCareer();
  const ads = useAds();
  const { offers } = useOffers();
  const forecast = seasonForecast(state);
  const [moneyOpen, setMoneyOpen] = useState(false);
  const [finder, setFinder] = useState<Finder>(DEFAULT_FINDER);
  const [shown, setShown] = useState(PAGE);
  const [picker, setPicker] = useState<Picker>(null);
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
  const close = () => setPicker(null);
  const countryName = finder.country === 'ALL' ? 'All' : (COUNTRIES.find((c) => c.id === finder.country)?.name ?? 'All');

  return (
    <>
      <ScrollView contentContainerStyle={s.content}>
        <View>
          <Pressable onPress={() => setMoneyOpen(true)} accessibilityRole="button" style={s.moneyLine}>
            <Text style={s.line}>
              Safe to spend <Text style={[s.lineStrong, { color: colors.green }]}>{formatMoney(forecast.safeToSpend)}</Text>
              {'  ·  '}season end{' '}
              <Text style={[s.lineStrong, forecast.end < 0 && { color: colors.red }]}>~{formatMoney(forecast.end)}</Text>
            </Text>
            <Text style={s.moneyArrow}>›</Text>
          </Pressable>
          <Text style={s.line}>
            Wages <Text style={s.lineStrong}>{formatMoney(wageBill(state.squad))}</Text> a season
          </Text>
          {!open ? (
            <Text style={s.line}>
              Window closed. Deals wait until{' '}
              {state.round < midWindowRound(state) ? `after matchday ${midWindowRound(state)}` : 'the season ends'}.
            </Text>
          ) : null}
          {status !== 'ok' ? <Text style={[s.line, { color: colors.red }]}>{MONEY_STATUS_TEXT[status]}</Text> : null}
        </View>

        {ads.available && canTakeAdBonus(state) ? (
          <Pressable
            onPress={async () => {
              if (await ads.showRewarded()) dispatch({ type: 'adBonus' });
            }}
            accessibilityRole="button"
            style={({ pressed }) => [s.bonus, pressed && s.pressed]}
          >
            <Text style={s.bonusText}>
              Sponsor bonus: watch a short ad for <Text style={s.bonusAmount}>+{formatMoney(adBonusAmount(state))}</Text>
            </Text>
            <Text style={s.bonusArrow}>›</Text>
          </Pressable>
        ) : null}

        {offers.length ? (
          <FadeIn>
            <SectionTitle>{`OFFERS · ${offers.length}`}</SectionTitle>
            {offers.map((o) => {
              const p = state.squad.find((m) => m.id === o.playerId);
              if (!p) return null;
              const diff = o.fee - playerValue(p);
              const club = clubById(state, o.clubId);
              return (
                <View key={o.id} style={s.offer}>
                  <Pressable style={s.offerTop} onPress={() => setDetail({ id: p.id, mode: 'squad' })}>
                    <ClubCrest club={club} size={34} />
                    <View style={s.main}>
                      <Text style={s.name} numberOfLines={1}>
                        {p.name}
                      </Text>
                      <Text style={s.small} numberOfLines={1}>
                        {club.name} ·{' '}
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
                </View>
              );
            })}
          </FadeIn>
        ) : null}

        <SectionTitle>FIND PLAYERS</SectionTitle>
        <View style={s.pickers}>
          <PickerButton
            label="SHOW"
            value={TABS.find((x) => x.id === finder.tab)!.label}
            onPress={() => setPicker('tab')}
            style={s.flex}
          />
          {finder.tab !== 'watch' ? (
            <PickerButton
              label="POSITION"
              value={finder.position === 'ALL' ? 'All' : finder.position}
              onPress={() => setPicker('position')}
              style={s.flex}
            />
          ) : null}
        </View>

        {finder.tab === 'browse' ? (
          <>
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
            <View style={s.pickers}>
              <PickerButton label="LEAGUE" value={countryName} onPress={() => setPicker('country')} style={s.flex} />
              <PickerButton
                label="MAX FEE"
                value={finder.maxFee === null ? 'Any' : formatMoney(finder.maxFee)}
                onPress={() => setPicker('fee')}
                style={s.flex}
              />
            </View>
          </>
        ) : null}

        {found.length === 0 ? <Text style={s.empty}>{EMPTY[finder.tab]}</Text> : null}
        <View>
          {found.slice(0, shown).map(({ player, note }, i) => (
            <FadeIn key={player.id} delay={Math.min(i, 8) * 25}>
              <MarketRow player={player} note={note} onPress={() => setDetail({ id: player.id, mode: 'market' })} />
            </FadeIn>
          ))}
        </View>
        {found.length > shown ? (
          <Button label={`SHOW MORE (${found.length - shown})`} variant="light" onPress={() => setShown(shown + PAGE)} />
        ) : null}
        {found.length ? <Text style={s.hint}>Ranges are guesses until you scout.</Text> : null}
      </ScrollView>

      <OptionSheet
        visible={picker === 'tab'}
        title="Show"
        options={TABS}
        value={finder.tab}
        onPick={(tab) => change({ tab })}
        onClose={close}
      />
      <OptionSheet
        visible={picker === 'position'}
        title="Position"
        options={POSITIONS.map((pos) => ({ id: pos, label: pos === 'ALL' ? 'All positions' : pos }))}
        value={finder.position}
        onPick={(position) => change({ position })}
        onClose={close}
      />
      <OptionSheet
        visible={picker === 'country'}
        title="League"
        options={[{ id: 'ALL', label: 'All leagues' }, ...COUNTRIES.map((c) => ({ id: c.id, label: c.name }))]}
        value={finder.country}
        onPick={(country) => change({ country })}
        onClose={close}
      />
      <OptionSheet
        visible={picker === 'fee'}
        title="Max fee"
        options={[{ id: 'any', label: 'Any' }, ...FEES.map((f) => ({ id: String(f), label: formatMoney(f) }))]}
        value={finder.maxFee === null ? 'any' : String(finder.maxFee)}
        onPick={(v) => change({ maxFee: v === 'any' ? null : Number(v) })}
        onClose={close}
      />
      <MoneySheet visible={moneyOpen} onClose={() => setMoneyOpen(false)} />
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
          <Text style={s.small} numberOfLines={1}>
            Age {p.age}
          </Text>
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
      <RatingWithPotential
        badge={<RangeBadge range={ratingRange(p, level)} size={36} />}
        rating={ratingRange(p, level)[1]}
        potential={potentialRange(p, level)}
      />
    </Pressable>
  );
}

const s = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  line: { fontSize: 14, fontWeight: '700', color: colors.muted, paddingVertical: 2 },
  lineStrong: { fontWeight: '900', color: colors.ink },
  moneyLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  moneyArrow: { fontSize: 20, fontWeight: '900', color: colors.borderDark },
  bonus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.greenSoft,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  bonusText: { flex: 1, fontSize: 14, fontWeight: '800', color: colors.ink },
  bonusAmount: { color: colors.green, fontWeight: '900' },
  bonusArrow: { fontSize: 22, fontWeight: '900', color: colors.green },
  offer: { gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  offerTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  offerButtons: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
  pickers: { flexDirection: 'row', gap: 8 },
  input: {
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
  },
  note: { fontSize: 12, fontWeight: '800', color: colors.green },
  empty: { textAlign: 'center', color: colors.muted, fontWeight: '700', marginVertical: 8 },
  player: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pressed: { opacity: 0.6 },
  main: { flex: 1, minWidth: 0, gap: 3 },
  name: { fontSize: 15, fontWeight: '800', color: colors.ink },
  // Several positions plus tags can be wider than the row: wrap whole items onto a second line.
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 8, rowGap: 2 },
  small: { fontSize: 12, fontWeight: '700', color: colors.muted },
  price: { alignItems: 'flex-end', flexShrink: 0 },
  priceText: { fontSize: 15, fontWeight: '900', color: colors.ink },
  hint: { fontSize: 12, color: colors.muted, fontWeight: '600', textAlign: 'center' },
});
