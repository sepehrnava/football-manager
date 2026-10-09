import { StyleSheet, View } from 'react-native';

import { cupProgress } from '../game/cups';
import { clubById, USER_ID } from '../game/game';
import type { Cup, CupTie } from '../game/types';
import { useCareer } from '../state/GameContext';
import { Card, ClubCrest, Icon, Tag, Text } from '../ui/components';
import { DISPLAY } from '../ui/text';
import { colors } from '../ui/theme';

/** One cup: every stage with its ties, the user's club highlighted. */
export function CupCard({ cup }: { cup: Cup }) {
  const { state } = useCareer();
  const mine = cupProgress(cup, USER_ID);
  const played = (t: CupTie) => !!t.winnerId;
  const stages = cup.stages.filter((st) => st.ties.length);
  const status = !mine
    ? { label: 'Not qualified', tone: 'muted' as const }
    : mine.champion
      ? { label: 'Winners', tone: 'gold' as const }
      : mine.out
        ? { label: 'Knocked out', tone: 'red' as const }
        : { label: 'Still in', tone: 'green' as const };
  return (
    <Card style={s.card}>
      <View style={s.head}>
        <Icon name="trophy" size={22} color={colors.goldDark} />
        <Text style={s.title} numberOfLines={1}>
          {cup.name}
        </Text>
        <Tag label={status.label} tone={status.tone} />
      </View>
      {stages.length === 0 ? <Text style={s.empty}>The draw is made after the first matchdays.</Text> : null}
      {stages.map((stage) => (
        <View key={stage.name} style={s.stage}>
          <Text style={s.stageName}>
            {stage.name} · after matchday {stage.afterRound}
          </Text>
          {stage.ties.map((t, i) => {
            const home = clubById(state, t.homeId);
            const away = clubById(state, t.awayId);
            const involved = t.homeId === USER_ID || t.awayId === USER_ID;
            return (
              <View key={i} style={[s.tie, i < stage.ties.length - 1 && s.rule, involved && s.tieMine]}>
                <ClubCrest club={home} size={18} />
                <Text style={[s.team, t.winnerId === t.homeId && s.won]} numberOfLines={1}>
                  {home.name}
                </Text>
                <Text style={[s.score, !played(t) && s.vs]}>
                  {played(t) ? `${t.result?.home}–${t.result?.away}${t.result?.pens ? 'p' : ''}` : 'v'}
                </Text>
                <Text style={[s.team, s.right, t.winnerId === t.awayId && s.won]} numberOfLines={1}>
                  {away.name}
                </Text>
                <ClubCrest club={away} size={18} />
              </View>
            );
          })}
        </View>
      ))}
    </Card>
  );
}

const s = StyleSheet.create({
  card: { gap: 10, paddingHorizontal: 0, paddingBottom: 6 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14 },
  title: { flex: 1, fontSize: 22, fontFamily: DISPLAY, fontWeight: '800', color: colors.ink },
  empty: { fontSize: 13, fontWeight: '500', color: colors.muted, paddingHorizontal: 14 },
  stage: { gap: 0 },
  stageName: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: colors.muted,
    textTransform: 'uppercase',
    paddingHorizontal: 14,
    paddingVertical: 4,
    backgroundColor: colors.inset,
  },
  tie: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 7, paddingHorizontal: 14 },
  rule: { borderBottomWidth: 1, borderBottomColor: colors.faint },
  tieMine: { backgroundColor: colors.goldSoft },
  team: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.ink2 },
  right: { textAlign: 'right' },
  won: { fontWeight: '800', color: colors.ink },
  score: { width: 52, textAlign: 'center', fontSize: 17, fontFamily: DISPLAY, fontWeight: '800', color: colors.ink },
  vs: { color: colors.muted },
});
