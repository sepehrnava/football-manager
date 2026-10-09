import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { clubById, compTable, midWindowRound, seasonRounds, USER_ID, userComp } from '../game/game';
import { zoneOf } from '../game/leagues';
import { playerValue, surname } from '../game/players';
import type { Fixture } from '../game/types';
import { useCareer } from '../state/GameContext';
import { Bar, Button, ClubCrest, Icon, IconButton, Text } from '../ui/components';
import { animateNextLayout, FadeIn, Pop } from '../ui/motion';
import { DISPLAY } from '../ui/text';
import { colors, formatMoney, radius } from '../ui/theme';
import { AchievementToast } from './Honours';

/** Names with a long single word (e.g. "Wolverhampton") need a smaller size to avoid breaking mid-word. */
function longWord(name: string) {
  return name.split(' ').some((w) => w.length > 11);
}

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
  // Only the user's own league (other leagues share round numbers).
  const others = roundFixtures.filter(
    (f) => f !== mine && f.country === mine?.country && f.division === mine?.division,
  );
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

  const skipLabel = state.round < midWindowRound(state) ? 'Skip to the window' : 'Skip to the end';

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <StatusBar style="light" />
      <View style={[s.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }]}>
        <View style={s.header}>
          <IconButton icon="close" label="Close" onPress={onClose} dark size={40} />
          <View style={s.headerMid}>
            <Text style={s.md}>{played === 0 ? 'Kick-off' : `Matchday ${played} / ${rounds}`}</Text>
            <Bar value={(played / rounds) * 100} color={colors.gold} track={colors.night3} height={4} />
          </View>
          <View style={s.spacer} />
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
            <FadeIn key={`o${lastRound}`} delay={80} style={s.panel}>
              {others.map((f, i) => (
                <ResultLine key={i} fixture={f} last={i === others.length - 1} />
              ))}
            </FadeIn>
          ) : null}

          <View style={[s.panel, s.table]}>
            {table.map((r, i) => {
              const c = clubById(state, r.clubId);
              const me = r.clubId === USER_ID;
              const zone = zoneOf(i, table.length, comp);
              return (
                <View key={r.clubId} style={[s.tr, me && s.me]}>
                  <View
                    style={[
                      s.zone,
                      zone === 'up' && { backgroundColor: colors.green },
                      zone === 'down' && { backgroundColor: colors.red },
                    ]}
                  />
                  <Text style={s.pos}>{i + 1}</Text>
                  <ClubCrest club={c} size={16} />
                  <Text style={[s.tname, me && s.bold]} numberOfLines={1}>
                    {c.name}
                  </Text>
                  <Text style={s.gd}>
                    {r.gf - r.ga > 0 ? '+' : ''}
                    {r.gf - r.ga}
                  </Text>
                  <Text style={[s.pts, me && { color: colors.gold }]}>{r.points}</Text>
                </View>
              );
            })}
          </View>
        </ScrollView>

        <View style={s.controls}>
          {stopText ? (
            <>
              <Text style={s.stop}>{stopText}</Text>
              <Button label="Continue" icon="arrow-right" size="lg" onPress={onClose} />
            </>
          ) : reached ? (
            <Button label="Done" icon="check" size="lg" onPress={onClose} />
          ) : (
            <View style={s.controlRow}>
              {active ? (
                <Button label="Pause" icon="pause" variant="secondary" style={s.pause} onPress={() => setRunning(false)} />
              ) : (
                <Button label="Play on" icon="play" style={s.pause} onPress={playOn} />
              )}
              <Button label={skipLabel} icon="fast-forward" variant="gold" style={s.flex} onPress={skip} />
            </View>
          )}
        </View>
      </View>
      <AchievementToast />
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
          Rated {p.rating}, age {p.age}, worth about {formatMoney(value)}:{' '}
          <Text style={{ color: diff >= 0 ? '#7EE2A0' : '#FF9A9D' }}>
            {diff >= 0 ? `${formatMoney(diff)} above` : `${formatMoney(-diff)} below`}
          </Text>{' '}
          value.
        </Text>
        <View style={s.offerButtons}>
          <Button
            label="Keep"
            variant="secondary"
            style={s.flex}
            onPress={() => dispatch({ type: 'rejectOffer', offerId: o.id })}
          />
          <Button
            label={`Sell ${formatMoney(o.fee)}`}
            style={s.flex}
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
    <View style={[s.panel, s.myMatch, { borderTopColor: color }]}>
      <View style={[s.verdict, { backgroundColor: color }]}>
        <Text style={s.verdictText}>{verdict}</Text>
      </View>
      <View style={s.scoreRow}>
        <View style={s.team}>
          <ClubCrest club={home} size={52} />
          <Text style={[s.teamName, longWord(home.name) && s.teamNameLong]} numberOfLines={2}>
            {home.name}
          </Text>
        </View>
        <Pop trigger={`${r.home}-${r.away}`} style={s.scoreBox}>
          <Text style={s.score}>{r.home}</Text>
          <Text style={s.scoreDash}>–</Text>
          <Text style={s.score}>{r.away}</Text>
        </Pop>
        <View style={s.team}>
          <ClubCrest club={away} size={52} />
          <Text style={[s.teamName, longWord(away.name) && s.teamNameLong]} numberOfLines={2}>
            {away.name}
          </Text>
        </View>
      </View>
      {r.scorers?.length ? (
        <View style={s.scorersLine}>
          <Icon name="soccer" size={14} color={colors.nightMuted} />
          <Text style={s.scorers}>{r.scorers.map(surname).join(', ')}</Text>
        </View>
      ) : null}
    </View>
  );
}

