import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useLeaderboard } from '../hooks/useLeaderboard';
import { useGames } from '../hooks/useGames';
import { usePicks } from '../hooks/usePicks';
import GameCard from '../components/game/GameCard';
import api from '../services/api';
import { mockGames, mockPicks, USE_MOCK_DATA } from '../utils/mockData';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { leaderboard, loading: lbLoading } = useLeaderboard();
  const { games: apiGames, loading: gamesLoading, refetch: refetchGames } = useGames();
  const { picks: apiPicks, loading: picksLoading, refetch: refetchPicks } = usePicks();

  const [localPicks, setLocalPicks] = useState(mockPicks);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

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

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}>

      {/* Stats Banner */}
      <View style={styles.statsBanner}>
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
            <Text style={[styles.statsBannerNum, mlWinPct != null && mlWinPct >= 50 && { color: '#22c55e' }]}>
              {mlWinPct != null ? `${mlWinPct}%` : '--'}
            </Text>
            <Text style={styles.statsBannerLabel}>WIN RATE</Text>
          </View>
          <View style={styles.statsDivider} />
          <View style={styles.statsBannerItem}>
            <Text style={styles.statsBannerNum}>
              {userStats ? userStats.total_games : '--'}
            </Text>
            <Text style={styles.statsBannerLabel}>PICKED</Text>
          </View>
        </View>
        {!userStats && (
          <Text style={styles.statsEmptyHint}>Make your first pick to track stats</Text>
        )}
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
              <TouchableOpacity
                style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
                onPress={handleSubmitPicks}
                disabled={submitting}
                activeOpacity={0.8}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>
                    Lock In Picks ({pickedGameCount}/{games.length})
                  </Text>
                )}
              </TouchableOpacity>
              <Text style={styles.submitHint}>
                Once locked, picks cannot be changed.
              </Text>
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
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  content: { padding: 16, paddingBottom: 40 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  statsBanner: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
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
    fontSize: 20,
    fontWeight: '900',
    color: '#000080',
    letterSpacing: -0.5,
  },
  statsBannerLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#9ca3af',
    marginTop: 4,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  statsDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#e5e7eb',
  },
  statsEmptyHint: {
    color: '#9ca3af',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },

  gamesHeader: {
    alignItems: 'center',
    marginBottom: 12,
  },
  gamesTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
    textAlign: 'center',
  },

  mockBanner: {
    backgroundColor: '#fffbeb',
    borderColor: '#fcd34d',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  mockBannerText: { color: '#92400e', fontSize: 12, fontWeight: '500', textAlign: 'center' },

  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  emptyText: { color: '#6b7280', fontSize: 15 },

  submitSection: { marginTop: 8, alignItems: 'center' },
  submitBtn: {
    backgroundColor: '#FF0000',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
    width: '100%',
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  submitHint: { color: '#6b7280', fontSize: 12, marginTop: 8, textAlign: 'center' },
  errorBox: { backgroundColor: '#fef2f2', borderRadius: 8, padding: 10, marginBottom: 10, width: '100%' },
  errorText: { color: '#dc2626', fontSize: 13, textAlign: 'center' },

  lockedBanner: {
    backgroundColor: '#000080',
    borderRadius: 10,
    padding: 16,
    marginTop: 12,
    alignItems: 'center',
  },
  lockedText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  lockedSub: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 4 },
});
