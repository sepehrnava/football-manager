import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { SQUAD_MAX } from '../game/constants';
import { canTrade, clubById, userClub } from '../game/game';
import { scoutCost } from '../game/staff';
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
import type { Player } from '../game/types';
import { useCareer } from '../state/GameContext';
import { Bar, Button, ClubCrest, PosTags, RangeBadge, RatingBadge, Row, Sheet, TrendTag } from '../ui/components';
import { ShirtAvatar } from '../ui/avatar';
import { FadeIn } from '../ui/motion';
import { colors, formatMoney } from '../ui/theme';

/** A squad player (contract, renew, sell) or a market target (scout, negotiate). */
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
    <Sheet visible title="Deal done!" onClose={onClose} footer={<Button label="DONE" variant="green" onPress={onClose} />}>
      <FadeIn from="scale" style={s.signed}>
        <Text style={s.signedEmoji}>🤝</Text>
        <Text style={s.signedName}>{player.name}</Text>
        <Text style={s.hint}>
          Signed for {player.contract.years} {player.contract.years === 1 ? 'season' : 'seasons'} at{' '}
          {formatMoney(player.contract.wage)}/yr. Pick the new signing in your XI from the Squad tab.
        </Text>
      </FadeIn>
    </Sheet>
  );
}

/** Offer levels as a share of the asking price: cheap but risky, to safe. */
const OFFERS = [
  { label: 'CHEEKY', share: 0.75 },
  { label: 'FAIR', share: 0.9 },
  { label: 'FULL PRICE', share: 1 },
];

function MarketView({ player: p, onClose }: { player: Player; onClose: () => void }) {
  const { state, dispatch } = useCareer();
  const asking = askingPrice(state, p);
  const scouted = (state.scouting[p.id] ?? 0) >= 1;
  const talk = state.talks[p.id];
  const club = clubById(state, p.clubId!);
  const wage = wageDemand(p);
  const pot = potentialRange(p, scouted ? 1 : 0);

  const blocked = !canTrade(state)
    ? 'The transfer window is closed'
    : state.squad.length >= SQUAD_MAX
      ? `Squad is full (${SQUAD_MAX})`
      : talk?.last === 'broken'
        ? `${club.name} stopped talking to you until the next window`
        : null;

  const bid = (fee: number) => dispatch({ type: 'bid', playerId: p.id, fee, years: 3 });

  return (
    <Sheet
      visible
      title={p.name}
      onClose={onClose}
      footer={
        <View style={s.footer}>
          {blocked ? <Text style={s.reason}>{blocked}</Text> : null}
          <View style={s.actions}>
              {OFFERS.map((o) => {
                const fee = roundMoney(asking * o.share);
                return (
                  <View key={o.label} style={s.flex}>
                    <Button
                      label={formatMoney(fee)}
                      variant={o.share === 1 ? 'green' : 'light'}
                      small
                      disabled={!!blocked || fee > state.money}
                      onPress={() => bid(fee)}
                    />
                    <Text style={s.offerLabel}>{o.label}</Text>
                  </View>
                );
              })}
          </View>
        </View>
      }
    >
      <View style={s.hero}>
        <RangeBadge range={ratingRange(p, scouted ? 1 : 0)} size={64} />
        <View style={s.heroText}>
          <PosTags positions={p.positions} size={18} />
          <Text style={s.meta}>
            {p.flag} Age {p.age}
          </Text>
          {/* Rising vs peak would hint at potential, so it shows only once scouted. */}
          {scouted || trend(p) === 'declining' || trend(p) === 'retiring' ? (
            <TrendTag trend={trend(p)} size={12} />
          ) : null}
          <View style={s.clubLine}>
            <ClubCrest club={club} size={18} />
            <Text style={s.meta}>{club.name}</Text>
          </View>
        </View>
        <View style={s.pot}>
          <Text style={s.potValue}>{pot ? rangeLabel(pot) : '?'}</Text>
          <Text style={s.potLabel}>POTENTIAL</Text>
        </View>
      </View>

      <Button
        label={(state.watch ?? []).includes(p.id) ? '★ Watching: tap to remove' : '☆ Watch this player'}
        variant="light"
        small
        onPress={() => dispatch({ type: 'watch', playerId: p.id })}
      />

      <View style={s.box}>
        <Row label="Price" value={formatMoney(asking)} bold />
        <Row label="Wage" value={`${formatMoney(wage)} per season`} />
        {scouted ? (
          <Text style={s.hint}>✓ Scouted: rating and potential are exact.</Text>
        ) : (
          <View style={s.scoutRow}>
            <Text style={[s.hint, s.flex]}>The rating is a guess. Scout to see exactly how good the player is.</Text>
            <Button
              label={`SCOUT ${formatMoney(scoutCost(state))}`}
              variant="light"
              small
              disabled={scoutCost(state) > state.money}
              onPress={() => dispatch({ type: 'scoutPlayer', playerId: p.id })}
            />
          </View>
        )}
      </View>

      {talk?.last && talk.last !== 'accepted' ? (
        <FadeIn key={`${talk.attempts}-${talk.last}`} from="scale">
          <View style={[s.reply, talk.last === 'countered' ? s.replyCounter : s.replyNo]}>
            <Text style={s.replyTitle}>
              {talk.last === 'countered'
                ? `They want ${formatMoney(talk.counter ?? 0)}`
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
                label={`PAY ${formatMoney(talk.counter)}`}
                variant="green"
                small
                disabled={talk.counter > state.money}
                onPress={() => bid(talk.counter!)}
              />
            ) : null}
          </View>
        </FadeIn>
      ) : null}

      <Text style={s.hint}>
        A cheeky offer saves money but may be rejected. Too many low offers and the club stops talking.
      </Text>
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
      onClose={onClose}
      footer={
        <View style={s.footer}>
          <Button
            label={p.listed ? 'TAKE OFF TRANSFER LIST' : 'PUT ON TRANSFER LIST'}
            variant={p.listed ? 'light' : 'green'}
            small
            onPress={() => dispatch({ type: 'list', playerId: p.id, listed: !p.listed })}
          />
          <View style={s.actions}>
            <Button
              label={isCaptain ? 'CAPTAIN ✓' : 'MAKE CAPTAIN'}
              variant="light"
              small
              disabled={isCaptain}
              style={s.flex}
              onPress={() => dispatch({ type: 'captain', playerId: p.id })}
            />
            <Button
              label={confirmSell ? 'TAP TO CONFIRM' : `QUICK SALE ${formatMoney(sale)}`}
              variant="red"
              small
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
                ? 'Listed: offers are waiting in Transfers.'
                : 'Listed: clubs will make offers when the next window opens.'
              : (sellBlocked ??
                `Transfer list = fair offers from clubs. Quick sale = instant cash, but less money.${
                  needsCover(state, p) ? ' An academy youngster fills any gap.' : ''
                }`)}
          </Text>
        </View>
      }
    >
      <View style={s.hero}>
        <ShirtAvatar crest={userClub(state).crest} label={String(p.number ?? '')} size={64} />
        <RatingBadge value={p.rating} size={64} />
        <View style={s.heroText}>
          <PosTags positions={p.positions} size={18} />
          <Text style={s.meta}>
            {p.flag} Age {p.age}
            {isCaptain ? ' · Captain' : ''}
          </Text>
          <TrendTag trend={trend(p)} size={12} />
        </View>
        <View style={s.pot}>
          <Text style={s.potValue}>{p.potential}</Text>
          <Text style={s.potLabel}>POTENTIAL</Text>
        </View>
      </View>

      {p.retiring ? (
        <View style={[s.box, s.retireBox]}>
          <Text style={s.retireTitle}>Retiring at the end of this season</Text>
          <Text style={s.hint}>
            After this season the player is gone for nothing. Sell during a transfer window to get something back.
          </Text>
        </View>
      ) : null}

      <View style={s.box}>
        <Row label="Wage" value={`${formatMoney(p.contract.wage)} per season`} />
        <Row label="Value" value={formatMoney(playerValue(p))} />
        <Row label="Goals this season" value={String(p.goals)} />
        <Text style={s.hint}>
          Contracts renew automatically. The new wage follows the player&apos;s rating: up when they improve,
          down as they age.
        </Text>
      </View>

      <View style={s.box}>
        <Row label="Chemistry" value={`${chem}`} />
        <Bar value={chem} color={chem >= 80 ? colors.green : chem >= 60 ? colors.gold : colors.orange} />
        <Text style={s.hint}>
          Chemistry grows with every season at the club. A captain in the XI adds +10 to team chemistry.
        </Text>
      </View>
    </Sheet>
  );
}

