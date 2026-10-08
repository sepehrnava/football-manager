import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ECONOMY } from '../game/constants';
import type { CrestPattern } from '../game/types';
import { useGame } from '../state/GameContext';
import { Button, Card, Crest, Pill, SectionTitle } from '../ui/components';
import { colors, CREST_COLORS, formatMoney } from '../ui/theme';

const PATTERNS: { id: CrestPattern; label: string }[] = [
  { id: 'solid', label: 'Solid' },
  { id: 'stripes', label: 'Stripes' },
  { id: 'half', label: 'Halves' },
  { id: 'band', label: 'Band' },
];

function makeShort(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 3) return words.slice(0, 3).map((w) => w[0]).join('').toUpperCase();
  if (words.length === 2) return (words[0].slice(0, 2) + words[1][0]).toUpperCase();
  return (words[0] ?? '').slice(0, 3).toUpperCase();
}

export function NewClubScreen() {
  const { dispatch } = useGame();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [short, setShort] = useState('');
  const [shortEdited, setShortEdited] = useState(false);
  const [pattern, setPattern] = useState<CrestPattern>('stripes');
  const [primary, setPrimary] = useState(CREST_COLORS[0]);
  const [secondary, setSecondary] = useState(CREST_COLORS[9]);

  const shortCode = shortEdited ? short : makeShort(name);
  const crest = { primary, secondary, pattern };

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={[s.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={s.logo}>POCKET{'\n'}MANAGER</Text>
      <Text style={s.tagline}>Build your XI. Trade smart. Keep the board happy.</Text>

      <View style={s.preview}>
        <Crest crest={crest} short={shortCode || '???'} size={110} />
        <Text style={s.previewName}>{name.trim() || 'Your club'}</Text>
      </View>

      <SectionTitle>CLUB NAME</SectionTitle>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="e.g. Tehran Rovers"
        placeholderTextColor={colors.muted}
        style={s.input}
        maxLength={24}
        autoCapitalize="words"
      />
      <TextInput
        value={shortCode}
        onChangeText={(t) => {
          setShortEdited(true);
          setShort(t.toUpperCase().slice(0, 3));
        }}
        placeholder="ABC"
        placeholderTextColor={colors.muted}
        style={[s.input, s.shortInput]}
        maxLength={3}
        autoCapitalize="characters"
      />

      <SectionTitle>CREST</SectionTitle>
      <View style={s.wrap}>
        {PATTERNS.map((p) => (
          <Pill key={p.id} label={p.label} active={pattern === p.id} onPress={() => setPattern(p.id)} />
        ))}
      </View>
      <Text style={s.label}>Main colour</Text>
      <Swatches value={primary} onChange={setPrimary} />
      <Text style={s.label}>Second colour</Text>
      <Swatches value={secondary} onChange={setSecondary} />

      <Card style={s.info}>
        <Text style={s.infoTitle}>Your situation</Text>
        <Text style={s.infoText}>
          You take over a mid-table squad with {formatMoney(ECONOMY.startMoney)} in the bank. Fixed
          costs and the stakeholder cashout mean the club loses money unless you finish higher.
          Prize money depends on your final position.
        </Text>
      </Card>

      <Button
        label="START CAREER"
        disabled={!name.trim()}
        onPress={() =>
          dispatch({ type: 'new', name, short: shortCode, crest, seed: Date.now() % 2147483647 })
        }
      />
    </ScrollView>
  );
}

function Swatches({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <View style={s.wrap}>
      {CREST_COLORS.map((c) => (
        <Pressable
          key={c}
          accessibilityLabel={`Colour ${c}`}
          onPress={() => onChange(c)}
          style={[s.swatch, { backgroundColor: c }, value === c && s.swatchActive]}
        />
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  content: { paddingHorizontal: 20, maxWidth: 560, width: '100%', alignSelf: 'center' },
  logo: {
    fontSize: 40,
    lineHeight: 42,
    fontWeight: '900',
    fontStyle: 'italic',
    textAlign: 'center',
    color: colors.ink,
    letterSpacing: 1,
  },
  tagline: { textAlign: 'center', color: colors.muted, fontWeight: '700', marginTop: 8 },
  preview: { alignItems: 'center', marginTop: 24, gap: 12 },
  previewName: { fontSize: 22, fontWeight: '900', color: colors.ink },
  input: {
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.border,
    borderBottomWidth: 4,
    borderBottomColor: colors.borderDark,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    fontWeight: '800',
    color: colors.ink,
  },
  shortInput: { marginTop: 10, width: 110, textAlign: 'center', letterSpacing: 3 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  label: { marginTop: 16, marginBottom: 8, fontWeight: '800', color: colors.ink },
  swatch: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: colors.borderDark,
  },
  swatchActive: { borderWidth: 4, borderColor: colors.ink, transform: [{ scale: 1.1 }] },
  info: { marginTop: 24, marginBottom: 20 },
  infoTitle: { fontSize: 16, fontWeight: '900', color: colors.ink, marginBottom: 6 },
  infoText: { fontSize: 15, lineHeight: 21, color: colors.muted, fontWeight: '600' },
});
