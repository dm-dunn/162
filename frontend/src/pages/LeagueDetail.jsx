import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { leagueService } from '../services/leagues';
import { useAuth } from '../context/AuthContext';
import Loading from '../components/common/Loading';
import LeagueProgressionChart from '../components/league/LeagueProgressionChart';

export default function LeagueDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [league, setLeague] = useState(null);
  const [members, setMembers] = useState([]);
  const [standings, setStandings] = useState([]);
  const [progression, setProgression] = useState([]);
  const [recentForm, setRecentForm] = useState([]);
  const [isOwner, setIsOwner] = useState(false);
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('standings');

  // Invite form state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteResults, setInviteResults] = useState([]);

  // Leave/remove state
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchLeague();
  }, [id]);

  const fetchLeague = async () => {
    try {
      setLoading(true);
      const [data, standingsData, progressionData] = await Promise.all([
        leagueService.getLeague(id),
        leagueService.getStandings(id).catch(() => ({ standings: [] })),
        leagueService.getProgression(id).catch(() => ({ progression: [], recentForm: [] }))
      ]);
      setLeague(data.league);
      setMembers(data.members);
      setIsOwner(data.isOwner);
      setPendingInvitations(data.pendingInvitations || []);
      setStandings(standingsData.standings || []);
      setProgression(progressionData.progression || []);
      setRecentForm(progressionData.recentForm || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load league');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviting(true);
    setInviteResults([]);

    const emails = emailInput
      .split(/[,\n]/)
      .map(e => e.trim())
      .filter(e => e.length > 0);

    if (emails.length === 0) return;

    try {
      const data = await leagueService.inviteMembers(id, emails);
      setInviteResults(data.results);
      setEmailInput('');
      fetchLeague();
    } catch (err) {
      setInviteResults([{ email: 'all', status: 'failed', error: err.response?.data?.error || 'Failed to send invitations' }]);
    } finally {
      setInviting(false);
    }
  };

  const handleLeave = async () => {
    if (!confirm('Are you sure you want to leave this league?')) return;
    setActionLoading(true);
    try {
      await leagueService.leaveLeague(id);
      navigate('/leagues');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to leave league');
      setActionLoading(false);
    }
  };

  const handleRemoveMember = async (userId, username) => {
    if (!confirm(`Remove ${username} from this league?`)) return;
    setActionLoading(true);
    try {
      await leagueService.removeMember(id, userId);
      fetchLeague();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to remove member');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <Loading />;

  if (error && !league) {
    return (
      <div className="max-w-2xl mx-auto mt-8">
        <div className="card text-center">
          <p className="text-red-600">{error}</p>
          <button onClick={() => navigate('/leagues')} className="btn-primary mt-4">
            Back to Leagues
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">

      {/* League Header — blue background */}
      <div className="rounded-xl px-6 py-5" style={{ backgroundColor: '#000080' }}>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-white">{league.name}</h1>
            {league.description && (
              <p className="text-blue-200 mt-1 text-sm">{league.description}</p>
            )}
            <p className="text-blue-300 text-xs mt-2">
              Created by {league.owner_username} &middot; {league.member_count} {league.member_count === 1 ? 'member' : 'members'}
            </p>
          </div>
          {!isOwner && (
            <button
              onClick={handleLeave}
              disabled={actionLoading}
              className="text-xs text-red-300 hover:text-red-200 font-medium mt-1"
            >
              Leave League
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Invite Section — collapsed by default, ~10% viewport */}
      {isOwner && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setInviteOpen(o => !o)}
            className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Invite Members
              {pendingInvitations.length > 0 && (
                <span className="bg-yellow-100 text-yellow-700 text-[10px] px-1.5 py-0.5 rounded-full font-semibold">
                  {pendingInvitations.length} pending
                </span>
              )}
            </span>
            <svg
              className={`w-3.5 h-3.5 transition-transform ${inviteOpen ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {inviteOpen && (
            <div className="px-4 pb-3 border-t border-gray-100">
              <form onSubmit={handleInvite} className="flex gap-2 items-start mt-2.5">
                <textarea
                  value={emailInput}
                  onChange={e => setEmailInput(e.target.value)}
                  className="input-field text-xs py-1.5 flex-1"
                  rows={2}
                  placeholder="friend@example.com, buddy@example.com"
                  required
                />
                <button type="submit" disabled={inviting} className="btn-primary text-xs py-1.5 px-3 whitespace-nowrap">
                  {inviting ? 'Sending...' : 'Send Invites'}
                </button>
              </form>

              {inviteResults.length > 0 && (
                <div className="mt-2 space-y-1">
                  {inviteResults.map((result, i) => (
                    <div key={i} className={`text-xs px-2 py-1 rounded ${result.status === 'sent' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                      {result.email}: {result.status === 'sent' ? 'Invitation sent' : result.error || 'Failed'}
                    </div>
                  ))}
                </div>
              )}

              {pendingInvitations.length > 0 && (
                <div className="mt-2">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Pending</p>
                  <div className="space-y-1">
                    {pendingInvitations.map(inv => (
                      <div key={inv.id} className="flex justify-between text-xs bg-gray-50 rounded px-2 py-1">
                        <span className="text-gray-700">{inv.email}</span>
                        <span className="text-gray-400">Expires {new Date(inv.expires_at).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tabs: Standings + Members */}
      <div className="card">
        <div className="flex border-b border-gray-200 mb-4">
          {['standings', 'members'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px transition-colors ${
                activeTab === tab
                  ? 'border-secondary-navy text-secondary-navy'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'standings' ? 'Standings' : `Members (${members.length})`}
            </button>
          ))}
        </div>

        {activeTab === 'standings' && (
          <div>
            {standings.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">No standings data yet.</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-gray-500 uppercase border-b border-gray-100">
                        <th className="text-left pb-2 w-8">#</th>
                        <th className="text-left pb-2">Player</th>
                        <th className="text-right pb-2">Pts</th>
                        <th className="text-right pb-2 hidden sm:table-cell">GP</th>
                        <th className="text-right pb-2 hidden sm:table-cell">ML%</th>
                        <th className="text-right pb-2 hidden sm:table-cell">Sprd%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {standings.map((entry, i) => (
                        <tr
                          key={entry.user_id}
                          className={`border-b border-gray-50 last:border-0 ${entry.user_id === user?.id ? 'bg-blue-50' : ''}`}
                        >
                          <td className="py-2.5 pr-2">
                            <span className={`text-xs font-bold ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-amber-600' : 'text-gray-400'}`}>
                              {i + 1}
                            </span>
                          </td>
                          <td className="py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color || '#1e40af' }} />
                              <div>
                                <span className="font-medium text-gray-900">{entry.username}</span>
                                {entry.user_id === user?.id && <span className="text-xs text-gray-400 ml-1">(you)</span>}
                                {entry.role === 'owner' && <span className="ml-1 text-xs text-secondary-navy font-medium">★</span>}
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 text-right font-bold text-secondary-navy">{entry.total_points}</td>
                          <td className="py-2.5 text-right text-gray-500 hidden sm:table-cell">{entry.total_games}</td>
                          <td className="py-2.5 text-right text-gray-500 hidden sm:table-cell">{parseFloat(entry.ml_pct).toFixed(1)}%</td>
                          <td className="py-2.5 text-right text-gray-500 hidden sm:table-cell">{parseFloat(entry.spread_pct).toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <LeagueProgressionChart
                  standings={standings}
                  progression={progression}
                  recentForm={recentForm}
                />
              </>
            )}
          </div>
        )}

        {activeTab === 'members' && (
          <div className="space-y-3">
            {members.map(member => (
              <div
                key={member.user_id}
                className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex-shrink-0"
                    style={{ backgroundColor: member.color || '#1e40af' }}
                  />
                  <div>
                    <p className="font-medium text-gray-900">
                      {member.username}
                      {member.user_id === user?.id && (
                        <span className="text-xs text-gray-400 ml-2">(you)</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    member.role === 'owner'
                      ? 'bg-secondary-navy text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {member.role === 'owner' ? 'Owner' : 'Member'}
                  </span>
                  {isOwner && member.role !== 'owner' && (
                    <button
                      onClick={() => handleRemoveMember(member.user_id, member.username)}
                      disabled={actionLoading}
                      className="text-xs text-red-500 hover:text-red-600"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
