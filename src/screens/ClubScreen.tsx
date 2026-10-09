import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  clubById,
  compTable,
  MONEY_STATUS_TEXT,
  moneyStatus,
  seasonForecast,
  seasonRounds,
  USER_ID,
  userClub,
  userComp,
} from '../game/game';
import { compName } from '../game/leagues';
import { cupProgress } from '../game/cups';
import { matchInsight, percent, userFixture } from '../game/insights';
import { useCareer } from '../state/GameContext';
import { ClubCrest, Sheet } from '../ui/components';
import { FadeIn } from '../ui/motion';
import { colors, formatMoney, ordinal, seasonLabel } from '../ui/theme';
import { ChallengeBanner } from './Challenge';
import { DailyRow } from './StartHome';
import type { NewsItem } from '../game/types';
import { MatchSheet } from './MatchSheet';
import { BuildSquadCard } from './BuildSquad';
import { Roadmap } from './Roadmap';
import { MoneySheet } from './MoneySheet';
import { StaffSheet } from './StaffSheet';
import { useOffers } from './useOffers';

/** Home: the club, the season roadmap, and one card that says what to do next. */
export function ClubScreen({
  onPlay,
  onOpenTransfers,
  onOpenLeague,
  onOpenSquad,
}: {
  /** Play until `state.round` reaches `until`; without it, play to the next stop. */
  onPlay: (until?: number) => void;
  onOpenTransfers: () => void;
  onOpenLeague: () => void;
  onOpenSquad: () => void;
}) {
  const { state } = useCareer();
  const { offers } = useOffers();
  const [sheetRound, setSheetRound] = useState<number | null>(null);
  const [allNews, setAllNews] = useState(false);
  const [staffOpen, setStaffOpen] = useState(false);
  const [moneyOpen, setMoneyOpen] = useState(false);
  const news = state.news ?? [];

  const club = userClub(state);
  const table = compTable(state);
  const myRow = table.find((r) => r.clubId === USER_ID)!;
  const position = table.indexOf(myRow) + 1;
  const status = moneyStatus(state);
  const retiring = state.squad.filter((p) => p.retiring).length;
  const coachStars = state.staff?.coach?.stars ?? 0;
  const next = userFixture(state, state.round);

  // Short notes, only when something needs attention.
  const notes: { text: string; onPress?: () => void; color?: string }[] = [];
  if (status !== 'ok') notes.push({ text: MONEY_STATUS_TEXT[status], color: colors.red });
  const inCups = (state.cups ?? []).filter((c) => cupProgress(c, USER_ID) && !cupProgress(c, USER_ID)!.out);
  if (inCups.length) notes.push({ text: `Still in the ${inCups.map((c) => c.name).join(' and ')}`, onPress: onOpenLeague });
  if (offers.length) {
    notes.push({
      text: `${offers.length} ${offers.length > 1 ? 'offers' : 'offer'} for your players`,
      onPress: onOpenTransfers,
    });
  }
  if (retiring) {
    notes.push({
      text: `${retiring} ${retiring > 1 ? 'players retire' : 'player retires'} after this season`,
      onPress: onOpenSquad,
    });
  }

  return (
    <ScrollView contentContainerStyle={s.content}>
      <BuildSquadCard onFindPlayers={onOpenTransfers} />
      <FadeIn style={s.hero}>
        <ClubCrest club={club} size={52} />
        <View style={s.heroText}>
          <Text style={s.clubName} numberOfLines={1}>
            {club.name}
          </Text>
          <Text style={s.heroMeta} numberOfLines={1}>
            {compName(userComp(state))}
          </Text>
        </View>
        <View style={s.pos}>
          <Text style={s.posValue}>{myRow.played ? ordinal(position) : '–'}</Text>
          <Text style={s.posLabel}>{myRow.points} pts</Text>
        </View>
      </FadeIn>

      {state.challenge ? <ChallengeBanner /> : null}

      <FadeIn delay={60}>
        <View style={s.head}>
          <Text style={s.headText}>SEASON</Text>
          <Text style={s.headMeta}>
            {Math.min(state.round, seasonRounds(state))}/{seasonRounds(state)}
          </Text>
        </View>
        <Roadmap onRound={setSheetRound} onWindow={onOpenTransfers} onFinish={onOpenLeague} />
      </FadeIn>

      {next ? (
        <FadeIn delay={100}>
          <Text style={s.headText}>NEXT MATCH</Text>
          <NextMatch round={state.round} onPress={() => setSheetRound(state.round)} />
        </FadeIn>
      ) : null}

      {!state.challenge ? (
        <FadeIn delay={120}>
          <Text style={s.headText}>MONEY</Text>
          <MoneyRow onPress={() => setMoneyOpen(true)} />
        </FadeIn>
      ) : null}
      <MoneySheet visible={moneyOpen} onClose={() => setMoneyOpen(false)} />

      <FadeIn delay={140} style={s.list}>
          {notes.map((n) => (
            <Pressable
              key={n.text}
              onPress={n.onPress}
              disabled={!n.onPress}
              style={({ pressed }) => [s.note, pressed && { opacity: 0.6 }]}
            >
              <Text style={[s.noteText, n.color ? { color: n.color } : null]}>{n.text}</Text>
              {n.onPress ? <Text style={s.chevron}>›</Text> : null}
            </Pressable>
          ))}
        <Pressable
          onPress={() => setStaffOpen(true)}
          accessibilityRole="button"
          style={({ pressed }) => [s.note, pressed && { opacity: 0.6 }]}
        >
          <Text style={s.noteText}>Staff</Text>
          <Text style={s.stars}>
            {'★'.repeat(coachStars)}
            <Text style={s.starsOff}>{'★'.repeat(5 - coachStars)}</Text>
          </Text>
          <Text style={s.chevron}>›</Text>
        </Pressable>
        {!state.challenge ? <DailyRow compact /> : null}
      </FadeIn>
      <StaffSheet visible={staffOpen} onClose={() => setStaffOpen(false)} />

      {news.length ? (
        <FadeIn delay={180}>
          <View style={s.head}>
            <Text style={s.headText}>NEWS</Text>
            {news.length > 3 ? (
              <Text style={s.more} onPress={() => setAllNews(true)}>
                See all
              </Text>
            ) : null}
          </View>
          {news.slice(0, 3).map((n, i) => (
            <NewsLine key={`${n.season}-${n.round}-${i}`} item={n} />
          ))}
        </FadeIn>
      ) : null}

      <MatchSheet round={sheetRound} onClose={() => setSheetRound(null)} onPlayTo={onPlay} />
      {allNews ? (
        <Sheet visible title="News" onClose={() => setAllNews(false)}>
          {news.map((n, i) => (
            <NewsLine key={`${n.season}-${n.round}-${i}`} item={n} showWhen />
          ))}
        </Sheet>
      ) : null}
    </ScrollView>
  );
}

