import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export function useGames(date) {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchGames = useCallback(async (signal) => {
    try {
      setLoading(true);
      const endpoint = date ? `/games/date/${date}` : '/games/today';
      const response = await api.get(endpoint, { signal });
      setGames(response.data.games);
      setError(null);
    } catch (err) {
      if (err.name === 'CanceledError') return;
      setError(err.response?.data?.error || 'Failed to fetch games');
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    const controller = new AbortController();
    fetchGames(controller.signal);
    return () => controller.abort();
  }, [fetchGames]);

  return { games, loading, error, refetch: () => fetchGames() };
}
