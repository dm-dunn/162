import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../../context/AuthContext';

export default function LeaderboardTable({ leaderboard, currentUserId }) {
  const maxPoints = Math.max(...leaderboard.map(e => e.total_points), 100);

  return (
    <View style={styles.container}>
      {leaderboard.map((entry) => {
        const isCurrentUser = entry.user_id === currentUserId;
        const pct = (entry.total_points / maxPoints) * 100;
        const barColor = entry.color || '#1e40af';

        return (
          <View
            key={entry.user_id}
            style={[styles.row, isCurrentUser && styles.rowHighlight]}
          >
            {/* Rank number */}
            <Text style={styles.rank}>{entry.rank}</Text>

            {/* Bar */}
            <View style={styles.barBg}>
              <View style={[styles.bar, { width: `${Math.max(pct, 12)}%`, backgroundColor: barColor }]}>
                {/* Glossy overlay */}
                <View style={styles.gloss} />
                <View style={styles.barContent}>
                  <Text style={styles.barName} numberOfLines={1}>
                    {entry.username}
                    {isCurrentUser ? ' (You)' : ''}
                  </Text>
                  <Text style={styles.barPoints}>{entry.total_points}</Text>
                </View>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 4,
    borderRadius: 10,
  },
  rowHighlight: {
    borderWidth: 2,
    borderColor: '#FF0000',
    borderRadius: 10,
    paddingHorizontal: 4,
  },
  rank: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000080',
    width: 28,
    textAlign: 'center',
  },
  barBg: {
    flex: 1,
    height: 38,
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  bar: {
    height: '100%',
    borderRadius: 10,
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  gloss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  barContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  barName: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    marginRight: 4,
  },
  barPoints: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
});
