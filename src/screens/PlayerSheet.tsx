import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { SQUAD_MAX, SQUAD_MIN } from '../game/constants';
import { canTrade } from '../game/game';
import { chemistry, playerValue, playerWage } from '../game/players';
import type { Player } from '../game/types';
import { useCareer } from '../state/GameContext';
import { Bar, Button, PosTags, RatingBadge, Row, Sheet } from '../ui/components';
import { colors, formatMoney } from '../ui/theme';

/** Details for a squad player (captain / sell) or a market player (buy). */
export function PlayerSheet({
  player,
  mode,
  onClose,
}: {
  player: Player | null;
  mode: 'squad' | 'market';
  onClose: () => void;
}) {
  const { state, dispatch } = useCareer();
  const [confirmSell, setConfirmSell] = useState(false);
  if (!player) return null;

  const value = playerValue(player);
  const wage = playerWage(player);
  const open = canTrade(state);
  const close = () => {
    setConfirmSell(false);
    onClose();
  };

  let footer;
  if (mode === 'market') {
    const reason = !open
      ? 'The transfer window is closed'
      : state.squad.length >= SQUAD_MAX
        ? `Squad is full (${SQUAD_MAX})`
        : value > state.money
          ? `You need ${formatMoney(value - state.money)} more`
          : null;
    footer = (
      <View style={s.footer}>
        {reason ? <Text style={s.reason}>{reason}</Text> : null}
        <Button
          label={`BUY FOR ${formatMoney(value)}`}
          variant="green"
          disabled={!!reason}
          onPress={() => {
            dispatch({ type: 'buy', playerId: player.id });
            close();
          }}
        />
      </View>
    );
  } else {
    const isCaptain = state.captainId === player.id;
    const sellReason = !open
      ? 'You can sell when the transfer window opens'
      : state.squad.length <= SQUAD_MIN
        ? `You need at least ${SQUAD_MIN} players`
        : null;
    footer = (
      <View style={s.footer}>
        <View style={s.actions}>
          <Button
            label={isCaptain ? 'CAPTAIN ✓' : 'MAKE CAPTAIN'}
            variant="light"
            small
            disabled={isCaptain}
            style={s.flex}
            onPress={() => dispatch({ type: 'captain', playerId: player.id })}
          />
          <Button
            label={confirmSell ? 'TAP TO CONFIRM' : `SELL ${formatMoney(value)}`}
            variant="red"
            small
            disabled={!!sellReason}
            style={s.flex}
            onPress={() => {
              if (!confirmSell) return setConfirmSell(true);
              dispatch({ type: 'sell', playerId: player.id });
              close();
            }}
          />
        </View>
        {sellReason ? <Text style={s.reason}>{sellReason}</Text> : null}
      </View>
    );
  }

  const chem = chemistry(player);
  return (
    <Sheet visible title={player.name} onClose={close} footer={footer}>
      <View style={s.hero}>
        <RatingBadge value={player.rating} size={64} />
        <View style={s.heroText}>
          <PosTags positions={player.positions} size={18} />
          <Text style={s.meta}>
            {player.flag} Age {player.age}
            {state.captainId === player.id && mode === 'squad' ? ' · Captain' : ''}
          </Text>
        </View>
        <View style={s.pot}>
          <Text style={s.potValue}>{player.potential}</Text>
          <Text style={s.potLabel}>POTENTIAL</Text>
        </View>
      </View>
      <View style={s.box}>
        <Row label={mode === 'market' ? 'Price' : 'Value'} value={formatMoney(value)} />
        <Row label="Yearly cost" value={formatMoney(wage)} />
        {mode === 'market' ? (
          <Row
            label="Money after buying"
            value={formatMoney(state.money - value)}
            color={state.money - value < 0 ? colors.red : undefined}
          />
        ) : (
          <>
            <Row label="Seasons at club" value={String(player.seasonsAtClub)} />
            <Row label="Goals this season" value={String(player.goals)} />
          </>
        )}
      </View>
      {mode === 'squad' ? (
        <View style={s.box}>
          <Row label="Chemistry" value={`${chem}`} />
          <Bar value={chem} color={chem >= 80 ? colors.green : chem >= 60 ? colors.gold : colors.orange} />
          <Text style={s.hint}>
            Chemistry grows with every season at the club. A captain in the XI adds +10 to team
            chemistry.
          </Text>
        </View>
      ) : (
        <Text style={s.hint}>
          New signings start with low chemistry (40) and gain 20 per season at the club.
        </Text>
      )}
    </Sheet>
  );
}

const s = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
  heroText: { flex: 1, gap: 4 },
  meta: { fontSize: 15, fontWeight: '700', color: colors.muted },
  pot: { alignItems: 'center' },
  potValue: { fontSize: 24, fontWeight: '900', color: colors.green },
  potLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1, color: colors.muted },
  box: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 12,
    gap: 4,
  },
  hint: { fontSize: 13, color: colors.muted, fontWeight: '600', marginTop: 6, lineHeight: 18 },
  footer: { gap: 8, paddingTop: 8 },
  actions: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
  reason: { textAlign: 'center', color: colors.muted, fontWeight: '700' },
});
