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
      {/* Header Card — Navy bar with title */}
      <View style={styles.headerSection}>
        <Text style={styles.headerTitle}>My Leagues</Text>
        <Text style={styles.headerSubtitle}>Compete with friends all season</Text>
        <View style={styles.headerBtns}>
          <TouchableOpacity
            style={[showCreate ? styles.btnInverted : styles.btnPrimary, styles.headerBtnHalf]}
            onPress={() => { setShowCreate(!showCreate); setShowJoin(false); }}
            activeOpacity={0.8}
          >
            <Text style={[showCreate ? styles.btnInvertedText : styles.btnPrimaryText]}>
              {showCreate ? 'Cancel' : 'Create League'}
            </Text>
            {!showCreate && <View style={styles.btnAccent} />}
          </TouchableOpacity>
          <TouchableOpacity
            style={[showJoin ? styles.btnInverted : styles.btnSecondary, styles.headerBtnHalf]}
            onPress={() => { setShowJoin(!showJoin); setShowCreate(false); setJoinError(''); }}
            activeOpacity={0.8}
          >
            <Text style={[showJoin ? styles.btnInvertedText : styles.btnSecondaryText]}>
              {showJoin ? 'Cancel' : 'Join with Code'}
            </Text>
            {!showJoin && <View style={styles.btnAccentSecondary} />}
          </TouchableOpacity>
        </View>
      </View>

      {/* Join with Code Form */}
      {showJoin && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Join With Code</Text>
          {joinError ? (
            <View style={[styles.errorBox, { borderWidth: 1.5, borderColor: '#C41E3A' }]}>
              <Text style={styles.errorText}>{joinError}</Text>
            </View>
          ) : null}
          <Text style={styles.inputLabel}>Invite Code</Text>
          <TextInput
            style={styles.input}
            value={joinCode}
            onChangeText={text => setJoinCode(text.toUpperCase())}
            placeholder="e.g., A1B2C3D4"
            placeholderTextColor="#D4C098"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={8}
          />
          <TouchableOpacity
            style={[styles.btnPrimary, joining && { opacity: 0.6 }]}
            onPress={handleJoin}
            disabled={joining}
            activeOpacity={0.8}
          >
            {joining ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.btnPrimaryText}>Join League</Text>
                <View style={styles.btnAccent} />
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Email Verification Banner */}
      {emailNotVerified && (
        <View style={styles.verifyCard}>
          <Text style={styles.verifyText}>
            ⚠  <Text style={{ fontWeight: '700' }}>Verify your email</Text> to create or join leagues
          </Text>
          {resendMessage ? (
            <Text style={[styles.verifyText, { color: resendMessage.startsWith('Verification') ? '#2E6B3E' : '#C41E3A', marginTop: 8, fontWeight: '600' }]}>
              {resendMessage}
            </Text>
          ) : null}
          <TouchableOpacity
            style={[styles.verifyBtn, resendLoading && { opacity: 0.6 }]}
            onPress={handleResendVerification}
            disabled={resendLoading}
            activeOpacity={0.8}
          >
            {resendLoading ? (
              <ActivityIndicator color="#0D1B4F" size="small" />
            ) : (
              <Text style={styles.verifyBtnText}>Resend Verification</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Create League Form */}
      {showCreate && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>New League</Text>
          {createError ? (
            <View style={[styles.errorBox, { borderWidth: 1.5, borderColor: '#C41E3A' }]}>
              <Text style={styles.errorText}>{createError}</Text>
            </View>
          ) : null}

          <Text style={styles.inputLabel}>League Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g., The Hot Corner"
            placeholderTextColor="#D4C098"
            maxLength={100}
          />

          <TouchableOpacity
            style={[styles.btnPrimary, creating && { opacity: 0.6 }]}
            onPress={handleCreate}
            disabled={creating}
            activeOpacity={0.8}
          >
            {creating ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.btnPrimaryText}>Create League</Text>
                <View style={styles.btnAccent} />
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {error && (
        <View style={[styles.errorBox, { borderWidth: 1.5, borderColor: '#C41E3A' }]}>
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
            <View style={styles.leagueTopBar} />
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
            <View style={styles.leagueFooter}>
              <Text style={styles.memberCount}>
                {league.member_count} {league.member_count === 1 ? 'member' : 'members'}
              </Text>
              <Text style={styles.leagueArrow}>→</Text>
            </View>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.cream },
  content: { padding: 16, paddingBottom: 32 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // ── Header Section ──
  headerSection: {
    backgroundColor: C.navy,
    borderRadius: 0,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
    marginHorizontal: -16,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    fontStyle: 'italic',
    color: C.white,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 12,
    fontStyle: 'italic',
    color: 'rgba(255, 255, 255, 0.45)',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 16,
  },
  headerBtns: { flexDirection: 'row', gap: 12, marginTop: 0 },
  headerBtnHalf: { flex: 1, position: 'relative' },

  // ── Buttons ──
  btnPrimary: {
    backgroundColor: C.navy,
    borderRadius: 0,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  btnPrimaryText: { color: C.white, fontWeight: '700', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.8 },
  btnAccent: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: C.gold,
  },
  btnSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: C.gold,
    borderRadius: 0,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSecondaryText: { color: C.gold, fontWeight: '700', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.8 },
  btnAccentSecondary: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: C.gold,
  },
  btnInverted: {
    backgroundColor: C.gold,
    borderRadius: 0,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnInvertedText: { color: C.navy, fontWeight: '700', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.8 },

  // ── Card ──
  card: {
    backgroundColor: C.parchment,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: C.creamDeep,
    padding: 16,
    marginBottom: 16,
    shadowColor: C.creamDeep,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  cardLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: C.gold,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 12,
  },

  // ── Input ──
  inputLabel: { fontSize: 9, fontWeight: '700', color: C.navy, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  input: {
    borderWidth: 1,
    borderColor: C.creamDeep,
    borderBottomWidth: 2,
    borderBottomColor: C.navy,
    borderRadius: 0,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: C.ink,
    marginBottom: 16,
    backgroundColor: C.white,
    fontStyle: 'italic',
  },

  // ── Error & Verify ──
  errorBox: { backgroundColor: '#FFF5F5', borderRadius: 0, padding: 12, marginBottom: 12 },
  errorText: { color: C.red, fontSize: 13, fontWeight: '500', fontStyle: 'italic' },
  verifyCard: {
    backgroundColor: C.gold,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: C.goldLight,
    padding: 14,
    marginBottom: 16,
    shadowColor: C.creamDeep,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  verifyText: { color: C.navy, fontSize: 13, fontStyle: 'italic', lineHeight: 20 },
  verifyBtn: {
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: C.navy,
    borderRadius: 0,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    backgroundColor: C.white,
  },
  verifyBtnText: { color: C.navy, fontWeight: '700', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8 },

  // ── Empty State ──
  emptyCard: { alignItems: 'center', paddingVertical: 48 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '900', fontStyle: 'italic', color: C.navy, marginBottom: 8 },
  emptySubtitle: { color: C.inkLight, fontSize: 13, textAlign: 'center', fontStyle: 'italic' },

  // ── League Card ──
  leagueCard: {
    backgroundColor: C.parchment,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: C.creamDeep,
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: C.creamDeep,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  leagueTopBar: {
    height: 5,
    backgroundColor: C.navy,
    width: '100%',
  },
  leagueHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 16, paddingTop: 14 },
  leagueName: { fontSize: 16, fontWeight: '700', fontStyle: 'italic', color: C.navy, flex: 1, marginRight: 8 },
  badge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4 },
  badgeOwner: { backgroundColor: C.navy },
  badgeMember: { backgroundColor: C.creamDark },
  badgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  badgeTextOwner: { color: C.white },
  badgeTextMember: { color: C.inkMid },
  leagueDesc: { color: C.inkMid, fontSize: 12, marginHorizontal: 16, marginTop: 8, fontStyle: 'italic' },
  leagueFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 14, marginTop: 10 },
  memberCount: { color: C.inkLight, fontSize: 11, fontStyle: 'italic' },
  leagueArrow: { color: C.gold, fontSize: 16, fontWeight: 'bold' },
});
