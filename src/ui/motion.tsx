import * as Haptics from 'expo-haptics';
import { useEffect, useState, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  LayoutAnimation,
  Platform,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

/** The native driver is unavailable on web; it falls back to JS there. */
export const NATIVE = Platform.OS !== 'web';

/** Fades and slides children in when mounted. Re-key to replay. */
export function FadeIn({
  children,
  delay = 0,
  from = 'up',
  distance = 14,
  duration = 260,
  style,
}: {
  children: ReactNode;
  delay?: number;
  from?: 'up' | 'left' | 'right' | 'scale';
  distance?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const [t] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(t, {
      toValue: 1,
      duration,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: NATIVE,
    }).start();
  }, [t, delay, duration]);
  const offset = t.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] });
  const transform =
    from === 'scale'
      ? [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] }) }]
      : from === 'up'
        ? [{ translateY: offset }]
        : [{ translateX: from === 'right' ? offset : Animated.multiply(offset, -1) }];
  return <Animated.View style={[style, { opacity: t, transform }]}>{children}</Animated.View>;
}

/** A looping 0 → 1 → 0 value for "you are here" style pulses. */
export function usePulse(active = true, period = 1400) {
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!active) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: period / 2, easing: Easing.inOut(Easing.quad), useNativeDriver: NATIVE }),
        Animated.timing(v, { toValue: 0, duration: period / 2, easing: Easing.inOut(Easing.quad), useNativeDriver: NATIVE }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v, active, period]);
  return v;
}

/** Springy press feedback: returns handlers and a style to put on an Animated.View. */
export function usePressScale(to = 0.96) {
  const [scale] = useState(() => new Animated.Value(1));
  const animate = (value: number) =>
    Animated.spring(scale, { toValue: value, useNativeDriver: NATIVE, speed: 40, bounciness: 8 }).start();
  return {
    onPressIn: () => animate(to),
    onPressOut: () => animate(1),
    style: { transform: [{ scale }] },
  };
}

/** Smoothly animates list reorders (e.g. the league table) on the next render. */
export function animateNextLayout() {
  LayoutAnimation.configureNext(
    LayoutAnimation.create(220, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity),
  );
}

/** A light tap felt on phones for presses that change something. */
export function haptic(kind: 'tap' | 'success' | 'warning' = 'tap') {
  if (Platform.OS === 'web') return;
  if (kind === 'tap') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  else
    Haptics.notificationAsync(
      kind === 'success' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning,
    ).catch(() => {});
}
