import { View, Text, StyleSheet } from 'react-native';
import { formatPoints } from '../../utils/formatters';

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

export default function LeaderboardTable({ leaderboard, currentUserId }) {
  const maxPoints = Math.max(...leaderboard.map(e => e.total_points), 100);

  const getMedalEmoji = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return null;
  };

  return (
    <View style={styles.container}>
      {leaderboard.map((entry, idx) => {
        const isCurrentUser = entry.user_id === currentUserId;
        const pct = (entry.total_points / maxPoints) * 100;
        const barColor = entry.color || C.navy;
        const medal = getMedalEmoji(entry.rank);
        const showDivider = (idx + 1) % 3 === 0 && idx < leaderboard.length - 1;

        return (
          <View key={entry.user_id}>
            {/* Row */}
            <View
              style={[
                styles.row,
                isCurrentUser && styles.rowHighlight
              ]}
            >
              {/* Rank / Medal */}
              <View style={styles.rankContainer}>
                {medal ? (
                  <Text style={styles.medal}>{medal}</Text>
                ) : (
                  <Text style={styles.rank}>{entry.rank}</Text>
                )}
              </View>

              {/* Color Dot */}
              <View
                style={[
                  styles.colorDot,
                  { backgroundColor: barColor }
                ]}
              />

              {/* Bar Container */}
              <View style={styles.barBg}>
                <View
                  style={[
                    styles.bar,
                    {
                      width: `${Math.max(pct, 15)}%`,
                      backgroundColor: barColor
                    }
                  ]}
                >
                  {/* Subtle gradient overlay (lighter at top) */}
                  <View style={styles.barGloss} />

                  {/* Content */}
                  <View style={styles.barContent}>
                    <View style={styles.barNameContainer}>
                      <Text style={styles.barName} numberOfLines={1}>
                        {entry.username}
                      </Text>
                      {isCurrentUser && (
                        <View style={styles.youTag}>
                          <Text style={styles.youTagText}>YOU</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.barPoints}>{formatPoints(entry.total_points)}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Divider after every 3rd row */}
            {showDivider && <View style={styles.divider} />}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  rowHighlight: {
    borderWidth: 1.5,
    borderColor: C.red,
    paddingHorizontal: 6,
  },

  // Rank section
  rankContainer: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medal: {
    fontSize: 20,
  },
  rank: {
    fontSize: 18,
    fontWeight: '900',
    color: C.navy,
    letterSpacing: -0.5,
  },

  // Color dot
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 1,
  },

  // Bar background
  barBg: {
    flex: 1,
    height: 40,
    backgroundColor: C.creamDark,
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.creamDeep,
  },

  // Actual bar
  bar: {
    height: '100%',
    borderRadius: 6,
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },

  // Glossy overlay at top
  barGloss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },

  // Bar content (username + points)
  barContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    zIndex: 1,
  },

  barNameContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  barName: {
    color: C.white,
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },

  youTag: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },

  youTagText: {
    color: C.white,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  barPoints: {
    color: C.white,
    fontSize: 14,
    fontWeight: '900',
    marginLeft: 8,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: C.creamDeep,
    marginVertical: 4,
    marginHorizontal: 0,
    borderStyle: 'dashed',
    opacity: 0.5,
  },
});
