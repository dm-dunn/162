import { createContext, useState, useContext, useEffect } from 'react';
import { authService } from '../services/auth';
import { tokenStorage } from '../services/tokenStorage';
import { setLogoutCallback } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // When the token refresh interceptor gives up, it calls this to sign out
    setLogoutCallback(() => setUser(null));
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await tokenStorage.getAccessToken();
      if (token) {
        const userData = await authService.getCurrentUser();
        setUser(userData);
      }
    } catch (error) {
      await tokenStorage.clearTokens();
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    const data = await authService.login(username, password);
    setUser(data.user);
    await tokenStorage.setAccessToken(data.accessToken);
    await tokenStorage.setRefreshToken(data.refreshToken);
  };

  const register = async (username, email, password, color) => {
    const data = await authService.register(username, email, password, color);
    setUser(data.user);
    await tokenStorage.setAccessToken(data.accessToken);
    await tokenStorage.setRefreshToken(data.refreshToken);
  };

  const logout = async () => {
    const refreshToken = await tokenStorage.getRefreshToken();
    try {
      await authService.logout(refreshToken);
    } catch (_) {
      // Best-effort server-side logout
    }
    await tokenStorage.clearTokens();
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const userData = await authService.getCurrentUser();
      setUser(userData);
    } catch (error) {
      // Silently fail — user will need to re-login if refresh fails
    }
  };

  const changePassword = async (newPassword) => {
    await authService.changePassword(newPassword);
    setUser((prev) => ({ ...prev, mustChangePassword: false }));
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, refreshUser, changePassword, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
