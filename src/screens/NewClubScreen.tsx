import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { clubCrest, clubEconomy } from '../game/game';
import {
  compKey,
  compName,
  COMPS,
  COUNTRIES,
  DEFAULT_COUNTRY,
  DISCLAIMER,
  flagOf,
  divisionsIn,
  LEAGUE,
  type Comp,
} from '../game/leagues';
import type { CrestPattern } from '../game/types';
import { useGame } from '../state/GameContext';
import {
  Button,
  Card,
  Chip,
  ChipScroll,
  Crest,
  Icon,
  ListRow,
  Section,
  Sheet,
  Text,
  type IconName,
} from '../ui/components';
import { FadeIn, stagger } from '../ui/motion';
import { DISPLAY } from '../ui/text';
import { colors, CREST_COLORS, formatMoney, radius } from '../ui/theme';
import { DailyCard } from './Challenge';

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
  // Chosen league in "Manage a club"; with a single league there is nothing to choose.
  const [comp, setComp] = useState<Comp | null>(COMPS.length === 1 ? COMPS[0] : null);
  // Country a new club starts in (its lowest division).
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const seed = () => Date.now() % 2147483647;

  const shortCode = shortEdited ? short : makeShort(name);
  const crest = { primary, secondary, pattern };

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={[s.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}
      keyboardShouldPersistTaps="handled"
    >
      {mode === null ? (
        <FadeIn from="scale" duration={420}>
          <Text style={s.logo}>POCKET{'\n'}MANAGER</Text>
          <View style={s.logoRule} />
          <Text style={s.tagline}>Build your XI. Trade smart. Keep the board happy.</Text>
        </FadeIn>
      ) : (
        <Text style={s.logoSmall}>POCKET MANAGER</Text>
      )}

      {mode === null ? (
        <View style={s.choices}>
          <FadeIn delay={120}>
            <ModeCard
              icon="shield-plus-outline"
              title="Create your club"
              text="Name it, design a crest, start at the bottom."
              onPress={() => setMode('create')}
            />
          </FadeIn>
          <FadeIn delay={180}>
            <ModeCard
              icon="stadium-variant"
              title="Manage a club"
              text={`${LEAGUE.clubs.length} clubs in ${COMPS.length} leagues, favourites to underdogs.`}
              onPress={() => setMode('manage')}
            />
          </FadeIn>
          <FadeIn delay={240}>
            <DailyCard />
          </FadeIn>
        </View>
      ) : (
        <Pressable
          onPress={() => {
            if (mode === 'manage' && comp !== null && COMPS.length > 1) {
              setComp(null);
              setPicked(null);
            } else setMode(null);
          }}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={({ pressed }) => [s.back, pressed && { opacity: 0.6 }]}
        >
          <Icon name="chevron-left" size={22} color={colors.ink2} />
          <Text style={s.backText}>Back</Text>
        </Pressable>
      )}

      {mode === 'manage' && comp === null ? (
        <FadeIn key="leagues" from="right" distance={14} style={s.step}>
          <Text style={s.stepTitle}>Choose a league</Text>
          {COUNTRIES.map((country, ci) => (
            <FadeIn key={country.id} delay={stagger(ci, 40)} style={s.country}>
              <Text style={s.countryName}>
                {country.flag} {country.name}
              </Text>
              <Card style={s.list}>
                {COMPS.filter((c2) => c2.country === country.id).map((c2, i, all) => {
                  const d = c2.division;
                  const clubs = LEAGUE.clubs.filter((c) => c.country === c2.country && c.division === d);
                  const budgets = clubs.map((c) => clubEconomy(c.level).money);
                  return (
                    <ListRow
                      key={compKey(c2)}
                      onPress={() => setComp(c2)}
                      accessibilityLabel={`League ${compName(c2)}`}
                      left={
                        <View style={[s.divisionBadge, d === 1 && s.divisionTop]}>
                          <Text style={[s.divisionNumber, d === 1 && { color: colors.ink }]}>{d}</Text>
                        </View>
                      }
                      title={compName(c2)}
                      subtitle={`${clubs.length} clubs · ${formatMoney(Math.min(...budgets))}–${formatMoney(Math.max(...budgets))} · ${d === 1 ? 'title' : 'promotion'}`}
                      right={
                        <View style={s.leagueCrests}>
                          {clubs.slice(0, 3).map((c) => (
                            <Crest key={c.short} crest={clubCrest(LEAGUE.clubs.indexOf(c))} size={18} />
                          ))}
                        </View>
                      }
                      chevron
                      last={i === all.length - 1}
                    />
                  );
                })}
              </Card>
            </FadeIn>
          ))}
        </FadeIn>
      ) : null}

      {mode === 'manage' && comp !== null ? (
        <FadeIn key={compKey(comp)} from="right" distance={14} style={s.step}>
          <Text style={s.stepTitle}>
            {flagOf(comp.country)} {compName(comp)}
          </Text>
          <Text style={s.hint}>Ranked by squad strength. Big clubs have money and stars, but big wages too.</Text>
          <Card style={s.list}>
            {LEAGUE.clubs
              .map((c, i) => ({ c, i }))
              .filter(({ c }) => c.country === comp.country && c.division === comp.division)
              .map(({ c, i }, rank, all) => {
                const eco = clubEconomy(c.level);
                const tier = clubTier(i);
                return (
                  <ListRow
                    key={c.short}
                    onPress={() => setPicked(i)}
                    accessibilityLabel={`Manage ${c.name}`}
                    selected={picked === i}
                    left={
                      <View style={s.clubLeft}>
                        <Text style={s.rank}>{rank + 1}</Text>
                        <Crest crest={clubCrest(i)} short={c.short} size={32} />
                      </View>
                    }
                    title={c.name}
                    subtitle={
                      <Text style={s.clubMeta}>
                        {'★'.repeat(tier.stars)}
                        <Text style={s.starsOff}>{'★'.repeat(5 - tier.stars)}</Text>
                        <Text style={s.clubTier}>  {tier.label}</Text>
                      </Text>
                    }
                    right={
                      <View style={s.clubRight}>
                        <Text style={s.clubBudget}>{formatMoney(eco.money)}</Text>
                        <Text style={[s.clubDifficulty, { color: tier.color }]}>{tier.difficulty}</Text>
                      </View>
                    }
                    last={rank === all.length - 1}
                  />
                );
              })}
          </Card>
          {picked !== null ? (
            <Sheet visible title={LEAGUE.clubs[picked].name} onClose={() => setPicked(null)}>
              <PickedClub index={picked} />
              <Button
                label={`Manage ${LEAGUE.clubs[picked].name}`}
                size="lg"
                onPress={() =>
                  dispatch({ type: 'new', name: '', short: '', crest, seed: seed(), takeOver: picked })
                }
              />
            </Sheet>
          ) : null}
        </FadeIn>
      ) : null}

      {mode === 'create' ? (
      <FadeIn key="create" from="right" distance={14}>
      <View style={s.preview}>
        <Crest crest={crest} short={shortCode || '???'} size={110} />
        <Text style={s.previewName}>{name.trim() || 'Your club'}</Text>
      </View>

      <Section title="Club name" style={s.gapTop} />
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
          <Section title="Country" style={s.gapTop} />
          <ChipScroll style={s.chips}>
            {COUNTRIES.map((c) => (
              <Chip key={c.id} label={`${c.flag} ${c.name}`} active={country === c.id} onPress={() => setCountry(c.id)} />
            ))}
          </ChipScroll>
        </>
      ) : null}

      <Section title="Crest" style={s.gapTop} />
      <View style={[s.wrap, s.chips]}>
        {PATTERNS.map((p) => (
          <Chip key={p.id} label={p.label} active={pattern === p.id} onPress={() => setPattern(p.id)} />
        ))}
      </View>
      <Text style={s.label}>Main colour</Text>
      <Swatches value={primary} onChange={setPrimary} />
      <Text style={s.label}>Second colour</Text>
      <Swatches value={secondary} onChange={setSecondary} />

      <Card tone="inset" style={s.info}>
        <View style={s.infoHead}>
          <Icon name="information-outline" size={18} color={colors.ink2} />
          <Text style={s.infoTitle}>Your situation</Text>
        </View>
        <Text style={s.infoText}>
          Your new club starts in the {compName({ country, division: divisionsIn(country) })} with a modest
          squad and a founding investment. Develop young players, sell at the right time and climb
          {divisionsIn(country) > 1 ? ' all the way to the top' : ' the table'}. Spend too much and the board
          sacks you.
        </Text>
      </Card>

      <Button
        label="Start career"
        icon="whistle"
        size="lg"
        disabled={!name.trim()}
        onPress={() =>
          dispatch({ type: 'new', name, short: shortCode, crest, seed: seed(), country })
        }
      />
      </FadeIn>
      ) : null}

      {DISCLAIMER ? <Text style={s.disclaimer}>{DISCLAIMER}</Text> : null}
    </ScrollView>
  );
}

