import { useEffect, useMemo, useState } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { clubById, USER_ID } from '../game/game';
import { basePositions, buildHighlights, type Dot, type Lineup } from '../game/highlights';
import { clubPlayers } from '../game/market';
import { surname } from '../game/players';
import { autoPick, starters } from '../game/team';
import type { Club, Fixture, GameState } from '../game/types';
import { useCareer } from '../state/GameContext';
import { Button, ClubCrest } from '../ui/components';
import { NATIVE } from '../ui/motion';
import { colors } from '../ui/theme';

const DOT = 16;
const BALL = 9;
const SPEEDS = [1, 2, 4];

function lineupOf(state: GameState, club: Club): Lineup {
  if (club.id === USER_ID) {
    const xi = starters(state.squad, state.lineup);
    return { formation: state.formation, names: xi.map((p) => (p ? surname(p.name) : '—')), attack: club.attack || 70 };
  }
  const players = clubPlayers(state, club.id);
  const ids = autoPick(players, '4-4-2');
  return {
    formation: '4-4-2',
    names: ids.map((id) => {
      const p = players.find((x) => x.id === id);
      return p ? surname(p.name) : '—';
    }),
    attack: club.attack || 70,
  };
}

/** Similar kit colours would make the teams hard to tell apart: the away side switches. */
function kits(home: Club, away: Club) {
  const hex = (c: string) => parseInt(c.replace('#', '').padEnd(6, '0').slice(0, 6), 16);
  const rgb = (c: string) => [(hex(c) >> 16) & 255, (hex(c) >> 8) & 255, hex(c) & 255];
  const [a, b] = [rgb(home.crest.primary), rgb(away.crest.primary)];
  const close = Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) < 160;
  return {
    home: { fill: home.crest.primary, edge: home.crest.secondary },
    away: close
      ? { fill: away.crest.secondary, edge: away.crest.primary }
      : { fill: away.crest.primary, edge: away.crest.secondary },
  };
}

