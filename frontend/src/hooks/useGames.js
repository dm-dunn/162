import { useState, useEffect } from 'react';
import api from '../services/api';

export function useGames(date) {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchGames();
  }, [date]);

  const fetchGames = async () => {
    try {
      setLoading(true);
      const endpoint = date ? `/games/date/${date}` : '/games/today';
      const response = await api.get(endpoint);
      setGames(response.data.games);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch games');
    } finally {
      setLoading(false);
    }
  };

  return { games, loading, error, refetch: fetchGames };
}