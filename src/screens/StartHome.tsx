import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { todayKey } from '../game/challenge';
import { clubCrest } from '../game/game';
import { COUNTRIES, LEAGUE } from '../game/leagues';
import { currentStreak } from '../game/meta';
import type { Crest as CrestData, CrestPattern, CrestShape } from '../game/types';
import { useGame } from '../state/GameContext';
import { Crest } from '../ui/components';
import { FadeIn, NATIVE, usePulse } from '../ui/motion';
import { colors, CREST_COLORS } from '../ui/theme';

/** One side's 4-3-3 as [depth from its own goal line, across], both in % of the pitch. */
const SHAPE: [number, number][] = [
  [5, 50],
  [17, 16], [15, 38], [15, 62], [17, 84],
  [29, 26], [27, 50], [29, 74],
  [40, 18], [42, 50], [40, 82],
];

/**
 * Upright pitch panel with two faint teams and the logo on the centre circle. It grows
 * to fill free space. Markings are placed in pixels from the measured size: percentage
 * offsets resolve differently on Android.
 */
export function Hero() {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  return (
    <View
      style={s.hero}
      onLayout={(e) => {
        const { width: w, height: h } = e.nativeEvent.layout;
        if (!size || size.w !== w || size.h !== h) setSize({ w, h });
      }}
    >
      {size ? <Markings w={size.w} h={size.h} /> : null}
      <Logo />
    </View>
  );
}

function Markings({ w, h }: { w: number; h: number }) {
  const band = h / 10;
  const circle = Math.min(w * 0.44, 150);
  const box = { width: w * 0.56, height: Math.min(h * 0.15, 96), left: w * 0.22 };
  return (
    <>
      {[0, 1, 2, 3, 4].map((i) => (
        <View key={i} style={[s.mow, { top: (i * 2 + 1) * band, height: band }]} />
      ))}
      <View style={[s.halfway, { top: h / 2 - 1 }]} />
      <View
        style={[
          s.line,
          { width: circle, height: circle, borderRadius: circle / 2, left: (w - circle) / 2, top: (h - circle) / 2 },
        ]}
      />
      <View style={[s.line, box, { top: -2 }]} />
      <View style={[s.line, box, { top: h - box.height + 2 }]} />
      {SHAPE.flatMap(([depth, across], i) => [
        <Player key={`h${i}`} x={(across / 100) * w} y={h - (depth / 100) * h} home phase={i} />,
        <Player key={`a${i}`} x={((100 - across) / 100) * w} y={(depth / 100) * h} home={false} phase={i + 11} />,
      ])}
    </>
  );
}

/** A faint player dot that drifts slowly on the spot. */
function Player({ x, y, home, phase }: { x: number; y: number; home: boolean; phase: number }) {
  const t = usePulse(true, 3200 + (phase % 7) * 450);
  const shift = t.interpolate({ inputRange: [0, 1], outputRange: [-2.5, 2.5] });
  const move = phase % 2 ? { translateX: shift } : { translateY: shift };
  return (
    <Animated.View style={[s.player, home ? s.home : s.away, { left: x - 7, top: y - 7, transform: [move] }]} />
  );
}

/** Outline offsets, then a deeper drop below: a sticker-like 3D logo. */
const OUTLINE: [number, number][] = [
  [-2, -2], [0, -2], [2, -2], [-2, 0], [2, 0],
  [-2, 2], [0, 2], [2, 2],
  [-2, 4], [0, 4], [2, 4], [-2, 5], [0, 5], [2, 5],
];

function Logo() {
  const text = `TOP\nSQUAD`;
  return (
    <View style={s.logoWrap}>
      <View>
        {OUTLINE.map(([dx, dy]) => (
          <Text
            key={`${dx},${dy}`}
            aria-hidden
            style={[s.logo, s.logoEdge, { left: dx, right: -dx, top: dy }]}
          >
            {text}
          </Text>
        ))}
        <Text style={s.logo}>{text}</Text>
      </View>
      <Text style={s.logoSub}>FOOTBALL MANAGER</Text>
    </View>
  );
}

/** Steps a counter on a timer, for the little changing badges. */
function useTicker(period: number, offset = 0) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let id: ReturnType<typeof setInterval> | undefined;
    const start = setTimeout(() => {
      id = setInterval(() => setN((x) => x + 1), period);
    }, offset);
    return () => {
      clearTimeout(start);
      if (id) clearInterval(id);
    };
  }, [period, offset]);
  return n;
}

/** The three menu icons change in turn, one beat apart. */
const BEAT = 2700;
const SWAP = 450;

const PATTERNS: CrestPattern[] = ['stripes', 'half', 'band', 'solid'];
const CREST_SHAPES: CrestShape[] = ['shield', 'round', 'square', 'oval', 'shield'];

/** A made-up crest that keeps redesigning itself: "this could be your club". */
export function CyclingCrest() {
  const n = useTicker(BEAT);
  const crest: CrestData = {
    primary: CREST_COLORS[(n * 3) % CREST_COLORS.length],
    secondary: CREST_COLORS[(n * 7 + 9) % CREST_COLORS.length],
    pattern: PATTERNS[n % PATTERNS.length],
    shape: CREST_SHAPES[n % CREST_SHAPES.length],
  };
  if (crest.primary === crest.secondary) crest.secondary = '#FFFFFF';
  return (
    <FadeIn key={n} from="scale" duration={SWAP}>
      <Crest crest={crest} short="YOU" size={34} />
    </FadeIn>
  );
}

