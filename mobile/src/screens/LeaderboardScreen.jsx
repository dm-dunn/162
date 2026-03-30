import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useLeaderboard } from '../hooks/useLeaderboard';
import { useLeagues } from '../hooks/useLeagues';
import LeaderboardTable from '../components/leaderboard/LeaderboardTable';

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

export default function LeaderboardScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { leagues } = useLeagues();
  const [selectedLeague, setSelectedLeague] = useState('');
  const { leaderboard, loading } = useLeaderboard(selectedLeague);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={C.navy} />
      </View>
    );
  }

  const filterOptions = [
    { label: 'Global', value: '' },
    ...leagues.map(l => ({ label: l.name, value: l.id }))
  ];

  // Calculate yesterday's date for leaderboard subtitle
  const yesterday = new Date(Date.now() - 86400000);
  const monthName = yesterday.toLocaleString('en-US', { month: 'long' });
  const day = yesterday.getDate();
  const year = new Date().getFullYear();

  const pageTitle = selectedLeague
    ? (filterOptions.find(o => o.value === selectedLeague)?.label?.toUpperCase() ?? 'THE BOARD')
    : 'THE BOARD';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top }]}
      showsVerticalScrollIndicator={false}
    >

      {/* League Filter Tabs */}
      {filterOptions.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
          style={styles.filterContainer}
        >
          {filterOptions.map((opt) => (
            <TouchableOpacity
              key={opt.value || 'global'}
              style={[
                styles.filterPill,
                selectedLeague === opt.value && styles.filterPillActive
              ]}
              onPress={() => setSelectedLeague(opt.value)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterPillText,
                  selectedLeague === opt.value && styles.filterPillTextActive
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Page Header */}
      <View style={styles.pageHeader}>
        <Text style={styles.pageHeaderTitle}>{pageTitle}</Text>
        <Text style={styles.pageHeaderSubtitle}>{year} Season · Through {monthName} {day}</Text>
        <View style={styles.decorativeRule} />
      </View>

      {/* Leaderboard Table */}
      <View style={styles.leaderboardWrapper}>
        {leaderboard.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No standings yet — make some picks!</Text>
          </View>
        ) : (
          <LeaderboardTable leaderboard={leaderboard} currentUserId={user.id} />
        )}
      </View>

      {/* Footer */}
      <Text style={styles.footerText}>Updated nightly after all games are final</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.cream },
  content: { paddingBottom: 32 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.cream },

  // App Bar
  appBar: {
    backgroundColor: C.navy,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 3,
    borderBottomColor: C.red,
    paddingBottom: 10,
  },
  appBarTitle: {
    fontSize: 18,
    fontWeight: '900',
    fontStyle: 'italic',
    color: C.white,
    letterSpacing: -0.5,
  },
  appBarSeason: {
    fontSize: 11,
    fontStyle: 'italic',
    color: C.inkLight,
    marginTop: 2,
  },

  // Filter Pills
  filterContainer: {
    backgroundColor: C.navy,
    paddingBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: C.gold,
  },
  filterScroll: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: C.cream,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  filterPillActive: {
    backgroundColor: C.gold,
    borderColor: C.gold,
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.cream,
    letterSpacing: 0.5,
  },
  filterPillTextActive: {
    color: C.navy,
  },

  // Page Header
  pageHeader: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  pageHeaderTitle: {
    fontSize: 28,
    fontWeight: '900',
    fontStyle: 'italic',
    color: C.navy,
    letterSpacing: -0.5,
  },
  pageHeaderSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    color: C.inkLight,
    marginTop: 6,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  decorativeRule: {
    marginTop: 12,
    height: 1,
    width: 120,
    backgroundColor: C.gold,
  },

  // Leaderboard
  leaderboardWrapper: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  emptyState: {
    backgroundColor: C.parchment,
    borderRadius: 8,
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    fontStyle: 'italic',
    color: C.inkLight,
    textAlign: 'center',
  },

  // Footer
  footerText: {
    fontSize: 10,
    fontFamily: 'Courier New',
    fontStyle: 'italic',
    color: C.inkMid,
    textAlign: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
});
