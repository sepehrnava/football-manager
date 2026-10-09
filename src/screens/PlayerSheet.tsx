import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { SQUAD_MAX } from '../game/constants';
import { canTrade, clubById } from '../game/game';
import { askingPrice, needsCover, quickSalePrice, releaseBlocker } from '../game/market';
import {
  chemistry,
  playerValue,
  potentialRange,
  rangeLabel,
  ratingRange,
  roundMoney,
  trend,
  wageDemand,
} from '../game/players';
import { scoutCost } from '../game/staff';
import type { Player } from '../game/types';
import { useCareer } from '../state/GameContext';
import {
  Bar,
  Button,
  Card,
  ClubCrest,
  Icon,
  PosTags,
  RangeBadge,
  RatingBadge,
  Sheet,
  Text,
  TrendTag,
  type IconName,
} from '../ui/components';
import { FadeIn, haptic } from '../ui/motion';
import { DISPLAY } from '../ui/text';
import { colors, formatMoney } from '../ui/theme';

/** A squad player (sell, list, captain) or a market target (scout, negotiate). */
export function PlayerSheet({
  playerId,
  mode,
  onClose,
}: {
  playerId: string | null;
  mode: 'squad' | 'market';
  onClose: () => void;
}) {
  const { state } = useCareer();
  if (!playerId) return null;
  const own = state.squad.find((p) => p.id === playerId);
  const other = state.world.find((p) => p.id === playerId);
  // A market target that just joined us shows the welcome view.
  if (mode === 'market' && own) return <Signed player={own} onClose={onClose} />;
  // Every market player belongs to a club (older saves may hold clubless ones; skip them).
  if (mode === 'market' && other?.clubId) return <MarketView key={other.id} player={other} onClose={onClose} />;
  if (own) return <SquadView key={own.id} player={own} onClose={onClose} />;
  return null;
}

function Signed({ player, onClose }: { player: Player; onClose: () => void }) {
  return (
    <Sheet visible title="Deal done!" onClose={onClose} footer={<Button label="Great" size="lg" onPress={onClose} />}>
      <FadeIn from="scale" style={s.signed}>
        <View style={s.signedIcon}>
          <Icon name="handshake" size={40} color={colors.greenDark} />
        </View>
        <RatingBadge value={player.rating} size={56} />
        <Text style={s.signedName}>{player.name}</Text>
        <Text style={s.hint}>
          Signed for {player.contract.years} {player.contract.years === 1 ? 'season' : 'seasons'} at{' '}
          {formatMoney(player.contract.wage)} a season. Put the new signing in your XI on the Squad tab, or tap Best XI.
        </Text>
      </FadeIn>
    </Sheet>
  );
}

/** Header shared by both views: rating, positions, age, career stage, potential. */
function Hero({
  rating,
  player: p,
  potential,
  scoutedTrend,
  extra,
}: {
  rating: ReactNode;
  player: Player;
  potential: string;
  scoutedTrend: boolean;
  extra?: ReactNode;
}) {
  return (
    <View style={s.hero}>
      {rating}
      <View style={s.heroText}>
        <PosTags positions={p.positions} size={14} />
        <Text style={s.meta}>
          {p.flag} Age {p.age}
        </Text>
        {scoutedTrend ? <TrendTag trend={trend(p)} size={11} /> : null}
        {extra}
      </View>
      <View style={s.pot}>
        <Text style={s.potValue}>{potential}</Text>
        <Text style={s.potLabel}>POTENTIAL</Text>
      </View>
    </View>
  );
}

