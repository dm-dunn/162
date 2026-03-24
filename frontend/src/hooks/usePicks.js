import { useState, useEffect } from 'react';
import api from '../services/api';

export function usePicks(date) {
  const [picks, setPicks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPicks();
  }, [date]);

  const fetchPicks = async () => {
    try {
      setLoading(true);
      const endpoint = date ? `/picks/date/${date}` : '/picks/today';
      const response = await api.get(endpoint);
      setPicks(response.data.picks);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch picks');
    } finally {
      setLoading(false);
    }
  };

  return { picks, loading, error, refetch: fetchPicks };
}