import { useState, useEffect } from 'react';
import api from '../services/api';

/**
 * Fetches leaderboard data for all provided leagues in parallel.
 *
 * @param {Array} leagues - Array of league objects (must have .id and .name/.league_name)
 * @returns {{ leagueLeaderboards: Object, loading: boolean }}
 *   leagueLeaderboards is a map of leagueId → leaderboard array
 */
export function useLeagueLeaderboards(leagues) {
  const [leagueLeaderboards, setLeagueLeaderboards] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!leagues || leagues.length === 0) {
      setLeagueLeaderboards({});
      return;
    }

    let cancelled = false;

    const fetchAll = async () => {
      setLoading(true);
      try {
        const results = await Promise.all(
          leagues.map(async (league) => {
            try {
              const res = await api.get(`/leaderboard?leagueId=${league.id}`);
              return { id: league.id, data: res.data.leaderboard };
            } catch {
              // If a single league fails (e.g. membership check), return empty
              return { id: league.id, data: [] };
            }
          })
        );

        if (!cancelled) {
          const map = {};
          results.forEach(({ id, data }) => {
            map[id] = data;
          });
          setLeagueLeaderboards(map);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchAll();

    return () => { cancelled = true; };
  }, [leagues?.length]);

  return { leagueLeaderboards, loading };
}
