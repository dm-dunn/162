import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="bg-secondary-navy text-white shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <Link to="/dashboard" className="text-2xl font-bold tracking-tight">
            MLB<span className="text-secondary-red">162</span>
          </Link>

          {user && (
            <nav className="flex items-center gap-6">
              <Link to="/dashboard" className="hover:text-secondary-red transition-colors">
                Dashboard
              </Link>
              <Link to="/leaderboard" className="hover:text-secondary-red transition-colors">
                Leaderboard
              </Link>
              <Link to="/leagues" className="hover:text-secondary-red transition-colors">
                Leagues
              </Link>
              <Link to="/profile" className="hover:text-secondary-red transition-colors">
                Profile
              </Link>
              <button
                onClick={handleLogout}
                className="bg-secondary-red px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
              >
                Logout
              </button>
            </nav>
          )}
        </div>
      </div>
    </header>
  );
}