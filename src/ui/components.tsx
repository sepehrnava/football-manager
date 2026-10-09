import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useEffect, useState, type ComponentProps, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LINE_OF } from '../game/constants';
import type { Club, Crest as CrestData, Position } from '../game/types';
import { haptic, NATIVE, usePressScale } from './motion';
import { DISPLAY, Text } from './text';
import { colors, lineColors, radius, ratingTier, shadow } from './theme';

export { Text } from './text';

export type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export function Icon({ name, size = 20, color = colors.ink }: { name: IconName; size?: number; color?: string }) {
  return <MaterialCommunityIcons name={name} size={size} color={color} />;
}

/* ------------------------------------------------------------------ surfaces */

type Tone = 'default' | 'green' | 'gold' | 'red' | 'blue' | 'dark' | 'inset';

const TONES: Record<Tone, { bg: string; border: string }> = {
  default: { bg: colors.card, border: colors.border },
  green: { bg: colors.greenSoft, border: '#C3E7D0' },
  gold: { bg: colors.goldSoft, border: '#F4DFA8' },
  red: { bg: colors.redSoft, border: '#F6CACC' },
  blue: { bg: colors.blueSoft, border: '#C9D9F8' },
  dark: { bg: colors.night, border: colors.night },
  inset: { bg: colors.inset, border: colors.border },
};

export function Card({
  children,
  style,
  tone = 'default',
  onPress,
  accessibilityLabel,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  tone?: Tone;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  const t = TONES[tone];
  const base = [styles.card, { backgroundColor: t.bg, borderColor: t.border }, tone === 'default' && shadow.card];
  if (!onPress) return <View style={[base, style]}>{children}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [base, style, pressed && styles.cardPressed]}
    >
      {children}
    </Pressable>
  );
}

/* ------------------------------------------------------------------- buttons */

type Variant = 'primary' | 'secondary' | 'dark' | 'danger' | 'gold' | 'ghost';
/** Older names kept so every screen reads the same. */
type LegacyVariant = 'green' | 'light' | 'red';

const BUTTONS: Record<Variant, { bg: string; edge: string; text: string; border: string }> = {
  primary: { bg: colors.green, edge: colors.greenDark, text: '#FFFFFF', border: colors.green },
  secondary: { bg: colors.card, edge: colors.borderDark, text: colors.ink, border: colors.border },
  dark: { bg: colors.ink, edge: '#000000', text: '#FFFFFF', border: colors.ink },
  danger: { bg: colors.red, edge: colors.redDark, text: '#FFFFFF', border: colors.red },
  gold: { bg: colors.gold, edge: colors.goldDark, text: '#3D2A04', border: colors.gold },
  ghost: { bg: 'transparent', edge: 'transparent', text: colors.ink2, border: 'transparent' },
};

