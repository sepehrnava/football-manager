import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { clubById, compTable, seasonRounds, USER_ID, userComp } from '../game/game';
import { zoneOf } from '../game/leagues';
import { playerValue, surname } from '../game/players';
import type { Fixture } from '../game/types';
import { useCareer } from '../state/GameContext';
import { Bar, Button, Card, ClubCrest } from '../ui/components';
import { animateNextLayout, FadeIn } from '../ui/motion';
import { colors, formatMoney } from '../ui/theme';

/** Time between matchdays: quick, but slow enough to follow the table. */
const STEP_MS = 650;

/**
 * Plays rounds on a timer until the next stop (transfer window or season end),
 * or until `until` rounds have been played. Without a target it also pauses
 * before key matches so the user can react. Pause any time to go match by match.
 */
export function SimScreen({ until: initialUntil, onClose }: { until?: number; onClose: () => void }) {
  const { state, dispatch } = useCareer();
  const insets = useSafeAreaInsets();
  const [running, setRunning] = useState(true);
  const [until, setUntil] = useState(initialUntil);
  const [startRound] = useState(state.round);
  const inSeason = state.phase === 'season';
  const reached = until !== undefined && state.round >= until;
  // When a window opens, clubs' bids are shown right here, one at a time.
  const offer = state.phase === 'window' ? state.offers[0] : undefined;
  // Matches run without interruption until a transfer window or the season end.
  const active = running && inSeason && !reached;

  useEffect(() => {
    if (!active) return;
    // The first match of a run starts quickly; later ones follow the speed.
    const delay = state.round === startRound ? 250 : STEP_MS;
    const t = setTimeout(() => {
      animateNextLayout();
      dispatch({ type: 'playRound' });
    }, delay);
    return () => clearTimeout(t);
  }, [active, state.round, startRound, dispatch]);

  const playOn = () => {
    setUntil(undefined);
    setRunning(true);
  };
  const skip = () => {
    animateNextLayout();
    dispatch({ type: 'simToStop' });
  };

  const played = state.round;
  const rounds = seasonRounds(state);
  const lastRound = played - 1;
  const roundFixtures = state.fixtures.filter((f) => f.round === lastRound);
  const mine = roundFixtures.find((f) => f.homeId === USER_ID || f.awayId === USER_ID);
  const others = roundFixtures.filter((f) => f !== mine);
  const table = compTable(state);
  const comp = userComp(state);

  const stopText =
    state.phase === 'window'
      ? state.offers.length
        ? `Transfer window is open · ${state.offers.length} ${state.offers.length > 1 ? 'offers' : 'offer'} for your players`
        : 'Transfer window is open'
      : state.phase === 'summary' || state.phase === 'gameover'
        ? 'Season finished'
        : null;

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={[s.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }]}>
        <View style={s.header}>
          <Pressable onPress={onClose} style={s.close} accessibilityLabel="Close">
            <Text style={s.closeText}>✕</Text>
          </Pressable>
          <View style={s.headerMid}>
            <Text style={s.md}>
              {played === 0 ? 'Kick-off' : `Matchday ${played} / ${rounds}`}
            </Text>
            <Bar value={(played / rounds) * 100} color={colors.ink} />
          </View>
          {stopText ? (
            <View style={s.close} />
          ) : (
            <Pressable onPress={skip} style={s.close} accessibilityLabel="Skip to the end">
              <Text style={s.closeText}>⏭</Text>
            </Pressable>
          )}
        </View>

        <ScrollView contentContainerStyle={s.content}>
          {offer ? <OfferCard key={offer.id} offerId={offer.id} /> : null}

          {mine ? (
            <FadeIn key={`r${lastRound}`} from="scale" duration={220}>
              <MyMatch fixture={mine} />
            </FadeIn>
          ) : (
            <Text style={s.wait}>Kick-off…</Text>
          )}

          {others.length ? (
            <FadeIn key={`o${lastRound}`} delay={80}>
              <Card style={s.others}>
                {others.map((f, i) => (
                  <ResultLine key={i} fixture={f} />
                ))}
              </Card>
            </FadeIn>
          ) : null}

          <Card style={s.table}>
            {table.map((r, i) => {
              const c = clubById(state, r.clubId);
              const me = r.clubId === USER_ID;
              return (
                <View key={r.clubId} style={[s.tr, me && s.me]}>
                  <Text
                    style={[
                      s.pos,
                      zoneOf(i, table.length, comp) === 'up' && { color: colors.green },
                      zoneOf(i, table.length, comp) === 'down' && { color: colors.red },
                    ]}
                  >
                    {i + 1}
                  </Text>
                  <ClubCrest club={c} size={16} />
                  <Text style={[s.tname, me && s.bold]} numberOfLines={1}>
                    {c.name}
                  </Text>
                  <Text style={s.gd}>{r.gf - r.ga > 0 ? '+' : ''}{r.gf - r.ga}</Text>
                  <Text style={s.pts}>{r.points}</Text>
                </View>
              );
            })}
          </Card>
        </ScrollView>

        <View style={s.controls}>
          {stopText ? (
            <>
              <Text style={s.stop}>{stopText}</Text>
              <Button label="CONTINUE" variant="green" onPress={onClose} />
            </>
          ) : reached ? (
            <Button label="DONE" variant="green" onPress={onClose} />
          ) : active ? (
            <Button label="⏸  PAUSE" variant="light" onPress={() => setRunning(false)} />
          ) : (
            <Button label="▶  CONTINUE" variant="green" onPress={playOn} />
          )}
        </View>
      </View>
    </Modal>
  );
}

