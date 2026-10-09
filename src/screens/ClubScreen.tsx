import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { cupProgress } from '../game/cups';
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
import { matchInsight, userFixture } from '../game/insights';
import { compName, flagOf } from '../game/leagues';
import { userStrength, wageBill } from '../game/team';
import type { NewsItem } from '../game/types';
import { useCareer } from '../state/GameContext';
import {
  Button,
  Card,
  ClubCrest,
  Icon,
  ListRow,
  OddsBar,
  Section,
  Sheet,
  StatTile,
  Text,
  type IconName,
} from '../ui/components';
import { FadeIn } from '../ui/motion';
import { DISPLAY } from '../ui/text';
import { colors, formatFans, formatMoney, ordinal, seasonLabel } from '../ui/theme';
import { ChallengeBanner, DailyCard } from './Challenge';
import type { Tab } from './MainScreen';
import { MatchSheet } from './MatchSheet';
import { Roadmap } from './Roadmap';

/** Home: what's next, how the club stands, what needs attention, and the season path. */
export function ClubScreen({
  onPlay,
  onTab,
}: {
  /** Play until `state.round` reaches `until`; without it, play to the next stop. */
  onPlay: (until?: number) => void;
  onTab: (tab: Tab) => void;
}) {
  const { state } = useCareer();
  const [sheetRound, setSheetRound] = useState<number | null>(null);
  const [allNews, setAllNews] = useState(false);

  const table = compTable(state);
  const myRow = table.find((r) => r.clubId === USER_ID)!;
  const position = table.indexOf(myRow) + 1;
  const comp = userComp(state);
  const news = state.news ?? [];
  const power = userStrength(state).power;

  return (
    <ScrollView contentContainerStyle={s.content}>
      {state.challenge ? (
        <FadeIn>
          <ChallengeBanner />
        </FadeIn>
      ) : null}

      <FadeIn delay={30}>
        <NextUp onPlay={() => onPlay()} onPreview={() => setSheetRound(state.round)} onTransfers={() => onTab('transfers')} />
      </FadeIn>

      <FadeIn delay={80} style={s.tiles}>
        <StatTile
          icon="podium"
          label="League"
          value={myRow.played ? ordinal(position) : '–'}
          sub={`${myRow.points} pts`}
          onPress={() => onTab('league')}
        />
        <StatTile
          icon="account-group"
          label="Fans"
          value={formatFans(state.fans)}
          sub={`Wages ${formatMoney(wageBill(state.squad))}`}
          onPress={() => onTab('transfers')}
        />
        <StatTile icon="shield-half-full" label="Team" value={String(power)} sub="Power" onPress={() => onTab('squad')} />
      </FadeIn>

      <FadeIn delay={120}>
        <ToDo onTab={onTab} />
      </FadeIn>

      <FadeIn delay={160}>
        <Section title={`Season ${seasonLabel(state.season)}`} />
        <Card style={s.roadCard}>
          <View style={s.roadHead}>
            <Text style={s.roadTitle} numberOfLines={1}>
              {flagOf(comp.country)} {compName(comp)}
            </Text>
            <Text style={s.roadMeta}>
              {Math.min(state.round, seasonRounds(state))}/{seasonRounds(state)}
            </Text>
          </View>
          <Roadmap onRound={setSheetRound} onWindow={() => onTab('transfers')} onFinish={() => onTab('league')} />
        </Card>
      </FadeIn>

      {news.length ? (
        <FadeIn delay={200}>
          <Section title="Latest" action={news.length > 3 ? { label: 'See all', onPress: () => setAllNews(true) } : undefined} />
          <Card style={s.news}>
            {news.slice(0, 3).map((n, i) => (
              <NewsLine key={`${n.season}-${n.round}-${i}`} item={n} last={i === Math.min(news.length, 3) - 1} />
            ))}
          </Card>
        </FadeIn>
      ) : null}

      {!state.challenge ? (
        <FadeIn delay={240}>
          <DailyCard />
        </FadeIn>
      ) : null}

      <MatchSheet round={sheetRound} onClose={() => setSheetRound(null)} onPlayTo={onPlay} />
      {allNews ? (
        <Sheet visible title="News" onClose={() => setAllNews(false)}>
          <Card style={s.news}>
            {news.map((n, i) => (
              <NewsLine key={`${n.season}-${n.round}-${i}`} item={n} showWhen last={i === news.length - 1} />
            ))}
          </Card>
        </Sheet>
      ) : null}
    </ScrollView>
  );
}

