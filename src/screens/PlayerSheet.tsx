import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MARKET, SQUAD_MAX } from '../game/constants';
import { canTrade, clubById } from '../game/game';
import { askingPrice, quickSalePrice, releaseBlocker, renewalDemand } from '../game/market';
import {
  chemistry,
  playerValue,
  potentialRange,
  rangeLabel,
  ratingRange,
  roundMoney,
  wageDemand,
} from '../game/players';
import type { Player } from '../game/types';
import { useCareer } from '../state/GameContext';
import { Bar, Button, ClubCrest, PosTags, RangeBadge, RatingBadge, Row, Sheet } from '../ui/components';
import { FadeIn } from '../ui/motion';
import { colors, formatMoney } from '../ui/theme';

const YEARS = [1, 2, 3, 4];

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
  if (mode === 'market' && other) return <MarketView key={other.id} player={other} onClose={onClose} />;
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

function MarketView({ player: p, onClose }: { player: Player; onClose: () => void }) {
  const { state, dispatch } = useCareer();
  const asking = askingPrice(state, p);
  const step = Math.max(50_000, roundMoney(asking * 0.05));
  const [fee, setFee] = useState(() => roundMoney(asking * 0.9));
  const [years, setYears] = useState(3);
  const level = state.scouting[p.id] ?? 0;
  const talk = state.talks[p.id];
  const club = p.clubId ? clubById(state, p.clubId) : null;
  const wage = wageDemand(p);
  const open = canTrade(state);
  const broken = talk?.last === 'broken';
  const triesLeft = MARKET.maxAttempts - (talk?.attempts ?? 0);
  const pot = potentialRange(p, level);
  const offerFee = club ? fee : 0;

  const blocked = !open
    ? 'The transfer window is closed'
    : state.squad.length >= SQUAD_MAX
      ? `Squad is full (${SQUAD_MAX})`
      : offerFee > state.money
        ? `You need ${formatMoney(offerFee - state.money)} more`
        : broken
          ? `${club?.name ?? 'The club'} ended talks this window`
          : null;

  const bid = (amount: number) => dispatch({ type: 'bid', playerId: p.id, fee: amount, years });

  return (
    <Sheet
      visible
      title={p.name}
      onClose={onClose}
      footer={
        <View style={s.footer}>
          {blocked ? <Text style={s.reason}>{blocked}</Text> : null}
          <Button
            label={club ? `OFFER ${formatMoney(fee)}` : `SIGN FOR ${formatMoney(wage)}/YR`}
            variant="green"
            disabled={!!blocked}
            onPress={() => bid(offerFee)}
          />
        </View>
      }
    >
      <View style={s.hero}>
        <RangeBadge range={ratingRange(p, level)} size={64} />
        <View style={s.heroText}>
          <PosTags positions={p.positions} size={18} />
          <Text style={s.meta}>
            {p.flag} Age {p.age}
          </Text>
          <View style={s.clubLine}>
            {club ? <ClubCrest club={club} size={18} /> : null}
            <Text style={s.meta}>
              {club ? `${club.name} · ${p.contract.years} yr${p.contract.years > 1 ? 's' : ''} left` : 'Free agent'}
            </Text>
          </View>
        </View>
        <View style={s.pot}>
          <Text style={s.potValue}>{pot ? rangeLabel(pot) : '?'}</Text>
          <Text style={s.potLabel}>POTENTIAL</Text>
        </View>
      </View>

      <View style={s.box}>
        <View style={s.scoutRow}>
          <View style={s.flex}>
            <Text style={s.boxTitle}>Scouting: {['Rough guess', 'Good estimate', 'Exact'][level]}</Text>
            <Text style={s.hint}>
              {level < 2 ? 'Scout to narrow the rating and reveal potential.' : 'You know exactly what you are buying.'}
            </Text>
          </View>
          {level < 2 ? (
            <Button
              label={`SCOUT ${formatMoney(MARKET.scoutCost[level])}`}
              variant="light"
              small
              disabled={MARKET.scoutCost[level] > state.money}
              onPress={() => dispatch({ type: 'scoutPlayer', playerId: p.id })}
            />
          ) : null}
        </View>
      </View>

      {talk?.last && talk.last !== 'accepted' ? (
        <FadeIn key={`${talk.attempts}-${talk.last}`} from="scale">
          <View style={[s.reply, talk.last === 'countered' ? s.replyCounter : s.replyNo]}>
            <Text style={s.replyTitle}>
              {talk.last === 'countered'
                ? `They'll sell for ${formatMoney(talk.counter ?? 0)}`
                : talk.last === 'rejected'
                  ? 'Offer rejected'
                  : 'Talks broken off'}
            </Text>
            <Text style={s.replyText}>
              {talk.last === 'countered'
                ? 'Accept their price, or try your luck with another offer.'
                : talk.last === 'rejected'
                  ? `Too low. ${triesLeft} ${triesLeft === 1 ? 'try' : 'tries'} left before they stop talking.`
                  : 'You pushed too hard. Try again next window.'}
            </Text>
            {talk.last === 'countered' && talk.counter && !blocked ? (
              <Button
                label={`ACCEPT ${formatMoney(talk.counter)}`}
                small
                disabled={talk.counter > state.money}
                onPress={() => bid(talk.counter!)}
              />
            ) : null}
          </View>
        </FadeIn>
      ) : null}

      <View style={s.box}>
        {club ? (
          <>
            <Row label="Asking price" value={formatMoney(asking)} />
            <Text style={s.boxTitle}>Your offer</Text>
            <View style={s.stepper}>
              <StepButton label="−" onPress={() => setFee(Math.max(0, fee - step))} />
              <Text style={s.feeText}>{formatMoney(fee)}</Text>
              <StepButton label="+" onPress={() => setFee(fee + step)} />
            </View>
            <View style={s.chips}>
              {[0.7, 0.85, 1, 1.1].map((f) => (
                <Pressable key={f} onPress={() => setFee(roundMoney(asking * f))} style={s.chip}>
                  <Text style={s.chipText}>{f === 1 ? 'Asking' : `${Math.round(f * 100)}%`}</Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : (
          <Text style={s.hint}>No transfer fee, but free agents ask for a higher wage.</Text>
        )}
        <Text style={s.boxTitle}>Contract length</Text>
        <View style={s.chips}>
          {YEARS.map((y) => (
            <Pressable key={y} onPress={() => setYears(y)} style={[s.chip, years === y && s.chipOn]}>
              <Text style={[s.chipText, years === y && s.chipTextOn]}>
                {y} yr{y > 1 ? 's' : ''}
              </Text>
            </Pressable>
          ))}
        </View>
        <Row label="Wage demand" value={`${formatMoney(wage)}/yr`} />
        <Row label={`Total cost over ${years} yr${years > 1 ? 's' : ''}`} value={formatMoney(offerFee + wage * years)} bold />
        <Row
          label="Money after the fee"
          value={formatMoney(state.money - offerFee)}
          color={state.money - offerFee < 0 ? colors.red : undefined}
        />
      </View>
      <Text style={s.hint}>
        Clubs accept somewhere around their asking price. Lowball too hard, or try {MARKET.maxAttempts} times, and
        they walk away.
      </Text>
    </Sheet>
  );
}

function SquadView({ player: p, onClose }: { player: Player; onClose: () => void }) {
  const { state, dispatch } = useCareer();
  const [confirmSell, setConfirmSell] = useState(false);
  const [years, setYears] = useState(3);
  const open = canTrade(state);
  const isCaptain = state.captainId === p.id;
  const expiring = p.contract.years === 1;
  const demand = renewalDemand(state, p);
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
            {sellBlocked ?? 'A quick sale goes to whoever pays now, well below value. Offers in Transfers pay more.'}
          </Text>
        </View>
      }
    >
      <View style={s.hero}>
        <RatingBadge value={p.rating} size={64} />
        <View style={s.heroText}>
          <PosTags positions={p.positions} size={18} />
          <Text style={s.meta}>
            {p.flag} Age {p.age}
            {isCaptain ? ' · Captain' : ''}
          </Text>
        </View>
        <View style={s.pot}>
          <Text style={s.potValue}>{p.potential}</Text>
          <Text style={s.potLabel}>POTENTIAL</Text>
        </View>
      </View>

      <View style={s.box}>
        <Row label="Wage" value={`${formatMoney(p.contract.wage)}/yr`} />
        <Row
          label="Contract"
          value={`${p.contract.years} season${p.contract.years > 1 ? 's' : ''} left`}
          color={expiring ? colors.red : undefined}
        />
        <Row label="Value" value={formatMoney(playerValue(p))} />
        <Row label="Goals this season" value={String(p.goals)} />
      </View>

      {expiring ? (
        <View style={[s.box, s.renewBox]}>
          <Text style={s.boxTitle}>Contract ends this season</Text>
          <Text style={s.hint}>
            Wants {formatMoney(demand)}/yr to stay
            {demand > p.contract.wage ? ` (+${formatMoney(demand - p.contract.wage)})` : ''}. Without a renewal, the
            player leaves for free when the season ends.
          </Text>
          <View style={s.chips}>
            {YEARS.map((y) => (
              <Pressable key={y} onPress={() => setYears(y)} style={[s.chip, years === y && s.chipOn]}>
                <Text style={[s.chipText, years === y && s.chipTextOn]}>
                  {y} yr{y > 1 ? 's' : ''}
                </Text>
              </Pressable>
            ))}
          </View>
          <Button
            label={`RENEW · ${formatMoney(demand)}/YR`}
            variant="green"
            small
            disabled={!open}
            onPress={() => dispatch({ type: 'renew', playerId: p.id, years })}
          />
          {!open ? <Text style={s.reason}>Renew when the transfer window opens.</Text> : null}
        </View>
      ) : null}

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

function StepButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.step, pressed && { opacity: 0.6 }]} accessibilityRole="button">
      <Text style={s.stepText}>{label}</Text>
    </Pressable>
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
  renewBox: { borderColor: '#F6C9CB', backgroundColor: '#FFF8F8' },
  boxTitle: { fontSize: 15, fontWeight: '900', color: colors.ink },
  scoutRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reply: { borderRadius: 16, padding: 14, gap: 6, marginBottom: 12 },
  replyCounter: { backgroundColor: '#FFF3D6' },
  replyNo: { backgroundColor: colors.redSoft },
  replyTitle: { fontSize: 17, fontWeight: '900', color: colors.ink },
  replyText: { fontSize: 13, fontWeight: '600', color: colors.muted },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  step: {
    width: 48,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.faint,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { fontSize: 24, fontWeight: '900', color: colors.ink },
  feeText: { fontSize: 28, fontWeight: '900', color: colors.ink },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 12, backgroundColor: colors.faint, borderWidth: 2, borderColor: colors.border },
  chipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { fontWeight: '800', color: colors.ink, fontSize: 13 },
  chipTextOn: { color: '#FFFFFF' },
  hint: { fontSize: 13, color: colors.muted, fontWeight: '600', lineHeight: 18 },
  footer: { gap: 8, paddingTop: 8 },
  actions: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
  reason: { textAlign: 'center', color: colors.muted, fontWeight: '700', fontSize: 12 },
  signed: { alignItems: 'center', gap: 8, paddingVertical: 12 },
  signedEmoji: { fontSize: 56 },
  signedName: { fontSize: 24, fontWeight: '900', color: colors.ink },
});
