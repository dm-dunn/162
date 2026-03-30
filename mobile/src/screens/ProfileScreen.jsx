import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useLeaderboard } from '../hooks/useLeaderboard';
import { useLeagues } from '../hooks/useLeagues';
import api from '../services/api';
import { USE_MOCK_DATA, mockStats } from '../utils/mockData';
import { formatPoints } from '../utils/formatters';

// Color options — must match RegisterScreen exactly
const COLOR_OPTIONS = [
  { name: 'Navy Blue', value: '#1e40af' },
  { name: 'Red',       value: '#dc2626' },
  { name: 'Green',     value: '#059669' },
  { name: 'Purple',    value: '#7c3aed' },
  { name: 'Orange',    value: '#ea580c' },
  { name: 'Pink',      value: '#db2777' },
  { name: 'Teal',      value: '#0d9488' },
  { name: 'Amber',     value: '#d97706' },
];

const getColorName = (hex) => {
  if (!hex) return 'None';
  const match = COLOR_OPTIONS.find(opt => opt.value.toLowerCase() === hex.toLowerCase());
  return match ? match.name : hex;
};

// Warm grayscale for other users' bars — fits the cream/parchment palette
const OTHERS_BAR_COLOR = '#9A8878';

// Retro baseball card color palette
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

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user, logout } = useAuth();
  const { leaderboard, loading: leaderboardLoading } = useLeaderboard('');
  const { leagues } = useLeagues();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    if (USE_MOCK_DATA) {
      setStats(mockStats);
      setLoading(false);
      return;
    }

    try {
      const response = await api.get('/picks/stats');
      setStats(response.data.stats);
    } catch (err) {
      // Stats fetch failed
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setResendLoading(true);
    setResendMessage('');
    try {
      await api.post('/auth/resend-verification');
      setResendMessage('Verification email sent! Check your inbox.');
    } catch (err) {
      setResendMessage(err.response?.data?.error || 'Failed to send email. Try again later.');
    } finally {
      setResendLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
  };

  const handleNavigateToLeaderboard = () => {
    navigation.navigate('Leaderboard');
  };

  const handleNavigateToLeagues = () => {
    navigation.navigate('Leagues');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={C.navy} />
      </View>
    );
  }

  // Get user's rank from leaderboard
  const userRank = leaderboard.find(entry => entry.user_id === user.id);
  const userRankNumber = userRank?.rank || 'N/A';
  const totalPlayers = leaderboard.length || 0;

  // Get 4 rows around user for mini standings (user + 3 closest competitors)
  const userIndex = leaderboard.findIndex(entry => entry.user_id === user.id);
  let standingsSlice = [];
  if (userIndex !== -1) {
    const start = Math.max(0, userIndex - 1);
    const end = Math.min(leaderboard.length, start + 4);
    standingsSlice = leaderboard.slice(start, end);
  } else {
    standingsSlice = leaderboard.slice(0, 4);
  }

  const getUserInitial = () => {
    return user.username ? user.username.charAt(0).toUpperCase() : 'U';
  };

  const maxPointsStandings = Math.max(...standingsSlice.map(e => e.total_points), 100);

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: 0 }]} showsVerticalScrollIndicator={false}>
      {/* 1. HERO SECTION */}
      <View style={[styles.heroSection, { paddingTop: insets.top + 16 }]}>
        <View style={styles.heroTopBorder} />

        <View style={styles.heroContent}>
          {/* Avatar */}
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getUserInitial()}</Text>
          </View>

          {/* Username */}
          <Text style={styles.username}>{user.username}</Text>

          {/* Joined date */}
          <Text style={styles.joinedDate}>Joined {new Date(user.createdAt || Date.now()).getFullYear()}</Text>

          {/* Rank pill */}
          <View style={styles.rankPill}>
            <Text style={styles.rankPillText}>🏅 Ranked #{userRankNumber} of {totalPlayers} Players</Text>
          </View>
        </View>

        <View style={styles.heroBottomBorder} />
        <View style={styles.heroBottomBorderGold} />
      </View>

      {/* 2. STATS BAR */}
      {stats && (
        <View style={styles.statsBar}>
          <View style={styles.statCell}>
            <Text style={styles.statValue}>{formatPoints(stats.total_points)}</Text>
            <Text style={styles.statLabel}>Points</Text>
          </View>
          <View style={styles.statDivider} />

          <View style={styles.statCell}>
            <Text style={styles.statValue}>{stats.ml_wins}-{stats.ml_losses}</Text>
            <Text style={styles.statLabel}>ML Record</Text>
          </View>
          <View style={styles.statDivider} />

          <View style={styles.statCell}>
            <Text style={styles.statValue}>{stats.spread_wins}-{stats.spread_losses}</Text>
            <Text style={styles.statLabel}>Spread Record</Text>
          </View>
          <View style={styles.statDivider} />

          <View style={styles.statCell}>
            <Text style={styles.statValue}>
              {stats.total_wins + stats.total_losses > 0
                ? Math.round((stats.total_wins / (stats.total_wins + stats.total_losses)) * 100)
                : 0}%
            </Text>
            <Text style={styles.statLabel}>Win %</Text>
          </View>
        </View>
      )}

      {/* 3. GLOBAL STANDINGS MINI-CARD */}
      <View style={styles.cardWrapper}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Global Standings</Text>
          <View style={styles.seasonBadge}>
            <Text style={styles.seasonBadgeText}>Season</Text>
          </View>
        </View>

        <View style={styles.standingsCard}>
          {standingsSlice.length === 0 ? (
            <Text style={styles.emptyStandingsText}>No standings yet</Text>
          ) : (
            <View style={styles.standingsRows}>
              {standingsSlice.map((entry) => {
                const isCurrentUser = entry.user_id === user.id;
                const pct = (entry.total_points / maxPointsStandings) * 100;
                // Current user: use their chosen color. Everyone else: warm grayscale.
                const barColor = isCurrentUser
                  ? (entry.color || user.color || C.navy)
                  : OTHERS_BAR_COLOR;

                // "YOU" fits comfortably inside the bar at ~35%+ width
                const youTagInside = pct >= 35;

                return (
                  <View key={entry.user_id} style={styles.standingsRow}>
                    {/* Rank */}
                    <Text style={styles.standingsRank}>{entry.rank}</Text>

                    {/* Bar */}
                    <View style={styles.standingsBarBg}>
                      <View
                        style={[
                          styles.standingsBar,
                          {
                            width: `${Math.max(pct, 15)}%`,
                            backgroundColor: barColor,
                          }
                        ]}
                      >
                        <View style={styles.barContent}>
                          <Text style={styles.standingsBarName} numberOfLines={1}>
                            {entry.username}
                          </Text>
                          {isCurrentUser && youTagInside && (
                            <Text style={styles.youTag}>YOU</Text>
                          )}
                        </View>
                        <Text style={styles.standingsBarPoints}>{formatPoints(entry.total_points)}</Text>
                      </View>
                    </View>

                    {/* "YOU" floated right when bar is too narrow */}
                    {isCurrentUser && !youTagInside && (
                      <Text style={styles.youTagOutside}>YOU</Text>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          <TouchableOpacity
            onPress={handleNavigateToLeaderboard}
            style={styles.standingsFooter}
          >
            <Text style={styles.standingsFooterText}>Tap to see full standings →</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 4. ACCOUNT SECTION */}
      <View style={styles.cardWrapper}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Account</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.menuRow}>
            <Text style={styles.menuLabel}>Email</Text>
            <Text style={styles.menuValue}>{user.email}</Text>
          </View>
          <View style={styles.menuDivider} />

          <View style={styles.menuRow}>
            <Text style={styles.menuLabel}>Change Password</Text>
            <Text style={styles.menuArrow}>→</Text>
          </View>
          <View style={styles.menuDivider} />

          <View style={styles.menuRow}>
            <Text style={styles.menuLabel}>Your Color</Text>
            <View style={styles.colorOption}>
              <View style={[styles.colorCircle, { backgroundColor: user.color || C.gold }]} />
              <Text style={styles.colorName}>{getColorName(user.color)}</Text>
            </View>
          </View>
        </View>

        {!user.emailVerified && (
          <View style={styles.verificationAlert}>
            <Text style={styles.verificationAlertText}>Your email is not verified</Text>
            <TouchableOpacity
              style={[styles.verifyBtn, resendLoading && { opacity: 0.6 }]}
              onPress={handleResendVerification}
              disabled={resendLoading}
              activeOpacity={0.8}
            >
              {resendLoading ? (
                <ActivityIndicator color={C.navy} size="small" />
              ) : (
                <Text style={styles.verifyBtnText}>Send Verification Email</Text>
              )}
            </TouchableOpacity>
            {resendMessage && (
              <Text style={[
                styles.resendMessage,
                { color: resendMessage.startsWith('Verification') ? C.green : C.red }
              ]}>
                {resendMessage}
              </Text>
            )}
          </View>
        )}
      </View>

      {/* 5. MY LEAGUES SECTION */}
      <View style={styles.cardWrapper}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Leagues</Text>
        </View>

        <View style={styles.card}>
          {leagues.length > 0 ? (
            <>
              {leagues.map((league, idx) => (
                <TouchableOpacity
                  key={league.id}
                  onPress={handleNavigateToLeagues}
                  style={styles.menuRow}
                >
                  <Text style={styles.menuLabel}>{league.name}</Text>
                  <View style={styles.leagueInfo}>
                    <Text style={styles.leagueMemberCount}>{league.member_count} members</Text>
                    <Text style={styles.menuArrow}>→</Text>
                  </View>
                </TouchableOpacity>
              ))}
              {leagues.length < 3 && <View style={styles.menuDivider} />}
            </>
          ) : null}

          <TouchableOpacity
            onPress={handleNavigateToLeagues}
            style={styles.menuRow}
          >
            <Text style={styles.menuLabel}>Join or Create a League</Text>
            <Text style={styles.menuArrow}>→</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 6. SIGN OUT BUTTON */}
      <TouchableOpacity
        style={styles.signOutBtn}
        onPress={handleLogout}
        activeOpacity={0.8}
      >
        <Text style={styles.signOutText}>SIGN OUT</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.cream,
  },
  content: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: C.cream,
  },

  // 1. HERO SECTION
  heroSection: {
    backgroundColor: C.navy,
    paddingHorizontal: 0,
    paddingBottom: 16,
  },
  heroTopBorder: {
    height: 2,
    backgroundColor: C.gold,
  },
  heroContent: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: C.red,
    borderWidth: 3,
    borderColor: C.gold,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '900',
    fontStyle: 'italic',
    color: C.white,
  },
  username: {
    fontSize: 20,
    fontWeight: '900',
    fontStyle: 'italic',
    color: C.white,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  joinedDate: {
    fontSize: 10,
    fontFamily: 'Courier New',
    color: 'rgba(255,255,255,0.35)',
    marginBottom: 10,
  },
  rankPill: {
    borderWidth: 1,
    borderColor: C.gold,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  rankPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.gold,
    letterSpacing: 0.5,
  },
  heroBottomBorder: {
    height: 3,
    backgroundColor: C.red,
  },
  heroBottomBorderGold: {
    height: 1,
    backgroundColor: C.gold,
  },

  // 2. STATS BAR
  statsBar: {
    backgroundColor: C.creamDark,
    flexDirection: 'row',
    marginHorizontal: 0,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '900',
    color: C.navy,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: C.inkLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: C.creamDeep,
  },

  // 3. GLOBAL STANDINGS MINI-CARD
  cardWrapper: {
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    fontStyle: 'italic',
    color: C.navy,
    letterSpacing: -0.5,
  },
  seasonBadge: {
    borderWidth: 1,
    borderColor: C.gold,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  seasonBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: C.gold,
    letterSpacing: 0.5,
  },

  card: {
    backgroundColor: C.parchment,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: C.creamDeep,
  },

  standingsCard: {
    backgroundColor: C.parchment,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: C.creamDeep,
  },
  standingsRows: {
    gap: 8,
  },
  standingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  standingsRank: {
    fontSize: 14,
    fontWeight: '900',
    color: C.navy,
    width: 24,
    letterSpacing: -0.5,
  },
  standingsBarBg: {
    flex: 1,
    backgroundColor: C.creamDeep,
    borderRadius: 3,
    height: 28,
    overflow: 'hidden',
  },
  standingsBar: {
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    justifyContent: 'space-between',
  },
  barContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  standingsBarName: {
    fontSize: 11,
    fontWeight: '700',
    color: C.white,
    letterSpacing: 0.3,
    flex: 1,
  },
  youTag: {
    fontSize: 8,
    fontWeight: '700',
    color: C.white,
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 2,
  },
  youTagOutside: {
    fontSize: 8,
    fontWeight: '700',
    color: C.inkLight,
    borderWidth: 1,
    borderColor: C.inkLight,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 2,
    marginLeft: 6,
    alignSelf: 'center',
  },
  standingsBarPoints: {
    fontSize: 11,
    fontWeight: '700',
    color: C.white,
  },
  emptyStandingsText: {
    fontSize: 13,
    fontStyle: 'italic',
    color: C.inkLight,
    textAlign: 'center',
    paddingVertical: 20,
  },
  standingsFooter: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: C.creamDeep,
  },
  standingsFooterText: {
    fontSize: 11,
    fontStyle: 'italic',
    color: C.inkLight,
    textAlign: 'center',
    letterSpacing: 0.3,
  },

  // 4. ACCOUNT SECTION / 5. LEAGUES SECTION
  menuRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    minHeight: 48,
  },
  menuLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: C.navy,
  },
  menuValue: {
    fontSize: 12,
    fontStyle: 'italic',
    color: C.inkLight,
    flex: 1,
    textAlign: 'right',
  },
  menuArrow: {
    fontSize: 16,
    fontWeight: '700',
    color: C.gold,
    marginLeft: 8,
  },
  menuDivider: {
    height: 1,
    backgroundColor: C.creamDeep,
    marginHorizontal: -12,
  },
  colorOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  colorCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: C.inkLight,
  },
  colorName: {
    fontSize: 12,
    fontStyle: 'italic',
    color: C.inkLight,
  },
  leagueInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  leagueMemberCount: {
    fontSize: 11,
    fontStyle: 'italic',
    color: C.inkLight,
  },

  verificationAlert: {
    backgroundColor: C.parchment,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: C.creamDeep,
  },
  verificationAlertText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.red,
    marginBottom: 8,
  },
  verifyBtn: {
    borderWidth: 1.5,
    borderColor: C.navy,
    borderRadius: 4,
    paddingVertical: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  verifyBtnText: {
    color: C.navy,
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.3,
  },
  resendMessage: {
    fontSize: 11,
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // 6. SIGN OUT BUTTON
  signOutBtn: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: C.red,
    borderRadius: 4,
    paddingVertical: 12,
    alignItems: 'center',
  },
  signOutText: {
    color: C.red,
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
});
