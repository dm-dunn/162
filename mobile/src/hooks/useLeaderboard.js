import { useState, useEffect } from 'react';
import api from '../services/api';
import { USE_MOCK_DATA, mockLeaderboard } from '../utils/mockData';

export function useLeaderboard(leagueId = '') {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchLeaderboard();
  }, [leagueId]);

  const fetchLeaderboard = async () => {
    if (USE_MOCK_DATA) {
      setLeaderboard(mockLeaderboard);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const params = leagueId ? `?leagueId=${leagueId}` : '';
      const response = await api.get(`/leaderboard${params}`);
      setLeaderboard(response.data.leaderboard);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch leaderboard');
    } finally {
      setLoading(false);
    }
  };

  return { leaderboard, loading, error, refetch: fetchLeaderboard };
}