const s = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
  heroText: { flex: 1, gap: 4 },
  clubLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  meta: { fontSize: 14, fontWeight: '700', color: colors.muted },
  pot: { alignItems: 'center' },
  potValue: { fontSize: 22, fontWeight: '900', color: colors.green },
  potLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1, color: colors.muted },
  box: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
    gap: 6,
  },
  hint: { fontSize: 13, color: colors.muted, fontWeight: '600', lineHeight: 18 },
  footer: { gap: 8, paddingTop: 8 },
  actions: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
  scoutRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reply: { borderRadius: 16, padding: 14, gap: 6, marginBottom: 12 },
  replyCounter: { backgroundColor: '#FFF3D6' },
  replyNo: { backgroundColor: colors.redSoft },
  replyTitle: { fontSize: 17, fontWeight: '900', color: colors.ink },
  replyText: { fontSize: 13, fontWeight: '600', color: colors.muted },
  retireBox: { borderColor: '#F6C9CB', backgroundColor: '#FFF8F8' },
  retireTitle: { fontSize: 15, fontWeight: '900', color: colors.red },
  offerLabel: { textAlign: 'center', fontSize: 11, fontWeight: '900', color: colors.muted, marginTop: 4, letterSpacing: 0.5 },
  reason: { textAlign: 'center', color: colors.muted, fontWeight: '700', fontSize: 12 },
  signed: { alignItems: 'center', gap: 8, paddingVertical: 12 },
  signedEmoji: { fontSize: 56 },
  signedName: { fontSize: 24, fontWeight: '900', color: colors.ink },
});
