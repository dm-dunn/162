import { useState } from 'react';
import api from '../../services/api';
import { USE_MOCK_DATA } from '../../utils/mockData';

export default function PickSelector({ game, existingPick, onPickMade }) {
  const [pickType, setPickType] = useState(existingPick?.pick_type || 'moneyline');
  const [pickedTeam, setPickedTeam] = useState(existingPick?.picked_team || 'home');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (USE_MOCK_DATA) {
        // Simulate API delay for realistic UX
        await new Promise(resolve => setTimeout(resolve, 300));

        // Return the pick data directly
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

  return (
    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
      {error && (
        <div className="bg-red-100 text-red-700 px-3 py-2 rounded mb-3 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Pick Type</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPickType('moneyline')}
              className={`py-2 px-4 rounded-lg font-medium transition-colors ${
                pickType === 'moneyline'
                  ? 'bg-secondary-navy text-white'
                  : 'bg-white border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Moneyline (+1)
            </button>
            <button
              type="button"
              onClick={() => setPickType('spread')}
              className={`py-2 px-4 rounded-lg font-medium transition-colors ${
                pickType === 'spread'
                  ? 'bg-secondary-navy text-white'
                  : 'bg-white border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Spread (+2/-1)
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Team</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPickedTeam('away')}
              className={`py-3 px-4 rounded-lg font-medium transition-colors ${
                pickedTeam === 'away'
                  ? 'bg-secondary-red text-white'
                  : 'bg-white border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {game.away_team_abbr}
            </button>
            <button
              type="button"
              onClick={() => setPickedTeam('home')}
              className={`py-3 px-4 rounded-lg font-medium transition-colors ${
                pickedTeam === 'home'
                  ? 'bg-secondary-red text-white'
                  : 'bg-white border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {game.home_team_abbr}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full btn-primary"
        >
          {loading ? 'Submitting...' : existingPick ? 'Update Pick' : 'Submit Pick'}
        </button>
      </form>
    </div>
  );
}