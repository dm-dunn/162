import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../context/AuthContext';
import { useLeaderboard } from '../hooks/useLeaderboard';
import { useLeagues } from '../hooks/useLeagues';
import LeaderboardTable from '../components/leaderboard/LeaderboardTable';

export default function LeaderboardScreen() {
  const { user } = useAuth();
  const { leagues } = useLeagues();
  const [selectedLeague, setSelectedLeague] = useState('');
  const { leaderboard, loading } = useLeaderboard(selectedLeague);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000080" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.title}>Season Leaderboard</Text>
        <Text style={styles.subtitle}>
          Rankings update daily after all games are final.
        </Text>

        {leagues.length > 0 && (
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={selectedLeague}
              onValueChange={setSelectedLeague}
              style={styles.picker}
            >
              <Picker.Item label="Global" value="" />
              {leagues.map(l => (
                <Picker.Item key={l.id} label={l.name} value={l.id} />
              ))}
            </Picker>
          </View>
        )}
      </View>

      <View style={styles.card}>
        <LeaderboardTable leaderboard={leaderboard} currentUserId={user.id} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  content: { padding: 16, paddingBottom: 32 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  title: { fontSize: 22, fontWeight: 'bold', color: '#000080', marginBottom: 6 },
  subtitle: { color: '#6b7280', fontSize: 14, marginBottom: 12 },
  pickerWrapper: {
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#f9fafb',
    marginTop: 4,
  },
  picker: { height: 44 },
});
