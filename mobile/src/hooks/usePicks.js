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
      let endpoint;
      if (date) {
        endpoint = `/picks/date/${date}`;
      } else {
        // Pass the device's local date so the server never uses UTC midnight
        // to determine "today" — avoids showing tomorrow's picks in evening hours.
        const d = new Date();
        const localDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        endpoint = `/picks/today?date=${localDate}`;
      }
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
