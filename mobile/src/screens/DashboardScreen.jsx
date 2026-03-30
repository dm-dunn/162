import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useLeaderboard } from '../hooks/useLeaderboard';
import { useGames } from '../hooks/useGames';
import { usePicks } from '../hooks/usePicks';
import { useLeagues } from '../hooks/useLeagues';
import { useLeagueLeaderboards } from '../hooks/useLeagueLeaderboards';
import GameCard from '../components/game/GameCard';
import api from '../services/api';
import { mockGames, mockPicks, USE_MOCK_DATA } from '../utils/mockData';

// Warm grayscale for other users' indicator bars — fits the parchment palette
const OTHERS_BAR_COLOR = '#9A8878';

const C = {
  cream: '#F4E9D0',
  creamDark: '#E8D9B8',
  creamDeep: '#D4C098',
  parchment: '#F9F3E3',
  red: '#C41E3A',
  redDark: '#9E1730',
  navy: '#0D1B4F',
  navyMid: '#1A2F6E',
  gold: '#C4912A',
  goldLight: '#E8B84B',
  brown: '#3D2112',
  ink: '#1A0F08',
  inkMid: '#4A3728',
  inkLight: '#7A6050',
  green: '#2E6B3E',
  white: '#FFFFFF',
};

export default function DashboardScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { leaderboard, loading: lbLoading } = useLeaderboard();
  const { games: apiGames, loading: gamesLoading, refetch: refetchGames } = useGames();
  const { picks: apiPicks, loading: picksLoading, refetch: refetchPicks } = usePicks();
  const { leagues } = useLeagues();
  const { leagueLeaderboards } = useLeagueLeaderboards(leagues);

  const [localPicks, setLocalPicks] = useState(mockPicks);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [standingsPage, setStandingsPage] = useState(0);
  const [standingsScrollWidth, setStandingsScrollWidth] = useState(0);

  const games = USE_MOCK_DATA ? mockGames : apiGames;
  const picks = USE_MOCK_DATA ? localPicks : apiPicks;

  const userStats = leaderboard.find(e => e.user_id === user.id);
  const pickedGameCount = games.filter(g => picks.some(p => p.game_id === g.id)).length;

  const handlePickMade = (newPick) => {
    if (USE_MOCK_DATA) {
      const completePick = {
        id: Date.now(),
        game_id: newPick.gameId,
        pick_type: newPick.pickType,
        picked_team: newPick.pickedTeam,
        result: null,
        points_earned: 0
      };
      setLocalPicks(prev => {
        const idx = prev.findIndex(p => p.game_id === completePick.game_id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = completePick;
          return updated;
        }
        return [...prev, completePick];
      });
    } else {
      refetchPicks();
    }
  };

  const handleSubmitPicks = async () => {
    setSubmitting(true);
    setSubmitError('');
    try {
      if (USE_MOCK_DATA) {
        await new Promise(r => setTimeout(r, 500));
        setSubmitted(true);
      } else {
        const pickData = picks.map(p => ({
          gameId: p.game_id,
          pickType: p.pick_type,
          pickedTeam: p.picked_team
        }));
        await api.post('/picks/submit-all', { picks: pickData });
        setSubmitted(true);
        refetchPicks();
      }
    } catch (err) {
      setSubmitError(err.response?.data?.error || 'Failed to submit picks');
    } finally {
      setSubmitting(false);
    }
  };

  const isLoading = lbLoading || (!USE_MOCK_DATA && (gamesLoading || picksLoading) && apiGames.length === 0);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000080" />
      </View>
    );
  }

  const mlWinPct = userStats && userStats.moneyline_wins + userStats.moneyline_losses > 0
    ? Math.round((userStats.moneyline_wins / (userStats.moneyline_wins + userStats.moneyline_losses)) * 100)
    : null;

  // Helper: get 4 rows for standings display (user +/- neighbors)
  const getStandingsRows = (data) => {
    if (!data || data.length === 0) return [];
    const userIndex = data.findIndex(e => e.user_id === user.id);
    if (userIndex === -1) return data.slice(0, 4);

    let start = Math.max(0, userIndex - 1);
    let end = Math.min(data.length, start + 4);
    if (end - start < 4) start = Math.max(0, end - 4);
    return data.slice(start, end);
  };

  // Standings pages: first is global, rest are leagues
  const standingsPages = [
    { name: 'Global', data: leaderboard }
  ];
  const leaguePages = leagues.map(l => ({
    name: l.name || l.league_name,
    data: leagueLeaderboards[l.id] || []
  }));
  standingsPages.push(...leaguePages);

  const currentPage = standingsPages[standingsPage] || standingsPages[0];
  const currentData = getStandingsRows(currentPage.data);

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: insets.top }]}>

      {/* App Bar */}
      <View style={styles.appBar}>
        <Text style={styles.appBarTitle}>MLB<Text style={styles.appBarTitleNum}>162</Text></Text>
        <View style={styles.appBarRight}>
          <View style={styles.yearBadge}>
            <Text style={styles.yearBadgeText}>2026</Text>
          </View>
        </View>
      </View>

      {/* Stats Banner */}
      <View style={styles.statsBanner}>
        <View style={styles.statsBannerTop} />
        <View style={styles.statsBannerRow}>
          <View style={styles.statsBannerItem}>
            <Text style={styles.statsBannerNum}>
              {userStats ? `${userStats.moneyline_wins}-${userStats.moneyline_losses}` : '--'}
            </Text>
            <Text style={styles.statsBannerLabel}>MONEYLINE</Text>
          </View>
          <View style={styles.statsDivider} />
          <View style={styles.statsBannerItem}>
            <Text style={styles.statsBannerNum}>
              {userStats ? `${userStats.spread_wins}-${userStats.spread_losses}` : '--'}
            </Text>
            <Text style={styles.statsBannerLabel}>SPREAD</Text>
          </View>
          <View style={styles.statsDivider} />
          <View style={styles.statsBannerItem}>
            <Text style={[styles.statsBannerNum, mlWinPct != null && mlWinPct >= 50 && { color: C.green }]}>
              {mlWinPct != null ? `${mlWinPct}%` : '--'}
            </Text>
            <Text style={styles.statsBannerLabel}>WIN %</Text>
          </View>
          <View style={styles.statsDivider} />
          <View style={styles.statsBannerItem}>
            <Text style={styles.statsBannerNum}>
              {userStats ? userStats.total_points : '--'}
            </Text>
            <Text style={styles.statsBannerLabel}>POINTS</Text>
          </View>
        </View>
      </View>

      {/* Standings Mini Card */}
      <View style={styles.standingsCard}>
        <View style={styles.standingsHeader}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Leaderboard')}
            activeOpacity={0.7}
          >
            <Text style={styles.standingsTitle}>Standings</Text>
          </TouchableOpacity>
          <View style={styles.standingsBadge}>
            <Text style={styles.standingsBadgeText}>{currentPage.name.toUpperCase()}</Text>
          </View>
        </View>

        <View
          style={styles.standingsScrollContainer}
          onLayout={(e) => setStandingsScrollWidth(e.nativeEvent.layout.width)}
        >
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onMomentumScrollEnd={(evt) => {
              if (!standingsScrollWidth) return;
              const page = Math.round(evt.nativeEvent.contentOffset.x / standingsScrollWidth);
              setStandingsPage(page);
            }}
            style={styles.standingsScroll}
          >
            {standingsPages.map((pg, pageIdx) => (
              <View
                key={pageIdx}
                style={[styles.standingsPage, standingsScrollWidth > 0 && { width: standingsScrollWidth }]}
              >
                {getStandingsRows(pg.data).map((row, idx) => {
                  const isUserRow = row.user_id === user.id;
                  const barColor = isUserRow ? (row.color || C.navy) : OTHERS_BAR_COLOR;
                  return (
                    <View key={idx} style={[styles.standingsRow, isUserRow && styles.standingsRowUser]}>
                      <View style={[styles.standingsBar, { backgroundColor: barColor }]} />
                      <Text style={styles.standingsUsername}>{row.username}</Text>
                      <Text style={styles.standingsPoints}>{row.total_points}</Text>
                    </View>
                  );
                })}
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Page dots */}
        <View style={styles.standingsDots}>
          {standingsPages.map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.standingsDot,
                idx === standingsPage ? styles.standingsDotActive : styles.standingsDotInactive
              ]}
            />
          ))}
        </View>
      </View>

      {/* Today's Games Header */}
      <View style={styles.gamesHeader}>
        <Text style={styles.gamesTitle}>Today's Games</Text>
      </View>

      {USE_MOCK_DATA && (
        <View style={styles.mockBanner}>
          <Text style={styles.mockBannerText}>Mock Data — picks won't be saved</Text>
        </View>
      )}

      {games.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No games scheduled for today</Text>
        </View>
      ) : (
        <>
          {games.map((game) => {
            const existingPick = picks.find(p => p.game_id === game.id);
            return (
              <GameCard
                key={game.id}
                game={game}
                existingPick={existingPick}
                onPickMade={handlePickMade}
                submitted={submitted}
              />
            );
          })}

          {!submitted && pickedGameCount > 0 && (
            <View style={styles.submitSection}>
              {submitError ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{submitError}</Text>
                </View>
              ) : null}
              <View style={styles.submitBar}>
                <View style={styles.submitBarLeft} />
                <Text style={styles.submitBarText}>
                  {pickedGameCount} OF {games.length} PICKED
                </Text>
                <TouchableOpacity
                  style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
                  onPress={handleSubmitPicks}
                  disabled={submitting}
                  activeOpacity={0.8}
                >
                  {submitting ? (
                    <ActivityIndicator color={C.white} size="small" />
                  ) : (
                    <Text style={styles.submitBtnText}>Lock In →</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {submitted && (
            <View style={styles.lockedBanner}>
              <Text style={styles.lockedText}>Picks Locked In</Text>
              <Text style={styles.lockedSub}>Check back when games go final</Text>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.parchment },
  content: { padding: 12, paddingBottom: 40 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.navy,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: -12,
    marginTop: -12,
    marginBottom: 12,
    borderBottomWidth: 3,
    borderBottomColor: C.red,
  },
  appBarTitle: {
    fontSize: 24,
    fontWeight: '900',
    fontStyle: 'italic',
    color: C.white,
    letterSpacing: -0.5,
  },
  appBarTitleNum: {
    fontSize: 20,
  },
  appBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  yearBadge: {
    backgroundColor: C.gold,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 3,
  },
  yearBadgeText: {
    fontSize: 14,
    fontWeight: '900',
    color: C.white,
    letterSpacing: 1,
  },

  statsBanner: {
    backgroundColor: C.navy,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 14,
    borderTopWidth: 2,
    borderTopColor: C.gold,
  },
  statsBannerTop: {
    height: 1,
    backgroundColor: C.gold,
    marginBottom: 0,
  },
  statsBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statsBannerItem: {
    flex: 1,
    alignItems: 'center',
  },
  statsBannerNum: {
    fontSize: 18,
    fontWeight: '900',
    color: C.white,
    letterSpacing: -0.5,
  },
  statsBannerLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.35)',
    marginTop: 3,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  statsDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },

  standingsCard: {
    backgroundColor: C.parchment,
    borderWidth: 1,
    borderColor: C.creamDeep,
    shadowColor: C.creamDeep,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
    marginBottom: 14,
    paddingBottom: 10,
  },
  standingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.creamDeep,
  },
  standingsTitle: {
    fontSize: 16,
    fontWeight: '900',
    fontStyle: 'italic',
    color: C.ink,
    letterSpacing: -0.5,
  },
  standingsBadge: {
    backgroundColor: C.navy,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 2,
  },
  standingsBadgeText: {
    fontSize: 8,
    fontWeight: '700',
    color: C.gold,
    letterSpacing: 1.5,
  },
  standingsScrollContainer: {
    overflow: 'hidden',
  },
  standingsScroll: {
    minHeight: 150,
  },
  standingsPage: {
    // Width is set dynamically to the measured container width for correct pagingEnabled behavior
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  standingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingRight: 10,
  },
  standingsRowUser: {
    borderWidth: 1.5,
    borderColor: C.red,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 2,
  },
  standingsBar: {
    width: 8,
    height: 28,
    marginRight: 10,
    borderRadius: 1,
  },
  standingsUsername: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: C.ink,
    letterSpacing: 0.5,
  },
  standingsPoints: {
    fontSize: 14,
    fontWeight: '900',
    color: C.red,
    minWidth: 30,
    textAlign: 'right',
  },
  standingsDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
    paddingTop: 8,
  },
  standingsDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  standingsDotActive: {
    backgroundColor: C.navy,
  },
  standingsDotInactive: {
    backgroundColor: C.creamDeep,
  },

  gamesHeader: {
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 12,
  },
  gamesTitle: {
    fontSize: 18,
    fontWeight: '900',
    fontStyle: 'italic',
    color: C.ink,
    letterSpacing: -0.5,
    textAlign: 'center',
  },

  mockBanner: {
    backgroundColor: C.goldLight,
    borderColor: C.gold,
    borderWidth: 1,
    borderRadius: 3,
    padding: 8,
    marginBottom: 10,
  },
  mockBannerText: { color: C.brown, fontSize: 11, fontWeight: '600', textAlign: 'center' },

  emptyCard: {
    backgroundColor: C.parchment,
    borderWidth: 1,
    borderColor: C.creamDeep,
    padding: 24,
    alignItems: 'center',
    marginHorizontal: 0,
  },
  emptyText: { color: C.inkLight, fontSize: 14 },

  submitSection: { marginTop: 10, alignItems: 'stretch', marginHorizontal: 0 },
  submitBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.navy,
    borderWidth: 1.5,
    borderColor: C.gold,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 12,
  },
  submitBarLeft: {
    width: 3,
    height: 32,
    backgroundColor: C.gold,
  },
  submitBarText: {
    flex: 1,
    color: C.white,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  submitBtn: {
    backgroundColor: C.gold,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: { color: C.white, fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  errorBox: { backgroundColor: '#fef2f2', borderRadius: 3, padding: 8, marginBottom: 8, width: '100%' },
  errorText: { color: '#dc2626', fontSize: 12, textAlign: 'center' },

  lockedBanner: {
    backgroundColor: C.navy,
    borderWidth: 1,
    borderColor: C.gold,
    padding: 14,
    marginTop: 10,
    alignItems: 'center',
  },
  lockedText: { color: C.white, fontSize: 14, fontWeight: '900', fontStyle: 'italic' },
  lockedSub: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 4 },
});