/** The one big card: next opponent, the odds, and the main action. */
function NextUp({ onPlay, onPreview, onTransfers }: { onPlay: () => void; onPreview: () => void; onTransfers: () => void }) {
  const { state } = useCareer();
  const me = userClub(state);
  const fixture = userFixture(state, state.round);
  const inWindow = state.phase === 'window';
  if (!fixture) return null;
  const insight = matchInsight(state, fixture);
  const opp = clubById(state, insight.opponentId);

  return (
    <Card tone="dark" style={s.next}>
      <View style={s.nextTop}>
        {inWindow ? (
          <View style={s.windowPill}>
            <Icon name="swap-horizontal-bold" size={14} color={colors.night} />
            <Text style={s.windowPillText}>{state.window === 'pre' ? 'PRE-SEASON WINDOW' : 'MID-SEASON WINDOW'}</Text>
          </View>
        ) : (
          <Text style={s.nextKicker}>NEXT MATCH</Text>
        )}
        <Text style={s.nextMeta}>
          MD{state.round + 1} · {insight.home ? 'Home' : 'Away'}
        </Text>
      </View>

      <View style={s.vs}>
        <View style={s.side}>
          <ClubCrest club={me} size={54} />
          <Text style={s.sideName} numberOfLines={1}>
            {me.short}
          </Text>
        </View>
        <Text style={s.vsText}>VS</Text>
        <View style={s.side}>
          <ClubCrest club={opp} size={54} />
          <Text style={s.sideName} numberOfLines={1}>
            {opp.short}
          </Text>
        </View>
      </View>
      <Text style={s.oppName} numberOfLines={1}>
        {opp.name}
      </Text>

      <OddsBar {...insight.odds} dark />

      {inWindow ? (
        <Text style={s.nextHint}>Sign and sell players now. The window closes when you kick off.</Text>
      ) : null}
      <View style={s.nextButtons}>
        {inWindow ? (
          <Button label="Transfers" icon="swap-horizontal" variant="secondary" style={s.flex} onPress={onTransfers} />
        ) : (
          <Button label="Preview" icon="clipboard-text" variant="secondary" style={s.flex} onPress={onPreview} />
        )}
        <Button label={inWindow ? 'Kick off' : 'Play'} icon="play" style={s.flex} onPress={onPlay} />
      </View>
    </Card>
  );
}

/** Things worth a look, each one tap away. Hidden when there is nothing. */
function ToDo({ onTab }: { onTab: (tab: Tab) => void }) {
  const { state } = useCareer();
  const status = moneyStatus(state);
  const retiring = state.squad.filter((p) => p.retiring).length;
  const empty = state.lineup.filter((id) => !id).length;
  const items: { icon: IconName; color: string; title: string; sub: string; tab: Tab }[] = [];
  if (status !== 'ok') {
    items.push({
      icon: 'alert-circle',
      color: colors.red,
      title: status === 'warning' ? 'Final warning from the board' : 'The club is in debt',
      sub: MONEY_STATUS_TEXT[status],
      tab: 'transfers',
    });
  }
  if (state.offers.length) {
    items.push({
      icon: 'handshake',
      color: colors.green,
      title: `${state.offers.length} ${state.offers.length > 1 ? 'offers' : 'offer'} for your players`,
      sub: 'Sell or keep them in Transfers',
      tab: 'transfers',
    });
  }
  if (empty) {
    items.push({
      icon: 'account-alert',
      color: colors.orange,
      title: `${empty} empty ${empty > 1 ? 'places' : 'place'} in your XI`,
      sub: 'Pick players on the Squad tab',
      tab: 'squad',
    });
  }
  const inCups = (state.cups ?? []).filter((c) => {
    const p = cupProgress(c, USER_ID);
    return p && !p.out && !p.champion;
  });
  if (inCups.length) {
    items.push({
      icon: 'earth',
      color: colors.blue,
      title: `${inCups.some((c) => cupProgress(c, USER_ID)!.wins > 0) ? 'Still in' : 'Playing in'} the ${inCups.map((c) => c.name).join(' and ')}`,
      sub: 'See the draw on the League tab',
      tab: 'league',
    });
  }
  if (retiring) {
    items.push({
      icon: 'hand-wave',
      color: colors.orange,
      title: `${retiring} ${retiring > 1 ? 'players retire' : 'player retires'} after this season`,
      sub: 'Sell them in a window to get something back',
      tab: 'squad',
    });
  }
  if (!items.length) return null;
  return (
    <Card style={s.todo}>
      {items.map((it, i) => (
        <ListRow
          key={it.title}
          left={
            <View style={[s.todoIcon, { backgroundColor: `${it.color}1F` }]}>
              <Icon name={it.icon} size={18} color={it.color} />
            </View>
          }
          title={it.title}
          subtitle={it.sub}
          onPress={() => onTab(it.tab)}
          chevron
          last={i === items.length - 1}
        />
      ))}
    </Card>
  );
}