const LEGACY: Record<LegacyVariant, Variant> = { green: 'primary', light: 'secondary', red: 'danger' };

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  small,
  icon,
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: Variant | LegacyVariant;
  size?: 'lg' | 'md' | 'sm';
  /** Same as size "sm". */
  small?: boolean;
  icon?: IconName;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const v = BUTTONS[(LEGACY as Record<string, Variant>)[variant] ?? (variant as Variant)];
  const sz = small ? 'sm' : size;
  const press = usePressScale(0.97);
  const textSize = sz === 'lg' ? 17 : sz === 'md' ? 15 : 13;
  return (
    <Animated.View style={[press.style, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        disabled={disabled}
        onPress={() => {
          haptic();
          onPress();
        }}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        style={({ pressed }) => [
          styles.button,
          styles[`button_${sz}`],
          {
            backgroundColor: v.bg,
            borderColor: v.border,
            borderBottomColor: v.edge,
            borderBottomWidth: variant === 'ghost' ? 0 : sz === 'sm' ? 3 : 4,
          },
          pressed && styles.buttonPressed,
          disabled && styles.disabled,
        ]}
      >
        {icon ? <Icon name={icon} size={textSize + 3} color={v.text} /> : null}
        <Text style={[styles.buttonText, { fontSize: textSize, color: v.text }]} numberOfLines={1}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

/** A round icon-only button (close, settings, skip). */
export function IconButton({
  icon,
  onPress,
  label,
  size = 40,
  dark,
  style,
}: {
  icon: IconName;
  onPress: () => void;
  label: string;
  size?: number;
  dark?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => [
        styles.iconButton,
        { width: size, height: size, borderRadius: size / 2 },
        dark && styles.iconButtonDark,
        pressed && { opacity: 0.6 },
        style,
      ]}
    >
      <Icon name={icon} size={size * 0.5} color={dark ? '#FFFFFF' : colors.ink2} />
    </Pressable>
  );
}

/* ---------------------------------------------------------------- selection */

/** Tabs inside a screen: a pill track with the selected option raised. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  dark,
  style,
}: {
  options: { id: T; label: string; icon?: IconName; badge?: number }[];
  value: T;
  onChange: (id: T) => void;
  dark?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.segTrack, dark && styles.segTrackDark, style]} accessibilityRole="tablist">
      {options.map((o) => {
        const on = o.id === value;
        const color = on ? (dark ? colors.ink : colors.ink) : dark ? colors.nightMuted : colors.muted;
        return (
          <Pressable
            key={o.id}
            onPress={() => {
              if (!on) haptic();
              onChange(o.id);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={o.label}
            style={[styles.seg, on && styles.segOn]}
          >
            {o.icon ? <Icon name={o.icon} size={16} color={color} /> : null}
            <Text style={[styles.segText, { color }]} numberOfLines={1}>
              {o.label}
            </Text>
            {o.badge ? (
              <View style={styles.segBadge}>
                <Text style={styles.segBadgeText}>{o.badge}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

/** A filter chip; `color` tints the label (e.g. position lines). */
export function Chip({
  label,
  icon,
  active,
  onPress,
  color,
}: {
  label: string;
  icon?: IconName;
  active?: boolean;
  onPress?: () => void;
  color?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      accessibilityLabel={label}
      onPress={() => {
        if (!active) haptic();
        onPress?.();
      }}
      style={({ pressed }) => [styles.chip, active && styles.chipOn, pressed && { opacity: 0.75 }]}
    >
      {icon ? <Icon name={icon} size={16} color={active ? '#FFFFFF' : (color ?? colors.ink2)} /> : null}
      <Text style={[styles.chipText, { color: active ? '#FFFFFF' : (color ?? colors.ink2) }]}>{label}</Text>
    </Pressable>
  );
}

/** Older name for Chip. */
export const Pill = Chip;

export function ChipScroll({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.chipScroll, style]}
      style={styles.chipScrollOuter}
    >
      {children}
    </ScrollView>
  );
}

/* ------------------------------------------------------------------- layout */

export function Section({
  title,
  action,
  style,
}: {
  title: string;
  action?: { label: string; onPress: () => void };
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.section, style]}>
      <Text style={styles.sectionText}>{title}</Text>
      {action ? (
        <Text style={styles.sectionAction} onPress={action.onPress} accessibilityRole="button">
          {action.label}
        </Text>
      ) : null}
    </View>
  );
}

/** Older name: a plain section heading. */
export function SectionTitle({ children }: { children: string }) {
  return <Section title={children} />;
}