/** "A club wants your player": sell now, or keep and play on. */
function OfferCard({ offerId }: { offerId: string }) {
  const { state, dispatch } = useCareer();
  const o = state.offers.find((x) => x.id === offerId);
  const p = o && state.squad.find((m) => m.id === o.playerId);
  if (!o || !p) return null;
  const club = clubById(state, o.clubId);
  const value = playerValue(p);
  const diff = o.fee - value;
  return (
    <FadeIn from="scale">
      <View style={s.offer}>
        <Text style={s.momentKicker}>TRANSFER OFFER</Text>
        <View style={s.offerTop}>
          <ClubCrest club={club} size={44} />
          <Text style={s.offerTitle}>
            {club.name} want {p.name}
          </Text>
        </View>
        <Text style={s.offerFee}>{formatMoney(o.fee)}</Text>
        <Text style={s.momentText}>
          Rated {p.rating}, age {p.age}, worth about {formatMoney(value)}. This offer is{' '}
          <Text style={{ color: diff >= 0 ? '#7EE2A0' : '#FF9A9D' }}>
            {diff >= 0 ? `${formatMoney(diff)} above` : `${formatMoney(-diff)} below`}
          </Text>{' '}
          that.
        </Text>
        <View style={s.offerButtons}>
          <Button
            label="KEEP"
            variant="light"
            style={s.offerButton}
            onPress={() => dispatch({ type: 'rejectOffer', offerId: o.id })}
          />
          <Button
            label={`SELL ${formatMoney(o.fee)}`}
            variant="green"
            style={s.offerButton}
            onPress={() => {
              animateNextLayout();
              dispatch({ type: 'acceptOffer', offerId: o.id });
            }}
          />
        </View>
      </View>
    </FadeIn>
  );
}

