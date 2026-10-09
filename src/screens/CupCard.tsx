import { StyleSheet, Text, View } from 'react-native';

import { clubById, USER_ID } from '../game/game';
import { cupProgress } from '../game/cups';
import type { Cup, CupTie } from '../game/types';
import { useCareer } from '../state/GameContext';
import { Card, ClubCrest } from '../ui/components';
import { colors } from '../ui/theme';

/** One cup: every stage with its ties, the user's club highlighted. */
export function CupCard({ cup }: { cup: Cup }) {
  const { state } = useCareer();
  const mine = cupProgress(cup, USER_ID);
  const played = (t: CupTie) => !!t.winnerId;
  const stages = cup.stages.filter((s) => s.ties.length);
  return (
    <Card style={s.card}>
      <View style={s.head}>
        <Text style={s.title}>🏆 {cup.name}</Text>
        <Text style={[s.badge, mine ? s.badgeIn : null]}>
          {!mine ? 'Not qualified' : mine.champion ? 'Winners!' : mine.out ? 'Knocked out' : 'You are in'}
        </Text>
      </View>
      {stages.map((stage) => (
        <View key={stage.name} style={s.stage}>
          <Text style={s.stageName}>
            {stage.name.toUpperCase()} · after matchday {stage.afterRound}
          </Text>
          {stage.ties.map((t, i) => {
            const home = clubById(state, t.homeId);
            const away = clubById(state, t.awayId);
            const involved = t.homeId === USER_ID || t.awayId === USER_ID;
            return (
              <View key={i} style={[s.tie, involved && s.tieMine]}>
                <ClubCrest club={home} size={18} />
                <Text style={[s.team, t.winnerId === t.homeId && s.won]} numberOfLines={1}>
                  {home.name}
                </Text>
                <Text style={s.score}>
                  {played(t) ? `${t.result?.home}–${t.result?.away}${t.result?.pens ? ' p' : ''}` : 'v'}
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
  card: { gap: 10 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '900', color: colors.ink },
  badge: { fontSize: 12, fontWeight: '900', color: colors.muted },
  badgeIn: { color: colors.green },
  stage: { gap: 4 },
  stageName: { fontSize: 11, fontWeight: '900', letterSpacing: 1, color: colors.muted, marginTop: 4 },
  tie: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, paddingHorizontal: 6 },
  tieMine: { backgroundColor: colors.faint, borderRadius: 10, borderWidth: 2, borderColor: colors.ink },
  team: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.ink },
  right: { textAlign: 'right' },
  won: { fontWeight: '900' },
  score: { width: 52, textAlign: 'center', fontWeight: '900', color: colors.ink, fontSize: 13 },
});
