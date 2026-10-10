import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { clubById, compTable, seasonRounds, USER_ID, userComp } from '../game/game';
import { zoneOf } from '../game/leagues';
import { playerValue, surname } from '../game/players';
import type { PlayMode } from '../game/meta';
import type { Fixture } from '../game/types';
import { useCareer, useGame } from '../state/GameContext';
import { Bar, Button, Card, ClubCrest } from '../ui/components';
import { BouncingBall, Confetti, LiveDot, ScoreTicker, Shake, SlideIn, Stamp } from '../ui/matchFx';
import { animateNextLayout, FadeIn } from '../ui/motion';
import { colors, formatMoney } from '../ui/theme';
import { AchievementToast } from './Honours';
import { SaleCheckSheet } from './SaleCheckSheet';

/** Names with a long single word (e.g. "Wolverhampton") need a smaller size to avoid breaking mid-word. */
function longWord(name: string) {
  return name.split(' ').some((w) => w.length > 11);
}

/** Time between matchdays in auto-play: enough to watch the result and the table move. */
const STEP_MS = 1800;
/** The first match of a run (and every match played one at a time) starts sooner. */
const FIRST_STEP_MS = 400;

/**
 * Plays matches in the user's saved mode: one at a time ("Next match"), or on a timer until
 * the next stop (transfer window or season end). It opens waiting for a tap; only an `until`
 * target from a match preview runs on its own until that round. The mode can be switched here at any time.
 */
export function SimScreen({ until: initialUntil, onClose }: { until?: number; onClose: () => void }) {
  const { state, dispatch } = useCareer();
  const { meta, setPlayMode } = useGame();
  const insets = useSafeAreaInsets();
  // Opens waiting for a tap, so a saved auto-play mode never starts on its own. Only a "play to here" target runs at once.
  const [running, setRunning] = useState(initialUntil !== undefined);
  const [openedAt] = useState(state.round);
  const [until, setUntil] = useState(initialUntil);
  const [runStart, setRunStart] = useState(state.round);
  const mode: PlayMode = meta.playMode ?? 'step';
  const auto = mode === 'auto' || until !== undefined;
  const inSeason = state.phase === 'season';
  const reached = until !== undefined && state.round >= until;
  // Nothing played since the screen opened: show it still, so it never looks like a match is going.
  const idle = !running && state.round === openedAt;
  // When a window opens, clubs' bids are shown right here, one at a time.
  // (Only bids made as the window opened; bids still on their way are not shown here.)
  const windowOffers = state.offers.filter((o) => !o.at);
  const offer = state.phase === 'window' ? windowOffers[0] : undefined;
  // Matches run without interruption until a transfer window or the season end.
  const active = running && inSeason && !reached;

  useEffect(() => {
    if (!active) return;
    // The first match of a run starts quickly; later ones follow the speed.
    const delay = state.round === runStart ? FIRST_STEP_MS : STEP_MS;
    const t = setTimeout(() => {
      animateNextLayout();
      dispatch({ type: 'playRound' });
      // Match by match: stop after each one.
      if (!auto) setRunning(false);
    }, delay);
    return () => clearTimeout(t);
  }, [active, auto, state.round, runStart, dispatch]);

  const playOn = () => {
    setUntil(undefined);
    setRunStart(state.round);
    setRunning(true);
  };
  // Switching mode only stops and sets the mode: the green button starts play.
  const changeMode = (next: PlayMode) => {
    setPlayMode(next);
    setUntil(undefined);
    setRunning(false);
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
  // Places gained or lost since the last result shown (none before the first match: that order is not a table yet).
  const myPos = table.findIndex((r) => r.clubId === USER_ID);
  const [move, setMove] = useState({ round: lastRound, pos: myPos, delta: 0 });
  if (move.round !== lastRound) {
    setMove({ round: lastRound, pos: myPos, delta: move.round < 0 ? 0 : move.pos - myPos });
  }

  const stopText =
    state.phase === 'window'
      ? windowOffers.length
        ? `Transfer window is open · ${windowOffers.length} ${windowOffers.length > 1 ? 'offers' : 'offer'} for your players`
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
            <View style={s.mdRow}>
              {active ? <LiveDot /> : null}
              <FadeIn key={played} from="scale" duration={200}>
                <Text style={s.md}>
                  {played === 0 ? 'Kick-off' : `Matchday ${played} / ${rounds}`}
                </Text>
              </FadeIn>
            </View>
            <Bar value={(played / rounds) * 100} color={colors.ink} />
          </View>
          <View style={s.spacer} />
        </View>

        <ScrollView contentContainerStyle={s.content}>
          {offer ? <OfferCard key={offer.id} offerId={offer.id} /> : null}

          {idle ? (
            <View style={s.waitBox}>
              <Text style={s.wait}>{played === 0 ? 'Ready to kick off' : `Ready for matchday ${played + 1}`}</Text>
            </View>
          ) : mine ? (
            <MyMatch key={`r${lastRound}`} fixture={mine} />
          ) : (
            <View style={s.waitBox}>
              <BouncingBall />
              <Text style={s.wait}>Kick-off…</Text>
            </View>
          )}

          {others.length > 0 && !idle ? (
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
                  {me && move.delta !== 0 && !idle ? (
                    <FadeIn key={`m${move.round}`} from="scale" delay={250} duration={200}>
                      <Text style={[s.move, { color: move.delta > 0 ? colors.green : colors.red }]}>
                        {move.delta > 0 ? '▲' : '▼'}
                        {Math.abs(move.delta)}
                      </Text>
                    </FadeIn>
                  ) : null}
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
          ) : (
            <>
              <ModeSwitch mode={auto ? 'auto' : 'step'} onChange={changeMode} />
              {!auto ? (
                <Button label="NEXT MATCH" variant="green" disabled={active} onPress={playOn} />
              ) : active ? (
                <Button label="PAUSE" variant="light" onPress={() => setRunning(false)} />
              ) : (
                <Button label={played === openedAt ? 'PLAY' : 'CONTINUE'} variant="green" onPress={playOn} />
              )}
            </>
          )}
        </View>
      </View>
      <AchievementToast />
    </Modal>
  );
}

