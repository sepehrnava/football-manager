import { useEffect, useState, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LINE_OF } from '../game/constants';
import type { Club, Crest as CrestData, CrestShape, Position } from '../game/types';
import { NATIVE, usePressScale } from './motion';
import { colors, lineColors } from './theme';

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

type ButtonVariant = 'dark' | 'light' | 'green' | 'red';

export function Button({
  label,
  onPress,
  variant = 'dark',
  disabled,
  small,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const v = BUTTONS[variant];
  const press = usePressScale();
  return (
    <Animated.View style={[press.style, style]}>
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={onPress}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        style={({ pressed }) => [
          styles.button,
          small && styles.buttonSmall,
          { backgroundColor: v.bg, borderColor: v.border, borderBottomColor: v.shadow },
          pressed && styles.pressed,
          disabled && styles.disabled,
        ]}
      >
        <Text style={[styles.buttonText, small && styles.buttonTextSmall, { color: v.text }]}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const BUTTONS: Record<ButtonVariant, { bg: string; border: string; shadow: string; text: string }> = {
  dark: { bg: '#1A1A1A', border: '#1A1A1A', shadow: '#000000', text: '#FFFFFF' },
  light: { bg: '#FFFFFF', border: colors.border, shadow: colors.borderDark, text: colors.ink },
  green: { bg: colors.green, border: colors.green, shadow: '#1B7E44', text: '#FFFFFF' },
  red: { bg: colors.red, border: colors.red, shadow: '#B5363A', text: '#FFFFFF' },
};

export function Pill({
  label,
  active,
  onPress,
  color,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  color?: string;
}) {
  const press = usePressScale(0.92);
  return (
    <Animated.View style={press.style}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        onPress={onPress}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        style={({ pressed }) => [styles.pill, active && styles.pillActive, pressed && styles.pressed]}
      >
        <Text style={[styles.pillText, { color: color ?? colors.ink }]}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

export function SectionTitle({ children }: { children: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionText}>{children}</Text>
    </View>
  );
}

export function RatingBadge({
  value,
  size = 30,
  tone = 'gold',
}: {
  value: number;
  size?: number;
  tone?: 'gold' | 'orange' | 'red' | 'gray';
}) {
  const bg = { gold: colors.gold, orange: colors.orange, red: colors.red, gray: '#B9B9B3' }[tone];
  return (
    <View
      style={[
        styles.rating,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg },
      ]}
    >
      <Text style={[styles.ratingText, { fontSize: size * 0.45 }]}>{value}</Text>
    </View>
  );
}

/** A scouted rating: exact badge when known, a soft range pill when not. */
export function RangeBadge({ range, size = 34 }: { range: [number, number]; size?: number }) {
  if (range[0] === range[1]) return <RatingBadge value={range[0]} size={size} />;
  return (
    <View style={[styles.range, { height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.rangeText, { fontSize: size * 0.36 }]}>
        {range[0]}–{range[1]}
      </Text>
    </View>
  );
}

const TRENDS = {
  rising: { label: '▲ RISING', color: '#25A55A' },
  peak: { label: '● PEAK', color: '#B58A1E' },
  declining: { label: '▼ DECLINING', color: '#E07B12' },
  retiring: { label: 'RETIRING', color: '#E5484D' },
} as const;

/** Career stage tag: rising, at peak, declining, or retiring after this season. */
export function TrendTag({ trend, size = 11 }: { trend: keyof typeof TRENDS; size?: number }) {
  const t = TRENDS[trend];
  return <Text style={[styles.trend, { color: t.color, fontSize: size }]}>{t.label}</Text>;
}

export function penaltyTone(drop: number): 'gold' | 'orange' | 'red' {
  return drop <= 0 ? 'gold' : drop <= 3 ? 'orange' : 'red';
}

export function PosTags({ positions, size = 13 }: { positions: Position[]; size?: number }) {
  return (
    <View style={styles.tags}>
      {positions.map((p) => (
        <Text key={p} style={[styles.tag, { fontSize: size, color: lineColors[LINE_OF[p]] }]}>
          {p}
        </Text>
      ))}
    </View>
  );
}

/** True for colours where dark text reads better than white. */
export function isLight(hex: string) {
  const n = parseInt(hex.replace('#', '').padEnd(6, '0').slice(0, 6), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b > 170;
}

/** Height and corner radii of each crest outline; all fit the same size × 1.15 box. */
function crestOutline(shape: CrestShape | undefined, size: number) {
  const box = size * 1.15;
  if (shape === 'round') return { h: size, top: size / 2, bottom: size / 2, box };
  if (shape === 'square') return { h: size, top: size * 0.22, bottom: size * 0.22, box };
  if (shape === 'oval') return { h: box, top: size / 2, bottom: size / 2, box };
  return { h: box, top: size * 0.2, bottom: size * 0.5, box };
}

export function Crest({ crest, short, size = 40 }: { crest: CrestData; short?: string; size?: number }) {
  const o = crestOutline(crest.shape, size);
  const h = o.h;
  // The initials sit on the band, or on the main colour; mixed patterns get an outline.
  const behind = crest.pattern === 'band' ? crest.secondary : crest.primary;
  const plain = crest.pattern === 'solid' || crest.pattern === 'band';
  const dark = plain && isLight(behind);
  return (
    <View
      style={[
        styles.crest,
        {
          width: size,
          height: h,
          marginVertical: (o.box - h) / 2,
          borderTopLeftRadius: o.top,
          borderTopRightRadius: o.top,
          borderBottomLeftRadius: o.bottom,
          borderBottomRightRadius: o.bottom,
          borderWidth: Math.max(1.5, size * 0.05),
          backgroundColor: crest.primary,
        },
      ]}
    >
      {crest.pattern === 'stripes' && (
        <View style={StyleSheet.absoluteFill}>
          <View style={styles.row}>
            {[0, 1, 2, 3, 4].map((i) => (
              <View
                key={i}
                style={{ flex: 1, height: h, backgroundColor: i % 2 ? crest.secondary : crest.primary }}
              />
            ))}
          </View>
        </View>
      )}
      {crest.pattern === 'half' && (
        <View style={[StyleSheet.absoluteFill, { left: '50%', backgroundColor: crest.secondary }]} />
      )}
      {crest.pattern === 'band' && (
        <View
          style={[
            StyleSheet.absoluteFill,
            { top: '38%', bottom: '38%', backgroundColor: crest.secondary },
          ]}
        />
      )}
      {short ? (
        <Text
          numberOfLines={1}
          style={[
            styles.crestText,
            {
              // Small crests get relatively larger, tighter text so the code stays readable.
              fontSize: size < 32 ? size * 0.34 : size * 0.3,
              letterSpacing: size < 32 ? -0.4 : 0,
              // Wider than the crest and centred: a wide code (WHU) is trimmed at the edge, never "W…".
              width: size * 1.4,
              textAlign: 'center',
              color: dark ? colors.ink : '#FFFFFF',
            },
            !dark && styles.crestOutline,
            !dark && size < 32 && { textShadowRadius: 1.5, textShadowColor: 'rgba(0,0,0,0.9)' },
          ]}
        >
          {short}
        </Text>
      ) : null}
    </View>
  );
}

export function ClubCrest({ club, size }: { club: Club; size?: number }) {
  return <Crest crest={club.crest} short={club.short} size={size} />;
}

export function Stat({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, color ? { color } : null]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export function Row({
  label,
  value,
  color,
  bold,
}: {
  label: string;
  value: string;
  color?: string;
  bold?: boolean;
}) {
  return (
    <View style={styles.kv}>
      <Text style={[styles.kvLabel, bold && styles.bold]}>{label}</Text>
      <Text style={[styles.kvValue, bold && styles.bold, color ? { color } : null]}>{value}</Text>
    </View>
  );
}

export function Bar({ value, color = colors.green }: { value: number; color?: string }) {
  const target = Math.max(0, Math.min(100, value));
  const [w] = useState(() => new Animated.Value(target));
  useEffect(() => {
    // Width can't use the native driver.
    Animated.timing(w, { toValue: target, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [w, target]);
  const width = w.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });
  return (
    <View style={styles.bar}>
      <Animated.View style={[styles.barFill, { width, backgroundColor: color }]} />
    </View>
  );
}

export function Sheet({
  visible,
  title,
  onClose,
  children,
  footer,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const [rise] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!visible) return;
    rise.setValue(0);
    Animated.spring(rise, { toValue: 1, useNativeDriver: NATIVE, speed: 14, bounciness: 4 }).start();
  }, [visible, rise]);
  const translateY = rise.interpolate({ inputRange: [0, 1], outputRange: [500, 0] });
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        <Animated.View style={[styles.sheet, { paddingBottom: insets.bottom + 16, transform: [{ translateY }] }]}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle} numberOfLines={1}>
              {title}
            </Text>
            <Pressable onPress={onClose} style={styles.close} accessibilityLabel="Close">
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>
          <ScrollView style={styles.sheetBody} contentContainerStyle={{ paddingBottom: 8 }}>
            {children}
          </ScrollView>
          {footer}
        </Animated.View>
      </View>
    </Modal>
  );
}

/** A small button that shows the current choice and opens a list of options. */
export function PickerButton({
  label,
  value,
  onPress,
  style,
}: {
  label: string;
  value: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      style={({ pressed }) => [styles.picker, pressed && { opacity: 0.6 }, style]}
    >
      <Text style={styles.pickerLabel}>{label}</Text>
      <Text style={styles.pickerValue} numberOfLines={1}>
        {value}
      </Text>
    </Pressable>
  );
}

/** A sheet with a plain list of options; the current one is ticked. Picking closes it. */
export function OptionSheet<T extends string>({
  visible,
  title,
  options,
  value,
  onPick,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: { id: T; label: string; note?: string }[];
  value: T;
  onPick: (id: T) => void;
  onClose: () => void;
}) {
  if (!visible) return null;
  return (
    <Sheet visible title={title} onClose={onClose}>
      {options.map((o, i) => (
        <Pressable
          key={o.id}
          onPress={() => {
            onPick(o.id);
            onClose();
          }}
          accessibilityRole="button"
          accessibilityState={{ selected: o.id === value }}
          style={({ pressed }) => [styles.option, i > 0 && styles.optionLine, pressed && { opacity: 0.6 }]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.optionLabel, o.id === value && { color: colors.green }]}>{o.label}</Text>
            {o.note ? <Text style={styles.optionNote}>{o.note}</Text> : null}
          </View>
          {o.id === value ? <Text style={styles.optionTick}>✓</Text> : null}
        </Pressable>
      ))}
    </Sheet>
  );
}

export const styles = StyleSheet.create({
  picker: { backgroundColor: colors.card, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 },
  pickerLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1, color: colors.muted },
  pickerValue: { fontSize: 16, fontWeight: '900', color: colors.ink },
  option: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  optionLine: { borderTopWidth: 1, borderTopColor: colors.border },
  optionLabel: { fontSize: 17, fontWeight: '800', color: colors.ink },
  optionNote: { fontSize: 13, fontWeight: '600', color: colors.muted, marginTop: 2 },
  optionTick: { fontSize: 18, fontWeight: '900', color: colors.green },
  // Flat white panel: no outline or thick edge, so screens stay calm.
  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 16,
  },
  button: {
    borderRadius: 18,
    borderWidth: 2,
    borderBottomWidth: 5,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSmall: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 14, borderBottomWidth: 4 },
  buttonText: { fontSize: 17, fontWeight: '900', letterSpacing: 0.3, textAlign: 'center' },
  buttonTextSmall: { fontSize: 14, fontWeight: '800' },
  pressed: { transform: [{ translateY: 2 }], opacity: 0.92 },
  disabled: { opacity: 0.4 },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  pillActive: { borderColor: colors.ink },
  pillText: { fontSize: 15, fontWeight: '800' },
  section: { marginTop: 22, marginBottom: 8 },
  sectionText: { fontSize: 12, fontWeight: '900', letterSpacing: 1.5, color: colors.muted },
  rating: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  ratingText: { color: '#FFFFFF', fontWeight: '900' },
  range: {
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF3D6',
    borderWidth: 2,
    borderColor: colors.gold,
    borderStyle: 'dashed',
  },
  rangeText: { color: '#A2700F', fontWeight: '900' },
  tags: { flexDirection: 'row', gap: 6 },
  trend: { fontWeight: '900', letterSpacing: 0.3 },
  tag: { fontWeight: '800' },
  crest: { overflow: 'hidden', borderColor: '#141414', alignItems: 'center', justifyContent: 'center' },
  crestOutline: {
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  crestText: { fontWeight: '900' },
  row: { flexDirection: 'row' },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 22, fontWeight: '900', color: colors.ink },
  statLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, color: colors.muted, marginTop: 2 },
  kv: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  kvLabel: { fontSize: 15, color: colors.muted, fontWeight: '600', flexShrink: 1 },
  kvValue: { fontSize: 15, color: colors.ink, fontWeight: '800' },
  bold: { color: colors.ink, fontWeight: '900' },
  bar: { height: 8, borderRadius: 4, backgroundColor: colors.faint, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 16,
    paddingTop: 14,
    maxHeight: '88%',
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  sheetTitle: { flex: 1, fontSize: 22, fontWeight: '900', color: colors.ink },
  sheetBody: { flexGrow: 0 },
  close: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { fontSize: 16, fontWeight: '900', color: colors.muted },
});