/** Prototype: a fast 2D replay of the key moments of a played match. */
export function MatchViewer({ fixture, onClose }: { fixture: Fixture; onClose: () => void }) {
  const { state } = useCareer();
  const insets = useSafeAreaInsets();
  const home = clubById(state, fixture.homeId);
  const away = clubById(state, fixture.awayId);
  const r = fixture.result!;
  const userHome = fixture.homeId === USER_ID;

  const { moments, start, homeLineup, awayLineup } = useMemo(() => {
    const h = lineupOf(state, home);
    const a = lineupOf(state, away);
    const mine = (r.scorers ?? []).map(surname);
    const ms = buildHighlights(
      h,
      a,
      { home: r.home, away: r.away },
      { home: userHome ? mine : [], away: userHome ? [] : mine },
      fixture.round * 7919 + r.home * 31 + r.away * 17 + home.id.length,
    );
    return { moments: ms, start: basePositions(h, a), homeLineup: h, awayLineup: a };
    // A replay is fixed once the match is played.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fixture]);

  const [size, setSize] = useState({ w: 0, h: 0 });
  const [dots] = useState(() => start.map((p) => new Animated.ValueXY({ x: 0, y: 0 })));
  const [ball] = useState(() => new Animated.ValueXY({ x: 0, y: 0 }));
  const [step, setStep] = useState({ m: -1, f: 0 });
  const [speed, setSpeed] = useState(1);
  const [skipped, setSkipped] = useState(false);
  const done = skipped || step.m >= moments.length;
  const kit = kits(home, away);

  const px = (p: Dot, r0: number) => ({ x: p.x * size.w - r0 / 2, y: p.y * size.h - r0 / 2 });

  // Kick-off positions as soon as the pitch is measured.
  useEffect(() => {
    if (!size.w) return;
    start.forEach((p, i) => dots[i].setValue(px(p, DOT)));
    ball.setValue(px({ x: 0.5, y: 0.5 }, BALL));
    const t = setTimeout(() => setStep({ m: 0, f: -1 }), 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.w]);

  // Play the current frame, then move on to the next one.
  useEffect(() => {
    if (!size.w || done || step.m < 0) return;
    const moment = moments[step.m];
    // f = -1 resets to a neutral shape before each moment.
    const frame =
      step.f < 0
        ? { players: start, ball: moment.frames[0].ball, ms: 350 }
        : moment.frames[step.f];
    const duration = frame.ms / speed;
    const anim = Animated.parallel([
      ...frame.players.map((p, i) =>
        Animated.timing(dots[i], {
          toValue: px(p, DOT),
          duration,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: NATIVE,
        }),
      ),
      Animated.timing(ball, {
        toValue: px(frame.ball, BALL),
        duration,
        easing: step.f === moment.frames.length - 2 ? Easing.out(Easing.quad) : Easing.inOut(Easing.quad),
        useNativeDriver: NATIVE,
      }),
    ]);
    anim.start(({ finished }) => {
      if (!finished) return;
      setStep((s) => (s.f + 1 < moment.frames.length ? { m: s.m, f: s.f + 1 } : { m: s.m + 1, f: -1 }));
    });
    return () => anim.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, size.w, speed, done]);

  const moment = moments[Math.max(0, step.m)];
  // The score shown changes once a goal's shot has gone in.
  const shown = done
    ? [r.home, r.away]
    : step.m < 0 || !moment
      ? [0, 0]
      : step.f >= moment.frames.length - 1
        ? moment.score
        : (moments[step.m - 1]?.score ?? [0, 0]);
  const minute = done ? 90 : step.m < 0 ? 0 : (moment?.minute ?? 90);
  const goalNow = !done && moment?.kind === 'goal' && step.f >= moment.frames.length - 2;

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={[s.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }]}>
        <View style={s.board}>
          <View style={s.side}>
            <ClubCrest club={home} size={30} />
            <Text style={s.short}>{home.short}</Text>
          </View>
          <View style={s.center}>
            <Text style={s.score}>
              {shown[0]} – {shown[1]}
            </Text>
            <Text style={s.clock}>{done ? 'FULL TIME' : `${minute}'`}</Text>
          </View>
          <View style={s.side}>
            <ClubCrest club={away} size={30} />
            <Text style={s.short}>{away.short}</Text>
          </View>
        </View>

        <View style={[s.commentary, goalNow && s.commentaryGoal]}>
          <Text style={[s.commentaryText, goalNow && { color: colors.ink }]} numberOfLines={1}>
            {done
              ? 'Full time'
              : step.m < 0 || !moment
                ? 'Kick-off'
                : step.f >= moment.frames.length - 2
                  ? moment.text
                  : moment.lead}
          </Text>
        </View>

        <View style={s.pitch} onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
          <View style={s.halfway} />
          <View style={s.circle} />
          <View style={[s.box, s.boxTop]} />
          <View style={[s.box, s.boxBottom]} />
          <View style={[s.goal, s.goalTop]} />
          <View style={[s.goal, s.goalBottom]} />
          {size.w
            ? dots.map((d, i) => {
                const k = i < 11 ? kit.home : kit.away;
                return (
                  <Animated.View
                    key={i}
                    style={[
                      s.dot,
                      { backgroundColor: k.fill, borderColor: k.edge },
                      i === 0 || i === 11 ? s.keeper : null,
                      { transform: d.getTranslateTransform() },
                    ]}
                  />
                );
              })
            : null}
          {size.w ? <Animated.View style={[s.ball, { transform: ball.getTranslateTransform() }]} /> : null}
        </View>

        {done ? (
          <View style={s.summary}>
            <Text style={s.summaryText} numberOfLines={2}>
              {moments
                .filter((m) => m.kind === 'goal')
                .map((m) => m.text.replace(' GOAL! ', ' ').replace(' scores', ''))
                .join(' · ') || 'No goals'}
            </Text>
            <Button label="CLOSE" variant="green" onPress={onClose} />
          </View>
        ) : (
          <View style={s.controls}>
            {SPEEDS.map((x) => (
              <Pressable
                key={x}
                onPress={() => setSpeed(x)}
                style={[s.speed, speed === x && s.speedOn]}
                accessibilityRole="button"
                accessibilityLabel={`Speed ${x}x`}
              >
                <Text style={[s.speedText, speed === x && s.speedTextOn]}>{x}×</Text>
              </Pressable>
            ))}
            <View style={s.flex} />
            <Pressable onPress={() => setSkipped(true)} style={s.skip} accessibilityRole="button" accessibilityLabel="Skip to full time">
              <Text style={s.skipText}>Skip ⏭</Text>
            </Pressable>
          </View>
        )}
        <Text style={s.note}>
          Demo · {homeLineup.formation} vs {awayLineup.formation} · the score was decided before the replay
        </Text>
      </View>
    </Modal>
  );
}

const LINE = 'rgba(255,255,255,0.6)';

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0F1A13', paddingHorizontal: 16, gap: 10 },
  flex: { flex: 1 },
  board: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  side: { width: 80, alignItems: 'center', gap: 4 },
  short: { color: '#FFFFFF', fontWeight: '900', fontSize: 14, letterSpacing: 1 },
  center: { alignItems: 'center' },
  score: { color: '#FFFFFF', fontWeight: '900', fontSize: 40 },
  clock: { color: colors.gold, fontWeight: '900', fontSize: 14, letterSpacing: 1 },
  commentary: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12 },
  commentaryGoal: { backgroundColor: colors.gold },
  commentaryText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15, textAlign: 'center' },
  pitch: {
    flex: 1,
    backgroundColor: colors.pitch,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: LINE,
    overflow: 'hidden',
  },
  halfway: { position: 'absolute', top: '50%', left: 0, right: 0, height: 2, backgroundColor: LINE },
  circle: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 80,
    height: 80,
    marginLeft: -40,
    marginTop: -40,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: LINE,
  },
  box: { position: 'absolute', left: '25%', right: '25%', height: '13%', borderWidth: 2, borderColor: LINE },
  boxTop: { top: -2 },
  boxBottom: { bottom: -2 },
  goal: { position: 'absolute', left: '42%', right: '42%', height: 6, backgroundColor: '#FFFFFF' },
  goalTop: { top: 0 },
  goalBottom: { bottom: 0 },
  dot: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    borderWidth: 2.5,
  },
  keeper: { borderColor: '#F2B544' },
  ball: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: BALL,
    height: BALL,
    borderRadius: BALL / 2,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#111111',
  },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  speed: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)' },
  speedOn: { backgroundColor: '#FFFFFF' },
  speedText: { color: '#FFFFFF', fontWeight: '900' },
  speedTextOn: { color: colors.ink },
  skip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)' },
  skipText: { color: '#FFFFFF', fontWeight: '900' },
  summary: { gap: 10 },
  summaryText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13, textAlign: 'center' },
  note: { color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: '600', textAlign: 'center' },
});
