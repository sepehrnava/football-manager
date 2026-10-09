import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  clubById,
  compTable,
  MONEY_STATUS_TEXT,
  moneyStatus,
  seasonRounds,
  USER_ID,
  userClub,
  userComp,
} from '../game/game';
import { compName, flagOf } from '../game/leagues';
import { cupProgress } from '../game/cups';
import { matchInsight, percent, userFixture } from '../game/insights';
import { useCareer } from '../state/GameContext';
import { Card, ClubCrest, Sheet } from '../ui/components';
import { FadeIn } from '../ui/motion';
import { colors, ordinal, seasonLabel } from '../ui/theme';
import { ChallengeBanner, DailyCard } from './Challenge';
import type { NewsItem } from '../game/types';
import { MatchSheet } from './MatchSheet';
import { BuildSquadCard } from './BuildSquad';
import { Roadmap } from './Roadmap';

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
  const [sheetRound, setSheetRound] = useState<number | null>(null);
  const [allNews, setAllNews] = useState(false);
  const news = state.news ?? [];

  const club = userClub(state);
  const table = compTable(state);
  const myRow = table.find((r) => r.clubId === USER_ID)!;
  const position = table.indexOf(myRow) + 1;
  const status = moneyStatus(state);
  const retiring = state.squad.filter((p) => p.retiring).length;
  const next = userFixture(state, state.round);
  const inWindow = state.phase === 'window';

  let nextLine: string | null = null;
  if (next) {
    const insight = matchInsight(state, next);
    const opp = clubById(state, insight.opponentId);
    nextLine = `Next: ${opp.name} (${insight.home ? 'home' : 'away'}) · win chance ${percent(insight.odds.win)}`;
  }

  // Short notes, only when something needs attention.
  const notes: { text: string; onPress?: () => void; color?: string }[] = [];
  if (status !== 'ok') {
    notes.push({ text: `${status === 'warning' ? '🚨' : '⚠️'} ${MONEY_STATUS_TEXT[status]}`, color: colors.red });
  }
  const inCups = (state.cups ?? []).filter((c) => cupProgress(c, USER_ID) && !cupProgress(c, USER_ID)!.out);
  if (inCups.length) {
    notes.push({
      text: `🏆 ${inCups.map((c) => c.name).join(' and ')}: you are in, see the League tab ›`,
      onPress: onOpenLeague,
    });
  }
  if (state.offers.length) {
    notes.push({
      text: `📨 ${state.offers.length} ${state.offers.length > 1 ? 'offers' : 'offer'} for your players ›`,
      onPress: onOpenTransfers,
    });
  }
  if (retiring) {
    notes.push({
      text: `👋 ${retiring} ${retiring > 1 ? 'players retire' : 'player retires'} after this season ›`,
      onPress: onOpenSquad,
    });
  }

  return (
    <ScrollView contentContainerStyle={s.content}>
      <BuildSquadCard onFindPlayers={onOpenTransfers} />
      <FadeIn style={s.hero}>
        <ClubCrest club={club} size={56} />
        <View style={s.heroText}>
          <Text style={s.clubName} numberOfLines={1}>
            {club.name}
          </Text>
          <Text style={s.heroMeta}>
            Season {seasonLabel(state.season)}
            {` · ${flagOf(userComp(state).country)} ${compName(userComp(state))}`}
          </Text>
        </View>
        <View style={s.posBadge}>
          <Text style={s.posValue}>{myRow.played ? ordinal(position) : '–'}</Text>
          <Text style={s.posLabel}>{myRow.points} PTS</Text>
        </View>
      </FadeIn>

      {state.challenge ? (
        <FadeIn delay={30}>
          <ChallengeBanner />
        </FadeIn>
      ) : null}

      <FadeIn delay={60}>
        <Card style={s.roadCard}>
          <View style={s.roadHead}>
            <Text style={s.roadTitle}>Season roadmap</Text>
            <Text style={s.roadMeta}>
              {Math.min(state.round, seasonRounds(state))}/{seasonRounds(state)} played
            </Text>
          </View>
          <Roadmap onRound={setSheetRound} onWindow={onOpenTransfers} onFinish={onOpenLeague} />
        </Card>
      </FadeIn>

      <FadeIn delay={120}>
        <Card style={[s.action, inWindow && s.actionWindow]}>
          <Text style={s.actionTitle}>
            {inWindow ? 'Transfer window is open' : 'Ready for the next match'}
          </Text>
          {nextLine ? <Text style={s.actionText}>{nextLine}</Text> : null}
          <Text style={s.actionHint}>
            {inWindow ? 'Buy and sell in Transfers, then press Kick off below.' : 'Press Play below to continue.'}
          </Text>
        </Card>
      </FadeIn>

      {notes.map((n, i) => (
        <FadeIn key={n.text} delay={160 + i * 40}>
          <Text style={[s.note, n.color ? { color: n.color } : null]} onPress={n.onPress}>
            {n.text}
          </Text>
        </FadeIn>
      ))}

      {news.length ? (
        <FadeIn delay={180}>
          <Card style={s.news}>
            <View style={s.newsHead}>
              <Text style={s.newsTitle}>📰 Latest</Text>
              {news.length > 3 ? (
                <Text style={s.newsMore} onPress={() => setAllNews(true)}>
                  See all ›
                </Text>
              ) : null}
            </View>
            {news.slice(0, 3).map((n, i) => (
              <NewsLine key={`${n.season}-${n.round}-${i}`} item={n} />
            ))}
          </Card>
        </FadeIn>
      ) : null}

      {!state.challenge ? (
        <FadeIn delay={200}>
          <DailyCard />
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

function NewsLine({ item, showWhen }: { item: NewsItem; showWhen?: boolean }) {
  return (
    <View style={s.newsLine}>
      <Text style={s.newsIcon}>{item.icon}</Text>
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
  content: { padding: 16, paddingBottom: 40, gap: 14 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroText: { flex: 1 },
  clubName: { fontSize: 24, fontWeight: '900', color: colors.ink },
  heroMeta: { fontSize: 14, fontWeight: '700', color: colors.muted, marginTop: 2 },
  posBadge: {
    alignItems: 'center',
    backgroundColor: colors.ink,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  posValue: { color: '#FFFFFF', fontSize: 20, fontWeight: '900' },
  posLabel: { color: '#BDBDB6', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  roadCard: { paddingHorizontal: 0, paddingBottom: 12, gap: 10 },
  roadHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 16 },
  roadTitle: { fontSize: 18, fontWeight: '900', color: colors.ink },
  roadMeta: { fontSize: 13, fontWeight: '800', color: colors.muted },
  action: { gap: 6 },
  actionWindow: { backgroundColor: colors.greenSoft, borderColor: '#BFE6CC', borderBottomColor: '#9ED6B1' },
  actionTitle: { fontSize: 18, fontWeight: '900', color: colors.ink },
  actionText: { fontSize: 14, fontWeight: '700', color: colors.ink },
  actionHint: { fontSize: 13, fontWeight: '600', color: colors.muted },
  news: { gap: 8 },
  newsHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  newsTitle: { fontSize: 15, fontWeight: '900', color: colors.ink },
  newsMore: { fontSize: 13, fontWeight: '800', color: colors.blue },
  newsLine: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 2 },
  newsIcon: { fontSize: 16, width: 22, textAlign: 'center' },
  newsText: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.ink },
  newsWhen: { fontSize: 11, fontWeight: '800', color: colors.muted },
  note: { fontSize: 14, fontWeight: '800', color: colors.ink, paddingHorizontal: 6 },
});