/** A tappable list line: something on the left, two lines of text, something on the right. */
export function ListRow({
  left,
  title,
  subtitle,
  right,
  onPress,
  chevron,
  last,
  selected,
  accessibilityLabel,
  titleStyle,
}: {
  left?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  onPress?: () => void;
  chevron?: boolean;
  last?: boolean;
  selected?: boolean;
  accessibilityLabel?: string;
  titleStyle?: StyleProp<TextStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={selected ? { selected } : undefined}
      style={({ pressed }) => [
        styles.listRow,
        !last && styles.listRowBorder,
        selected && styles.listRowSelected,
        pressed && styles.listRowPressed,
      ]}
    >
      {left}
      <View style={styles.listMain}>
        {typeof title === 'string' ? (
          <Text style={[styles.listTitle, titleStyle]} numberOfLines={1}>
            {title}
          </Text>
        ) : (
          title
        )}
        {typeof subtitle === 'string' ? (
          <Text style={styles.listSub} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : (
          subtitle
        )}
      </View>
      {right}
      {chevron ? <Icon name="chevron-right" size={20} color={colors.borderDark} /> : null}
    </Pressable>
  );
}

export function EmptyState({ icon, title, text }: { icon: IconName; title: string; text?: string }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Icon name={icon} size={26} color={colors.muted} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {text ? <Text style={styles.emptyText}>{text}</Text> : null}
    </View>
  );
}