function MyMatch({ fixture }: { fixture: Fixture }) {
  const { state } = useCareer();
  const home = clubById(state, fixture.homeId);
  const away = clubById(state, fixture.awayId);
  const r = fixture.result!;
  const us = fixture.homeId === USER_ID ? r.home : r.away;
  const them = fixture.homeId === USER_ID ? r.away : r.home;
  const verdict = us > them ? 'WIN' : us < them ? 'LOSS' : 'DRAW';
  const color = us > them ? colors.green : us < them ? colors.red : colors.draw;
  return (
    <Card style={s.myMatch}>
      <View style={[s.verdict, { backgroundColor: color }]}>
        <Text style={s.verdictText}>{verdict}</Text>
      </View>
      <View style={s.scoreRow}>
        <View style={s.team}>
          <ClubCrest club={home} size={52} />
          <Text style={s.teamName} numberOfLines={2}>
            {home.name}
          </Text>
        </View>
        <Text style={s.score}>
          {r.home} – {r.away}
        </Text>
        <View style={s.team}>
          <ClubCrest club={away} size={52} />
          <Text style={s.teamName} numberOfLines={2}>
            {away.name}
          </Text>
        </View>
      </View>
      {r.scorers?.length ? (
        <Text style={s.scorers}>⚽ {r.scorers.map(surname).join(', ')}</Text>
      ) : null}
    </Card>
  );
}

function ResultLine({ fixture }: { fixture: Fixture }) {
  const { state } = useCareer();
  const h = clubById(state, fixture.homeId);
  const a = clubById(state, fixture.awayId);
  return (
    <View style={s.result}>
      <Text style={[s.rname, s.right]} numberOfLines={1}>
        {h.name}
      </Text>
      <Text style={s.rscore}>
        {fixture.result?.home} – {fixture.result?.away}
      </Text>
      <Text style={s.rname} numberOfLines={1}>
        {a.name}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  headerMid: { flex: 1, gap: 6 },
  md: { fontSize: 18, fontWeight: '900', color: colors.ink, textAlign: 'center' },
  close: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { fontSize: 15, fontWeight: '900', color: colors.muted },
  content: { gap: 12, paddingBottom: 12 },
  offer: { backgroundColor: colors.ink, borderRadius: 20, padding: 16, gap: 8 },
  offerTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  offerTitle: { flex: 1, color: '#FFFFFF', fontWeight: '900', fontSize: 19 },
  offerFee: { color: colors.gold, fontWeight: '900', fontSize: 34 },
  offerButtons: { flexDirection: 'row', gap: 10, marginTop: 4 },
  offerButton: { flex: 1 },
  momentKicker: { color: colors.gold, fontWeight: '900', fontSize: 12, letterSpacing: 1.5 },
  momentText: { color: '#CFCFC8', fontWeight: '600', fontSize: 14 },
  wait: { textAlign: 'center', fontSize: 18, fontWeight: '800', color: colors.muted, marginVertical: 40 },
  myMatch: { alignItems: 'center', gap: 10 },
  verdict: { paddingHorizontal: 14, paddingVertical: 4, borderRadius: 10 },
  verdictText: { color: '#FFFFFF', fontWeight: '900', letterSpacing: 2 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  team: { flex: 1, alignItems: 'center', gap: 6 },
  teamName: { fontSize: 14, fontWeight: '800', color: colors.ink, textAlign: 'center' },
  score: { fontSize: 40, fontWeight: '900', color: colors.ink, paddingHorizontal: 8 },
  scorers: { fontSize: 13, fontWeight: '700', color: colors.muted, textAlign: 'center' },
  others: { paddingVertical: 8, gap: 2 },
  result: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 3 },
  rname: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.ink },
  right: { textAlign: 'right' },
  rscore: { width: 50, textAlign: 'center', fontWeight: '900', color: colors.ink },
  table: { paddingVertical: 6, paddingHorizontal: 10 },
  tr: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5, paddingHorizontal: 4 },
  me: { backgroundColor: colors.faint, borderRadius: 8, borderWidth: 2, borderColor: colors.ink },
  pos: { width: 20, fontWeight: '900', color: colors.ink },
  tname: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.ink },
  bold: { fontWeight: '900' },
  gd: { width: 34, textAlign: 'right', fontSize: 12, fontWeight: '700', color: colors.muted },
  pts: { width: 28, textAlign: 'right', fontWeight: '900', color: colors.ink },
  controls: { gap: 8, paddingTop: 8 },
  stop: { textAlign: 'center', fontSize: 16, fontWeight: '900', color: colors.ink },
});
