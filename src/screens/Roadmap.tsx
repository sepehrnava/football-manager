import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { clubById, compTable, midWindowRound, projectedPosition, seasonRounds, USER_ID } from '../game/game';
import { userFixture } from '../game/insights';
import { useCareer } from '../state/GameContext';
import { Crest } from '../ui/components';
import { colors, ordinal } from '../ui/theme';

type Stop =
  | { kind: 'window'; which: 'pre' | 'mid' }
  | { kind: 'round'; round: number }
  | { kind: 'finish' };

/** Start window, first half, mid-season window, second half, finish. */
function makeStops(rounds: number, mid: number): Stop[] {
  return [
    { kind: 'window', which: 'pre' },
    ...Array.from({ length: mid }, (_, round) => ({ kind: 'round' as const, round })),
    { kind: 'window', which: 'mid' },
    ...Array.from({ length: rounds - mid }, (_, i) => ({ kind: 'round' as const, round: mid + i })),
    { kind: 'finish' },
  ];
}

// Wide enough that matchdays don't feel crowded.
const ITEM_W = 80;

/** The whole season as a path: windows, every matchday and the finish line. */
export function Roadmap({
  onRound,
  onWindow,
  onFinish,
}: {
  onRound: (round: number) => void;
  onWindow: () => void;
  onFinish: () => void;
}) {
  const { state } = useCareer();
  const mid = midWindowRound(state);
  const STOPS = makeStops(seasonRounds(state), mid);
  const scroll = useRef<ScrollView>(null);
  const [width, setWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);

  // Where "you are" on the path.
  const cursor =
    state.phase === 'window'
      ? STOPS.findIndex((s) => s.kind === 'window' && s.which === state.window)
      : state.phase === 'season'
        ? STOPS.findIndex((s) => s.kind === 'round' && s.round === state.round)
        : STOPS.length - 1;

  // Center "you are here" once both the viewport and the track are measured.
  useEffect(() => {
    if (!width || !contentWidth) return;
    const x = Math.min(Math.max(0, cursor * ITEM_W - width / 2 + ITEM_W / 2), contentWidth - width);
    // Wait a frame: on first mount the scroll view may not accept offsets yet.
    const t = setTimeout(() => scroll.current?.scrollTo({ x, animated: true }), 80);
    return () => clearTimeout(t);
  }, [cursor, width, contentWidth]);

  const table = compTable(state);
  const myPos = table.findIndex((r) => r.clubId === USER_ID) + 1;
  const started = table.some((r) => r.played > 0);
  const finishPos = started ? myPos : projectedPosition(state);

  return (
    <ScrollView
      ref={scroll}
      horizontal
      showsHorizontalScrollIndicator={false}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      onContentSizeChange={(w) => setContentWidth(w)}
      contentContainerStyle={s.track}
    >
      {STOPS.map((stop, i) => {
        const reached = i <= cursor;
        const lineIn = i === 0 ? null : i <= cursor ? 'done' : 'todo';
        const lineOut = i === STOPS.length - 1 ? null : i < cursor ? 'done' : 'todo';
        const current = i === cursor;
        if (stop.kind === 'window') {
          const open = state.phase === 'window' && state.window === stop.which;
          return (
            <Item key={`w${stop.which}`} label={stop.which === 'pre' ? 'START' : 'WINDOW'} lineIn={lineIn} lineOut={lineOut} current={current}
              caption={open ? 'Open' : reached ? 'Closed' : `After MD${mid}`}
              onPress={open ? onWindow : undefined}
            >
              <View style={[s.window, open && s.windowOpen, !reached && s.future]}>
                <Text style={[s.windowIcon, open && { color: colors.green }]}>⇄</Text>
              </View>
            </Item>
          );
        }
        if (stop.kind === 'finish') {
          const done = state.phase === 'summary' || state.phase === 'gameover';
          return (
            <Item key="finish" label="FINAL" lineIn={lineIn} lineOut={null} caption={`${done ? '' : '~'}${ordinal(finishPos)}`} onPress={onFinish}>
              <View style={[s.window, s.finish]}>
                <Text style={[s.windowIcon, { color: '#B58A1E' }]}>★</Text>
              </View>
            </Item>
          );
        }
        const f = userFixture(state, stop.round);
        if (!f) return null;
        const home = f.homeId === USER_ID;
        const opp = clubById(state, home ? f.awayId : f.homeId);
        const r = f.result;
        let ring: string = 'transparent';
        let caption = `${home ? 'H' : 'A'} · ${opp.short}`;
        if (r) {
          const us = home ? r.home : r.away;
          const them = home ? r.away : r.home;
          ring = us > them ? colors.green : us < them ? colors.red : colors.draw;
          caption = `${us}–${them}`;
        }
        const isNext = current || (state.phase === 'window' && stop.round === state.round);
        return (
          <Item key={stop.round} label={`MD${stop.round + 1}`} lineIn={lineIn} lineOut={lineOut} caption={caption} current={current}
            captionColor={r ? ring : undefined} bold={isNext} onPress={() => onRound(stop.round)}
          >
            <View style={[s.node, { borderColor: isNext ? colors.ink : ring }, r && { backgroundColor: ring }, !r && !isNext && s.future]}>
              <Crest crest={opp.crest} short={opp.short} size={r ? 20 : 22} />
            </View>
          </Item>
        );
      })}
    </ScrollView>
  );
}