/** The top two clubs of every top division, taking turns. */
const SHOWCASE = COUNTRIES.flatMap((c) =>
  LEAGUE.clubs
    .map((x, i) => ({ x, i }))
    .filter(({ x }) => x.country === c.id && x.division === 1)
    .slice(0, 2)
    .map(({ i }) => i),
);

/** Real club badges taking turns. */
export function ClubCycle() {
  const n = useTicker(BEAT, BEAT / 3);
  const i = SHOWCASE[n % SHOWCASE.length];
  return (
    <FadeIn key={n} from="scale" duration={SWAP}>
      <Crest crest={clubCrest(i)} short={LEAGUE.clubs[i].short} size={34} />
    </FadeIn>
  );
}

/** One start option: a small icon, a title, an optional note and a value on the right. */
export function MenuRow({
  icon,
  title,
  note,
  value,
  onPress,
  last,
  compact,
}: {
  icon?: ReactNode;
  title: string;
  note?: string;
  value?: string;
  onPress: () => void;
  last?: boolean;
  /** Smaller row for lists inside a career screen. */
  compact?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [s.row, compact && s.rowCompact, !last && s.rowLine, pressed && { opacity: 0.6 }]}
    >
      {icon ? <View style={[s.icon, compact && s.iconCompact]}>{icon}</View> : null}
      <View style={s.rowMain}>
        <Text style={[s.rowTitle, compact && s.rowTitleCompact]}>{title}</Text>
        {note ? <Text style={s.rowNote}>{note}</Text> : null}
      </View>
      {value ? <Text style={s.rowValue}>{value}</Text> : null}
      <Text style={s.arrow}>›</Text>
    </Pressable>
  );
}

/** A drawn target that gets hit on every beat: it jolts, tilts and settles. */
function DartHit() {
  const n = useTicker(BEAT, (BEAT * 2) / 3);
  const [hit] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (n === 0) return;
    hit.setValue(0);
    Animated.spring(hit, { toValue: 1, useNativeDriver: NATIVE, speed: 6, bounciness: 14 }).start();
  }, [n, hit]);
  const scale = hit.interpolate({ inputRange: [0, 1], outputRange: [1.25, 1] });
  const rotate = hit.interpolate({ inputRange: [0, 1], outputRange: ['-14deg', '0deg'] });
  return (
    <Animated.View style={[s.target, { transform: [{ scale }, { rotate }] }]}>
      <View style={s.targetRing}>
        <View style={s.targetEye} />
      </View>
    </Animated.View>
  );
}

/** Today's Daily Challenge as a menu row: the streak, or a tick once played. */
export function DailyRow({ last, compact }: { last?: boolean; compact?: boolean }) {
  const { meta, openChallenge } = useGame();
  const [busy, setBusy] = useState(false);
  const today = todayKey();
  const streak = currentStreak(meta, today);
  const open = () => {
    if (busy) return;
    setBusy(true);
    // Give the "Preparing" note a frame to show: building the challenge takes a moment.
    setTimeout(() => openChallenge().finally(() => setBusy(false)), 30);
  };
  return (
    <MenuRow
      icon={<DartHit />}
      title="Daily challenge"
      note={busy ? 'Preparing…' : undefined}
      value={streak > 0 ? `Streak ${streak}` : undefined}
      onPress={open}
      last={last}
      compact={compact}
    />
  );
}

/** Quiet text links under the menu. */
export function StartLinks({ onSpin, onHonours }: { onSpin: () => void; onHonours: () => void }) {
  return (
    <View style={s.links}>
      <Text style={s.link} onPress={onSpin} accessibilityRole="button">
        Random club
      </Text>
      <Text style={s.dot}>·</Text>
      <Text style={s.link} onPress={onHonours} accessibilityRole="button">
        Honours
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  hero: {
    flex: 1,
    minHeight: 280,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.pitch,
    borderRadius: 24,
  },
  mow: { position: 'absolute', left: 0, right: 0, backgroundColor: colors.pitchDark },
  halfway: { position: 'absolute', left: 0, right: 0, height: 2, backgroundColor: colors.pitchLine },
  line: { position: 'absolute', borderWidth: 2, borderColor: colors.pitchLine },
  logoWrap: { alignItems: 'center' },
  logoSub: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 3,
    color: '#FFFFFF',
    backgroundColor: colors.ink,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: 'hidden',
  },
  logo: {
    fontSize: 56,
    lineHeight: 56,
    fontWeight: '900',
    fontStyle: 'italic',
    textAlign: 'center',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  player: { position: 'absolute', width: 14, height: 14, borderRadius: 7 },
  home: { backgroundColor: 'rgba(255,255,255,0.22)' },
  away: { backgroundColor: 'rgba(8,40,18,0.28)' },
  logoEdge: { position: 'absolute', color: colors.ink },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 20 },
  icon: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
  rowCompact: { paddingVertical: 12, gap: 10 },
  iconCompact: { width: 28, height: 28, transform: [{ scale: 0.75 }] },
  rowTitleCompact: { fontSize: 15, fontWeight: '800' },
  target: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetRing: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetEye: { width: 9, height: 9, borderRadius: 4.5, backgroundColor: colors.red },
  rowLine: { borderBottomWidth: 1, borderBottomColor: colors.border },
  rowMain: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 21, fontWeight: '900', color: colors.ink },
  rowNote: { fontSize: 14, fontWeight: '600', color: colors.muted },
  rowValue: { fontSize: 14, fontWeight: '800', color: colors.muted },
  arrow: { fontSize: 28, fontWeight: '900', color: colors.borderDark },
  links: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 16 },
  link: { fontSize: 15, fontWeight: '800', color: colors.muted, paddingVertical: 8 },
  dot: { fontSize: 15, fontWeight: '800', color: colors.borderDark },
});
