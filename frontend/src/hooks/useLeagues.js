import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { USE_MOCK_DATA } from '../utils/mockData';

export function useLeagues() {
  const [leagues, setLeagues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLeagues = useCallback(async (signal) => {
    if (USE_MOCK_DATA) {
      setLeagues([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await api.get('/leagues', { signal });
      setLeagues(response.data.leagues);
      setError(null);
    } catch (err) {
      if (err.name === 'CanceledError') return;
      setError(err.response?.data?.error || 'Failed to fetch leagues');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchLeagues(controller.signal);
    return () => controller.abort();
  }, [fetchLeagues]);

  return { leagues, loading, error, refetch: () => fetchLeagues() };
}
