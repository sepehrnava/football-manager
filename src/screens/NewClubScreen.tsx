import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ECONOMY } from '../game/constants';
import { clubCrest, clubEconomy } from '../game/game';
import { AI_CLUBS } from '../game/names';
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

/** Made-up example names for the club-name field, one picked at random. */
const EXAMPLE_NAMES = [
  'Silverbay Athletic',
  'Redcliff United',
  'Oakmere Rovers',
  'Brightwater FC',
  'Falconridge Town',
  'Ironvale City',
  'Lakeshore Wanderers',
  'Northgate Albion',
];

export function NewClubScreen() {
  const { dispatch } = useGame();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [example] = useState(() => EXAMPLE_NAMES[Math.floor(Math.random() * EXAMPLE_NAMES.length)]);
  const [short, setShort] = useState('');
  const [shortEdited, setShortEdited] = useState(false);
  const [pattern, setPattern] = useState<CrestPattern>('stripes');
  const [primary, setPrimary] = useState(CREST_COLORS[0]);
  const [secondary, setSecondary] = useState(CREST_COLORS[9]);
  const [mode, setMode] = useState<'create' | 'manage' | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const seed = () => Date.now() % 2147483647;

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

      {mode === null ? (
        <View style={s.choices}>
          <ModeCard
            icon="🏗️"
            title="Create your club"
            text="Pick a name and crest. Start small with a modest squad and build a legend."
            onPress={() => setMode('create')}
          />
          <ModeCard
            icon="🏟️"
            title="Manage a club"
            text="Take over one of the league's 10 clubs, from title favourites to underdogs."
            onPress={() => setMode('manage')}
          />
        </View>
      ) : (
        <Text style={s.back} onPress={() => setMode(null)}>
          ‹ Back
        </Text>
      )}

      {mode === 'manage' ? (
        <>
          <SectionTitle>CHOOSE YOUR CLUB</SectionTitle>
          {AI_CLUBS.map((c, i) => {
            const eco = clubEconomy(c.level);
            const tier = clubTier(c.level);
            return (
              <Pressable
                key={c.short}
                onPress={() => setPicked(i)}
                accessibilityRole="button"
                accessibilityLabel={`Manage ${c.name}`}
                accessibilityState={{ selected: picked === i }}
                style={[s.clubRow, picked === i && s.clubRowOn]}
              >
                <Crest crest={clubCrest(i)} short={c.short} size={40} />
                <View style={s.clubMain}>
                  <Text style={s.clubName}>{c.name}</Text>
                  <Text style={s.clubMeta}>
                    {'★'.repeat(tier.stars)}
                    <Text style={s.starsOff}>{'★'.repeat(5 - tier.stars)}</Text> · {tier.label}
                  </Text>
                </View>
                <View style={s.clubRight}>
                  <Text style={s.clubBudget}>{formatMoney(eco.money)}</Text>
                  <Text style={[s.clubDifficulty, { color: tier.color }]}>{tier.difficulty}</Text>
                </View>
              </Pressable>
            );
          })}
          <Text style={s.hint}>
            Big clubs have stars, more money and sponsors, but big wages too: they must keep winning to pay
            the bills. Underdogs are cheap and poor.
          </Text>
          <Button
            label={picked === null ? 'PICK A CLUB' : `MANAGE ${AI_CLUBS[picked].name.toUpperCase()}`}
            disabled={picked === null}
            onPress={() =>
              dispatch({ type: 'new', name: '', short: '', crest, seed: seed(), takeOver: picked })
            }
          />
        </>
      ) : null}

      {mode === 'create' ? (
      <>
      <View style={s.preview}>
        <Crest crest={crest} short={shortCode || '???'} size={110} />
        <Text style={s.previewName}>{name.trim() || 'Your club'}</Text>
      </View>

      <SectionTitle>CLUB NAME</SectionTitle>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder={`e.g. ${example}`}
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
          Your new club starts with a modest squad and {formatMoney(ECONOMY.startMoney)}. Buy better
          players, sell at the right time, and climb the table. Spend too much and the board sacks you.
        </Text>
      </Card>

      <Button
        label="START CAREER"
        disabled={!name.trim()}
        onPress={() =>
          dispatch({ type: 'new', name, short: shortCode, crest, seed: seed() })
        }
      />
      </>
      ) : null}
    </ScrollView>
  );
}

function ModeCard({ icon, title, text, onPress }: { icon: string; title: string; text: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [s.mode, pressed && { opacity: 0.85 }]}>
      <Text style={s.modeIcon}>{icon}</Text>
      <View style={s.clubMain}>
        <Text style={s.modeTitle}>{title}</Text>
        <Text style={s.modeText}>{text}</Text>
      </View>
      <Text style={s.modeArrow}>›</Text>
    </Pressable>
  );
}

/** How strong a club is, in words a player understands at a glance. */
function clubTier(level: number) {
  const stars = Math.max(1, Math.min(5, Math.round((level - 58) / 4)));
  if (level >= 75) return { stars, label: 'Title favourites', difficulty: 'Easy', color: colors.green };
  if (level >= 71) return { stars, label: 'Contenders', difficulty: 'Normal', color: colors.ink };
  if (level >= 66) return { stars, label: 'Mid-table', difficulty: 'Normal', color: colors.ink };
  return { stars, label: 'Underdogs', difficulty: 'Hard', color: colors.red };
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
  choices: { gap: 12, marginTop: 8 },
  mode: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: colors.border,
    borderBottomWidth: 5,
    borderBottomColor: colors.borderDark,
    padding: 18,
  },
  modeIcon: { fontSize: 40 },
  modeTitle: { fontSize: 20, fontWeight: '900', color: colors.ink },
  modeText: { fontSize: 14, fontWeight: '600', color: colors.muted, marginTop: 2 },
  modeArrow: { fontSize: 32, fontWeight: '900', color: colors.muted },
  back: { fontSize: 16, fontWeight: '800', color: colors.muted, paddingVertical: 8 },
  clubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.border,
    borderBottomWidth: 4,
    borderBottomColor: colors.borderDark,
    padding: 12,
    marginBottom: 8,
  },
  clubRowOn: { borderColor: colors.ink, borderBottomColor: colors.ink, backgroundColor: '#FFF8E6' },
  clubMain: { flex: 1 },
  clubName: { fontSize: 16, fontWeight: '900', color: colors.ink },
  clubMeta: { fontSize: 13, fontWeight: '800', color: colors.gold, marginTop: 2 },
  starsOff: { color: colors.border },
  clubRight: { alignItems: 'flex-end' },
  clubBudget: { fontSize: 15, fontWeight: '900', color: colors.ink },
  clubDifficulty: { fontSize: 12, fontWeight: '900' },
  hint: { fontSize: 13, fontWeight: '600', color: colors.muted, marginVertical: 12, lineHeight: 18 },
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
