import { useState } from 'react';
import { getTeamLogo, getTeamName, getTeamColor } from '../../utils/teamLogos';
import api from '../../services/api';
import { USE_MOCK_DATA } from '../../utils/mockData';

export default function GameCard({ game, existingPick, onPickMade, submitted }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const gameTime = new Date(game.game_time);
  const isLocked = game.data_locked || submitted;

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Calculate spread display
  const getSpreadDisplay = (team) => {
    if (!game.spread) return '';

    if (team === 'home') {
      return game.spread > 0 ? `+${game.spread}` : game.spread;
    } else {
      return game.spread > 0 ? game.spread * -1 : `+${game.spread * -1}`;
    }
  };

  const handlePickClick = async (pickedTeam, pickType) => {
    if (isLocked || loading) return;

    setLoading(true);
    setError('');

    try {
      if (USE_MOCK_DATA) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 300));

        onPickMade({
          gameId: game.id,
          pickType,
          pickedTeam
        });
      } else {
        const response = await api.post('/picks', {
          gameId: game.id,
          pickType,
          pickedTeam
        });

        onPickMade(response.data.pick);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to make pick');
    } finally {
      setLoading(false);
    }
  };

  const isPicked = (team, pickType) => {
    return existingPick && existingPick.picked_team === team && existingPick.pick_type === pickType;
  };

  return (
    <div className="card hover:shadow-lg transition-shadow">
      {/* Game Time and Lock Status */}
      <div className="text-center text-sm text-gray-600 mb-4">
        {formatTime(gameTime)} {isLocked && '🔒'}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 text-red-700 px-3 py-2 rounded mb-3 text-sm">
          {error}
        </div>
      )}

      {/* Team Sections - Horizontal Layout */}
      <div className="flex items-stretch gap-3">
        {/* Away Team Section */}
        <div className="flex-1 flex flex-col items-center space-y-3">
          {/* Team Logo and Info */}
          <div className="flex flex-col items-center">
            <img
              src={getTeamLogo(game.away_team_abbr)}
              alt={getTeamName(game.away_team_abbr)}
              className="w-16 h-16 object-contain mb-2"
              loading="lazy"
            />
            <div className="font-bold text-lg">{game.away_team_abbr}</div>
            {game.away_score !== null && (
              <div className="text-2xl font-bold mt-1">{game.away_score}</div>
            )}
          </div>

          {/* Pick Buttons */}
          <div className="w-full space-y-2">
            {/* Moneyline Button */}
            <button
              onClick={() => handlePickClick('away', 'moneyline')}
              disabled={isLocked || loading}
              className={`w-full py-2 px-3 rounded-lg text-sm font-medium transition-all border-2 ${
                isPicked('away', 'moneyline')
                  ? 'text-white'
                  : 'bg-white hover:opacity-80'
              } ${isLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              style={{
                backgroundColor: isPicked('away', 'moneyline') ? getTeamColor(game.away_team_abbr) : 'white',
                borderColor: getTeamColor(game.away_team_abbr),
                color: isPicked('away', 'moneyline') ? 'white' : getTeamColor(game.away_team_abbr)
              }}
            >
              ML
            </button>

            {/* Spread Button */}
            <button
              onClick={() => handlePickClick('away', 'spread')}
              disabled={isLocked || loading}
              className={`w-full py-2 px-3 rounded-lg text-sm font-medium transition-all border-2 ${
                isPicked('away', 'spread')
                  ? 'text-white'
                  : 'bg-white hover:opacity-80'
              } ${isLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              style={{
                backgroundColor: isPicked('away', 'spread') ? getTeamColor(game.away_team_abbr) : 'white',
                borderColor: getTeamColor(game.away_team_abbr),
                color: isPicked('away', 'spread') ? 'white' : getTeamColor(game.away_team_abbr)
              }}
            >
              {getSpreadDisplay('away')}
            </button>
          </div>
        </div>

        {/* VS Separator */}
        <div className="flex items-center justify-center px-2">
          {submitted ? (
            <div className="text-2xl">🔒</div>
          ) : (
            <div className="text-gray-400 font-bold text-lg">VS</div>
          )}
        </div>

        {/* Home Team Section */}
        <div className="flex-1 flex flex-col items-center space-y-3">
          {/* Team Logo and Info */}
          <div className="flex flex-col items-center">
            <img
              src={getTeamLogo(game.home_team_abbr)}
              alt={getTeamName(game.home_team_abbr)}
              className="w-16 h-16 object-contain mb-2"
              loading="lazy"
            />
            <div className="font-bold text-lg">{game.home_team_abbr}</div>
            {game.home_score !== null && (
              <div className="text-2xl font-bold mt-1">{game.home_score}</div>
            )}
          </div>

          {/* Pick Buttons */}
          <div className="w-full space-y-2">
            {/* Moneyline Button */}
            <button
              onClick={() => handlePickClick('home', 'moneyline')}
              disabled={isLocked || loading}
              className={`w-full py-2 px-3 rounded-lg text-sm font-medium transition-all border-2 ${
                isPicked('home', 'moneyline')
                  ? 'text-white'
                  : 'bg-white hover:opacity-80'
              } ${isLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              style={{
                backgroundColor: isPicked('home', 'moneyline') ? getTeamColor(game.home_team_abbr) : 'white',
                borderColor: getTeamColor(game.home_team_abbr),
                color: isPicked('home', 'moneyline') ? 'white' : getTeamColor(game.home_team_abbr)
              }}
            >
              ML
            </button>

            {/* Spread Button */}
            <button
              onClick={() => handlePickClick('home', 'spread')}
              disabled={isLocked || loading}
              className={`w-full py-2 px-3 rounded-lg text-sm font-medium transition-all border-2 ${
                isPicked('home', 'spread')
                  ? 'text-white'
                  : 'bg-white hover:opacity-80'
              } ${isLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              style={{
                backgroundColor: isPicked('home', 'spread') ? getTeamColor(game.home_team_abbr) : 'white',
                borderColor: getTeamColor(game.home_team_abbr),
                color: isPicked('home', 'spread') ? 'white' : getTeamColor(game.home_team_abbr)
              }}
            >
              {getSpreadDisplay('home')}
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
