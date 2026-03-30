import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Share,
} from 'react-native';
import { leagueService } from '../services/leagues';
import { formatPoints } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';
import ProgressionChart from '../components/league/ProgressionChart';

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

const NAVY = C.navy;

export default function LeagueDetailScreen({ route, navigation }) {
  const { leagueId } = route.params;
  const { user } = useAuth();

  const [league, setLeague] = useState(null);
  const [members, setMembers] = useState([]);
  const [standings, setStandings] = useState([]);
  const [progression, setProgression] = useState([]);
  const [recentForm, setRecentForm] = useState([]);
  const [isOwner, setIsOwner] = useState(false);
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [simulateLoading, setSimulateLoading] = useState(false);
  const [simulateResult, setSimulateResult] = useState('');

  useEffect(() => { fetchLeague(); }, [leagueId]);

  const fetchLeague = async () => {
    try {
      setLoading(true);
      const [data, standingsData, progData] = await Promise.all([
        leagueService.getLeague(leagueId),
        leagueService.getStandings(leagueId).catch(() => ({ standings: [] })),
        leagueService.getProgression(leagueId).catch(() => ({ progression: [], recentForm: [] })),
      ]);
      setLeague(data.league);
      setMembers(data.members);
      setIsOwner(data.isOwner);
      setPendingInvitations(data.pendingInvitations || []);
      setStandings(standingsData.standings || []);
      setProgression(progData.progression || []);
      setRecentForm(progData.recentForm || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load league');
    } finally {
      setLoading(false);
    }
  };

  const handleShareInvite = async () => {
    const inviteUrl = `https://mlb162.app/join/${league.invite_code}`;
    await Share.share({
      message: `Join my MLB162 league "${league.name}"! ${inviteUrl}`,
      url: inviteUrl,
    });
  };

  const handleLeave = () => {
    Alert.alert('Leave League', 'Are you sure you want to leave this league?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave', style: 'destructive',
        onPress: async () => {
          setActionLoading(true);
          try {
            await leagueService.leaveLeague(leagueId);
            navigation.goBack();
          } catch (err) {
            setError(err.response?.data?.error || 'Failed to leave league');
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete League',
      `Are you sure you want to delete "${league?.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete League',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await leagueService.deleteLeague(leagueId);
              navigation.goBack();
            } catch (err) {
              setError(err.response?.data?.error || 'Failed to delete league');
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleRemoveMember = (memberId, username) => {
    Alert.alert('Remove Member', `Remove ${username} from this league?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          setActionLoading(true);
          try {
            await leagueService.removeMember(leagueId, memberId);
            fetchLeague();
          } catch (err) {
            setError(err.response?.data?.error || 'Failed to remove member');
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const handleSimulateJoin = async () => {
    setSimulateLoading(true);
    setSimulateResult('');
    try {
      const result = await leagueService.simulateJoin(leagueId);
      setSimulateResult(
        result.hadToken
          ? '✓ Push notification sent! Check your device.'
          : '⚠ No push token registered — open the app on a real device first.'
      );
    } catch (err) {
      setSimulateResult('✗ ' + (err.response?.data?.error || 'Failed to send simulation'));
    } finally {
      setSimulateLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={NAVY} />
      </View>
    );
  }

  if (error && !league) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.btn} onPress={() => navigation.goBack()}>
          <Text style={styles.btnText}>Back to Leagues</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const rankColor = i => i === 0 ? '#f59e0b' : i === 1 ? '#9ca3af' : i === 2 ? '#b45309' : '#d1d5db';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* ── League Header — navy blue ── */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.leagueName, { textAlign: 'center' }]}>{league.name}</Text>
          {league.description ? (
            <Text style={styles.leagueDesc}>{league.description}</Text>
          ) : null}
        </View>
        {!isOwner && (
          <TouchableOpacity onPress={handleLeave} disabled={actionLoading}>
            <Text style={styles.leaveText}>Leave</Text>
          </TouchableOpacity>
        )}
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* ── Standings ── */}
      <View style={styles.card}>
        <Text style={[styles.sectionTitle, {textAlign: 'center'}]}>Standings</Text>
        {standings.length === 0 ? (
          <Text style={styles.emptyText}>No members yet</Text>
        ) : (
          <>
            {/* Table header */}
            <View style={styles.standingsHeader}>
              <Text style={[styles.standingsHeaderCell, { flex: 0.4 }]}>#</Text>
              <Text style={[styles.standingsHeaderCell, { flex: 3 }]}>Player</Text>
              <Text style={[styles.standingsHeaderCell, { flex: 1.2, textAlign: 'center' }]}>ML</Text>
              <Text style={[styles.standingsHeaderCell, { flex: 1.2, textAlign: 'center' }]}>SPR</Text>
              <Text style={[styles.standingsHeaderCell, { flex: 1.4, textAlign: 'right' }]}>PTS</Text>
            </View>

            {standings.map((entry, idx) => {
              const isMe = entry.user_id === user?.id;
              const mlRec = `${entry.ml_wins}-${entry.ml_losses}`;
              const sprRec = `${entry.spread_wins}-${entry.spread_losses}`;
              return (
                <View
                  key={entry.user_id}
                  style={[
                    styles.standingsRow,
                    idx < standings.length - 1 && styles.standingsRowBorder,
                    isMe && styles.standingsRowMe,
                  ]}
                >
                  <Text style={[styles.standingsRank, { flex: 0.4, color: rankColor(idx) }]}>
                    {idx + 1}
                  </Text>
                  <View style={{ flex: 3, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={[styles.standingsAvatar, { backgroundColor: entry.color || NAVY }]} />
                    <View>
                      <Text style={[styles.standingsName, isMe && { color: NAVY }]}>
                        {entry.username}
                        {isMe ? ' (you)' : ''}
                        {entry.role === 'owner' ? ' 👑' : ''}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.standingsCell, { flex: 1.2, textAlign: 'center' }]}>{mlRec}</Text>
                  <Text style={[styles.standingsCell, { flex: 1.2, textAlign: 'center' }]}>{sprRec}</Text>
                  <Text style={[styles.standingsPoints, { flex: 1.4, textAlign: 'right' }]}>
                    {formatPoints(entry.total_points)}
                  </Text>
                </View>
              );
            })}

            {/* Progression chart + recent form */}
            <View style={styles.chartDivider} />
            <Text style={[styles.chartTitle, { textAlign: 'center' }]}>Points Progression</Text>
            <ProgressionChart
              progression={progression}
              standings={standings}
            />
          </>
        )}
      </View>

      {/* ── Members ── */}
      <View style={styles.card}>
        <Text style={[styles.sectionTitle, { textAlign: 'center' }]}>Members ({members.length})</Text>
        {members.map((member, idx) => (
          <View
            key={member.user_id}
            style={[styles.memberRow, idx < members.length - 1 && styles.memberRowBorder]}
          >
            <View style={[styles.avatar, { backgroundColor: member.color || NAVY }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.memberName}>
                {member.username}
                {member.user_id === user?.id ? ' (you)' : ''}
              </Text>
            </View>
            <View style={styles.memberActions}>
              <View style={[styles.badge, member.role === 'owner' ? styles.badgeOwner : styles.badgeMember]}>
                <Text style={[styles.badgeText, { color: member.role === 'owner' ? '#fff' : '#4b5563' }]}>
                  {member.role === 'owner' ? 'Owner' : 'Member'}
                </Text>
              </View>
              {isOwner && member.role !== 'owner' && (
                <TouchableOpacity
                  onPress={() => handleRemoveMember(member.user_id, member.username)}
                  disabled={actionLoading}
                  style={{ marginLeft: 8 }}
                >
                  <Text style={styles.removeText}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}
      </View>

      {/* ── Invite Members — compact accordion at the bottom ── */}
      {isOwner && (
        <View style={styles.inviteAccordion}>
          <TouchableOpacity
            style={styles.inviteBar}
            onPress={() => setInviteOpen(o => !o)}
            activeOpacity={0.7}
          >
            <Text style={[styles.inviteBarLabel]}>
              ✉  Invite Members
              {pendingInvitations.length > 0 && (
                <Text style={styles.pendingCount}> · {pendingInvitations.length} pending</Text>
              )}
            </Text>
            <Text style={styles.inviteChevron}>{inviteOpen ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {inviteOpen && (
            <View style={styles.inviteBody}>
              <Text style={styles.inviteHint}>
                Share your invite code or link with friends.
              </Text>
              <View style={styles.codeCard}>
                <Text style={styles.codeLabel}>INVITE CODE</Text>
                <Text style={styles.codeText}>{league.invite_code?.toUpperCase()}</Text>
              </View>
              <TouchableOpacity style={styles.shareBtn} onPress={handleShareInvite} activeOpacity={0.8}>
                <Text style={styles.shareBtnText}>Share Invite Link</Text>
              </TouchableOpacity>
              {pendingInvitations.length > 0 && (
                <View style={{ marginTop: 10 }}>
                  <Text style={styles.pendingLabel}>Pending invites</Text>
                  {pendingInvitations.map(inv => (
                    <View key={inv.id} style={styles.pendingRow}>
                      <Text style={styles.pendingEmail}>{inv.email}</Text>
                      <Text style={styles.pendingExpiry}>
                        exp. {new Date(inv.expires_at).toLocaleDateString()}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>
      )}

      {/* ── Simulate Join (owner dev tool) ── */}
      {isOwner && (
        <View style={styles.simulateCard}>
          <Text style={styles.simulateTitle}>🧪 Dev: Simulate Join</Text>
          <Text style={styles.simulateHint}>
            Fires a test push notification to your device as if someone just joined.
          </Text>
          <TouchableOpacity
            style={[styles.simulateBtn, simulateLoading && { opacity: 0.5 }]}
            onPress={handleSimulateJoin}
            disabled={simulateLoading}
            activeOpacity={0.8}
          >
            {simulateLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.simulateBtnText}>Send Test Notification</Text>
            )}
          </TouchableOpacity>
          {simulateResult ? (
            <Text style={styles.simulateResult}>{simulateResult}</Text>
          ) : null}
        </View>
      )}

      {/* ── Delete League (owner only) ── */}
      {isOwner && (
        <TouchableOpacity
          style={[styles.deleteBtn, actionLoading && { opacity: 0.5 }]}
          onPress={handleDelete}
          disabled={actionLoading}
          activeOpacity={0.8}
        >
          <Text style={styles.deleteBtnText}>Delete League</Text>
        </TouchableOpacity>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.cream },
  content: { padding: 16, paddingBottom: 40 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, padding: 24 },

  // ── Header ──
  header: {
    backgroundColor: C.navy,
    borderRadius: 0,
    paddingHorizontal: 16,
    paddingVertical: 18,
    marginHorizontal: -16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: C.creamDeep,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  leagueName: { fontSize: 24, fontWeight: '900', fontStyle: 'italic', color: C.white, marginBottom: 6 },
  leagueDesc: { color: 'rgba(255, 255, 255, 0.65)', fontSize: 12, marginBottom: 4, fontStyle: 'italic' },
  leagueMeta: { color: 'rgba(255, 255, 255, 0.45)', fontSize: 11, fontStyle: 'italic' },
  leaveText: { color: '#FFB3B3', fontWeight: '700', fontSize: 12, paddingTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },

  // ── Invite accordion ──
  inviteAccordion: {
    backgroundColor: C.parchment,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: C.creamDeep,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: C.creamDeep,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  inviteBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.creamDark,
  },
  inviteBarLabel: { fontSize: 13, fontWeight: '700', color: C.navy, fontStyle: 'italic' },
  pendingCount: { fontSize: 11, color: C.gold, fontWeight: '700' },
  inviteChevron: { fontSize: 11, color: C.inkLight, fontWeight: '700' },
  inviteBody: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: C.creamDark,
  },
  inviteHint: { color: C.inkMid, fontSize: 12, marginBottom: 14, fontStyle: 'italic' },
  codeCard: {
    backgroundColor: C.white,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: C.creamDeep,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 14,
    alignItems: 'center',
    shadowColor: C.creamDeep,
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.8,
    shadowRadius: 0,
    elevation: 2,
  },
  codeLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: C.gold,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 8,
  },
  codeText: { fontSize: 28, fontWeight: '900', color: C.navy, letterSpacing: 4, fontFamily: 'Courier New' },
  shareBtn: {
    backgroundColor: C.navy,
    borderRadius: 0,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  shareBtnText: { color: C.white, fontWeight: '700', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.8 },
  pendingLabel: { fontSize: 9, fontWeight: '700', color: C.inkLight, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8, marginTop: 12 },
  pendingRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.creamDark, paddingHorizontal: 0 },
  pendingEmail: { fontSize: 12, color: C.ink, fontWeight: '500' },
  pendingExpiry: { fontSize: 11, color: C.inkLight, fontStyle: 'italic' },

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
  sectionTitle: { fontSize: 15, fontWeight: '900', fontStyle: 'italic', color: C.navy, marginBottom: 14, textAlign: 'center' },

  // ── Standings ──
  standingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: C.navy,
    marginBottom: 8,
  },
  standingsHeaderCell: { fontSize: 9, fontWeight: '700', color: C.inkLight, textTransform: 'uppercase', letterSpacing: 1 },
  standingsRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11 },
  standingsRowBorder: { borderBottomWidth: 1, borderBottomColor: C.creamDark },
  standingsRowMe: { backgroundColor: C.creamDark, marginHorizontal: -16, paddingHorizontal: 16, borderRadius: 0 },
  standingsRank: { fontSize: 14, fontWeight: '800', color: C.gold },
  standingsAvatar: { width: 28, height: 28, borderRadius: 14 },
  standingsName: { fontSize: 13, fontWeight: '700', color: C.ink, fontStyle: 'italic' },
  standingsUsername: { fontSize: 10, color: C.inkLight },
  standingsCell: { fontSize: 12, color: C.inkMid, fontWeight: '600' },
  standingsPoints: { fontSize: 14, fontWeight: '900', color: C.navy },

  // ── Chart divider / title ──
  chartDivider: { height: 1, backgroundColor: C.creamDark, marginVertical: 16 },
  chartTitle: { fontSize: 12, fontWeight: '700', color: C.inkLight, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },

  // ── Members ──
  memberRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, gap: 12 },
  memberRowBorder: { borderBottomWidth: 1, borderBottomColor: C.creamDark },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  memberName: { fontSize: 13, fontWeight: '700', color: C.ink, fontStyle: 'italic' },
  memberUsername: { fontSize: 11, color: C.inkLight, marginTop: 2 },
  memberActions: { flexDirection: 'row', alignItems: 'center' },
  badge: { borderRadius: 3, paddingHorizontal: 8, paddingVertical: 4 },
  badgeOwner: { backgroundColor: C.navy },
  badgeMember: { backgroundColor: C.creamDark },
  badgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  removeText: { color: C.red, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },

  // ── Simulate Join (dev tool) ──
  simulateCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 0,
    borderWidth: 1.5,
    borderColor: '#3a3a5c',
    borderStyle: 'dashed',
    padding: 16,
    marginBottom: 16,
  },
  simulateTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#a78bfa',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  simulateHint: {
    fontSize: 11,
    color: '#8b8ba7',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  simulateBtn: {
    backgroundColor: '#4f46e5',
    borderRadius: 0,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  simulateBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  simulateResult: {
    fontSize: 11,
    color: '#a5b4fc',
    marginTop: 10,
    fontStyle: 'italic',
    textAlign: 'center',
  },

  // ── Delete ──
  deleteBtn: {
    borderWidth: 2,
    borderColor: C.red,
    borderRadius: 0,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: 'rgba(196, 30, 58, 0.05)',
  },
  deleteBtnText: { color: C.red, fontWeight: '700', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 },

  // ── Misc ──
  emptyText: { color: C.inkLight, textAlign: 'center', paddingVertical: 14, fontStyle: 'italic' },
  errorBox: { backgroundColor: 'rgba(196, 30, 58, 0.08)', borderRadius: 0, padding: 12, marginBottom: 12, borderWidth: 1.5, borderColor: C.red },
  errorText: { color: C.red, fontSize: 13, fontWeight: '600', fontStyle: 'italic' },
  btn: { backgroundColor: C.navy, borderRadius: 0, paddingVertical: 12, paddingHorizontal: 24, marginTop: 8 },
  btnText: { color: C.white, fontWeight: '700', fontSize: 14, textTransform: 'uppercase', letterSpacing: 0.8 },
});