/** Money now, at season end and safe to spend, in one tappable row. Opens the breakdown. */
function MoneyRow({ onPress }: { onPress: () => void }) {
  const { state } = useCareer();
  const f = seasonForecast(state);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Season money forecast"
      style={({ pressed }) => [s.match, pressed && { opacity: 0.6 }]}
    >
      <Figure label="NOW" value={formatMoney(f.now)} />
      <Figure label="SEASON END" value={`~${formatMoney(f.end)}`} color={f.end < 0 ? colors.red : colors.ink} />
      <Figure label="SAFE TO SPEND" value={formatMoney(f.safeToSpend)} color={colors.green} />
      <Text style={s.chevron}>›</Text>
    </Pressable>
  );
}

function Figure({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={s.figure}>
      <Text style={[s.figureValue, color ? { color } : null]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={s.figureLabel}>{label}</Text>
    </View>
  );
}

/** The next fixture as one row: opponent, venue and the chance to win. Opens the match sheet. */
function NextMatch({ round, onPress }: { round: number; onPress: () => void }) {
  const { state } = useCareer();
  const f = userFixture(state, round);
  if (!f) return null;
  const insight = matchInsight(state, f);
  const opp = clubById(state, insight.opponentId);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Next match against ${opp.name}`}
      style={({ pressed }) => [s.match, pressed && { opacity: 0.6 }]}
    >
      <ClubCrest club={opp} size={36} />
      <View style={s.heroText}>
        <Text style={s.matchName} numberOfLines={1}>
          {opp.name}
        </Text>
        <Text style={s.matchMeta}>
          {insight.home ? 'Home' : 'Away'} · Matchday {round + 1}
        </Text>
      </View>
      <View style={s.pos}>
        <Text style={s.matchOdds}>{percent(insight.odds.win)}</Text>
        <Text style={s.posLabel}>to win</Text>
      </View>
      <Text style={s.chevron}>›</Text>
    </Pressable>
  );
}

function NewsLine({ item, showWhen }: { item: NewsItem; showWhen?: boolean }) {
  return (
    <View style={s.newsLine}>
      <Text style={s.newsText}>{item.text}</Text>
      {showWhen ? (
        <Text style={s.newsWhen}>
          {seasonLabel(item.season)} · MD{item.round}
        </Text>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40, gap: 22 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  heroText: { flex: 1 },
  clubName: { fontSize: 24, fontWeight: '900', color: colors.ink },
  heroMeta: { fontSize: 14, fontWeight: '700', color: colors.muted, marginTop: 2 },
  pos: { alignItems: 'flex-end' },
  posValue: { fontSize: 26, fontWeight: '900', color: colors.ink },
  posLabel: { fontSize: 12, fontWeight: '700', color: colors.muted },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 },
  headText: { fontSize: 12, fontWeight: '900', letterSpacing: 1.5, color: colors.muted },
  headMeta: { fontSize: 13, fontWeight: '800', color: colors.muted },
  more: { fontSize: 13, fontWeight: '800', color: colors.ink },
  match: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 14,
  },
  matchName: { fontSize: 17, fontWeight: '900', color: colors.ink },
  matchMeta: { fontSize: 13, fontWeight: '700', color: colors.muted, marginTop: 1 },
  matchOdds: { fontSize: 20, fontWeight: '900', color: colors.ink },
  figure: { flex: 1, alignItems: 'center', gap: 2 },
  figureValue: { fontSize: 16, fontWeight: '900', color: colors.ink },
  figureLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 0.8, color: colors.muted },
  list: { borderTopWidth: 1, borderTopColor: colors.border },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  noteText: { flex: 1, fontSize: 15, fontWeight: '800', color: colors.ink },
  stars: { fontSize: 13, color: colors.gold },
  starsOff: { color: colors.border },
  chevron: { fontSize: 24, fontWeight: '900', color: colors.borderDark, marginLeft: 8 },
  newsLine: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  newsText: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.ink },
  newsWhen: { fontSize: 11, fontWeight: '800', color: colors.muted },
});
