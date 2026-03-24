import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLeagues } from '../hooks/useLeagues';
import { leagueService } from '../services/leagues';
import Loading from '../components/common/Loading';

export default function Leagues() {
  const { leagues, loading, error, refetch } = useLeagues();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    setCreateError('');
    try {
      await leagueService.createLeague(name);
      setName('');
      setShowCreate(false);
      refetch();
    } catch (err) {
      console.error('League creation error:', err);
      setCreateError(err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to create league');
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      <div className="card flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-secondary-navy">My Leagues</h1>
          <p className="text-gray-600 mt-1">Compete with friends in private leagues</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="btn-primary"
        >
          {showCreate ? 'Cancel' : 'Create League'}
        </button>
      </div>

      {showCreate && (
        <div className="card">
          <h2 className="text-xl font-bold text-secondary-navy mb-4">Create New League</h2>
          {createError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {createError}
            </div>
          )}
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">League Name</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className="input-field"
                required
                minLength={3}
                maxLength={100}
                placeholder="e.g., The Hot Corner"
              />
            </div>
            <button type="submit" disabled={creating} className="btn-primary">
              {creating ? 'Creating...' : 'Create League'}
            </button>
          </form>
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {leagues.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-gray-400 text-5xl mb-4">&#9917;</div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No leagues yet</h3>
          <p className="text-gray-500">Create a league and invite your friends to compete!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {leagues.map(league => (
            <Link
              key={league.id}
              to={`/leagues/${league.id}`}
              className="card hover:shadow-lg transition-shadow"
            >
              <div className="flex justify-between items-start">
                <h3 className="text-lg font-bold text-secondary-navy">{league.name}</h3>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  league.role === 'owner'
                    ? 'bg-secondary-navy text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {league.role === 'owner' ? 'Owner' : 'Member'}
                </span>
              </div>
              {league.description && (
                <p className="text-gray-600 text-sm mt-2 line-clamp-2">{league.description}</p>
              )}
              <div className="flex items-center mt-3 text-sm text-gray-500">
                <span>{league.member_count} {league.member_count === 1 ? 'member' : 'members'}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
