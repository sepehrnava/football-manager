import { ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '../ui/text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ECONOMY } from '../game/constants';
import { compName, DEFAULT_COUNTRY } from '../game/leagues';
import { useCareer, useGame } from '../state/GameContext';
import { Button, Card, Row, SectionTitle } from '../ui/components';
import { FadeIn } from '../ui/motion';
import { colors, formatFans, formatMoney, ordinal, seasonLabel } from '../ui/theme';

export function SeasonEndScreen() {
  const { state, dispatch } = useCareer();
  const { resetCareer } = useGame();
  const insets = useSafeAreaInsets();
  const sum = state.summary;
  if (!sum) return null;
  const sacked = state.phase === 'gameover';
  const champion = sum.position === 1;

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={[s.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 }]}
    >
      <FadeIn>
        <Text style={s.kicker}>SEASON {seasonLabel(sum.season)} COMPLETE</Text>
      </FadeIn>
      <FadeIn from="scale" delay={150} duration={420}>
        <Text style={s.place}>{champion ? '🏆' : ordinal(sum.position)}</Text>
      </FadeIn>
      <FadeIn delay={300}>
        <Text style={s.headline}>
          {champion ? 'Champions!' : `You finished ${ordinal(sum.position)}`}
        </Text>
        {!champion ? <Text style={s.sub}>Champions: {sum.championName}</Text> : null}
        {sum.cupResults?.map((c) => (
          <Text key={c.name} style={s.sub}>
            🏆 {c.name}: {c.result}
          </Text>
        ))}
        {sum.movement ? (
          <View style={[s.movement, sum.movement === 'promoted' ? s.promoted : s.relegated]}>
            <Text style={s.movementText}>
              {sum.movement === 'promoted'
                ? `⬆️ PROMOTED to the ${compName({ country: sum.country ?? DEFAULT_COUNTRY, division: (sum.division ?? 2) - 1 })}!`
                : `⬇️ Relegated to the ${compName({ country: sum.country ?? DEFAULT_COUNTRY, division: (sum.division ?? 1) + 1 })}`}
            </Text>
          </View>
        ) : null}
      </FadeIn>

      {sum.board === 'sacked' || sum.board === 'warning' ? (
        <Card style={s.sacked}>
          <Text style={s.sackedTitle}>
            {sacked ? 'The board has sacked you' : '🚨 Final warning from the board'}
          </Text>
          <Text style={s.sackedText}>
            {sacked
              ? `Two seasons in a row below ${formatMoney(ECONOMY.debtLimit)}. Your time at the club is over.`
              : `The club ended the season at ${formatMoney(sum.moneyAfter)}. Finish next season above ${formatMoney(ECONOMY.debtLimit)}, or you are sacked. Selling players is the quickest fix.`}
          </Text>
        </Card>
      ) : null}

      <FadeIn delay={450}>
      <SectionTitle>FINANCES</SectionTitle>
      <Card>
        <Row label="Prize money" value={`+${formatMoney(sum.prize)}`} color={colors.green} />
        <Row label="Fan revenue" value={`+${formatMoney(sum.fanIncome)}`} color={colors.green} />
        {sum.tv ? <Row label="TV money" value={`+${formatMoney(sum.tv)}`} color={colors.green} /> : null}
        {sum.cupPrize ? <Row label="Cup prize money" value={`+${formatMoney(sum.cupPrize)}`} color={colors.green} /> : null}
        {sum.sponsor ? <Row label="Sponsors" value={`+${formatMoney(sum.sponsor)}`} color={colors.green} /> : null}
        <Row label="Player wages" value={`-${formatMoney(sum.wages)}`} color={colors.red} />
        {sum.staffWages ? <Row label="Staff wages" value={`-${formatMoney(sum.staffWages)}`} color={colors.red} /> : null}
        <Row label="Running the club" value={`-${formatMoney(sum.fixedCosts)}`} color={colors.red} />
        {sum.stakeholder ? (
          <Row label="Owners' share of profit" value={`-${formatMoney(sum.stakeholder)}`} color={colors.red} />
        ) : null}
        {sum.bonuses ? (
          <Row label="Top-finish bonuses" value={`-${formatMoney(sum.bonuses)}`} color={colors.red} />
        ) : null}
        <View style={s.divider} />
        <Row
          label="Season result"
          value={`${sum.net >= 0 ? '+' : ''}${formatMoney(sum.net)}`}
          color={sum.net >= 0 ? colors.green : colors.red}
          bold
        />
        <Row label="Money" value={`${formatMoney(sum.moneyBefore)} → ${formatMoney(sum.moneyAfter)}`} bold />
        <Row label="Fans" value={`${formatFans(sum.fansBefore)} → ${formatFans(sum.fansAfter)}`} />
      </Card>
      </FadeIn>

      {!sacked ? (
        <FadeIn delay={600}>
          <SectionTitle>PLAYER DEVELOPMENT</SectionTitle>
          <Card>
            {sum.changes.length === 0 ? <Text style={s.muted}>No rating changes.</Text> : null}
            {sum.changes.slice(0, 8).map((c) => (
              <Row
                key={c.name}
                label={c.name}
                value={`${c.from} → ${c.to} ${c.to > c.from ? '▲' : '▼'}`}
                color={c.to > c.from ? colors.green : colors.red}
              />
            ))}
            {sum.changes.length > 8 ? (
              <Text style={s.muted}>+{sum.changes.length - 8} more changes</Text>
            ) : null}
          </Card>

          {sum.retired.length || sum.academy.length ? (
            <>
              <SectionTitle>SQUAD CHANGES</SectionTitle>
              <Card>
                {sum.retired.map((n) => (
                  <Row key={n} label={n} value="Retired" color={colors.muted} />
                ))}
                {sum.academy.map((n) => (
                  <Row key={n} label={n} value="Academy graduate" color={colors.green} />
                ))}
              </Card>
            </>
          ) : null}
        </FadeIn>
      ) : null}

      <View style={s.action}>
        {sacked ? (
          <Button label="START A NEW CAREER" onPress={resetCareer} />
        ) : (
          <Button
            label={`START ${seasonLabel(sum.season + 1)} ▶`}
            variant="green"
            onPress={() => dispatch({ type: 'nextSeason' })}
          />
        )}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  content: { paddingHorizontal: 16, gap: 4, maxWidth: 640, width: '100%', alignSelf: 'center' },
  kicker: { textAlign: 'center', fontSize: 13, fontWeight: '800', letterSpacing: 2, color: colors.muted },
  place: { textAlign: 'center', fontSize: 72, fontWeight: '900', color: colors.ink, marginTop: 8 },
  movement: { alignSelf: 'center', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 8, marginTop: 12 },
  promoted: { backgroundColor: colors.green },
  relegated: { backgroundColor: colors.red },
  movementText: { color: '#FFFFFF', fontWeight: '900', fontSize: 16 },
  headline: { textAlign: 'center', fontSize: 26, fontWeight: '900', color: colors.ink },
  sub: { textAlign: 'center', fontSize: 15, fontWeight: '700', color: colors.muted, marginTop: 4 },
  sacked: { marginTop: 16, backgroundColor: colors.redSoft, borderColor: '#F6C9CA', borderBottomColor: '#EFA9AB' },
  sackedTitle: { fontSize: 18, fontWeight: '900', color: colors.red },
  sackedText: { fontSize: 14, fontWeight: '600', color: colors.ink, marginTop: 4 },
  divider: { height: 2, backgroundColor: colors.faint, marginVertical: 6 },
  muted: { color: colors.muted, fontWeight: '700', paddingVertical: 4 },
  action: { marginTop: 20 },
});
