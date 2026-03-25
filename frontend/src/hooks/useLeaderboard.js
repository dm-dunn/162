import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { USE_MOCK_DATA, mockLeaderboard } from '../utils/mockData';

export function useLeaderboard(leagueId = '') {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLeaderboard = useCallback(async (signal) => {
    if (USE_MOCK_DATA) {
      setLeaderboard(mockLeaderboard);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const params = leagueId ? `?leagueId=${leagueId}` : '';
      const response = await api.get(`/leaderboard${params}`, { signal });
      setLeaderboard(response.data.leaderboard);
      setError(null);
    } catch (err) {
      if (err.name === 'CanceledError') return;
      setError(err.response?.data?.error || 'Failed to fetch leaderboard');
    } finally {
      setLoading(false);
    }
  }, [leagueId]);

  useEffect(() => {
    const controller = new AbortController();
    fetchLeaderboard(controller.signal);
    return () => controller.abort();
  }, [fetchLeaderboard]);

  return { leaderboard, loading, error, refetch: () => fetchLeaderboard() };
}