/** News items store an emoji; the UI shows a matching icon in a colour. */
const NEWS_ICONS: Record<string, { icon: IconName; color: string }> = {
  '⚽': { icon: 'soccer', color: colors.ink2 },
  '💥': { icon: 'lightning-bolt', color: colors.green },
  '😮': { icon: 'star-shooting', color: colors.goldDark },
  '😓': { icon: 'emoticon-sad-outline', color: colors.red },
  '🔝': { icon: 'arrow-up-bold', color: colors.green },
  '🌍': { icon: 'earth', color: colors.blue },
  '🏆': { icon: 'trophy', color: colors.goldDark },
  '🏁': { icon: 'flag-checkered', color: colors.ink2 },
  '⬆️': { icon: 'arrow-up-bold', color: colors.green },
  '⬇️': { icon: 'arrow-down-bold', color: colors.red },
  '👋': { icon: 'hand-wave', color: colors.orange },
};

function NewsLine({ item, showWhen, last }: { item: NewsItem; showWhen?: boolean; last?: boolean }) {
  const look = NEWS_ICONS[item.icon] ?? { icon: 'newspaper-variant' as IconName, color: colors.muted };
  return (
    <ListRow
      left={
        <View style={[s.todoIcon, { backgroundColor: `${look.color}1A` }]}>
          <Icon name={look.icon} size={17} color={look.color} />
        </View>
      }
      title={
        <Text style={s.newsText} numberOfLines={2}>
          {item.text}
        </Text>
      }
      subtitle={showWhen ? `${seasonLabel(item.season)} · matchday ${item.round}` : undefined}
      last={last}
    />
  );
}

const s = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32, gap: 12 },
  flex: { flex: 1 },
  next: { padding: 16, gap: 12 },
  nextTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nextKicker: { fontSize: 12, fontWeight: '800', letterSpacing: 1.2, color: colors.nightMuted },
  nextMeta: { fontSize: 13, fontWeight: '700', color: colors.nightMuted },
  windowPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#7EE2A0',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  windowPillText: { fontSize: 11, fontWeight: '800', color: colors.night, letterSpacing: 0.6 },
  vs: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 28 },
  side: { alignItems: 'center', gap: 6, width: 80 },
  sideName: { fontSize: 22, fontFamily: DISPLAY, fontWeight: '800', color: '#FFFFFF', letterSpacing: 1 },
  vsText: { fontSize: 30, fontFamily: DISPLAY, fontStyle: 'italic', color: colors.nightMuted },
  oppName: { textAlign: 'center', fontSize: 14, fontWeight: '600', color: colors.nightMuted, marginTop: -6 },
  nextHint: { fontSize: 13, fontWeight: '500', color: colors.nightMuted, textAlign: 'center' },
  nextButtons: { flexDirection: 'row', gap: 10 },
  tiles: { flexDirection: 'row', gap: 10 },
  todo: { padding: 0, overflow: 'hidden' },
  todoIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  roadCard: { paddingHorizontal: 0, paddingTop: 14, paddingBottom: 10, gap: 10, marginTop: 10 },
  roadHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, gap: 8 },
  roadTitle: { flex: 1, fontSize: 15, fontWeight: '800', color: colors.ink },
  roadMeta: { fontSize: 18, fontFamily: DISPLAY, fontWeight: '800', color: colors.muted },
  news: { padding: 0, overflow: 'hidden', marginTop: 10 },
  newsText: { fontSize: 14, fontWeight: '600', color: colors.ink, lineHeight: 19 },
});
