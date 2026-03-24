import { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { leagueService } from '../services/leagues';
import { useAuth } from '../context/AuthContext';
import Loading from '../components/common/Loading';

export default function JoinLeague() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { user } = useAuth();
  const navigate = useNavigate();

  const [inviteInfo, setInviteInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    if (token) {
      fetchInviteInfo();
    } else {
      setLoading(false);
      setError('No invitation token provided');
    }
  }, [token]);

  const fetchInviteInfo = async () => {
    try {
      const data = await leagueService.getInviteInfo(token);
      setInviteInfo(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid or expired invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    setJoining(true);
    setError('');
    try {
      const data = await leagueService.joinLeague(token);
      setJoined(true);
      setTimeout(() => navigate(`/leagues/${data.leagueId}`), 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to join league');
    } finally {
      setJoining(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="max-w-md mx-auto mt-16">
      <div className="card text-center">
        {error && !inviteInfo ? (
          <>
            <div className="text-red-500 text-5xl mb-4">&#10007;</div>
            <h2 className="text-2xl font-bold text-secondary-navy mb-2">Invalid Invitation</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <Link to="/dashboard" className="btn-primary inline-block">
              Go to Dashboard
            </Link>
          </>
        ) : joined ? (
          <>
            <div className="text-green-500 text-5xl mb-4">&#10003;</div>
            <h2 className="text-2xl font-bold text-secondary-navy mb-2">You're in!</h2>
            <p className="text-gray-600 mb-4">
              You've joined <strong>{inviteInfo.leagueName}</strong>. Redirecting...
            </p>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-secondary-navy mb-2">League Invitation</h2>
            <div className="bg-gray-50 rounded-lg p-6 my-6">
              <h3 className="text-xl font-bold text-secondary-navy">{inviteInfo.leagueName}</h3>
              <p className="text-gray-500 text-sm mt-2">
                Invited by {inviteInfo.inviterName} &middot; {inviteInfo.memberCount} {inviteInfo.memberCount === 1 ? 'member' : 'members'}
              </p>
            </div>

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">
                {error}
              </div>
            )}

            {user ? (
              <button
                onClick={handleJoin}
                disabled={joining}
                className="w-full btn-primary"
              >
                {joining ? 'Joining...' : 'Join League'}
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-gray-600 text-sm">
                  You need an account to join this league.
                </p>
                <Link
                  to={`/register?leagueToken=${token}`}
                  className="w-full btn-primary inline-block"
                >
                  Create Account & Join
                </Link>
                <p className="text-sm text-gray-500">
                  Already have an account?{' '}
                  <Link to="/login" className="text-secondary-red hover:underline">
                    Log in
                  </Link>
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
