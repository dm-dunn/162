import { useState, useEffect } from 'react';
import api from '../services/api';
import { USE_MOCK_DATA } from '../utils/mockData';

export function useLeagues() {
  const [leagues, setLeagues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchLeagues();
  }, []);

  const fetchLeagues = async () => {
    if (USE_MOCK_DATA) {
      setLeagues([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await api.get('/leagues');
      setLeagues(response.data.leagues);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch leagues');
    } finally {
      setLoading(false);
    }
  };

  return { leagues, loading, error, refetch: fetchLeagues };
}
