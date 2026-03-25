import { useAuth } from '../context/AuthContext';
import { usePicks } from '../hooks/usePicks';
import api from '../services/api';
import { useState, useEffect } from 'react';
import Loading from '../components/common/Loading';
import { USE_MOCK_DATA, mockStats } from '../utils/mockData';

export default function Profile() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    if (USE_MOCK_DATA) {
      setStats(mockStats);
      setLoading(false);
      return;
    }

    try {
      const response = await api.get('/picks/stats');
      setStats(response.data.stats);
    } catch (error) {
      // Stats fetch failed — will show empty state
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <h1 className="text-3xl font-bold text-secondary-navy mb-2">
          Profile
        </h1>
        <p className="text-gray-600">Your account information and statistics</p>
      </div>

      <div className="card">
        <h2 className="text-xl font-bold text-secondary-navy mb-4">
          Account Info
        </h2>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Username:</span>
            <span className="font-semibold">{user.username}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Email:</span>
            <span className="font-semibold">{user.email}</span>
          </div>
        </div>
      </div>

      {stats && (
        <div className="card">
          <h2 className="text-xl font-bold text-secondary-navy mb-4">
            Lifetime Stats
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-lg mb-3">Overall</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Picks:</span>
                  <span className="font-semibold">{stats.total_picks}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Wins:</span>
                  <span className="font-semibold text-green-600">{stats.total_wins}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Losses:</span>
                  <span className="font-semibold text-red-600">{stats.total_losses}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Points:</span>
                  <span className="font-semibold text-secondary-navy">{stats.total_points}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-3">Breakdown</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Moneyline W-L:</span>
                  <span className="font-semibold">
                    {stats.ml_wins}-{stats.ml_losses}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Spread W-L:</span>
                  <span className="font-semibold">
                    {stats.spread_wins}-{stats.spread_losses}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}