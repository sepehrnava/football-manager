import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { clubCrest, clubEconomy } from '../game/game';
import { compName, divisionsIn, flagOf, LEAGUE } from '../game/leagues';
import { Button, Crest, Pill, Sheet } from '../ui/components';
import { FadeIn } from '../ui/motion';
import { colors, formatMoney } from '../ui/theme';

export type Difficulty = 'Easy' | 'Normal' | 'Hard';

/** How strong a club is compared with the rest of its division, at a glance. */
export function clubTier(index: number) {
  const club = LEAGUE.clubs[index];
  const peers = LEAGUE.clubs.filter((c) => c.country === club.country && c.division === club.division);
  const levels = peers.map((c) => c.level);
  const min = Math.min(...levels);
  const max = Math.max(...levels);
  const stars = max === min ? 3 : 1 + Math.round(((club.level - min) / (max - min)) * 4);
  const rank = peers.indexOf(club) / peers.length; // clubs are sorted strongest first
  const top = club.division === 1;
  const tier = (label: string, difficulty: Difficulty, color: string) => ({ stars, label, difficulty, color });
  if (rank < 0.2) return tier(top ? 'Title favourites' : 'Promotion favourites', 'Easy', colors.green);
  if (rank < 0.5) return tier(top ? 'Contenders' : 'Promotion hopefuls', 'Normal', colors.ink);
  if (rank < 0.8) return tier('Mid-table', 'Normal', colors.ink);
  return tier(top && divisionsIn(club.country) > 1 ? 'Relegation fight' : 'Underdogs', 'Hard', colors.red);
}

export function Stars({ count }: { count: number }) {
  return (
    <Text style={s.stars}>
      {'★'.repeat(count)}
      <Text style={s.starsOff}>{'★'.repeat(5 - count)}</Text>
    </Text>
  );
}

/** What taking over a club means: budget, expectations and difficulty. */
export function PickedClub({ index }: { index: number }) {
  const c = LEAGUE.clubs[index];
  const eco = clubEconomy(c.level);
  const tier = clubTier(index);
  return (
    <View style={s.picked}>
      <Crest crest={clubCrest(index)} short={c.short} size={72} />
      <Text style={s.pickedMeta}>
        {flagOf(c.country)} {compName({ country: c.country, division: c.division })}
      </Text>
      <Stars count={tier.stars} />
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

const FILTERS: ('Any' | Difficulty)[] = ['Any', 'Easy', 'Normal', 'Hard'];
/** Pause before each step of the roll: quick at first, slowing down to a stop. */
const ROLL = [50, 50, 55, 60, 65, 75, 85, 100, 120, 145, 175, 215, 265];

/** Random club picker: a short slot-machine roll, then take the job or spin again. */
export function SpinSheet({
  visible,
  onClose,
  onManage,
}: {
  visible: boolean;
  onClose: () => void;
  onManage: (index: number) => void;
}) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('Any');
  const [shown, setShown] = useState<number | null>(null);
  const [rolling, setRolling] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tiers = useMemo(() => LEAGUE.clubs.map((_, i) => clubTier(i).difficulty), []);
  const pool = useMemo(
    () => LEAGUE.clubs.map((_, i) => i).filter((i) => filter === 'Any' || tiers[i] === filter),
    [filter, tiers],
  );

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  if (!visible) return null;

  const spin = () => {
    const pick = () => pool[Math.floor(Math.random() * pool.length)];
    setRolling(true);
    const step = (n: number) => {
      setShown(pick());
      if (n === ROLL.length) {
        setRolling(false);
        return;
      }
      timer.current = setTimeout(() => step(n + 1), ROLL[n]);
    };
    step(0);
  };

  const close = () => {
    if (timer.current) clearTimeout(timer.current);
    setRolling(false);
    setShown(null);
    onClose();
  };

  const landed = shown !== null && !rolling;
  const club = shown !== null ? LEAGUE.clubs[shown] : null;

  return (
    <Sheet visible title="Random club" onClose={close}>
      <View style={s.filters}>
        {FILTERS.map((f) => (
          <Pill
            key={f}
            label={f}
            active={filter === f}
            onPress={rolling ? undefined : () => setFilter(f)}
            color={f === 'Easy' ? colors.green : f === 'Hard' ? colors.red : undefined}
          />
        ))}
      </View>

      {landed && shown !== null ? (
        <FadeIn key={shown} from="scale" duration={320}>
          <Text style={s.spinName}>{club?.name}</Text>
          <PickedClub index={shown} />
        </FadeIn>
      ) : (
        <View style={s.reel}>
          {club && shown !== null ? (
            <>
              <Crest crest={clubCrest(shown)} short={club.short} size={72} />
              <Text style={s.reelName} numberOfLines={1}>
                {club.name}
              </Text>
            </>
          ) : (
            <Crest crest={{ primary: colors.border, secondary: colors.border, pattern: 'solid' }} short="?" size={72} />
          )}
        </View>
      )}

      <View style={s.spinActions}>
        {landed && shown !== null ? (
          <>
            <Button label={`MANAGE ${club!.name.toUpperCase()}`} variant="green" onPress={() => onManage(shown)} />
            <Button label="SPIN AGAIN" variant="light" onPress={spin} />
          </>
        ) : (
          <Button label="SPIN" variant="green" disabled={rolling} onPress={spin} />
        )}
      </View>
    </Sheet>
  );
}

const s = StyleSheet.create({
  stars: { fontSize: 13, fontWeight: '800', color: colors.gold, marginTop: 2 },
  starsOff: { color: colors.border },
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
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  spinName: { fontSize: 22, fontWeight: '900', color: colors.ink, textAlign: 'center', marginBottom: 8 },
  reel: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 190,
    marginBottom: 18,
    borderRadius: 22,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.borderDark,
    backgroundColor: colors.faint,
  },
  reelName: { fontSize: 17, fontWeight: '900', color: colors.ink, paddingHorizontal: 16 },
  spinActions: { gap: 10 },
});
