import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { BENCH_SIZE, FORMATION_IDS, FORMATIONS } from '../game/constants';
import { userClub } from '../game/game';
import { lineOf, playerValue, ratingAt, surname, trend } from '../game/players';
import { benchFor, starters, userStrength, wageBill } from '../game/team';
import type { FormationId, Line, Player, Position, StaffRole } from '../game/types';
import { useCareer } from '../state/GameContext';
import {
  Button,
  Card,
  Chip,
  ChipScroll,
  Icon,
  ListRow,
  penaltyTone,
  PosTags,
  RatingBadge,
  Section,
  Segmented,
  Sheet,
  Tag,
  Text,
  TrendTag,
} from '../ui/components';
import { animateNextLayout, FadeIn } from '../ui/motion';
import { DISPLAY } from '../ui/text';
import { colors, formatMoney, shadow } from '../ui/theme';
import { TACTIC_OPTIONS } from './MatchSheet';
import { PlayerSheet } from './PlayerSheet';
import { StaffPanel, StaffSheet } from './StaffSheet';

type View_ = 'lineup' | 'players' | 'staff';

const LINE_ORDER: Record<Line, number> = { GK: 0, DF: 1, MD: 2, AT: 3 };

/** What the user tapped first: a position on the pitch or a player off it. */
type Selection = { kind: 'slot'; index: number } | { kind: 'player'; id: string } | null;

function fitColor(drop: number) {
  return drop <= 0 ? colors.green : penaltyTone(drop) === 'red' ? colors.red : colors.orange;
}

export function SquadScreen() {
  const { state } = useCareer();
  const [view, setView] = useState<View_>('lineup');
  const [detail, setDetail] = useState<string | null>(null);
  const [staffRole, setStaffRole] = useState<StaffRole | null>(null);
  const [sel, setSel] = useState<Selection>(null);

  return (
    <View style={s.screen}>
      <View style={s.top}>
        <Segmented
          options={[
            { id: 'lineup', label: 'Lineup', icon: 'soccer-field' },
            { id: 'players', label: `Players ${state.squad.length}`, icon: 'account-group' },
            { id: 'staff', label: 'Staff', icon: 'whistle' },
          ]}
          value={view}
          onChange={(v) => {
            setSel(null);
            setView(v);
          }}
        />
      </View>

      {view === 'lineup' ? <LineupView sel={sel} setSel={setSel} onDetails={setDetail} /> : null}
      {view === 'players' ? (
        <FadeIn key="players" style={s.flex}>
          <PlayersView onOpen={setDetail} />
        </FadeIn>
      ) : null}
      {view === 'staff' ? (
        <FadeIn key="staff" style={s.flex}>
          <ScrollView contentContainerStyle={s.content}>
            <StaffPanel onChange={setStaffRole} />
          </ScrollView>
        </FadeIn>
      ) : null}

      <PlayerSheet playerId={detail} mode="squad" onClose={() => setDetail(null)} />
      <StaffSheet role={staffRole} onClose={() => setStaffRole(null)} />
    </View>
  );
}

/* ------------------------------------------------------------------- lineup */

