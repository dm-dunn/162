import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export function usePicks(date) {
  const [picks, setPicks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPicks = useCallback(async (signal) => {
    try {
      setLoading(true);
      const endpoint = date ? `/picks/date/${date}` : '/picks/today';
      const response = await api.get(endpoint, { signal });
      setPicks(response.data.picks);
      setError(null);
    } catch (err) {
      if (err.name === 'CanceledError') return;
      setError(err.response?.data?.error || 'Failed to fetch picks');
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    const controller = new AbortController();
    fetchPicks(controller.signal);
    return () => controller.abort();
  }, [fetchPicks]);

  return { picks, loading, error, refetch: () => fetchPicks() };
}