function Item({
  label,
  caption,
  captionColor,
  bold,
  current,
  lineIn,
  lineOut,
  onPress,
  children,
}: {
  /** "You are here": a soft highlight behind the stop. */
  current?: boolean;
  label: string;
  caption: string;
  captionColor?: string;
  bold?: boolean;
  lineIn: 'done' | 'todo' | null;
  lineOut: 'done' | 'todo' | null;
  onPress?: () => void;
  children: ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={[s.item, current && s.itemCurrent]}
      accessibilityRole="button"
      accessibilityLabel={`${label} ${caption}`}
      accessibilityState={{ selected: !!current }}
    >
      <Text style={[s.label, bold && s.labelBold]}>{label}</Text>
      <View style={s.lineRow}>
        <View style={[s.line, lineIn === 'done' && s.lineDone, lineIn === null && s.lineNone]} />
        <View style={s.nodeWrap}>{children}</View>
        <View style={[s.line, lineOut === 'done' && s.lineDone, lineOut === null && s.lineNone]} />
      </View>
      <Text style={[s.caption, captionColor ? { color: captionColor } : null, bold && s.labelBold]} numberOfLines={1}>
        {caption}
      </Text>
    </Pressable>
  );
}

const NODE = 44;

const s = StyleSheet.create({
  track: { paddingVertical: 4 },
  item: { width: ITEM_W, alignItems: 'center', gap: 6, paddingVertical: 6, borderRadius: 16 },
  itemCurrent: { backgroundColor: '#FFF1CC' },
  label: { fontSize: 10, fontWeight: '800', color: colors.muted, letterSpacing: 0.5 },
  labelBold: { color: colors.ink, fontWeight: '900' },
  lineRow: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  line: { flex: 1, height: 4, backgroundColor: colors.border },
  lineDone: { backgroundColor: colors.ink },
  lineNone: { backgroundColor: 'transparent' },
  nodeWrap: { width: NODE, height: NODE, alignItems: 'center', justifyContent: 'center' },
  node: {
    width: NODE,
    height: NODE,
    borderRadius: NODE / 2,
    borderWidth: 3,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  future: { opacity: 0.55 },
  window: {
    width: NODE,
    height: NODE,
    // Plain until open (green) or the finish (gold): no grey ring.
    borderRadius: 14,
    borderWidth: 3,
    borderColor: 'transparent',
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  windowOpen: { borderColor: colors.green, backgroundColor: colors.greenSoft },
  finish: { borderColor: colors.gold, backgroundColor: '#FFF8E6' },
  windowIcon: { fontSize: 22, fontWeight: '900', color: colors.muted },
  caption: { fontSize: 11, fontWeight: '800', color: colors.muted },
});
