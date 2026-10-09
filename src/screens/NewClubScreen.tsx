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
  flagOf,
  divisionsIn,
  LEAGUE,
  type Comp,
} from '../game/leagues';
import type { CrestPattern } from '../game/types';
import { useGame } from '../state/GameContext';
import { DailyCard } from './Challenge';
import { Button, Card, Crest, Pill, SectionTitle, Sheet } from '../ui/components';
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
        <>
          <Text style={s.logo}>POCKET{'\n'}MANAGER</Text>
          <Text style={s.tagline}>Build your XI. Trade smart. Keep the board happy.</Text>
        </>
      ) : (
        <Text style={s.logoSmall}>POCKET MANAGER</Text>
      )}

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
            text={`Take over one of ${LEAGUE.clubs.length} clubs in ${COMPS.length} leagues, from title favourites to underdogs.`}
            onPress={() => setMode('manage')}
          />
          <DailyCard />
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
                <Text style={s.countryFlag}>{country.flag}</Text>
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
                    <View style={[s.divisionBadge, d === 1 ? s.divisionTop : s.divisionLower]}>
                      <Text style={[s.divisionNumber, d === 1 && { color: colors.ink }]}>{d}</Text>
                      <Text style={[s.divisionLabel, d === 1 && { color: colors.ink }]}>DIV</Text>
                    </View>
                    <View style={s.clubMain}>
                      <Text style={s.leagueName}>{compName(c2)}</Text>
                      <Text style={s.leagueMeta}>
                        {clubs.length} clubs · {formatMoney(Math.min(...budgets))}–{formatMoney(Math.max(...budgets))}
                      </Text>
                      <Text style={s.leagueMeta}>
                        {d === 1 ? 'Win the title' : `Fight for promotion to Division ${d - 1}`}
                      </Text>
                      <View style={s.leagueCrests}>
                        {clubs.slice(0, 5).map((c) => (
                          <Crest key={c.short} crest={clubCrest(LEAGUE.clubs.indexOf(c))} short={c.short} size={26} />
                        ))}
                      </View>
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
          <SectionTitle>{`${flagOf(comp.country)} ${compName(comp).toUpperCase()} · CHOOSE YOUR CLUB`}</SectionTitle>
          <Text style={s.hint}>Ranked by squad strength: where each club is expected to finish.</Text>
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
                    <Text style={s.clubMeta}>
                      {'★'.repeat(tier.stars)}
                      <Text style={s.starsOff}>{'★'.repeat(5 - tier.stars)}</Text>
                    </Text>
                    <Text style={s.clubTier}>{tier.label}</Text>
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
          {picked !== null ? (
            <Sheet visible title={LEAGUE.clubs[picked].name} onClose={() => setPicked(null)}>
              <PickedClub index={picked} />
              <Button
                label={`MANAGE ${LEAGUE.clubs[picked].name.toUpperCase()}`}
                variant="green"
                onPress={() =>
                  dispatch({ type: 'new', name: '', short: '', crest, seed: seed(), takeOver: picked })
                }
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
              <Pill key={c.id} label={`${c.flag} ${c.name}`} active={country === c.id} onPress={() => setCountry(c.id)} />
            ))}
          </View>
        </>
      ) : null}

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
          Your new club starts in the {compName({ country, division: divisionsIn(country) })} with a modest
          squad and a founding investment. Develop young players, sell at the right time and climb
          {divisionsIn(country) > 1 ? ' all the way to the top' : ' the table'}. Spend too much and the board
          sacks you.
        </Text>
      </Card>

      <Button
        label="START CAREER"
        disabled={!name.trim()}
        onPress={() =>
          dispatch({ type: 'new', name, short: shortCode, crest, seed: seed(), country })
        }
      />
      </>
      ) : null}

      {DISCLAIMER ? <Text style={s.disclaimer}>{DISCLAIMER}</Text> : null}
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

/** What taking over a club means: budget, expectations and difficulty. */
function PickedClub({ index }: { index: number }) {
  const c = LEAGUE.clubs[index];
  const eco = clubEconomy(c.level);
  const tier = clubTier(index);
  const comp = { country: c.country, division: c.division };
  return (
    <View style={s.picked}>
      <Crest crest={clubCrest(index)} short={c.short} size={72} />
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
  league: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: colors.border,
    borderBottomWidth: 5,
    borderBottomColor: colors.borderDark,
    padding: 18,
    marginBottom: 12,
  },
  country: { marginBottom: 6 },
  countryHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, marginBottom: 8 },
  countryFlag: { fontSize: 26 },
  countryName: { fontSize: 15, fontWeight: '900', letterSpacing: 1.5, color: colors.muted, textTransform: 'uppercase' },
  divisionBadge: { width: 52, height: 62, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  divisionTop: { backgroundColor: colors.gold },
  divisionLower: { backgroundColor: colors.ink },
  divisionNumber: { fontSize: 28, fontWeight: '900', color: '#FFFFFF', lineHeight: 30 },
  divisionLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1, color: '#BDBDB6' },
  leagueName: { fontSize: 21, fontWeight: '900', color: colors.ink },
  leagueMeta: { fontSize: 14, fontWeight: '700', color: colors.muted, marginTop: 2 },
  leagueCrests: { flexDirection: 'row', gap: 6, marginTop: 10 },
  rank: { width: 24, fontSize: 16, fontWeight: '900', color: colors.muted, textAlign: 'center' },
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
  clubTier: { fontSize: 12, fontWeight: '800', color: colors.muted, marginTop: 1 },
  logoSmall: {
    fontSize: 16,
    fontWeight: '900',
    fontStyle: 'italic',
    textAlign: 'center',
    color: colors.ink,
    letterSpacing: 2,
  },
  picked: { alignItems: 'center', gap: 6, marginBottom: 18 },
  pickedMeta: { fontSize: 15, fontWeight: '800', color: colors.muted, marginTop: 4 },
  pickedStats: { flexDirection: 'row', gap: 8, marginTop: 10, alignSelf: 'stretch' },
  pickedStat: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.border,
    paddingVertical: 10,
    paddingHorizontal: 4,
    gap: 2,
  },
  pickedValue: { fontSize: 15, fontWeight: '900', color: colors.ink, textAlign: 'center' },
  pickedLabel: { fontSize: 9, fontWeight: '900', color: colors.muted, letterSpacing: 1 },
  clubRight: { alignItems: 'flex-end' },
  clubBudget: { fontSize: 15, fontWeight: '900', color: colors.ink },
  clubDifficulty: { fontSize: 12, fontWeight: '900' },
  disclaimer: { fontSize: 11, fontWeight: '600', color: colors.muted, lineHeight: 15, marginTop: 28, textAlign: 'center' },
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
