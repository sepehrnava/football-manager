import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Easing, StyleSheet, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { NATIVE, usePulse } from './motion';
import { colors } from './theme';

/** Slides in from one side with a small overshoot, like a versus intro. */
export function SlideIn({ from, delay = 0, children }: { from: 'left' | 'right'; delay?: number; children: ReactNode }) {
  const [t] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.spring(t, { toValue: 1, delay, speed: 14, bounciness: 9, useNativeDriver: NATIVE }).start();
  }, [t, delay]);
  const translateX = t.interpolate({ inputRange: [0, 1], outputRange: [from === 'left' ? -70 : 70, 0] });
  const opacity = t.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] });
  return <Animated.View style={[s.fill, { opacity, transform: [{ translateX }] }]}>{children}</Animated.View>;
}

/** Ticks a score up goal by goal, popping on each goal. Calls `onDone` once the final score shows. */
export function ScoreTicker({
  home,
  away,
  delay = 0,
  style,
  onDone,
}: {
  home: number;
  away: number;
  delay?: number;
  style?: StyleProp<TextStyle>;
  onDone?: () => void;
}) {
  const steps = Math.max(home, away);
  // One beat per goal, shortened for big scores so the count fits between matchdays.
  const stepMs = steps ? Math.min(260, 900 / steps) : 0;
  const [step, setStep] = useState(0);
  const [pop] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (step >= steps) {
      const t = setTimeout(() => onDone?.(), steps ? 0 : delay);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setStep(step + 1);
      pop.setValue(1.35);
      Animated.spring(pop, { toValue: 1, speed: 30, bounciness: 14, useNativeDriver: NATIVE }).start();
    }, step === 0 ? delay : stepMs);
    return () => clearTimeout(t);
    // onDone is a fresh closure each render; only the count drives the timer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, steps, delay, stepMs, pop]);
  return (
    <Animated.Text style={[style, { transform: [{ scale: pop }] }]}>
      {Math.min(step, home)} – {Math.min(step, away)}
    </Animated.Text>
  );
}

/** A result badge that slams down like a rubber stamp. */
export function Stamp({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const [t] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.spring(t, { toValue: 1, speed: 22, bounciness: 12, useNativeDriver: NATIVE }).start();
  }, [t]);
  const scale = t.interpolate({ inputRange: [0, 1], outputRange: [2.4, 1] });
  const rotate = t.interpolate({ inputRange: [0, 1], outputRange: ['-14deg', '-3deg'] });
  const opacity = t.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1] });
  return <Animated.View style={[style, { opacity, transform: [{ scale }, { rotate }] }]}>{children}</Animated.View>;
}

/** Shakes its children sideways once when `active` turns true (a loss). */
export function Shake({ active, children }: { active: boolean; children: ReactNode }) {
  const [x] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!active) return;
    const hit = (to: number) =>
      Animated.timing(x, { toValue: to, duration: 45, easing: Easing.linear, useNativeDriver: NATIVE });
    Animated.sequence([hit(-9), hit(8), hit(-6), hit(4), hit(0)]).start();
  }, [x, active]);
  return <Animated.View style={{ transform: [{ translateX: x }] }}>{children}</Animated.View>;
}

const CONFETTI = [colors.gold, colors.green, colors.blue, colors.red, colors.orange, '#FFFFFF'];

/** A burst of confetti from the centre of its parent (a win). Ignores touches. */
export function Confetti({ count = 18 }: { count?: number }) {
  const [t] = useState(() => new Animated.Value(0));
  const [bits] = useState(() =>
    Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
      const dist = 70 + Math.random() * 70;
      return {
        x: Math.cos(angle) * dist,
        // Bias upward, then let gravity pull the pieces down.
        y: Math.sin(angle) * dist * 0.7 - 30,
        spin: `${(Math.random() < 0.5 ? -1 : 1) * (180 + Math.random() * 360)}deg`,
        color: CONFETTI[i % CONFETTI.length],
        w: 5 + Math.random() * 4,
      };
    }),
  );
  useEffect(() => {
    Animated.timing(t, { toValue: 1, duration: 750, easing: Easing.out(Easing.quad), useNativeDriver: NATIVE }).start();
  }, [t]);
  const opacity = t.interpolate({ inputRange: [0, 0.65, 1], outputRange: [1, 1, 0] });
  return (
    <View pointerEvents="none" style={s.burst}>
      {bits.map((b, i) => (
        <Animated.View
          key={i}
          style={[
            s.bit,
            {
              width: b.w,
              height: b.w * 1.6,
              backgroundColor: b.color,
              opacity,
              transform: [
                { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, b.x] }) },
                { translateY: t.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, b.y, b.y + 40] }) },
                { rotate: t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', b.spin] }) },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

/** A football bouncing on its shadow, for "waiting for kick-off". */
export function BouncingBall({ size = 30 }: { size?: number }) {
  const v = usePulse(true, 700);
  const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 1.2] });
  const shadow = v.interpolate({ inputRange: [0, 1], outputRange: [1, 0.5] });
  return (
    <View style={[s.ballBox, { height: size * 2.4 }]}>
      <Animated.View
        style={[
          s.ball,
          { width: size, height: size, borderRadius: size / 2, transform: [{ translateY }] },
        ]}
      >
        <View style={[s.patch, { width: size * 0.36, height: size * 0.36, borderRadius: size * 0.18 }]} />
      </Animated.View>
      <Animated.View style={[s.shadow, { width: size, transform: [{ scaleX: shadow }] }]} />
    </View>
  );
}

/** A small pulsing red dot that marks the simulation as live. */
export function LiveDot() {
  const v = usePulse(true, 1000);
  const opacity = v.interpolate({ inputRange: [0, 1], outputRange: [1, 0.25] });
  return <Animated.View style={[s.live, { opacity }]} />;
}

const s = StyleSheet.create({
  fill: { flex: 1 },
  burst: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  bit: { position: 'absolute', borderRadius: 1.5 },
  ballBox: { alignItems: 'center', justifyContent: 'flex-end' },
  ball: {
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  patch: { backgroundColor: colors.ink },
  shadow: { height: 6, borderRadius: 3, backgroundColor: 'rgba(0,0,0,0.15)', marginTop: 4 },
  live: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.red },
});