/** A small uppercase label: FOR SALE, RETIRING, NEW. */
export function Tag({ label, tone = 'muted' }: { label: string; tone?: 'muted' | 'green' | 'gold' | 'red' | 'blue' | 'dark' }) {
  const t = {
    muted: { bg: colors.faint, fg: colors.ink2 },
    green: { bg: colors.greenSoft, fg: colors.greenDark },
    gold: { bg: colors.goldSoft, fg: colors.goldInk },
    red: { bg: colors.redSoft, fg: colors.redDark },
    blue: { bg: colors.blueSoft, fg: colors.blue },
    dark: { bg: colors.ink, fg: '#FFFFFF' },
  }[tone];
  return (
    <View style={[styles.tag, { backgroundColor: t.bg }]}>
      <Text style={[styles.tagText, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

/** Red count bubble for tabs and buttons. */
export function CountBadge({ n, style }: { n: number; style?: StyleProp<ViewStyle> }) {
  if (!n) return null;
  return (
    <View style={[styles.count, style]}>
      <Text style={styles.countText}>{n > 9 ? '9+' : n}</Text>
    </View>
  );
}

/* ------------------------------------------------------------------ players */

/** Rating in a gold/silver/bronze badge; a tone overrides it (out-of-position penalty). */
export function RatingBadge({
  value,
  size = 34,
  tone,
}: {
  value: number;
  size?: number;
  tone?: 'gold' | 'orange' | 'red' | 'gray';
}) {
  const tier = ratingTier(value);
  const override = tone && tone !== 'gold' ? { orange: colors.orange, red: colors.red, gray: '#B9BEB9' }[tone] : null;
  return (
    <View
      style={[
        styles.rating,
        {
          width: size,
          height: size,
          borderRadius: size * 0.32,
          backgroundColor: override ?? tier.bg,
          borderColor: override ? '#FFFFFF' : tier.ring,
        },
      ]}
    >
      <Text style={[styles.ratingText, { fontSize: size * 0.56, color: override ? '#FFFFFF' : tier.fg }]}>
        {value}
      </Text>
    </View>
  );
}

/** A scouted rating: exact badge when known, a dashed range when it is still a guess. */
export function RangeBadge({ range, size = 34 }: { range: [number, number]; size?: number }) {
  if (range[0] === range[1]) return <RatingBadge value={range[0]} size={size} />;
  return (
    <View style={[styles.range, { height: size, borderRadius: size * 0.32, minWidth: size * 1.6 }]}>
      <Text style={[styles.rangeText, { fontSize: size * 0.46 }]}>
        {range[0]}–{range[1]}
      </Text>
    </View>
  );
}

const TRENDS = {
  rising: { label: 'RISING', icon: 'trending-up', color: colors.green },
  peak: { label: 'PEAK', icon: 'star-four-points', color: colors.goldDark },
  declining: { label: 'DECLINING', icon: 'trending-down', color: colors.orange },
  retiring: { label: 'RETIRING', icon: 'hand-wave', color: colors.red },
} as const;

/** Career stage: rising, at peak, declining, or retiring after this season. */
export function TrendTag({ trend, size = 11 }: { trend: keyof typeof TRENDS; size?: number }) {
  const t = TRENDS[trend];
  return (
    <View style={styles.trend}>
      <Icon name={t.icon} size={size + 2} color={t.color} />
      <Text style={[styles.trendText, { color: t.color, fontSize: size }]}>{t.label}</Text>
    </View>
  );
}

export function penaltyTone(drop: number): 'gold' | 'orange' | 'red' {
  return drop <= 0 ? 'gold' : drop <= 3 ? 'orange' : 'red';
}

export function PosTags({ positions, size = 12 }: { positions: Position[]; size?: number }) {
  return (
    <View style={styles.tags}>
      {positions.map((p) => (
        <View key={p} style={[styles.pos, { backgroundColor: `${lineColors[LINE_OF[p]]}1A` }]}>
          <Text style={[styles.posText, { fontSize: size, color: lineColors[LINE_OF[p]] }]}>{p}</Text>
        </View>
      ))}
    </View>
  );
}

/* -------------------------------------------------------------------- clubs */

/** True for colours where dark text reads better than white. */
function isLight(hex: string) {
  const n = parseInt(hex.replace('#', '').padEnd(6, '0').slice(0, 6), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b > 170;
}

export function Crest({ crest, short, size = 40 }: { crest: CrestData; short?: string; size?: number }) {
  const h = size * 1.15;
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
          borderTopLeftRadius: size * 0.2,
          borderTopRightRadius: size * 0.2,
          borderBottomLeftRadius: size * 0.5,
          borderBottomRightRadius: size * 0.5,
          borderWidth: Math.max(1.5, size * 0.05),
          backgroundColor: crest.primary,
        },
      ]}
    >
      {crest.pattern === 'stripes' && (
        <View style={StyleSheet.absoluteFill}>
          <View style={styles.rowFlex}>
            {[0, 1, 2, 3, 4].map((i) => (
              <View key={i} style={{ flex: 1, height: h, backgroundColor: i % 2 ? crest.secondary : crest.primary }} />
            ))}
          </View>
        </View>
      )}
      {crest.pattern === 'half' && (
        <View style={[StyleSheet.absoluteFill, { left: '50%', backgroundColor: crest.secondary }]} />
      )}
      {crest.pattern === 'band' && (
        <View style={[StyleSheet.absoluteFill, { top: '38%', bottom: '38%', backgroundColor: crest.secondary }]} />
      )}
      {short && size >= 28 ? (
        <Text
          numberOfLines={1}
          style={[styles.crestText, { fontSize: size * 0.34, color: dark ? colors.ink : '#FFFFFF' }, !dark && styles.crestOutline]}
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

/* -------------------------------------------------------------------- numbers */

export function Stat({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, color ? { color } : null]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

/** A tappable number tile for dashboards. */
export function StatTile({
  icon,
  label,
  value,
  sub,
  color,
  onPress,
}: {
  icon: IconName;
  label: string;
  value: string;
  sub?: string;
  color?: string;
  onPress?: () => void;
}) {
  return (
    <Card style={styles.statTile} onPress={onPress} accessibilityLabel={`${label} ${value}`}>
      <View style={styles.statTileHead}>
        <Icon name={icon} size={15} color={colors.muted} />
        <Text style={styles.statTileLabel} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <Text style={[styles.statTileValue, color ? { color } : null]} numberOfLines={1}>
        {value}
      </Text>
      {sub ? (
        <Text style={styles.statTileSub} numberOfLines={1}>
          {sub}
        </Text>
      ) : null}
    </Card>
  );
}

export function Row({
  label,
  value,
  color,
  bold,
  icon,
}: {
  label: string;
  value: string;
  color?: string;
  bold?: boolean;
  icon?: IconName;
}) {
  return (
    <View style={styles.kv}>
      {icon ? <Icon name={icon} size={17} color={colors.muted} /> : null}
      <Text style={[styles.kvLabel, bold && styles.bold]}>{label}</Text>
      <Text style={[styles.kvValue, bold && styles.bold, color ? { color } : null]}>{value}</Text>
    </View>
  );
}

export function Bar({ value, color = colors.green, height = 8, track = colors.faint }: { value: number; color?: string; height?: number; track?: string }) {
  const target = Math.max(0, Math.min(100, value));
  const [w] = useState(() => new Animated.Value(target));
  useEffect(() => {
    // Width can't use the native driver.
    Animated.timing(w, { toValue: target, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [w, target]);
  const width = w.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });
  return (
    <View style={[styles.bar, { height, borderRadius: height / 2, backgroundColor: track }]}>
      <Animated.View style={[styles.barFill, { width, height, borderRadius: height / 2, backgroundColor: color }]} />
    </View>
  );
}

/** Win / draw / loss split as one bar with labels. */
export function OddsBar({ win, draw, loss, dark }: { win: number; draw: number; loss: number; dark?: boolean }) {
  const pct = (x: number) => `${Math.round(x * 100)}%`;
  return (
    <View style={styles.odds}>
      <View style={styles.oddsBar}>
        <View style={{ flex: Math.max(win, 0.03), backgroundColor: colors.green }} />
        <View style={{ flex: Math.max(draw, 0.03), backgroundColor: dark ? colors.nightMuted : colors.draw }} />
        <View style={{ flex: Math.max(loss, 0.03), backgroundColor: colors.red }} />
      </View>
      <View style={styles.oddsLabels}>
        <Text style={[styles.oddsText, { color: colors.green }]}>Win {pct(win)}</Text>
        <Text style={[styles.oddsText, { color: dark ? colors.nightMuted : colors.muted }]}>Draw {pct(draw)}</Text>
        <Text style={[styles.oddsText, { color: colors.red }]}>Loss {pct(loss)}</Text>
      </View>
    </View>
  );
}

/* --------------------------------------------------------------------- sheet */

export function Sheet({
  visible,
  title,
  subtitle,
  onClose,
  children,
  footer,
}: {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const [rise] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!visible) return;
    rise.setValue(0);
    Animated.spring(rise, { toValue: 1, useNativeDriver: NATIVE, speed: 16, bounciness: 3 }).start();
  }, [visible, rise]);
  const translateY = rise.interpolate({ inputRange: [0, 1], outputRange: [600, 0] });
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        <Animated.View style={[styles.sheet, { paddingBottom: insets.bottom + 16, transform: [{ translateY }] }]}>
          <View style={styles.grabber} />
          <View style={styles.sheetHeader}>
            <View style={styles.sheetTitles}>
              <Text style={styles.sheetTitle} numberOfLines={1}>
                {title}
              </Text>
              {subtitle ? (
                <Text style={styles.sheetSubtitle} numberOfLines={1}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
            <IconButton icon="close" label="Close" onPress={onClose} size={36} />
          </View>
          <ScrollView style={styles.sheetBody} contentContainerStyle={styles.sheetContent} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
          {footer ? <View style={styles.sheetFooter}>{footer}</View> : null}
        </Animated.View>
      </View>
    </Modal>
  );
}

/* -------------------------------------------------------------------- styles */

export const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: 16,
  },
  cardPressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  button: {
    flexDirection: 'row',
    gap: 8,
    borderRadius: radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  button_lg: { minHeight: 56, borderRadius: radius.lg },
  button_md: { minHeight: 48 },
  button_sm: { minHeight: 38, borderRadius: 12, paddingHorizontal: 12 },
  buttonText: { fontWeight: '800', letterSpacing: 0.2, textAlign: 'center', flexShrink: 1 },
  buttonPressed: { transform: [{ translateY: 2 }] },
  disabled: { opacity: 0.38 },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconButtonDark: { backgroundColor: colors.night3, borderColor: colors.nightLine },
  segTrack: {
    flexDirection: 'row',
    backgroundColor: colors.faint,
    borderRadius: radius.md,
    padding: 3,
    gap: 3,
  },
  segTrackDark: { backgroundColor: colors.night3 },
  seg: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    minHeight: 38,
    borderRadius: 11,
    paddingHorizontal: 6,
  },
  segOn: { backgroundColor: colors.card, ...shadow.card },
  segText: { fontSize: 14, fontWeight: '700' },
  segBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  segBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  chipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { fontSize: 14, fontWeight: '700' },
  chipScrollOuter: { flexGrow: 0, marginHorizontal: -16 },
  chipScroll: { gap: 8, paddingHorizontal: 16 },
  section: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: -2,
    paddingHorizontal: 2,
  },
  sectionText: { fontSize: 12, fontWeight: '800', letterSpacing: 1.2, color: colors.muted, textTransform: 'uppercase' },
  sectionAction: { fontSize: 14, fontWeight: '700', color: colors.green },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 14 },
  listRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.faint },
  listRowSelected: { backgroundColor: colors.goldSoft },
  listRowPressed: { backgroundColor: colors.inset },
  listMain: { flex: 1, gap: 3, minWidth: 0 },
  listTitle: { fontSize: 15, fontWeight: '700', color: colors.ink },
  listSub: { fontSize: 13, fontWeight: '500', color: colors.muted },
  empty: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 24, gap: 6 },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.faint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: colors.ink, textAlign: 'center' },
  emptyText: { fontSize: 14, fontWeight: '500', color: colors.muted, textAlign: 'center', lineHeight: 20 },
  tag: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  tagText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  count: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: colors.card,
  },
  countText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  rating: { alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  ratingText: { fontFamily: DISPLAY, fontWeight: '800', marginTop: 1 },
  range: {
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.goldSoft,
    borderWidth: 1.5,
    borderColor: colors.gold,
    borderStyle: 'dashed',
  },
  rangeText: { color: colors.goldInk, fontFamily: DISPLAY, fontWeight: '800' },
  trend: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  trendText: { fontWeight: '800', letterSpacing: 0.4 },
  tags: { flexDirection: 'row', gap: 4 },
  pos: { borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1 },
  posText: { fontWeight: '800' },
  crest: { overflow: 'hidden', borderColor: '#141414', alignItems: 'center', justifyContent: 'center' },
  crestOutline: {
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  crestText: { fontFamily: DISPLAY, fontWeight: '800', letterSpacing: 0.5 },
  rowFlex: { flexDirection: 'row' },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 28, fontFamily: DISPLAY, fontWeight: '800', color: colors.ink },
  statLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1, color: colors.muted },
  statTile: { flex: 1, paddingVertical: 12, paddingHorizontal: 12, gap: 2 },
  statTileHead: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statTileLabel: { fontSize: 11, fontWeight: '700', color: colors.muted, flexShrink: 1 },
  statTileValue: { fontSize: 26, fontFamily: DISPLAY, fontWeight: '800', color: colors.ink },
  statTileSub: { fontSize: 11, fontWeight: '600', color: colors.muted, marginTop: -2 },
  kv: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7 },
  kvLabel: { flex: 1, fontSize: 15, color: colors.ink2, fontWeight: '500' },
  kvValue: { fontSize: 15, color: colors.ink, fontWeight: '700' },
  bold: { color: colors.ink, fontWeight: '800' },
  bar: { overflow: 'hidden', width: '100%' },
  barFill: {},
  odds: { gap: 6 },
  oddsBar: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', gap: 2 },
  oddsLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  oddsText: { fontWeight: '800', fontSize: 13 },
  backdrop: { flex: 1, backgroundColor: 'rgba(8,14,10,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 16,
    paddingTop: 8,
    maxHeight: '90%',
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: colors.borderDark, marginBottom: 8 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  sheetTitles: { flex: 1 },
  sheetTitle: { fontSize: 22, fontWeight: '800', color: colors.ink },
  sheetSubtitle: { fontSize: 14, fontWeight: '600', color: colors.muted, marginTop: 1 },
  sheetBody: { flexGrow: 0 },
  sheetContent: { paddingBottom: 8, gap: 12 },
  sheetFooter: { paddingTop: 12, gap: 8 },
});
