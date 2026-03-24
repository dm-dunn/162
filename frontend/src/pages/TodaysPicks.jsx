import { useAuth } from '../context/AuthContext';
import { useLeaderboard } from '../hooks/useLeaderboard';
import { useGames } from '../hooks/useGames';
import Loading from '../components/common/Loading';

export default function Dashboard() {
  const { user } = useAuth();
  const { leaderboard, loading: leaderboardLoading } = useLeaderboard();
  const { games, loading: gamesLoading } = useGames();

  const userRank = leaderboard.find(entry => entry.user_id === user.id);
  const todaysGames = games.length;

  if (leaderboardLoading || gamesLoading) {
    return <Loading />;
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <h1 className="text-3xl font-bold text-secondary-navy mb-2">
          Welcome back, {user.username}!
        </h1>
        <p className="text-gray-600">Track your picks and climb the leaderboard</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
        <div className="card">
          <h2 className="text-xl font-bold text-secondary-navy mb-4">Your Stats</h2>
          {userRank ? (
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Games:</span>
                <span className="font-semibold">{userRank.total_games}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Moneyline Record:</span>
                <span className="font-semibold">
                  {userRank.moneyline_wins}-{userRank.moneyline_losses}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Spread Record:</span>
                <span className="font-semibold">
                  {userRank.spread_wins}-{userRank.spread_losses}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-gray-600">Make your first pick to see stats!</p>
          )}
        </div>

        <div className="card">
          <h2 className="text-xl font-bold text-secondary-navy mb-4">Top 5 Leaders</h2>
          <div className="space-y-2">
            {leaderboard.slice(0, 5).map((entry, index) => (
              <div key={entry.user_id} className="flex justify-between items-center py-2 border-b last:border-0">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-lg text-secondary-navy">
                    {index + 1}
                  </span>
                  <span className="font-medium">
                    {entry.username}
                  </span>
                </div>
                <span className="font-bold text-secondary-navy">
                  {entry.total_points} pts
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}