function LineupView({
  sel,
  setSel,
  onDetails,
}: {
  sel: Selection;
  setSel: (s: Selection) => void;
  onDetails: (id: string) => void;
}) {
  const { state, dispatch } = useCareer();
  const [formationOpen, setFormationOpen] = useState(false);
  const strength = userStrength(state);
  const xi = starters(state.squad, state.lineup);
  const bench = benchFor(state.squad, state.lineup, BENCH_SIZE);
  const reserves = state.squad
    .filter((p) => !state.lineup.includes(p.id) && !bench.includes(p))
    .sort((a, b) => LINE_ORDER[lineOf(a)] - LINE_ORDER[lineOf(b)] || b.rating - a.rating);
  const formation = FORMATIONS[state.formation];
  const kit = userClub(state).crest;

  const assign = (slot: number, playerId: string) => {
    animateNextLayout();
    dispatch({ type: 'assign', slot, playerId });
    setSel(null);
  };

  // First tap selects; a second tap on another position swaps them, and a tap
  // on a bench player (before or after) brings that player on.
  const tapSlot = (i: number) => {
    if (sel?.kind === 'player') return assign(i, sel.id);
    if (sel?.kind === 'slot') {
      if (sel.index === i) return setSel(null);
      const from = state.lineup[sel.index];
      const to = state.lineup[i];
      if (from) return assign(i, from);
      if (to) return assign(sel.index, to);
      return setSel({ kind: 'slot', index: i });
    }
    setSel({ kind: 'slot', index: i });
  };
  const tapPlayer = (id: string) => {
    if (sel?.kind === 'slot') return assign(sel.index, id);
    setSel(sel?.kind === 'player' && sel.id === id ? null : { kind: 'player', id });
  };

  const targetPos: Position | undefined = sel?.kind === 'slot' ? formation.slots[sel.index].pos : undefined;
  const selectedPlayer =
    sel?.kind === 'player' ? state.squad.find((p) => p.id === sel.id) : sel?.kind === 'slot' ? xi[sel.index] : null;

  return (
    <View style={s.flex}>
      <ScrollView contentContainerStyle={[s.content, sel && s.contentWithBar]}>
        <View style={s.controls}>
          <Pressable
            onPress={() => setFormationOpen(true)}
            style={({ pressed }) => [s.formation, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
            accessibilityLabel={`Formation ${state.formation}`}
          >
            <Text style={s.formationText}>{state.formation}</Text>
            <Icon name="chevron-down" size={18} color={colors.ink2} />
          </Pressable>
          <Button
            label="Best XI"
            icon="auto-fix"
            variant="secondary"
            size="sm"
            style={s.flex}
            onPress={() => {
              animateNextLayout();
              dispatch({ type: 'autoPick' });
              setSel(null);
            }}
          />
        </View>
        <Segmented options={TACTIC_OPTIONS} value={state.tactic} onChange={(t) => dispatch({ type: 'tactic', tactic: t })} />

        <View style={s.pitchCard}>
          <View style={s.strength}>
            <Strength label="ATT" value={strength.attack} />
            <Strength label="DEF" value={strength.defense} />
            <Strength label="CHEM" value={strength.chemistry} />
            <Strength label="POWER" value={strength.power} strong />
          </View>
          <View style={s.pitch}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <View key={i} style={[s.stripe, { top: `${(i * 100) / 6}%` }, i % 2 === 1 && s.stripeAlt]} />
            ))}
            <View style={s.boxTop} />
            <View style={s.halfway} />
            <View style={s.circle} />
            <View style={s.boxBottom} />
            {formation.slots.map((sl, i) => {
              const p = xi[i];
              const r = p ? ratingAt(p, sl.pos) : 0;
              const drop = p ? p.rating - r : 0;
              const selected = sel?.kind === 'slot' && sel.index === i;
              return (
                <Pressable
                  key={i}
                  onPress={() => tapSlot(i)}
                  accessibilityLabel={
                    p
                      ? `${sl.pos}: ${p.name}, ${r}${drop > 0 ? `, out of position −${drop}` : ', natural position'}`
                      : `Empty ${sl.pos} slot`
                  }
                  style={[s.token, { left: `${sl.x * 100}%`, top: `${sl.y * 100}%` }]}
                >
                  {p ? (
                    <>
                      <View
                        style={[
                          s.shirt,
                          { backgroundColor: kit.primary, borderColor: kit.secondary },
                          selected && s.selected,
                        ]}
                      >
                        <Text style={s.shirtPos}>{sl.pos}</Text>
                      </View>
                      <View style={s.tokenRating}>
                        <RatingBadge value={r} size={24} tone={penaltyTone(drop)} />
                      </View>
                      {state.captainId === p.id ? (
                        <View style={s.captain}>
                          <Text style={s.captainText}>C</Text>
                        </View>
                      ) : null}
                      {drop > 0 ? (
                        <View style={[s.fit, { backgroundColor: fitColor(drop) }]}>
                          <Text style={s.fitText}>−{drop}</Text>
                        </View>
                      ) : null}
                      <View style={[s.nameChip, p.retiring && s.nameChipRetiring]}>
                        <Text style={s.tokenName} numberOfLines={1}>
                          {surname(p.name)}
                        </Text>
                      </View>
                    </>
                  ) : (
                    <>
                      <View style={[s.empty, selected && s.selected]}>
                        <Icon name="plus" size={18} color="#FFFFFF" />
                      </View>
                      <View style={s.nameChip}>
                        <Text style={s.tokenName}>{sl.pos}</Text>
                      </View>
                    </>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
        <Text style={s.legend}>Tap a player, then another position or a substitute to swap.</Text>

        <Section title={`Substitutes · ${bench.length}/${BENCH_SIZE}`} />
        <BenchStrip players={bench} target={targetPos} sel={sel} onTap={tapPlayer} />
        {reserves.length ? (
          <>
            <Section title={`Not in the matchday squad · ${reserves.length}`} />
            <BenchStrip players={reserves} target={targetPos} sel={sel} onTap={tapPlayer} />
          </>
        ) : null}
      </ScrollView>

      {sel ? (
        <FadeIn key={sel.kind === 'slot' ? `s${sel.index}` : sel.id} style={s.bar} distance={16} duration={160}>
          <Icon name="swap-vertical" size={22} color={colors.gold} />
          <Text style={s.barText} numberOfLines={2}>
            {sel.kind === 'player'
              ? `Bring on ${surname(selectedPlayer?.name ?? '')}: tap a position`
              : selectedPlayer
                ? `Swap ${surname(selectedPlayer.name)}: tap a sub or a position`
                : `Fill ${targetPos}: tap a substitute`}
          </Text>
          {selectedPlayer ? (
            <Pressable onPress={() => onDetails(selectedPlayer.id)} style={s.barButton} accessibilityRole="button">
              <Icon name="account-details" size={20} color="#FFFFFF" />
            </Pressable>
          ) : null}
          <Pressable onPress={() => setSel(null)} style={s.barButton} accessibilityRole="button" accessibilityLabel="Cancel">
            <Icon name="close" size={20} color="#FFFFFF" />
          </Pressable>
        </FadeIn>
      ) : null}

      {formationOpen ? (
        <FormationSheet
          value={state.formation}
          onPick={(f) => {
            animateNextLayout();
            dispatch({ type: 'formation', formation: f });
            setFormationOpen(false);
          }}
          onClose={() => setFormationOpen(false)}
        />
      ) : null}
    </View>
  );
}

function Strength({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <View style={s.strengthItem}>
      <Text style={[s.strengthValue, strong && { color: colors.gold }]}>{value}</Text>
      <Text style={s.strengthLabel}>{label}</Text>
    </View>
  );
}

/** Substitutes (or reserves) as a row of tokens; shows the fit for a selected position. */
function BenchStrip({
  players,
  target,
  sel,
  onTap,
}: {
  players: Player[];
  target?: Position;
  sel: Selection;
  onTap: (id: string) => void;
}) {
  const { state } = useCareer();
  const kit = userClub(state).crest;
  return (
    <ChipScroll style={s.bench}>
      {players.map((p) => {
        const r = target ? ratingAt(p, target) : p.rating;
        const drop = p.rating - r;
        const on = sel?.kind === 'player' && sel.id === p.id;
        return (
          <Pressable
            key={p.id}
            onPress={() => onTap(p.id)}
            accessibilityRole="button"
            accessibilityLabel={`Squad player ${p.name}`}
            accessibilityState={{ selected: on }}
            style={({ pressed }) => [s.benchCard, on && s.benchCardOn, pressed && { opacity: 0.8 }]}
          >
            <View style={[s.benchShirt, { backgroundColor: kit.primary, borderColor: kit.secondary }]}>
              <Text style={s.shirtPos}>{p.positions[0]}</Text>
            </View>
            <View style={s.benchRating}>
              <RatingBadge value={r} size={22} tone={target ? penaltyTone(drop) : undefined} />
            </View>
            <Text style={s.benchName} numberOfLines={1}>
              {surname(p.name)}
            </Text>
            <Text style={s.benchMeta}>
              {target && drop > 0 ? `−${drop} at ${target}` : `Age ${p.age}`}
            </Text>
            {p.retiring ? <Tag label="LAST SEASON" tone="red" /> : p.listed ? <Tag label="FOR SALE" tone="blue" /> : null}
          </Pressable>
        );
      })}
    </ChipScroll>
  );
}

function FormationSheet({
  value,
  onPick,
  onClose,
}: {
  value: FormationId;
  onPick: (f: FormationId) => void;
  onClose: () => void;
}) {
  return (
    <Sheet visible title="Formation" subtitle="Your players move to the closest positions" onClose={onClose}>
      <View style={s.formGrid}>
        {FORMATION_IDS.map((id) => (
          <Pressable
            key={id}
            onPress={() => onPick(id)}
            accessibilityRole="button"
            accessibilityLabel={`Formation ${id}`}
            accessibilityState={{ selected: id === value }}
            style={({ pressed }) => [s.formCard, id === value && s.formCardOn, pressed && { opacity: 0.8 }]}
          >
            <View style={s.mini}>
              <View style={s.miniHalf} />
              {FORMATIONS[id].slots.map((sl, i) => (
                <View key={i} style={[s.miniDot, { left: `${sl.x * 100}%`, top: `${sl.y * 100}%` }]} />
              ))}
            </View>
            <Text style={s.formName}>{id}</Text>
          </Pressable>
        ))}
      </View>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ players */

const LINES: { id: Line | 'ALL'; label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'GK', label: 'Goalkeepers' },
  { id: 'DF', label: 'Defenders' },
  { id: 'MD', label: 'Midfielders' },
  { id: 'AT', label: 'Attackers' },
];

function PlayersView({ onOpen }: { onOpen: (id: string) => void }) {
  const { state } = useCareer();
  const [line, setLine] = useState<Line | 'ALL'>('ALL');
  const bench = new Set(benchFor(state.squad, state.lineup, BENCH_SIZE).map((p) => p.id));
  const list = state.squad
    .filter((p) => line === 'ALL' || lineOf(p) === line)
    .sort((a, b) => LINE_ORDER[lineOf(a)] - LINE_ORDER[lineOf(b)] || b.rating - a.rating);
  const avgAge = state.squad.reduce((a, p) => a + p.age, 0) / Math.max(1, state.squad.length);

  return (
    <ScrollView contentContainerStyle={s.content}>
      <View style={s.summary}>
        <SummaryItem label="Players" value={String(state.squad.length)} />
        <SummaryItem label="Avg age" value={avgAge.toFixed(1)} />
        <SummaryItem label="Wages / season" value={formatMoney(wageBill(state.squad))} />
      </View>
      <ChipScroll>
        {LINES.map((l) => (
          <Chip key={l.id} label={l.label} active={line === l.id} onPress={() => setLine(l.id)} />
        ))}
      </ChipScroll>
      <Card style={s.list}>
        {list.map((p, i) => {
          const role = state.lineup.includes(p.id) ? 'XI' : bench.has(p.id) ? 'SUB' : null;
          return (
            <ListRow
              key={p.id}
              left={<RatingBadge value={p.rating} size={38} />}
              title={`${p.flag} ${p.name}`}
              subtitle={
                <View style={s.rowMeta}>
                  <PosTags positions={p.positions} size={11} />
                  <Text style={s.rowAge}>{p.age}y</Text>
                  <TrendTag trend={trend(p)} size={10} />
                </View>
              }
              right={
                <View style={s.rowRight}>
                  <View style={s.rowTags}>
                    {state.captainId === p.id ? <Tag label="C" tone="dark" /> : null}
                    {p.listed ? <Tag label="FOR SALE" tone="blue" /> : null}
                    {role ? <Tag label={role} tone={role === 'XI' ? 'green' : 'muted'} /> : null}
                  </View>
                  <Text style={s.rowValue}>{formatMoney(playerValue(p))}</Text>
                </View>
              }
              onPress={() => onOpen(p.id)}
              accessibilityLabel={`Squad player ${p.name}`}
              last={i === list.length - 1}
            />
          );
        })}
      </Card>
      <Text style={s.legend}>Tap a player to sell, list or make captain.</Text>
    </ScrollView>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.summaryItem}>
      <Text style={s.summaryValue}>{value}</Text>
      <Text style={s.summaryLabel}>{label}</Text>
    </View>
  );
}

const TOKEN_W = 76;

const s = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  top: { paddingHorizontal: 16, paddingBottom: 4 },
  content: { padding: 16, paddingTop: 10, paddingBottom: 32, gap: 12 },
  contentWithBar: { paddingBottom: 110 },
  controls: { flexDirection: 'row', gap: 10 },
  formation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 6,
    backgroundColor: colors.ink,
  },
  formationText: { fontSize: 20, fontFamily: DISPLAY, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.5 },
  pitchCard: { borderRadius: 8, overflow: 'hidden', backgroundColor: colors.night },
  strength: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 8 },
  strengthItem: { flex: 1, alignItems: 'center' },
  strengthValue: { fontSize: 22, fontFamily: DISPLAY, fontWeight: '800', color: '#FFFFFF' },
  strengthLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1, color: colors.nightMuted },
  pitch: { backgroundColor: colors.pitch, aspectRatio: 0.82, width: '100%', overflow: 'hidden' },
  stripe: { position: 'absolute', left: 0, right: 0, height: `${100 / 6}%` },
  stripeAlt: { backgroundColor: colors.pitchStripe },
  boxTop: {
    position: 'absolute',
    top: -2,
    left: '28%',
    right: '28%',
    height: '13%',
    borderWidth: 2,
    borderColor: colors.pitchLine,
  },
  boxBottom: {
    position: 'absolute',
    bottom: -2,
    left: '28%',
    right: '28%',
    height: '13%',
    borderWidth: 2,
    borderColor: colors.pitchLine,
  },
  halfway: { position: 'absolute', top: '50%', left: 0, right: 0, height: 2, backgroundColor: colors.pitchLine },
  circle: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 90,
    height: 90,
    marginLeft: -45,
    marginTop: -45,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: colors.pitchLine,
  },
  token: { position: 'absolute', width: TOKEN_W, marginLeft: -TOKEN_W / 2, marginTop: -26, alignItems: 'center' },
  shirt: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
  shirtPos: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: DISPLAY,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowRadius: 2,
    textShadowOffset: { width: 0, height: 1 },
  },
  selected: { borderColor: colors.gold, borderWidth: 4, transform: [{ scale: 1.12 }] },
  tokenRating: { position: 'absolute', top: -6, right: 6 },
  captain: {
    position: 'absolute',
    top: -4,
    left: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  captainText: { color: '#FFFFFF', fontSize: 12, fontFamily: DISPLAY, fontWeight: '800' },
  fit: {
    position: 'absolute',
    top: 28,
    left: 8,
    minWidth: 22,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fitText: { color: '#FFFFFF', fontSize: 12, fontFamily: DISPLAY, fontWeight: '800' },
  nameChip: {
    marginTop: 3,
    backgroundColor: 'rgba(8,20,12,0.55)',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
    maxWidth: TOKEN_W,
  },
  nameChipRetiring: { backgroundColor: colors.red },
  tokenName: { color: '#FFFFFF', fontWeight: '700', fontSize: 11 },
  empty: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.85)',
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  legend: { color: colors.muted, fontWeight: '500', fontSize: 13, textAlign: 'center' },
  bench: { paddingVertical: 4 },
  benchCard: {
    width: 92,
    alignItems: 'center',
    gap: 3,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  benchCardOn: { borderColor: colors.gold, borderWidth: 2, backgroundColor: colors.goldSoft },
  benchShirt: { width: 38, height: 38, borderRadius: 19, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  benchRating: { position: 'absolute', top: 6, right: 8 },
  benchName: { fontSize: 13, fontWeight: '700', color: colors.ink, marginTop: 2 },
  benchMeta: { fontSize: 11, fontWeight: '600', color: colors.muted },
  bar: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.night,
    borderRadius: 8,
    paddingVertical: 10,
    paddingLeft: 14,
    paddingRight: 8,
    ...shadow.float,
  },
  barText: { flex: 1, color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  barButton: {
    width: 38,
    height: 38,
    borderRadius: 6,
    backgroundColor: colors.night3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  formCard: {
    width: '31%',
    flexGrow: 1,
    alignItems: 'center',
    gap: 6,
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  formCardOn: { borderColor: colors.ink, borderWidth: 2.5 },
  mini: { width: '100%', aspectRatio: 0.82, backgroundColor: colors.pitch, borderRadius: 4, overflow: 'hidden' },
  miniHalf: { position: 'absolute', top: '50%', left: 0, right: 0, height: 1.5, backgroundColor: colors.pitchLine },
  miniDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    marginLeft: -5,
    marginTop: -5,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },
  formName: { fontSize: 20, fontFamily: DISPLAY, fontWeight: '800', color: colors.ink },
  summary: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: 8, borderWidth: 1, borderColor: colors.border, paddingVertical: 10 },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: 22, fontFamily: DISPLAY, fontWeight: '800', color: colors.ink },
  summaryLabel: { fontSize: 11, fontWeight: '600', color: colors.muted },
  list: { padding: 0, overflow: 'hidden' },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowAge: { fontSize: 12, fontWeight: '600', color: colors.muted },
  rowRight: { alignItems: 'flex-end', gap: 4 },
  rowTags: { flexDirection: 'row', gap: 4 },
  rowValue: { fontSize: 12, fontWeight: '600', color: colors.muted },
});
