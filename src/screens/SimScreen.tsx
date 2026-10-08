import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MID_WINDOW_ROUND, ROUNDS } from '../game/constants';
import { clubById, USER_ID } from '../game/game';
import { leagueTable } from '../game/league';
import { surname } from '../game/players';
import type { Fixture } from '../game/types';
import { useCareer } from '../state/GameContext';
import { Bar, Button, Card, ClubCrest } from '../ui/components';
import { colors } from '../ui/theme';

const SPEEDS = { normal: 900, fast: 300 };

/**
 * Plays rounds on a timer until the next stop (transfer window or season end).
 * Pause at any time to go match by match.
 */
export function SimScreen({ mode, onClose }: { mode: 'fast' | 'step'; onClose: () => void }) {
  const { state, dispatch } = useCareer();
  const insets = useSafeAreaInsets();
  const [running, setRunning] = useState(mode === 'fast');
  const [speed, setSpeed] = useState<keyof typeof SPEEDS>('normal');
  const stepped = useRef(false);
  const inSeason = state.phase === 'season';

  // "Next match" plays exactly one round when opened (guarded against double effects).
  useEffect(() => {
    if (mode !== 'step' || stepped.current) return;
    stepped.current = true;
    dispatch({ type: 'playRound' });
  }, [mode, dispatch]);

  useEffect(() => {
    if (!running || !inSeason) return;
    const t = setTimeout(() => dispatch({ type: 'playRound' }), SPEEDS[speed]);
    return () => clearTimeout(t);
  }, [running, inSeason, speed, state.round, dispatch]);

  const played = state.round;
  const lastRound = played - 1;
  const roundFixtures = state.fixtures.filter((f) => f.round === lastRound);
  const mine = roundFixtures.find((f) => f.homeId === USER_ID || f.awayId === USER_ID);
  const others = roundFixtures.filter((f) => f !== mine);
  const table = leagueTable(state.clubs, state.fixtures);

  const stopText =
    state.phase === 'window'
      ? 'Transfer window is open'
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
              {played === 0 ? 'Kick-off' : `Matchday ${played} / ${ROUNDS}`}
            </Text>
            <Bar value={(played / ROUNDS) * 100} color={colors.ink} />
          </View>
          <Pressable
            onPress={() => setSpeed(speed === 'normal' ? 'fast' : 'normal')}
            style={[s.close, speed === 'fast' && s.speedOn]}
            accessibilityLabel="Toggle speed"
          >
            <Text style={[s.closeText, speed === 'fast' && { color: '#FFFFFF' }]}>
              {speed === 'fast' ? '3×' : '1×'}
            </Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={s.content}>
          {mine ? <MyMatch fixture={mine} /> : <Text style={s.wait}>Get ready…</Text>}

          {others.length ? (
            <Card style={s.others}>
              {others.map((f, i) => (
                <ResultLine key={i} fixture={f} />
              ))}
            </Card>
          ) : null}

          <Card style={s.table}>
            {table.map((r, i) => {
              const c = clubById(state, r.clubId);
              const me = r.clubId === USER_ID;
              return (
                <View key={r.clubId} style={[s.tr, me && s.me]}>
                  <Text style={s.pos}>{i + 1}</Text>
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
          ) : running ? (
            <Button label="⏸  PAUSE" variant="light" onPress={() => setRunning(false)} />
          ) : (
            <View style={s.row}>
              <Button
                label="NEXT MATCH"
                variant="light"
                style={s.flex}
                onPress={() => dispatch({ type: 'playRound' })}
              />
              <Button label="▶ PLAY ON" style={s.flex} onPress={() => setRunning(true)} />
            </View>
          )}
          {!stopText ? (
            <Pressable onPress={() => dispatch({ type: 'simToStop' })} style={s.skip}>
              <Text style={s.skipText}>
                Skip to {state.round < MID_WINDOW_ROUND ? 'transfer window' : 'end of season'} ⏭
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Modal>
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
  const color = us > them ? colors.green : us < them ? colors.red : '#8A8A84';
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
  speedOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  closeText: { fontSize: 15, fontWeight: '900', color: colors.muted },
  content: { gap: 12, paddingBottom: 12 },
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
  row: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
  stop: { textAlign: 'center', fontSize: 16, fontWeight: '900', color: colors.ink },
  skip: { alignItems: 'center', paddingVertical: 6 },
  skipText: { color: colors.muted, fontWeight: '800' },
});
