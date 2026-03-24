import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Share,
} from 'react-native';
import { leagueService } from '../services/leagues';
import { useAuth } from '../context/AuthContext';
import ProgressionChart from '../components/league/ProgressionChart';

const NAVY = '#000080';

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
                    {entry.total_points}
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
              <View style={styles.codeBox}>
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
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  content: { padding: 16, paddingBottom: 40 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, padding: 24 },

  // ── Header ──
  header: {
    backgroundColor: NAVY,
    borderRadius: 14,
    padding: 18,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  leagueName: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 4 },
  leagueDesc: { color: '#93c5fd', fontSize: 13, marginBottom: 4 },
  leagueMeta: { color: '#bfdbfe', fontSize: 12 },
  leaveText: { color: '#fca5a5', fontWeight: '600', fontSize: 13, paddingTop: 2 },

  // ── Invite accordion ──
  inviteAccordion: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  inviteBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  inviteBarLabel: { fontSize: 13, fontWeight: '600', color: '#374151' },
  pendingCount: { fontSize: 12, color: '#f59e0b', fontWeight: '600' },
  inviteChevron: { fontSize: 10, color: '#9ca3af' },
  inviteBody: {
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inviteHint: { color: '#6b7280', fontSize: 12, marginBottom: 10 },
  codeBox: {
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  codeText: { fontSize: 24, fontWeight: '900', color: NAVY, letterSpacing: 5 },
  shareBtn: {
    backgroundColor: '#FF0000',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  shareBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  pendingLabel: { fontSize: 11, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', marginBottom: 6 },
  pendingRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  pendingEmail: { fontSize: 12, color: '#374151' },
  pendingExpiry: { fontSize: 11, color: '#9ca3af' },

  // ── Card ──
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionTitle: { fontSize: 17, fontWeight: 'bold', color: NAVY, marginBottom: 14 },

  // ── Standings ──
  standingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1.5,
    borderBottomColor: '#e5e7eb',
    marginBottom: 4,
  },
  standingsHeaderCell: { fontSize: 11, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5 },
  standingsRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  standingsRowBorder: { borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  standingsRowMe: { backgroundColor: '#eff6ff', marginHorizontal: -16, paddingHorizontal: 16, borderRadius: 8 },
  standingsRank: { fontSize: 14, fontWeight: '800' },
  standingsAvatar: { width: 28, height: 28, borderRadius: 14 },
  standingsName: { fontSize: 13, fontWeight: '600', color: '#111827' },
  standingsUsername: { fontSize: 11, color: '#9ca3af' },
  standingsCell: { fontSize: 13, color: '#374151', fontWeight: '500' },
  standingsPoints: { fontSize: 14, fontWeight: '800', color: NAVY },

  // ── Chart divider / title ──
  chartDivider: { height: 1, backgroundColor: '#f3f4f6', marginVertical: 16 },
  chartTitle: { fontSize: 13, fontWeight: '700', color: '#6b7280', marginBottom: 4 },

  // ── Members ──
  memberRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  memberRowBorder: { borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  memberName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  memberUsername: { fontSize: 12, color: '#6b7280', marginTop: 1 },
  memberActions: { flexDirection: 'row', alignItems: 'center' },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeOwner: { backgroundColor: NAVY },
  badgeMember: { backgroundColor: '#f3f4f6' },
  badgeText: { fontSize: 11, fontWeight: '600' },
  removeText: { color: '#ef4444', fontSize: 12, fontWeight: '500' },

  // ── Delete ──
  deleteBtn: {
    borderWidth: 1.5,
    borderColor: '#fca5a5',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: 10,
  },
  deleteBtnText: { color: '#ef4444', fontWeight: '700', fontSize: 14 },

  // ── Misc ──
  emptyText: { color: '#6b7280', textAlign: 'center', paddingVertical: 12 },
  errorBox: { backgroundColor: '#fef2f2', borderRadius: 8, padding: 12, marginBottom: 10 },
  errorText: { color: '#dc2626', fontSize: 14 },
  btn: { backgroundColor: NAVY, borderRadius: 8, paddingVertical: 12, paddingHorizontal: 24, marginTop: 8 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
