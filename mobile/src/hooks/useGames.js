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
      let endpoint;
      if (date) {
        endpoint = `/games/date/${date}`;
      } else {
        // Pass the device's local date so the server never uses UTC midnight
        // to determine "today" — avoids showing tomorrow's games in evening hours.
        const d = new Date();
        const localDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        endpoint = `/games/today?date=${localDate}`;
      }
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