function Tiles({ items }: { items: { icon: IconName; label: string; value: string; color?: string }[] }) {
  return (
    <View style={s.tiles}>
      {items.map((t) => (
        <View key={t.label} style={s.tile}>
          <View style={s.tileHead}>
            <Icon name={t.icon} size={14} color={colors.muted} />
            <Text style={s.tileLabel}>{t.label}</Text>
          </View>
          <Text style={[s.tileValue, t.color ? { color: t.color } : null]} numberOfLines={1}>
            {t.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

/** Offer levels as a share of the asking price: cheap but risky, to safe. */
const OFFERS = [
  { label: 'Cheeky', share: 0.75 },
  { label: 'Fair', share: 0.9 },
  { label: 'Full price', share: 1 },
];

function MarketView({ player: p, onClose }: { player: Player; onClose: () => void }) {
  const { state, dispatch } = useCareer();
  const asking = askingPrice(state, p);
  const scouted = (state.scouting[p.id] ?? 0) >= 1;
  const talk = state.talks[p.id];
  const club = clubById(state, p.clubId!);
  const wage = wageDemand(p);
  const pot = potentialRange(p, scouted ? 1 : 0);
  const watching = (state.watch ?? []).includes(p.id);
  const cost = scoutCost(state);

  const blocked = !canTrade(state)
    ? 'The transfer window is closed. You can bid in the next one.'
    : state.squad.length >= SQUAD_MAX
      ? `Your squad is full (${SQUAD_MAX}). Sell someone first.`
      : talk?.last === 'broken'
        ? `${club.name} stopped talking to you until the next window.`
        : null;

  const bid = (fee: number) => dispatch({ type: 'bid', playerId: p.id, fee, years: 3 });

  return (
    <Sheet
      visible
      title={p.name}
      subtitle={club.name}
      onClose={onClose}
      footer={
        <>
          {blocked ? <Text style={s.reason}>{blocked}</Text> : <Text style={s.reason}>Make an offer</Text>}
          <View style={s.actions}>
            {OFFERS.map((o) => {
              const fee = roundMoney(asking * o.share);
              return (
                <View key={o.label} style={s.flex}>
                  <Button
                    label={formatMoney(fee)}
                    variant={o.share === 1 ? 'primary' : 'secondary'}
                    disabled={!!blocked || fee > state.money}
                    onPress={() => bid(fee)}
                  />
                  <Text style={s.offerLabel}>{o.label}</Text>
                </View>
              );
            })}
          </View>
        </>
      }
    >
      <Hero
        rating={<RangeBadge range={ratingRange(p, scouted ? 1 : 0)} size={60} />}
        player={p}
        potential={pot ? rangeLabel(pot) : '?'}
        // Rising vs peak would hint at potential, so it shows only once scouted.
        scoutedTrend={scouted || trend(p) === 'declining' || trend(p) === 'retiring'}
        extra={
          <View style={s.clubLine}>
            <ClubCrest club={club} size={16} />
            <Text style={s.meta} numberOfLines={1}>
              {club.name}
            </Text>
          </View>
        }
      />

      <Tiles
        items={[
          { icon: 'tag-outline', label: 'Price', value: formatMoney(asking), color: asking > state.money ? colors.red : undefined },
          { icon: 'cash', label: 'Wage / season', value: formatMoney(wage) },
          { icon: 'file-document-outline', label: 'Contract left', value: `${p.contract.years} yr` },
          { icon: 'bank', label: 'Your money', value: formatMoney(state.money) },
        ]}
      />

      <View style={s.row2}>
        <Pressable
          onPress={() => {
            haptic();
            dispatch({ type: 'watch', playerId: p.id });
          }}
          style={({ pressed }) => [s.watch, watching && s.watchOn, pressed && { opacity: 0.7 }]}
          accessibilityRole="button"
          accessibilityLabel={watching ? 'Stop watching' : 'Watch this player'}
        >
          <Icon name={watching ? 'star' : 'star-outline'} size={20} color={watching ? colors.goldDark : colors.ink2} />
          <Text style={s.watchText}>{watching ? 'Watching' : 'Watch'}</Text>
        </Pressable>
        {scouted ? (
          <View style={s.scouted}>
            <Icon name="check-decagram" size={18} color={colors.greenDark} />
            <Text style={s.scoutedText}>Scouted: exact rating</Text>
          </View>
        ) : (
          <Button
            label={`Scout ${formatMoney(cost)}`}
            icon="binoculars"
            variant="secondary"
            style={s.flex}
            disabled={cost > state.money}
            onPress={() => dispatch({ type: 'scoutPlayer', playerId: p.id })}
          />
        )}
      </View>
      {!scouted ? <Text style={s.hint}>The rating is a guess until you scout. Scouting shows the exact rating and potential.</Text> : null}

      {talk?.last && talk.last !== 'accepted' ? (
        <FadeIn key={`${talk.attempts}-${talk.last}`} from="scale">
          <Card tone={talk.last === 'countered' ? 'gold' : 'red'} style={s.reply}>
            <Text style={s.replyTitle}>
              {talk.last === 'countered'
                ? `${club.short} want ${formatMoney(talk.counter ?? 0)}`
                : talk.last === 'rejected'
                  ? 'Offer rejected'
                  : 'They walked away'}
            </Text>
            <Text style={s.replyText}>
              {talk.last === 'countered'
                ? 'Close! Pay their price to sign the player.'
                : talk.last === 'rejected'
                  ? 'Too low. Try a higher offer.'
                  : 'You offered too little too often. Try again next window.'}
            </Text>
            {talk.last === 'countered' && talk.counter && !blocked ? (
              <Button
                label={`Pay ${formatMoney(talk.counter)}`}
                icon="handshake"
                disabled={talk.counter > state.money}
                onPress={() => bid(talk.counter!)}
              />
            ) : null}
          </Card>
        </FadeIn>
      ) : null}

      <Text style={s.hint}>A cheeky offer saves money but may be rejected. Too many low offers and the club stops talking.</Text>
    </Sheet>
  );
}

function SquadView({ player: p, onClose }: { player: Player; onClose: () => void }) {
  const { state, dispatch } = useCareer();
  const [confirmSell, setConfirmSell] = useState(false);
  const isCaptain = state.captainId === p.id;
  const sale = quickSalePrice(p);
  const sellBlocked = releaseBlocker(state, p);
  const chem = chemistry(p);

  return (
    <Sheet
      visible
      title={p.name}
      subtitle={isCaptain ? 'Your captain' : 'Your player'}
      onClose={onClose}
      footer={
        <>
          <Button
            label={p.listed ? 'Take off the transfer list' : 'Put on the transfer list'}
            icon={p.listed ? 'tag-remove-outline' : 'tag-outline'}
            variant={p.listed ? 'secondary' : 'primary'}
            onPress={() => dispatch({ type: 'list', playerId: p.id, listed: !p.listed })}
          />
          <View style={s.actions}>
            <Button
              label={isCaptain ? 'Captain' : 'Make captain'}
              icon="crown"
              variant="secondary"
              disabled={isCaptain}
              style={s.flex}
              onPress={() => dispatch({ type: 'captain', playerId: p.id })}
            />
            <Button
              label={confirmSell ? 'Tap to confirm' : `Sell now ${formatMoney(sale)}`}
              variant="danger"
              disabled={!!sellBlocked}
              style={s.flex}
              onPress={() => {
                if (!confirmSell) return setConfirmSell(true);
                dispatch({ type: 'quickSale', playerId: p.id });
                onClose();
              }}
            />
          </View>
          <Text style={s.reason}>
            {p.listed
              ? canTrade(state)
                ? 'Listed: clubs make fair offers in Transfers.'
                : 'Listed: clubs will make offers when the next window opens.'
              : (sellBlocked ??
                `Transfer list = fair offers from clubs. Sell now = instant cash, but less.${
                  needsCover(state, p) ? ' An academy youngster fills any gap.' : ''
                }`)}
          </Text>
        </>
      }
    >
      <Hero rating={<RatingBadge value={p.rating} size={60} />} player={p} potential={String(p.potential)} scoutedTrend />

      {p.retiring ? (
        <Card tone="red" style={s.retire}>
          <Icon name="hand-wave" size={22} color={colors.red} />
          <View style={s.flex}>
            <Text style={s.retireTitle}>Retires after this season</Text>
            <Text style={s.hint}>Then the player leaves for nothing. Sell in a window to get something back.</Text>
          </View>
        </Card>
      ) : null}

      <Tiles
        items={[
          { icon: 'tag-outline', label: 'Value', value: formatMoney(playerValue(p)) },
          { icon: 'cash', label: 'Wage / season', value: formatMoney(p.contract.wage) },
          { icon: 'file-document-outline', label: 'Contract', value: `${p.contract.years} yr` },
          { icon: 'soccer', label: 'Goals', value: String(p.goals) },
        ]}
      />

      <Card style={s.chem}>
        <View style={s.chemHead}>
          <Text style={s.chemTitle}>Chemistry</Text>
          <Text style={s.chemValue}>{chem}</Text>
        </View>
        <Bar value={chem} color={chem >= 80 ? colors.green : chem >= 60 ? colors.gold : colors.orange} />
        <Text style={s.hint}>Grows with every season at the club. A captain in the XI adds +10 for the team.</Text>
      </Card>
      <Text style={s.hint}>Contracts renew by themselves. The wage follows the rating: up as players improve, down as they age.</Text>
    </Sheet>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  heroText: { flex: 1, gap: 4, minWidth: 0 },
  clubLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  meta: { fontSize: 14, fontWeight: '600', color: colors.ink2, flexShrink: 1 },
  pot: { alignItems: 'center' },
  potValue: { fontSize: 30, fontFamily: DISPLAY, fontWeight: '800', color: colors.green },
  potLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1, color: colors.muted },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: {
    width: '48.5%',
    flexGrow: 1,
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 2,
  },
  tileHead: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  tileLabel: { fontSize: 12, fontWeight: '600', color: colors.muted },
  tileValue: { fontSize: 24, fontFamily: DISPLAY, fontWeight: '800', color: colors.ink },
  row2: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  watch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 48,
    paddingHorizontal: 14,
    borderRadius: 6,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  watchOn: { backgroundColor: colors.goldSoft, borderColor: colors.gold },
  watchText: { fontSize: 15, fontWeight: '700', color: colors.ink },
  scouted: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 48,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: colors.greenSoft,
  },
  scoutedText: { fontSize: 14, fontWeight: '700', color: colors.greenDark },
  hint: { fontSize: 13, color: colors.muted, fontWeight: '500', lineHeight: 18 },
  actions: { flexDirection: 'row', gap: 10 },
  reply: { gap: 6 },
  replyTitle: { fontSize: 17, fontWeight: '800', color: colors.ink },
  replyText: { fontSize: 14, fontWeight: '500', color: colors.ink2 },
  retire: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  retireTitle: { fontSize: 15, fontWeight: '800', color: colors.red },
  chem: { gap: 8 },
  chemHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chemTitle: { fontSize: 15, fontWeight: '700', color: colors.ink },
  chemValue: { fontSize: 24, fontFamily: DISPLAY, fontWeight: '800', color: colors.ink },
  offerLabel: { textAlign: 'center', fontSize: 12, fontWeight: '700', color: colors.muted, marginTop: 4 },
  reason: { textAlign: 'center', color: colors.muted, fontWeight: '600', fontSize: 13 },
  signed: { alignItems: 'center', gap: 10, paddingVertical: 8 },
  signedIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signedName: { fontSize: 24, fontWeight: '800', color: colors.ink },
});
