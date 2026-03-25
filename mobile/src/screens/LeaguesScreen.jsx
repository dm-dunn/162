import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLeagues } from '../hooks/useLeagues';
import { leagueService } from '../services/leagues';
import { authService } from '../services/auth';

export default function LeaguesScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { leagues, loading, error, refetch } = useLeagues();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [emailNotVerified, setEmailNotVerified] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');

  const handleCreate = async () => {
    if (!name.trim() || name.length < 3) {
      setCreateError('League name must be at least 3 characters');
      return;
    }
    setCreating(true);
    setCreateError('');
    setEmailNotVerified(false);
    try {
      await leagueService.createLeague(name);
      setName('');
      setShowCreate(false);
      refetch();
    } catch (err) {
      // Error handled below via UI state
      if (err.response?.data?.code === 'EMAIL_NOT_VERIFIED') {
        setEmailNotVerified(true);
        setShowCreate(false);
      } else {
        setCreateError(err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to create league');
      }
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) {
      setJoinError('Enter an invite code');
      return;
    }
    setJoining(true);
    setJoinError('');
    try {
      const data = await leagueService.joinWithCode(joinCode.trim());
      setJoinCode('');
      setShowJoin(false);
      refetch();
      navigation.navigate('LeagueDetail', { leagueId: data.leagueId });
    } catch (err) {
      setJoinError(err.response?.data?.error || 'Invalid code. Try again.');
    } finally {
      setJoining(false);
    }
  };

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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000080" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}>
      {/* Header Card */}
      <View style={styles.card}>
        <Text style={styles.title}>My Leagues</Text>
        <Text style={styles.subtitle}>Compete with friends in private leagues</Text>
        <View style={styles.headerBtns}>
          <TouchableOpacity
            style={[showCreate ? styles.btnSecondary : styles.btn, styles.headerBtnHalf]}
            onPress={() => { setShowCreate(!showCreate); setShowJoin(false); }}
            activeOpacity={0.8}
          >
            <Text style={showCreate ? styles.btnSecondaryText : styles.btnText}>
              {showCreate ? 'Cancel' : 'Create League'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[showJoin ? styles.btnSecondary : styles.btnOutline, styles.headerBtnHalf]}
            onPress={() => { setShowJoin(!showJoin); setShowCreate(false); setJoinError(''); }}
            activeOpacity={0.8}
          >
            <Text style={showJoin ? styles.btnSecondaryText : styles.btnOutlineText}>
              {showJoin ? 'Cancel' : 'Join with Code'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Join with Code Form */}
      {showJoin && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Join a League</Text>
          {joinError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{joinError}</Text>
            </View>
          ) : null}
          <Text style={styles.label}>Invite Code</Text>
          <TextInput
            style={styles.input}
            value={joinCode}
            onChangeText={text => setJoinCode(text.toUpperCase())}
            placeholder="e.g., A1B2C3D4"
            placeholderTextColor="#9ca3af"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={8}
          />
          <TouchableOpacity
            style={[styles.btn, joining && { opacity: 0.6 }]}
            onPress={handleJoin}
            disabled={joining}
            activeOpacity={0.8}
          >
            {joining ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Join League</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Email Verification Banner */}
      {emailNotVerified && (
        <View style={styles.verifyCard}>
          <Text style={styles.verifyTitle}>Email Verification Required</Text>
          <Text style={styles.verifyText}>
            You need to verify your email before creating or joining leagues. Check your inbox for the verification link.
          </Text>
          {resendMessage ? (
            <Text style={[styles.verifyText, { color: resendMessage.startsWith('Verification') ? '#16a34a' : '#dc2626', marginTop: 8 }]}>
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

      {/* Create League Form */}
      {showCreate && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Create New League</Text>
          {createError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{createError}</Text>
            </View>
          ) : null}

          <Text style={styles.label}>League Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g., The Hot Corner"
            placeholderTextColor="#9ca3af"
            maxLength={100}
          />

          <TouchableOpacity
            style={[styles.btn, creating && { opacity: 0.6 }]}
            onPress={handleCreate}
            disabled={creating}
            activeOpacity={0.8}
          >
            {creating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Create League</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* League List */}
      {leagues.length === 0 ? (
        <View style={[styles.card, styles.emptyCard]}>
          <Text style={styles.emptyIcon}>⚾</Text>
          <Text style={styles.emptyTitle}>No leagues yet</Text>
          <Text style={styles.emptySubtitle}>Create a league and invite your friends to compete!</Text>
        </View>
      ) : (
        leagues.map(league => (
          <TouchableOpacity
            key={league.id}
            style={styles.leagueCard}
            onPress={() => navigation.navigate('LeagueDetail', { leagueId: league.id })}
            activeOpacity={0.7}
          >
            <View style={styles.leagueHeader}>
              <Text style={styles.leagueName}>{league.name}</Text>
              <View style={[
                styles.badge,
                league.role === 'owner' ? styles.badgeOwner : styles.badgeMember
              ]}>
                <Text style={[
                  styles.badgeText,
                  league.role === 'owner' ? styles.badgeTextOwner : styles.badgeTextMember
                ]}>
                  {league.role === 'owner' ? 'Owner' : 'Member'}
                </Text>
              </View>
            </View>
            {league.description ? (
              <Text style={styles.leagueDesc} numberOfLines={2}>{league.description}</Text>
            ) : null}
            <Text style={styles.memberCount}>
              {league.member_count} {league.member_count === 1 ? 'member' : 'members'}
            </Text>
          </TouchableOpacity>
        ))
      )}
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
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  title: { fontSize: 22, fontWeight: 'bold', color: '#000080', textAlign: 'center' },
  subtitle: { color: '#6b7280', fontSize: 13, marginTop: 4, textAlign: 'center' },
  headerBtns: { flexDirection: 'row', gap: 10, marginTop: 16 },
  headerBtnHalf: { flex: 1 },
  sectionTitle: { fontSize: 17, fontWeight: 'bold', color: '#000080', marginBottom: 14 },
  btn: {
    backgroundColor: '#FF0000',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  btnSecondary: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  btnSecondaryText: { color: '#374151', fontWeight: '600', fontSize: 14 },
  btnOutline: {
    borderWidth: 1.5,
    borderColor: '#000080',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  btnOutlineText: { color: '#000080', fontWeight: '700', fontSize: 14 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    marginBottom: 16,
    backgroundColor: '#f9fafb',
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  errorBox: { backgroundColor: '#fef2f2', borderRadius: 8, padding: 12, marginBottom: 12 },
  errorText: { color: '#dc2626', fontSize: 13 },
  verifyCard: {
    backgroundColor: '#fffbeb',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#fcd34d',
  },
  verifyTitle: { fontSize: 15, fontWeight: '700', color: '#92400e', marginBottom: 8 },
  verifyText: { color: '#78350f', fontSize: 13, lineHeight: 20 },
  resendBtn: {
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: '#000080',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  resendBtnText: { color: '#000080', fontWeight: '700', fontSize: 13 },
  emptyCard: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: '#374151', marginBottom: 6 },
  emptySubtitle: { color: '#6b7280', fontSize: 14, textAlign: 'center' },
  leagueCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  leagueHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  leagueName: { fontSize: 16, fontWeight: 'bold', color: '#000080', flex: 1, marginRight: 8 },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeOwner: { backgroundColor: '#000080' },
  badgeMember: { backgroundColor: '#f3f4f6' },
  badgeText: { fontSize: 11, fontWeight: '600' },
  badgeTextOwner: { color: '#fff' },
  badgeTextMember: { color: '#4b5563' },
  leagueDesc: { color: '#6b7280', fontSize: 13, marginTop: 6 },
  memberCount: { color: '#9ca3af', fontSize: 12, marginTop: 8 },
});
