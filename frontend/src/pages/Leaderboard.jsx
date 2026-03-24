import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLeaderboard } from '../hooks/useLeaderboard';
import { useLeagues } from '../hooks/useLeagues';
import LeaderboardTable from '../components/leaderboard/LeaderboardTable';
import Loading from '../components/common/Loading';

export default function Leaderboard() {
  const { user } = useAuth();
  const { leagues } = useLeagues();
  const [selectedLeague, setSelectedLeague] = useState('');
  const { leaderboard, loading } = useLeaderboard(selectedLeague);

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-secondary-navy mb-2">
              Season Leaderboard
            </h1>
            <p className="text-gray-600">
              Track your progress through the season. Rankings update daily after all games are final.
            </p>
          </div>

          {leagues.length > 0 && (
            <select
              value={selectedLeague}
              onChange={(e) => setSelectedLeague(e.target.value)}
              className="input-field w-auto min-w-[160px]"
            >
              <option value="">Global</option>
              {leagues.map(league => (
                <option key={league.id} value={league.id}>
                  {league.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <LeaderboardTable leaderboard={leaderboard} currentUserId={user.id} />
    </div>
  );
}
