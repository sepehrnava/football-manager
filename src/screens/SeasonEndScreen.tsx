import { StatusBar } from 'expo-status-bar';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ECONOMY } from '../game/constants';
import { compName, DEFAULT_COUNTRY } from '../game/leagues';
import { useCareer, useGame } from '../state/GameContext';
import { Button, Card, Icon, Row, Section, Tag, Text } from '../ui/components';
import { FadeIn } from '../ui/motion';
import { DISPLAY } from '../ui/text';
import { colors, formatFans, formatMoney, ordinal, radius, seasonLabel } from '../ui/theme';

export function SeasonEndScreen() {
  const { state, dispatch } = useCareer();
  const { resetCareer } = useGame();
  const insets = useSafeAreaInsets();
  const sum = state.summary;
  if (!sum) return null;
  const sacked = state.phase === 'gameover';
  const champion = sum.position === 1;
  const place = ordinal(sum.position);
  const suffix = place.slice(String(sum.position).length);

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 24 }]}
    >
      <StatusBar style="light" />
      <View style={[s.hero, { paddingTop: insets.top + 24 }]}>
        <FadeIn>
          <Text style={s.kicker}>SEASON {seasonLabel(sum.season)} · FINAL TABLE</Text>
        </FadeIn>
        <FadeIn from="scale" delay={150} duration={480} style={s.placeRow}>
          {champion ? <Icon name="trophy" size={64} color={colors.gold} /> : null}
          <Text style={[s.place, champion && { color: colors.gold }]}>{sum.position}</Text>
          <Text style={[s.placeSuffix, champion && { color: colors.gold }]}>{suffix}</Text>
        </FadeIn>
        <FadeIn delay={300} style={s.heroText}>
          <Text style={s.headline}>{champion ? 'Champions' : `You finished ${place}`}</Text>
          {!champion ? <Text style={s.sub}>Champions: {sum.championName}</Text> : null}
          {sum.cupResults?.map((c) => (
            <View key={c.name} style={s.cupLine}>
              <Icon name="trophy-outline" size={15} color={colors.nightMuted} />
              <Text style={s.sub}>
                {c.name}: {c.result}
              </Text>
            </View>
          ))}
          {sum.movement ? (
            <View style={[s.movement, sum.movement === 'promoted' ? s.promoted : s.relegated]}>
              <Icon name={sum.movement === 'promoted' ? 'arrow-up-bold' : 'arrow-down-bold'} size={18} color="#FFFFFF" />
              <Text style={s.movementText}>
                {sum.movement === 'promoted'
                  ? `Promoted to the ${compName({ country: sum.country ?? DEFAULT_COUNTRY, division: (sum.division ?? 2) - 1 })}`
                  : `Relegated to the ${compName({ country: sum.country ?? DEFAULT_COUNTRY, division: (sum.division ?? 1) + 1 })}`}
              </Text>
            </View>
          ) : null}
        </FadeIn>
      </View>

      <View style={s.body}>
        {sum.board === 'sacked' || sum.board === 'warning' ? (
          <FadeIn delay={380}>
            <Card tone="red" style={s.sacked}>
              <View style={s.sackedHead}>
                <Icon name="alert-octagon" size={22} color={colors.red} />
                <Text style={s.sackedTitle}>{sacked ? 'The board has sacked you' : 'Final warning from the board'}</Text>
              </View>
              <Text style={s.sackedText}>
                {sacked
                  ? `Two seasons in a row below ${formatMoney(ECONOMY.debtLimit)}. Your time at the club is over.`
                  : `The club ended the season at ${formatMoney(sum.moneyAfter)}. Finish next season above ${formatMoney(ECONOMY.debtLimit)}, or you are sacked. Selling players is the quickest fix.`}
              </Text>
            </Card>
          </FadeIn>
        ) : null}

        <FadeIn delay={450} style={s.group}>
          <Section title="Finances" />
          <Card style={s.card}>
            <Row icon="podium" label="Prize money" value={`+${formatMoney(sum.prize)}`} color={colors.greenDark} />
            <Row icon="account-group" label="Fan revenue" value={`+${formatMoney(sum.fanIncome)}`} color={colors.greenDark} />
            {sum.tv ? <Row icon="television-classic" label="TV money" value={`+${formatMoney(sum.tv)}`} color={colors.greenDark} /> : null}
            {sum.cupPrize ? (
              <Row icon="trophy-outline" label="Cup prize money" value={`+${formatMoney(sum.cupPrize)}`} color={colors.greenDark} />
            ) : null}
            {sum.sponsor ? <Row icon="handshake" label="Sponsors" value={`+${formatMoney(sum.sponsor)}`} color={colors.greenDark} /> : null}
            <Row icon="tshirt-crew" label="Player wages" value={`-${formatMoney(sum.wages)}`} color={colors.red} />
            {sum.staffWages ? <Row icon="whistle" label="Staff wages" value={`-${formatMoney(sum.staffWages)}`} color={colors.red} /> : null}
            <Row icon="stadium" label="Running the club" value={`-${formatMoney(sum.fixedCosts)}`} color={colors.red} />
            {sum.stakeholder ? (
              <Row icon="briefcase" label="Owners' share of profit" value={`-${formatMoney(sum.stakeholder)}`} color={colors.red} />
            ) : null}
            {sum.bonuses ? <Row icon="medal" label="Top-finish bonuses" value={`-${formatMoney(sum.bonuses)}`} color={colors.red} /> : null}
            <View style={s.divider} />
            <View style={s.net}>
              <Text style={s.netLabel}>Season result</Text>
              <Text style={[s.netValue, { color: sum.net >= 0 ? colors.greenDark : colors.red }]}>
                {sum.net >= 0 ? '+' : ''}
                {formatMoney(sum.net)}
              </Text>
            </View>
            <Row icon="cash" label="Money" value={`${formatMoney(sum.moneyBefore)} → ${formatMoney(sum.moneyAfter)}`} bold />
            <Row icon="account-heart" label="Fans" value={`${formatFans(sum.fansBefore)} → ${formatFans(sum.fansAfter)}`} />
          </Card>
        </FadeIn>

        {!sacked ? (
          <FadeIn delay={600} style={s.group}>
            <Section title="Player development" />
            <Card style={s.card}>
              {sum.changes.length === 0 ? <Text style={s.muted}>No rating changes.</Text> : null}
              {sum.changes.slice(0, 8).map((c) => {
                const up = c.to > c.from;
                return (
                  <View key={c.name} style={s.change}>
                    <Icon name={up ? 'arrow-up-bold' : 'arrow-down-bold'} size={16} color={up ? colors.green : colors.red} />
                    <Text style={s.changeName} numberOfLines={1}>
                      {c.name}
                    </Text>
                    <Text style={s.changeFrom}>{c.from}</Text>
                    <Icon name="arrow-right" size={14} color={colors.muted} />
                    <Text style={[s.changeTo, { color: up ? colors.greenDark : colors.red }]}>{c.to}</Text>
                  </View>
                );
              })}
              {sum.changes.length > 8 ? <Text style={s.muted}>+{sum.changes.length - 8} more changes</Text> : null}
            </Card>

            {sum.retired.length || sum.academy.length ? (
              <>
                <Section title="Squad changes" />
                <Card style={s.card}>
                  {sum.retired.map((n) => (
                    <View key={n} style={s.change}>
                      <Icon name="hand-wave" size={16} color={colors.muted} />
                      <Text style={s.changeName}>{n}</Text>
                      <Tag label="Retired" />
                    </View>
                  ))}
                  {sum.academy.map((n) => (
                    <View key={n} style={s.change}>
                      <Icon name="sprout" size={16} color={colors.green} />
                      <Text style={s.changeName}>{n}</Text>
                      <Tag label="Academy" tone="green" />
                    </View>
                  ))}
                </Card>
              </>
            ) : null}
          </FadeIn>
        ) : null}

        <FadeIn delay={700} style={s.action}>
          {sacked ? (
            <Button label="Start a new career" icon="refresh" size="lg" onPress={resetCareer} />
          ) : (
            <Button
              label={`Start ${seasonLabel(sum.season + 1)}`}
              icon="arrow-right"
              size="lg"
              onPress={() => dispatch({ type: 'nextSeason' })}
            />
          )}
        </FadeIn>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  content: { maxWidth: 640, width: '100%', alignSelf: 'center' },
  hero: { backgroundColor: colors.night, paddingHorizontal: 16, paddingBottom: 28, alignItems: 'center' },
  kicker: { textAlign: 'center', fontSize: 15, fontFamily: DISPLAY, fontWeight: '800', letterSpacing: 1.5, color: colors.nightMuted },
  placeRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', gap: 4, marginTop: 6 },
  place: { fontSize: 140, lineHeight: 150, fontFamily: DISPLAY, fontWeight: '800', fontStyle: 'italic', color: '#FFFFFF' },
  placeSuffix: { fontSize: 44, fontFamily: DISPLAY, fontWeight: '800', fontStyle: 'italic', color: '#FFFFFF', marginTop: 22 },
  heroText: { alignItems: 'center', gap: 4 },
  headline: { textAlign: 'center', fontSize: 30, fontFamily: DISPLAY, fontWeight: '800', color: '#FFFFFF', textTransform: 'uppercase' },
  sub: { textAlign: 'center', fontSize: 14, fontWeight: '600', color: colors.nightMuted },
  cupLine: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  movement: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginTop: 12,
  },
  promoted: { backgroundColor: colors.green },
  relegated: { backgroundColor: colors.red },
  movementText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  body: { paddingHorizontal: 16, paddingTop: 12, gap: 10 },
  group: { gap: 10 },
  card: { paddingVertical: 8, gap: 0 },
  sacked: { gap: 6 },
  sackedHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sackedTitle: { flex: 1, fontSize: 20, fontFamily: DISPLAY, fontWeight: '800', color: colors.redDark },
  sackedText: { fontSize: 14, fontWeight: '600', color: colors.ink },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 6 },
  net: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingVertical: 2 },
  netLabel: { fontSize: 15, fontWeight: '800', color: colors.ink },
  netValue: { fontSize: 32, fontFamily: DISPLAY, fontWeight: '800' },
  change: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  changeName: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.ink },
  changeFrom: { fontSize: 18, fontFamily: DISPLAY, fontWeight: '800', color: colors.muted },
  changeTo: { fontSize: 20, fontFamily: DISPLAY, fontWeight: '800', minWidth: 22, textAlign: 'right' },
  muted: { color: colors.muted, fontWeight: '600', paddingVertical: 4 },
  action: { marginTop: 14 },
});