function ModeCard({ icon, title, text, onPress }: { icon: IconName; title: string; text: string; onPress: () => void }) {
  return (
    <Card onPress={onPress} accessibilityLabel={title} style={s.mode}>
      <View style={s.modeIcon}>
        <Icon name={icon} size={26} color="#FFFFFF" />
      </View>
      <View style={s.clubMain}>
        <Text style={s.modeTitle}>{title}</Text>
        <Text style={s.modeText}>{text}</Text>
      </View>
      <Icon name="chevron-right" size={24} color={colors.borderDark} />
    </Card>
  );
}

/** What taking over a club means: budget, expectations and difficulty. */
function PickedClub({ index }: { index: number }) {
  const c = LEAGUE.clubs[index];
  const eco = clubEconomy(c.level);
  const tier = clubTier(index);
  const comp = { country: c.country, division: c.division };
  return (
    <View style={s.picked}>
      <FadeIn from="scale">
        <Crest crest={clubCrest(index)} short={c.short} size={72} />
      </FadeIn>
      <Text style={s.pickedMeta}>
        {flagOf(c.country)} {compName(comp)}
      </Text>
      <Text style={s.clubMeta}>
        {'★'.repeat(tier.stars)}
        <Text style={s.starsOff}>{'★'.repeat(5 - tier.stars)}</Text>
      </Text>
      <View style={s.pickedStats}>
        <PickedStat label="BUDGET" value={formatMoney(eco.money)} />
        <PickedStat label="EXPECTED" value={tier.label} />
        <PickedStat label="DIFFICULTY" value={tier.difficulty} color={tier.color} />
      </View>
    </View>
  );
}

function PickedStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={s.pickedStat}>
      <Text style={[s.pickedValue, color ? { color } : null]}>{value}</Text>
      <Text style={s.pickedLabel}>{label}</Text>
    </View>
  );
}

/** How strong a club is compared with the rest of its division, at a glance. */
function clubTier(index: number) {
  const club = LEAGUE.clubs[index];
  const peers = LEAGUE.clubs.filter((c) => c.country === club.country && c.division === club.division);
  const levels = peers.map((c) => c.level);
  const min = Math.min(...levels);
  const max = Math.max(...levels);
  const stars = max === min ? 3 : 1 + Math.round(((club.level - min) / (max - min)) * 4);
  const rank = peers.indexOf(club) / peers.length; // clubs are sorted strongest first
  const top = club.division === 1;
  if (rank < 0.2)
    return { stars, label: top ? 'Title favourites' : 'Promotion favourites', difficulty: 'Easy', color: colors.green };
  if (rank < 0.5)
    return { stars, label: top ? 'Contenders' : 'Promotion hopefuls', difficulty: 'Normal', color: colors.ink };
  if (rank < 0.8) return { stars, label: 'Mid-table', difficulty: 'Normal', color: colors.ink };
  return {
    stars,
    label: top && divisionsIn(club.country) > 1 ? 'Relegation fight' : 'Underdogs',
    difficulty: 'Hard',
    color: colors.red,
  };
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
  content: { paddingHorizontal: 16, maxWidth: 560, width: '100%', alignSelf: 'center' },
  logo: {
    fontSize: 64,
    lineHeight: 60,
    fontFamily: DISPLAY,
    fontStyle: 'italic',
    textAlign: 'center',
    color: colors.ink,
    marginTop: 24,
  },
  logoRule: { alignSelf: 'center', width: 56, height: 4, backgroundColor: colors.green, marginTop: 10, borderRadius: 1 },
  tagline: { textAlign: 'center', color: colors.muted, fontWeight: '600', marginTop: 10 },
  logoSmall: {
    fontSize: 20,
    fontFamily: DISPLAY,
    fontStyle: 'italic',
    textAlign: 'center',
    color: colors.ink,
    letterSpacing: 1,
  },
  choices: { gap: 10, marginTop: 28 },
  mode: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16 },
  modeIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeTitle: { fontSize: 24, fontFamily: DISPLAY, fontWeight: '800', color: colors.ink, textTransform: 'uppercase' },
  modeText: { fontSize: 14, fontWeight: '500', color: colors.muted, marginTop: 1 },
  back: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingVertical: 8, marginLeft: -6 },
  backText: { fontSize: 15, fontWeight: '700', color: colors.ink2 },
  step: { gap: 10 },
  stepTitle: { fontSize: 30, fontFamily: DISPLAY, fontWeight: '800', color: colors.ink },
  list: { padding: 0, overflow: 'hidden' },
  country: { gap: 6 },
  countryName: { fontSize: 13, fontWeight: '800', color: colors.ink2 },
  divisionBadge: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divisionTop: { backgroundColor: colors.gold },
  divisionNumber: { fontSize: 20, fontFamily: DISPLAY, fontWeight: '800', color: '#FFFFFF' },
  leagueCrests: { flexDirection: 'row', gap: 3 },
  clubLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rank: { width: 20, fontSize: 17, fontFamily: DISPLAY, fontWeight: '800', color: colors.muted, textAlign: 'center' },
  clubMain: { flex: 1 },
  clubMeta: { fontSize: 12, fontWeight: '700', color: colors.goldDark },
  starsOff: { color: colors.border },
  clubTier: { fontSize: 12, fontWeight: '600', color: colors.muted },
  clubRight: { alignItems: 'flex-end' },
  clubBudget: { fontSize: 18, fontFamily: DISPLAY, fontWeight: '800', color: colors.ink },
  clubDifficulty: { fontSize: 12, fontWeight: '800' },
  picked: { alignItems: 'center', gap: 6, marginBottom: 6 },
  pickedMeta: { fontSize: 14, fontWeight: '700', color: colors.muted, marginTop: 4 },
  pickedStats: {
    flexDirection: 'row',
    marginTop: 10,
    alignSelf: 'stretch',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pickedStat: { flex: 1, alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4, gap: 1 },
  pickedValue: { fontSize: 18, fontFamily: DISPLAY, fontWeight: '800', color: colors.ink, textAlign: 'center' },
  pickedLabel: { fontSize: 10, fontWeight: '700', color: colors.muted, letterSpacing: 0.8 },
  disclaimer: { fontSize: 11, fontWeight: '500', color: colors.muted, lineHeight: 15, marginTop: 28, textAlign: 'center' },
  hint: { fontSize: 13, fontWeight: '500', color: colors.muted, lineHeight: 18, marginTop: -6 },
  preview: { alignItems: 'center', marginTop: 16, gap: 10 },
  previewName: { fontSize: 30, fontFamily: DISPLAY, fontWeight: '800', color: colors.ink },
  gapTop: { marginTop: 18, marginBottom: 8 },
  chips: { marginTop: 0 },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderDark,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 17,
    fontWeight: '700',
    color: colors.ink,
  },
  shortInput: { marginTop: 8, width: 100, textAlign: 'center', letterSpacing: 3 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  label: { marginTop: 14, marginBottom: 8, fontSize: 12, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  swatch: { width: 36, height: 36, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderDark },
  swatchActive: { borderWidth: 3, borderColor: colors.ink, transform: [{ scale: 1.08 }] },
  info: { marginTop: 22, marginBottom: 16, gap: 4 },
  infoHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoTitle: { fontSize: 15, fontWeight: '800', color: colors.ink },
  infoText: { fontSize: 14, lineHeight: 20, color: colors.ink2, fontWeight: '500' },
});
