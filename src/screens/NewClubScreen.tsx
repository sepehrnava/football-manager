import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { clubCrest, clubEconomy } from '../game/game';
import {
  compKey,
  compName,
  COMPS,
  COUNTRIES,
  DEFAULT_COUNTRY,
  DISCLAIMER,
  divisionsIn,
  LEAGUE,
  type Comp,
} from '../game/leagues';
import type { Crest as CrestData, CrestPattern, CrestShape } from '../game/types';
import { useGame } from '../state/GameContext';
import { clubTier, PickedClub, SpinSheet, Stars } from './ClubPick';
import { useAccount } from '../cloud/AccountContext';
import { AccountSheet } from './AccountSheet';
import { HonoursSheet } from './Honours';
import { DailyRow, FeaturedCrest, Hero, MenuRow, StartLinks, YouCrest } from './StartHome';
import { Button, Crest, Pill, SectionTitle, Sheet } from '../ui/components';
import { FadeIn } from '../ui/motion';
import { colors, CREST_COLORS, formatMoney } from '../ui/theme';

const SHAPES: { id: CrestShape; label: string }[] = [
  { id: 'shield', label: 'Shield' },
  { id: 'round', label: 'Round' },
  { id: 'square', label: 'Square' },
  { id: 'oval', label: 'Oval' },
];

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
  const [shape, setShape] = useState<CrestShape>('shield');
  const [primary, setPrimary] = useState(CREST_COLORS[0]);
  const [secondary, setSecondary] = useState(CREST_COLORS[9]);
  const [mode, setMode] = useState<'create' | 'manage' | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  // Chosen league in "Manage a club"; with a single league there is nothing to choose.
  const [comp, setComp] = useState<Comp | null>(COMPS.length === 1 ? COMPS[0] : null);
  // Country a new club starts in (its lowest division).
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [spinning, setSpinning] = useState(false);
  const [honours, setHonours] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const { provider } = useAccount();
  // Building a career takes a moment on phones: show it, then start on the next frame.
  const [starting, setStarting] = useState(false);
  const start = (action: Parameters<typeof dispatch>[0]) => {
    if (starting) return;
    setStarting(true);
    setTimeout(() => dispatch(action), 30);
  };
  const seed = () => Date.now() % 2147483647;

  const shortCode = shortEdited ? short : makeShort(name);
  const crest = { primary, secondary, pattern, shape };

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={[s.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}
      keyboardShouldPersistTaps="handled"
    >
      {mode === null ? null : <Text style={s.logoSmall}>TOP SQUAD</Text>}

      {mode === null ? (
        <View style={s.start}>
          <FadeIn from="scale" duration={320} style={s.start}>
            <Hero />
          </FadeIn>
          {/* After the logo lands, the menu rows slide in one by one, then the links. */}
          <View style={s.menu}>
            <FadeIn delay={650} from="right" distance={48} duration={340}>
              <MenuRow icon={<YouCrest />} title="Create your club" onPress={() => setMode('create')} />
            </FadeIn>
            <FadeIn delay={740} from="right" distance={48} duration={340}>
              <MenuRow icon={<FeaturedCrest />} title="Manage a club" onPress={() => setMode('manage')} />
            </FadeIn>
            <FadeIn delay={830} from="right" distance={48} duration={340}>
              <DailyRow last />
            </FadeIn>
          </View>
          <FadeIn delay={960} duration={300}>
            <StartLinks
            onSpin={() => setSpinning(true)}
            onHonours={() => setHonours(true)}
            onAccount={provider ? () => setAccountOpen(true) : undefined}
            />
          </FadeIn>
          <AccountSheet visible={accountOpen} onClose={() => setAccountOpen(false)} />
          <SpinSheet
            visible={spinning}
            onClose={() => setSpinning(false)}
            starting={starting}
            onManage={(i) => start({ type: 'new', name: '', short: '', crest: clubCrest(i), seed: seed(), takeOver: i })}
          />
          <HonoursSheet visible={honours} onClose={() => setHonours(false)} />
        </View>
      ) : (
        <Text
          style={s.back}
          onPress={() => {
            if (mode === 'manage' && comp !== null && COMPS.length > 1) {
              setComp(null);
              setPicked(null);
            } else setMode(null);
          }}
        >
          ‹ Back
        </Text>
      )}

      {mode === 'manage' && comp === null ? (
        <>
          <SectionTitle>CHOOSE A LEAGUE</SectionTitle>
          {COUNTRIES.map((country) => (
            <View key={country.id} style={s.country}>
              <View style={s.countryHead}>
                <Text style={s.countryName}>{country.name}</Text>
              </View>
              {COMPS.filter((c2) => c2.country === country.id).map((c2) => {
                const d = c2.division;
                const clubs = LEAGUE.clubs.filter((c) => c.country === c2.country && c.division === d);
                const budgets = clubs.map((c) => clubEconomy(c.level).money);
                return (
                  <Pressable
                    key={compKey(c2)}
                    onPress={() => setComp(c2)}
                    accessibilityRole="button"
                    accessibilityLabel={`League ${compName(c2)}`}
                    style={({ pressed }) => [s.league, pressed && { opacity: 0.85 }]}
                  >
                    <Crest crest={clubCrest(LEAGUE.clubs.indexOf(clubs[0]))} short={clubs[0].short} size={32} />
                    <View style={s.clubMain}>
                      <Text style={s.leagueName}>{compName(c2)}</Text>
                      <Text style={s.leagueMeta}>
                        {clubs.length} clubs · {formatMoney(Math.min(...budgets))}–{formatMoney(Math.max(...budgets))}
                      </Text>
                    </View>
                    <Text style={s.modeArrow}>›</Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </>
      ) : null}

      {mode === 'manage' && comp !== null ? (
        <>
          <SectionTitle>{compName(comp).toUpperCase()}</SectionTitle>
          {LEAGUE.clubs
            .map((c, i) => ({ c, i }))
            .filter(({ c }) => c.country === comp.country && c.division === comp.division)
            .map(({ c, i }, rank) => {
              const eco = clubEconomy(c.level);
              const tier = clubTier(i);
              return (
                <Pressable
                  key={c.short}
                  onPress={() => setPicked(i)}
                  accessibilityRole="button"
                  accessibilityLabel={`Manage ${c.name}`}
                  accessibilityState={{ selected: picked === i }}
                  style={[s.clubRow, picked === i && s.clubRowOn]}
                >
                  <Text style={s.rank}>{rank + 1}</Text>
                  <Crest crest={clubCrest(i)} short={c.short} size={40} />
                  <View style={s.clubMain}>
                    <Text style={s.clubName} numberOfLines={1}>
                      {c.name}
                    </Text>
                    <Stars count={tier.stars} />
                    <Text style={s.clubTier}>{tier.label}</Text>
                  </View>
                  <View style={s.clubRight}>
                    <Text style={s.clubBudget}>{formatMoney(eco.money)}</Text>
                    <Text style={[s.clubDifficulty, { color: tier.color }]}>{tier.difficulty}</Text>
                  </View>
                </Pressable>
              );
            })}
          {picked !== null ? (
            <Sheet visible title={LEAGUE.clubs[picked].name} onClose={() => setPicked(null)}>
              <PickedClub index={picked} />
              <Button
                label={starting ? 'STARTING…' : `MANAGE ${LEAGUE.clubs[picked].name.toUpperCase()}`}
                variant="green"
                onPress={() => start({ type: 'new', name: '', short: '', crest, seed: seed(), takeOver: picked })}
              />
            </Sheet>
          ) : null}
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

      {COUNTRIES.length > 1 ? (
        <>
          <SectionTitle>COUNTRY</SectionTitle>
          <View style={s.wrap}>
            {COUNTRIES.map((c) => (
              <Pill key={c.id} label={c.name} active={country === c.id} onPress={() => setCountry(c.id)} />
            ))}
          </View>
        </>
      ) : null}

      <SectionTitle>SHAPE</SectionTitle>
      <View style={s.choices}>
        {SHAPES.map((x) => (
          <CrestChoice
            key={x.id}
            label={x.label}
            crest={{ ...crest, shape: x.id }}
            short={shortCode || '???'}
            active={shape === x.id}
            onPress={() => setShape(x.id)}
          />
        ))}
      </View>
      <SectionTitle>PATTERN</SectionTitle>
      <View style={s.choices}>
        {PATTERNS.map((p) => (
          <CrestChoice
            key={p.id}
            label={p.label}
            crest={{ ...crest, pattern: p.id }}
            short={shortCode || '???'}
            active={pattern === p.id}
            onPress={() => setPattern(p.id)}
          />
        ))}
      </View>
      <Text style={s.label}>Main colour</Text>
      <Swatches value={primary} onChange={setPrimary} />
      <Text style={s.label}>Second colour</Text>
      <Swatches value={secondary} onChange={setSecondary} />

      <Text style={s.info}>
        You start in the {compName({ country, division: divisionsIn(country) })} with no players and a budget.
      </Text>

      <Button
        label={starting ? 'STARTING…' : 'START CAREER'}
        disabled={!name.trim()}
        onPress={() => start({ type: 'new', name, short: shortCode, crest, seed: seed(), country })}
      />
      </>
      ) : null}

      {DISCLAIMER ? <Text style={[s.disclaimer, mode === null && s.disclaimerEnd]}>{DISCLAIMER}</Text> : null}
    </ScrollView>
  );
}

/** One crest option shown as a small crest in your colours; the chosen one is ringed. */
function CrestChoice({
  label,
  crest,
  short,
  active,
  onPress,
}: {
  label: string;
  crest: CrestData;
  short: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [s.choice, active && s.choiceOn, pressed && { opacity: 0.7 }]}
    >
      <Crest crest={crest} short={short} size={36} />
      <Text style={[s.choiceText, active && { color: colors.ink }]}>{label}</Text>
    </Pressable>
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
  start: { flex: 1 },
  menu: { marginTop: 4 },
  modeArrow: { fontSize: 32, fontWeight: '900', color: colors.muted },
  back: { fontSize: 16, fontWeight: '800', color: colors.muted, paddingVertical: 8 },
  league: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  country: { marginBottom: 10 },
  countryHead: { marginTop: 10 },
  countryName: { fontSize: 12, fontWeight: '900', letterSpacing: 1.5, color: colors.muted, textTransform: 'uppercase' },
  leagueName: { fontSize: 18, fontWeight: '900', color: colors.ink },
  leagueMeta: { fontSize: 13, fontWeight: '700', color: colors.muted, marginTop: 2 },
  rank: { width: 24, fontSize: 16, fontWeight: '900', color: colors.muted, textAlign: 'center' },
  clubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  clubRowOn: { backgroundColor: colors.card },
  clubMain: { flex: 1 },
  clubName: { fontSize: 16, fontWeight: '900', color: colors.ink },
  clubTier: { fontSize: 12, fontWeight: '800', color: colors.muted, marginTop: 1 },
  logoSmall: {
    fontSize: 16,
    fontWeight: '900',
    fontStyle: 'italic',
    textAlign: 'center',
    color: colors.ink,
    letterSpacing: 2,
  },
  clubRight: { alignItems: 'flex-end' },
  clubBudget: { fontSize: 15, fontWeight: '900', color: colors.ink },
  clubDifficulty: { fontSize: 12, fontWeight: '900' },
  disclaimer: { fontSize: 11, fontWeight: '600', color: colors.muted, lineHeight: 15, marginTop: 28, textAlign: 'center' },
  // On the start view the pitch takes the free space; the note follows the menu.
  disclaimerEnd: { marginTop: 16 },
  hint: { fontSize: 13, fontWeight: '600', color: colors.muted, marginVertical: 12, lineHeight: 18 },
  content: { flexGrow: 1, paddingHorizontal: 20, maxWidth: 560, width: '100%', alignSelf: 'center' },
  preview: { alignItems: 'center', marginTop: 24, gap: 12 },
  previewName: { fontSize: 22, fontWeight: '900', color: colors.ink },
  input: {
    backgroundColor: colors.card,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    fontWeight: '800',
    color: colors.ink,
  },
  shortInput: { marginTop: 10, width: 110, textAlign: 'center', letterSpacing: 3 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  choices: { flexDirection: 'row', gap: 8 },
  choice: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: colors.card,
  },
  choiceOn: { borderColor: colors.ink },
  choiceText: { fontSize: 12, fontWeight: '800', color: colors.muted },
  label: { marginTop: 16, marginBottom: 8, fontWeight: '800', color: colors.ink },
  swatch: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: colors.borderDark,
  },
  swatchActive: { borderWidth: 4, borderColor: colors.ink, transform: [{ scale: 1.1 }] },
  info: { marginTop: 24, marginBottom: 14, fontSize: 14, lineHeight: 20, color: colors.muted, fontWeight: '700' },
});