function ResultLine({ fixture, last }: { fixture: Fixture; last: boolean }) {
  const { state } = useCareer();
  const h = clubById(state, fixture.homeId);
  const a = clubById(state, fixture.awayId);
  return (
    <View style={[s.result, !last && s.rule]}>
      <Text style={[s.rname, s.right]} numberOfLines={1}>
        {h.name}
      </Text>
      <Text style={s.rscore}>
        {fixture.result?.home}–{fixture.result?.away}
      </Text>
      <Text style={s.rname} numberOfLines={1}>
        {a.name}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.night, paddingHorizontal: 16 },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  headerMid: { flex: 1, gap: 6 },
  md: { fontSize: 22, fontFamily: DISPLAY, fontWeight: '800', color: '#FFFFFF', textAlign: 'center', letterSpacing: 0.5, textTransform: 'uppercase' },
  spacer: { width: 40, height: 40 },
  content: { gap: 10, paddingBottom: 12 },
  panel: { backgroundColor: colors.night2, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.nightLine, overflow: 'hidden' },
  offer: { backgroundColor: colors.night2, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.gold, padding: 16, gap: 8 },
  offerTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  offerTitle: { flex: 1, color: '#FFFFFF', fontWeight: '800', fontSize: 18 },
  offerFee: { color: colors.gold, fontFamily: DISPLAY, fontWeight: '800', fontSize: 44, marginVertical: -4 },
  offerButtons: { flexDirection: 'row', gap: 10, marginTop: 4 },
  momentKicker: { color: colors.gold, fontFamily: DISPLAY, fontWeight: '800', fontSize: 15, letterSpacing: 1 },
  momentText: { color: colors.nightMuted, fontWeight: '600', fontSize: 14 },
  wait: { textAlign: 'center', fontSize: 28, fontFamily: DISPLAY, fontWeight: '800', color: colors.nightMuted, marginVertical: 40 },
  myMatch: { alignItems: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 10, borderTopWidth: 3 },
  verdict: { paddingHorizontal: 10, paddingVertical: 1, borderRadius: radius.sm },
  verdictText: { color: '#FFFFFF', fontFamily: DISPLAY, fontWeight: '800', fontSize: 16, letterSpacing: 2 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  team: { flex: 1, alignItems: 'center', gap: 6 },
  teamName: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' },
  teamNameLong: { fontSize: 12 },
  scoreBox: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 6 },
  score: { fontSize: 64, fontFamily: DISPLAY, fontWeight: '800', color: '#FFFFFF', minWidth: 30, textAlign: 'center' },
  scoreDash: { fontSize: 40, fontFamily: DISPLAY, color: colors.nightMuted },
  scorersLine: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12 },
  scorers: { fontSize: 13, fontWeight: '600', color: colors.nightMuted, textAlign: 'center', flexShrink: 1 },
  result: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, paddingHorizontal: 12 },
  rule: { borderBottomWidth: 1, borderBottomColor: colors.nightLine },
  rname: { flex: 1, fontSize: 13, fontWeight: '600', color: '#DDE5DF' },
  right: { textAlign: 'right' },
  rscore: { width: 44, textAlign: 'center', fontSize: 18, fontFamily: DISPLAY, fontWeight: '800', color: '#FFFFFF' },
  table: { paddingVertical: 4 },
  tr: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5, paddingRight: 12 },
  me: { backgroundColor: colors.night3 },
  zone: { width: 3, alignSelf: 'stretch', backgroundColor: 'transparent' },
  pos: { width: 20, fontSize: 15, fontFamily: DISPLAY, fontWeight: '800', color: colors.nightMuted },
  tname: { flex: 1, fontSize: 13, fontWeight: '600', color: '#DDE5DF' },
  bold: { fontWeight: '800', color: '#FFFFFF' },
  gd: { width: 34, textAlign: 'right', fontSize: 12, fontWeight: '600', color: colors.nightMuted },
  pts: { width: 28, textAlign: 'right', fontSize: 17, fontFamily: DISPLAY, fontWeight: '800', color: '#FFFFFF' },
  controls: { gap: 8, paddingTop: 10 },
  controlRow: { flexDirection: 'row', gap: 10 },
  pause: { width: 128 },
  stop: { textAlign: 'center', fontSize: 20, fontFamily: DISPLAY, fontWeight: '800', color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: 0.5 },
});
