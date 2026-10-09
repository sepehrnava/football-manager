import { StyleSheet, Text, View } from 'react-native';

import { formationLinks, linkScore } from '../game/links';
import { surname } from '../game/players';
import { chemistryBreakdown, starters } from '../game/team';
import type { FormationId, Player } from '../game/types';
import { useCareer } from '../state/GameContext';
import { Sheet } from '../ui/components';
import { colors } from '../ui/theme';
import { FORMATIONS } from '../game/constants';

const RED = '#E5484D';

export function linkColor(score: number) {
  return score >= 2 ? colors.green : score === 1 ? colors.orange : RED;
}

/** Coloured lines between neighbouring starters, drawn under the player tokens. */
export function LinkLines({
  xi,
  formation,
  width,
  height,
}: {
  xi: (Player | null)[];
  formation: FormationId;
  width: number;
  height: number;
}) {
  if (!width || !height) return null;
  const slots = FORMATIONS[formation].slots;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {formationLinks(formation).map(([a, b]) => {
        const score = linkScore(xi[a], xi[b]);
        const x1 = slots[a].x * width;
        const y1 = slots[a].y * height;
        const x2 = slots[b].x * width;
        const y2 = slots[b].y * height;
        const length = Math.hypot(x2 - x1, y2 - y1);
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const thick = score === 3 ? 5 : 4;
        return (
          <View
            key={`${a}-${b}`}
            style={{
              position: 'absolute',
              left: (x1 + x2) / 2 - length / 2,
              top: (y1 + y2) / 2 - thick / 2,
              width: length,
              height: thick,
              borderRadius: thick / 2,
              backgroundColor: linkColor(score),
              opacity: xi[a] && xi[b] ? 0.95 : 0.35,
              transform: [{ rotate: `${angle}rad` }],
            }}
          />
        );
      })}
    </View>
  );
}

/** A starter's links: who he is linked to and why. */
export function PlayerLinks({ player }: { player: Player }) {
  const { state } = useCareer();
  const xi = starters(state.squad, state.lineup);
  const slot = xi.findIndex((p) => p?.id === player.id);
  if (slot < 0) {
    return <Text style={s.hint}>On the bench: no links. Only the starting XI has chemistry.</Text>;
  }
  const mine = formationLinks(state.formation).filter(([a, b]) => a === slot || b === slot);
  return (
    <View style={s.links}>
      {mine.map(([a, b]) => {
        const other = xi[a === slot ? b : a];
        const score = linkScore(player, other);
        const together = other ? Math.min(2, player.seasonsAtClub, other.seasonsAtClub) : 0;
        const reasons = other
          ? [
              together ? `${together}${together === 2 ? '+' : ''} season${together > 1 ? 's' : ''} together` : 'new together',
              player.flag === other.flag ? 'same country' : null,
            ].filter(Boolean)
          : ['empty position'];
        return (
          <View key={`${a}-${b}`} style={s.linkRow}>
            <View style={[s.linkDot, { backgroundColor: linkColor(score) }]} />
            <Text style={s.linkName} numberOfLines={1}>
              {other ? `${other.flag} ${surname(other.name)}` : '—'}
            </Text>
            <Text style={s.linkWhy} numberOfLines={1}>
              {reasons.join(' · ')}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/** What team chemistry is, how links work, and how the team stands now. */
export function ChemistrySheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { state } = useCareer();
  if (!visible) return null;
  const c = chemistryBreakdown(state);
  const sign = c.bonus > 0 ? '+' : '';
  return (
    <Sheet visible title="Team chemistry" onClose={onClose}>
      <View style={s.top}>
        <Text style={[s.big, { color: c.team >= 80 ? colors.green : c.team >= 60 ? colors.gold : colors.orange }]}>
          {c.team}
        </Text>
        <View style={s.topText}>
          <Text style={s.effect}>
            {sign}
            {c.bonus} to attack and defence
          </Text>
          <Text style={s.hint}>The lines on the pitch link neighbouring players. Stronger links, better team.</Text>
        </View>
      </View>

      <Text style={s.section}>WHAT MAKES A LINK</Text>
      <View style={s.box}>
        <Text style={s.rule}>+1 for each season they have played together at your club (up to 2)</Text>
        <Text style={s.rule}>+1 if they are from the same country</Text>
        <View style={s.legend}>
          {[
            { score: 0, label: 'Red · 0' },
            { score: 1, label: 'Orange · 1' },
            { score: 2, label: 'Green · 2–3' },
          ].map((l) => (
            <View key={l.label} style={s.legendItem}>
              <View style={[s.legendLine, { backgroundColor: linkColor(l.score) }]} />
              <Text style={s.legendText}>{l.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <Text style={s.section}>YOUR XI</Text>
      <View style={s.box}>
        <View style={s.line}>
          <Text style={s.lineLabel}>
            Links: <Text style={{ color: colors.green }}>{c.counts[2] + c.counts[3]} green</Text>
            {' · '}
            <Text style={{ color: colors.orange }}>{c.counts[1]} orange</Text>
            {' · '}
            <Text style={{ color: RED }}>{c.counts[0]} red</Text>
          </Text>
          <Text style={s.lineValue}>{c.fromLinks}</Text>
        </View>
        <View style={s.line}>
          <Text style={s.lineLabel}>{c.captainIn ? 'Captain is playing' : 'Captain is not in the XI'}</Text>
          <Text style={[s.lineValue, { color: c.captainIn ? colors.green : colors.muted }]}>
            {c.captainIn ? '+10' : '+0'}
          </Text>
        </View>
        <View style={[s.line, s.total]}>
          <Text style={[s.lineLabel, s.bold]}>Team chemistry</Text>
          <Text style={[s.lineValue, s.bold]}>{c.team}</Text>
        </View>
      </View>
      <Text style={s.hint}>
        Tip: put players from the same country next to each other. New signings start with red links that turn
        green after a couple of seasons.
      </Text>
    </Sheet>
  );
}

const s = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  big: { fontSize: 52, fontWeight: '900' },
  topText: { flex: 1, gap: 2 },
  effect: { fontSize: 17, fontWeight: '900', color: colors.ink },
  hint: { fontSize: 13, color: colors.muted, fontWeight: '600', lineHeight: 18 },
  section: { fontSize: 12, fontWeight: '900', letterSpacing: 1.2, color: colors.muted, marginTop: 4 },
  box: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 4,
  },
  rule: { fontSize: 15, fontWeight: '700', color: colors.ink, paddingVertical: 2 },
  legend: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendLine: { width: 22, height: 5, borderRadius: 3 },
  legendText: { fontSize: 12, fontWeight: '800', color: colors.muted },
  line: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 10 },
  total: { borderTopWidth: 2, borderTopColor: colors.faint },
  lineLabel: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.ink },
  lineValue: { fontSize: 16, fontWeight: '900', color: colors.ink },
  bold: { color: colors.ink, fontWeight: '900' },
  links: { gap: 2 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  linkDot: { width: 18, height: 5, borderRadius: 3 },
  linkName: { fontSize: 15, fontWeight: '800', color: colors.ink, flexShrink: 1 },
  linkWhy: { flex: 1, textAlign: 'right', fontSize: 12, fontWeight: '700', color: colors.muted },
});
