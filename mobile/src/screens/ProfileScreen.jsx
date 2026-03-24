import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { authService } from '../services/auth';
import { USE_MOCK_DATA, mockStats } from '../utils/mockData';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  const handleResendVerification = async () => {
    setResendLoading(true);
    setResendMessage('');
    try {
      await authService.resendVerification();
      setResendMessage('Verification email sent! Check your inbox.');
    } catch (err) {
      setResendMessage(err.response?.data?.error || 'Failed to send email. Try again later.');
    } finally {
      setResendLoading(false);
    }
  };
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

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
      console.error('Failed to fetch stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000080" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}>
      {/* Account Info */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Account Info</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Username</Text>
          <Text style={styles.rowValue}>{user.username}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Email</Text>
          <Text style={styles.rowValue}>{user.email}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Email Status</Text>
          <View style={[styles.badge, user.emailVerified ? styles.badgeVerified : styles.badgeUnverified]}>
            <Text style={[styles.badgeText, user.emailVerified ? styles.badgeTextVerified : styles.badgeTextUnverified]}>
              {user.emailVerified ? 'Verified' : 'Not Verified'}
            </Text>
          </View>
        </View>
        {!user.emailVerified && (
          <View style={styles.verifySection}>
            {resendMessage ? (
              <Text style={[styles.resendMessage, { color: resendMessage.startsWith('Verification') ? '#16a34a' : '#dc2626' }]}>
                {resendMessage}
              </Text>
            ) : null}
            <TouchableOpacity
              style={[styles.resendBtn, resendLoading && { opacity: 0.6 }]}
              onPress={handleResendVerification}
              disabled={resendLoading}
              activeOpacity={0.8}
            >
              {resendLoading ? (
                <ActivityIndicator color="#000080" size="small" />
              ) : (
                <Text style={styles.resendBtnText}>Resend Verification Email</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Season Statistics */}
      {stats && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Lifetime Stats</Text>

          <Text style={styles.subTitle}>Overall</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Total Picks</Text>
            <Text style={styles.rowValue}>{stats.total_picks}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Total Wins</Text>
            <Text style={[styles.rowValue, { color: '#16a34a' }]}>{stats.total_wins}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Total Losses</Text>
            <Text style={[styles.rowValue, { color: '#dc2626' }]}>{stats.total_losses}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Total Points</Text>
            <Text style={[styles.rowValue, { color: '#000080', fontWeight: '700' }]}>{stats.total_points}</Text>
          </View>

          <Text style={[styles.subTitle, { marginTop: 20 }]}>Breakdown</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Moneyline W-L</Text>
            <Text style={styles.rowValue}>{stats.ml_wins}-{stats.ml_losses}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Spread W-L</Text>
            <Text style={styles.rowValue}>{stats.spread_wins}-{stats.spread_losses}</Text>
          </View>
        </View>
      )}

      {/* Logout */}
      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={logout}
        activeOpacity={0.8}
      >
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  content: { padding: 16, paddingBottom: 40 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#000080', marginBottom: 14 },
  subTitle: { fontSize: 15, fontWeight: '600', color: '#374151', marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, alignItems: 'center' },
  rowLabel: { color: '#6b7280', fontSize: 14 },
  rowValue: { fontSize: 14, fontWeight: '600', color: '#111827' },
  divider: { height: 1, backgroundColor: '#f3f4f6' },
  logoutBtn: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#fca5a5',
    marginTop: 4,
  },
  logoutText: { color: '#dc2626', fontWeight: '700', fontSize: 15 },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeVerified: { backgroundColor: '#dcfce7' },
  badgeUnverified: { backgroundColor: '#fef3c7' },
  badgeText: { fontSize: 12, fontWeight: '600' },
  badgeTextVerified: { color: '#166534' },
  badgeTextUnverified: { color: '#92400e' },
  verifySection: { marginTop: 12 },
  resendMessage: { fontSize: 13, marginBottom: 8 },
  resendBtn: {
    borderWidth: 1.5,
    borderColor: '#000080',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  resendBtnText: { color: '#000080', fontWeight: '700', fontSize: 13 },
});
