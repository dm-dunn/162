import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLeaderboard } from '../hooks/useLeaderboard';
import { useGames } from '../hooks/useGames';
import { usePicks } from '../hooks/usePicks';
import Loading from '../components/common/Loading';
import GameCard from '../components/game/GameCard';
import api from '../services/api';
import { mockGames, mockPicks, USE_MOCK_DATA } from '../utils/mockData';

export default function Dashboard() {
  const { user } = useAuth();
  const { leaderboard, loading: leaderboardLoading } = useLeaderboard();
  const { games: apiGames, loading: gamesLoading, refetch: refetchGames } = useGames();
  const { picks: apiPicks, loading: picksLoading, refetch: refetchPicks } = usePicks();

  const [localPicks, setLocalPicks] = useState(mockPicks);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Use mock data if enabled, otherwise use API data
  const games = USE_MOCK_DATA ? mockGames : apiGames;
  const picks = USE_MOCK_DATA ? localPicks : apiPicks;

  const userRank = leaderboard.find(entry => entry.user_id === user.id);
  const todaysGames = games.length;

  const handlePickMade = (newPick) => {
    if (USE_MOCK_DATA) {
      // For mock data, create a complete pick object
      const completePick = {
        id: Date.now(), // Use timestamp as unique ID for mock
        game_id: newPick.gameId,
        pick_type: newPick.pickType,
        picked_team: newPick.pickedTeam,
        result: null,
        points_earned: 0
      };

      // Update local mock picks
      setLocalPicks(prev => {
        const existingIndex = prev.findIndex(p => p.game_id === completePick.game_id);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = completePick;
          return updated;
        }
        return [...prev, completePick];
      });
    } else {
      // Refresh real picks from API
      refetchPicks();
      refetchGames();
    }
  };

  const handleSubmitPicks = async () => {
    setSubmitting(true);
    setSubmitError('');

    try {
      if (USE_MOCK_DATA) {
        await new Promise(resolve => setTimeout(resolve, 500));
        setSubmitted(true);
      } else {
        const pickData = picks.map(p => ({
          gameId: p.game_id,
          pickType: p.pick_type,
          pickedTeam: p.picked_team
        }));
        await api.post('/picks/submit-all', { picks: pickData });
        setSubmitted(true);
        refetchPicks();
      }
    } catch (err) {
      setSubmitError(err.response?.data?.error || 'Failed to submit picks');
    } finally {
      setSubmitting(false);
    }
  };

  // Count how many games have picks
  const pickedGameCount = games.filter(g => picks.some(p => p.game_id === g.id)).length;

  if (leaderboardLoading || (gamesLoading && !USE_MOCK_DATA) || (picksLoading && !USE_MOCK_DATA)) {
    return <Loading />;
  }

  return (
    <div className="space-y-6">
      <div className="text-center py-2">
        <h1 className="text-3xl font-bold text-secondary-navy">
          Welcome back, {user.username}!
        </h1>
        <p className="text-gray-500 mt-1">Track your picks and climb the leaderboard</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
        <div className="card bg-secondary-navy text-white">
          <div className="text-sm mb-2">Your Rank</div>
          <div className="text-4xl font-bold">
            {userRank?.rank || '-'}
          </div>
          {userRank && (
            <div className="text-sm mt-2">
              {userRank.total_points} points
            </div>
          )}
        </div>

        <div className="card bg-secondary-red text-white">
          <div className="text-sm mb-2">Today's Games</div>
          <div className="text-4xl font-bold">{todaysGames}</div>
          <div className="text-sm mt-2">Make your picks</div>
        </div>

        <div className="card bg-tertiary-brown text-white">
          <div className="text-sm mb-2">Win Rate</div>
          <div className="text-4xl font-bold">
            {userRank?.moneyline_win_pct || 0}%
          </div>
          <div className="text-sm mt-2">Moneyline picks</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card flex flex-col">
          <h2 className="text-xl font-bold text-secondary-navy mb-4">Your Stats</h2>
          {userRank ? (
            <div className="grid grid-cols-3 gap-3 flex-1">
              <div className="bg-gray-50 rounded-xl p-4 text-center border border-gray-100 flex flex-col items-center justify-center flex-1">
                <div className="text-3xl font-bold text-secondary-navy">{userRank.total_games}</div>
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mt-1">Games</div>
              </div>
              <div className="bg-green-50 rounded-xl p-4 text-center border border-green-100 flex flex-col items-center justify-center flex-1">
                <div className="text-3xl font-bold text-green-600">
                  {userRank.moneyline_wins}-{userRank.moneyline_losses}
                </div>
                <div className="text-xs font-medium text-green-600 uppercase tracking-wide mt-1">Moneyline</div>
              </div>
              <div className="bg-blue-50 rounded-xl p-4 text-center border border-blue-100 flex flex-col items-center justify-center flex-1">
                <div className="text-3xl font-bold text-blue-600">
                  {userRank.spread_wins}-{userRank.spread_losses}
                </div>
                <div className="text-xs font-medium text-blue-600 uppercase tracking-wide mt-1">Spread</div>
              </div>
            </div>
          ) : (
            <p className="text-gray-600">Make your first pick to see stats!</p>
          )}
        </div>

        <div className="card">
          <h2 className="text-xl font-bold text-secondary-navy mb-4 text-center">Leaderboard</h2>
          <div className="space-y-2">
            {leaderboard.slice(0, 5).map((entry) => {
              const isCurrentUser = entry.user_id === user.id;
              const maxPoints = Math.max(...leaderboard.map(e => e.total_points), 100);
              const percentOfMax = (entry.total_points / maxPoints) * 100;

              return (
                <div
                  key={entry.user_id}
                  className={`rounded-lg transition-all ${
                    isCurrentUser ? 'ring-2 ring-secondary-red' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Rank */}
                    <span className="text-lg font-bold text-secondary-navy min-w-[2rem] text-center">
                      {entry.rank}
                    </span>

                    {/* Bar graph container */}
                    <div className="flex-1 relative h-9 bg-gray-100 rounded-lg overflow-hidden shadow-inner">
                      {/* Colored bar with gradient and shadow */}
                      <div
                        className="absolute inset-y-0 left-0 rounded-lg transition-all duration-500 flex items-center justify-between px-3 shadow-md"
                        style={{
                          width: `${percentOfMax}%`,
                          background: `linear-gradient(to bottom, ${entry.color || '#1e40af'}, ${entry.color || '#1e40af'}dd)`,
                          minWidth: percentOfMax > 0 ? '60px' : '0'
                        }}
                      >
                        {/* Glossy overlay on top half */}
                        <div className="absolute inset-0 rounded-lg pointer-events-none"
                             style={{
                               background: 'linear-gradient(to bottom, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.1) 40%, transparent 50%)'
                             }}
                        />

                        {/* Content */}
                        <div className="flex items-center gap-2 text-white text-sm font-medium relative z-10">
                          <span>{entry.username}</span>
                          {isCurrentUser && (
                            <span className="text-xs bg-white/20 backdrop-blur-sm px-1.5 py-0.5 rounded">
                              You
                            </span>
                          )}
                        </div>
                        <span className="text-white text-sm font-semibold relative z-10">
                          {entry.total_points}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="text-2xl font-bold text-secondary-navy mb-6 text-center">Today's Games</h2>
        {USE_MOCK_DATA && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <span className="text-yellow-700 font-semibold">🧪 Mock Data Mode</span>
            </div>
            <p className="text-sm text-yellow-600 mt-1">
              Using test data. Picks won't be saved to the database.
            </p>
          </div>
        )}
        {games.length === 0 ? (
          <p className="text-gray-600 text-center py-8">No games scheduled for today</p>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {games.map((game) => {
                const existingPick = picks.find(p => p.game_id === game.id);
                return (
                  <GameCard
                    key={game.id}
                    game={game}
                    existingPick={existingPick}
                    onPickMade={handlePickMade}
                    submitted={submitted}
                  />
                );
              })}
            </div>

            {/* Submit Picks Button */}
            {!submitted && pickedGameCount > 0 && (
              <div className="mt-6 text-center">
                {submitError && (
                  <div className="bg-red-100 text-red-700 px-4 py-2 rounded-lg mb-4 text-sm">
                    {submitError}
                  </div>
                )}
                <button
                  onClick={handleSubmitPicks}
                  disabled={submitting}
                  className="btn-primary px-8 py-3 text-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Submitting...' : `Submit Picks (${pickedGameCount}/${games.length})`}
                </button>
                <p className="text-sm text-gray-500 mt-2">
                  Once submitted, your picks will be locked and cannot be changed.
                </p>
              </div>
            )}

            {submitted && (
              <div className="mt-6 text-center">
                <div className="bg-secondary-navy text-white px-4 py-3 rounded-lg inline-flex items-center gap-2">
                  <span className="text-lg">🔒</span>
                  <span className="font-semibold">Picks submitted and locked!</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}