const MODES: { id: PlayMode; label: string }[] = [
  { id: 'step', label: 'Match by match' },
  { id: 'auto', label: 'Auto-play' },
];

/** Two-way switch for how matches are played; the choice is remembered. */
function ModeSwitch({ mode, onChange }: { mode: PlayMode; onChange: (mode: PlayMode) => void }) {
  return (
    <View style={s.modes} accessibilityRole="radiogroup">
      {MODES.map((m) => {
        const on = m.id === mode;
        return (
          <Pressable
            key={m.id}
            onPress={() => !on && onChange(m.id)}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            style={[s.mode, on && s.modeOn]}
          >
            <Text style={[s.modeText, on && s.modeTextOn]}>{m.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** "A club wants your player": sell now, or keep and play on. */
function OfferCard({ offerId }: { offerId: string }) {
  const { state, dispatch } = useCareer();
  const [checking, setChecking] = useState(false);
  const o = state.offers.find((x) => x.id === offerId);
  const p = o && state.squad.find((m) => m.id === o.playerId);
  if (!o || !p) return null;
  const club = clubById(state, o.clubId);
  const value = playerValue(p);
  const diff = o.fee - value;
  return (
    <FadeIn from="scale">
      <SaleCheckSheet playerId={checking ? p.id : null} onClose={() => setChecking(false)} />
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
        <Text style={s.offerCheck} onPress={() => setChecking(true)} accessibilityRole="button">
          Check my squad ›
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

/** The user's result, played out like a game: crests slide in, the score ticks up, then the verdict lands. */
function MyMatch({ fixture }: { fixture: Fixture }) {
  const { state } = useCareer();
  const [done, setDone] = useState(false);
  const home = clubById(state, fixture.homeId);
  const away = clubById(state, fixture.awayId);
  const r = fixture.result!;
  const us = fixture.homeId === USER_ID ? r.home : r.away;
  const them = fixture.homeId === USER_ID ? r.away : r.home;
  const verdict = us > them ? 'WIN' : us < them ? 'LOSS' : 'DRAW';
  const color = us > them ? colors.green : us < them ? colors.red : colors.draw;
  return (
    <Shake active={done && us < them}>
      <Card style={s.myMatch}>
        <View style={s.verdictSlot}>
          {done ? (
            <Stamp style={[s.verdict, { backgroundColor: color }]}>
              <Text style={s.verdictText}>{verdict}</Text>
            </Stamp>
          ) : null}
        </View>
        <View style={s.scoreRow}>
          <SlideIn from="left">
            <View style={s.team}>
              <ClubCrest club={home} size={52} />
              <Text style={[s.teamName, longWord(home.name) && s.teamNameLong]} numberOfLines={2}>
                {home.name}
              </Text>
            </View>
          </SlideIn>
          <ScoreTicker home={r.home} away={r.away} delay={300} style={s.score} onDone={() => setDone(true)} />
          <SlideIn from="right">
            <View style={s.team}>
              <ClubCrest club={away} size={52} />
              <Text style={[s.teamName, longWord(away.name) && s.teamNameLong]} numberOfLines={2}>
                {away.name}
              </Text>
            </View>
          </SlideIn>
        </View>
        {r.scorers?.length ? (
          <FadeIn delay={200}>
            <Text style={s.scorers}>Goals: {r.scorers.map(surname).join(', ')}</Text>
          </FadeIn>
        ) : null}
        {done && us > them ? <Confetti /> : null}
      </Card>
    </Shake>
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
  mdRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  md: { fontSize: 18, fontWeight: '900', color: colors.ink, textAlign: 'center' },
  spacer: { width: 42, height: 42 },
  teamNameLong: { fontSize: 12 },
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
  offerCheck: { color: '#FFFFFF', fontWeight: '900', fontSize: 15, paddingVertical: 6, textDecorationLine: 'underline' },
  offerButtons: { flexDirection: 'row', gap: 10, marginTop: 4 },
  offerButton: { flex: 1 },
  momentKicker: { color: colors.gold, fontWeight: '900', fontSize: 12, letterSpacing: 1.5 },
  momentText: { color: '#CFCFC8', fontWeight: '600', fontSize: 14 },
  waitBox: { alignItems: 'center', gap: 10, marginVertical: 28 },
  wait: { textAlign: 'center', fontSize: 18, fontWeight: '800', color: colors.muted },
  myMatch: { alignItems: 'center', gap: 10 },
  verdictSlot: { height: 27, justifyContent: 'center' },
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
  move: { fontSize: 11, fontWeight: '900' },
  bold: { fontWeight: '900' },
  gd: { width: 34, textAlign: 'right', fontSize: 12, fontWeight: '700', color: colors.muted },
  pts: { width: 28, textAlign: 'right', fontWeight: '900', color: colors.ink },
  controls: { gap: 8, paddingTop: 8 },
  modes: {
    flexDirection: 'row',
    backgroundColor: colors.faint,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    padding: 3,
  },
  mode: { flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: 'center' },
  modeOn: { backgroundColor: colors.ink },
  modeText: { fontSize: 13, fontWeight: '800', color: colors.muted },
  modeTextOn: { color: '#FFFFFF' },
  stop: { textAlign: 'center', fontSize: 16, fontWeight: '900', color: colors.ink },
});
