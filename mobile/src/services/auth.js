import api from './api';

export const authService = {
  async login(email, password) {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  async register(username, email, password, color) {
    const response = await api.post('/auth/register', {
      username,
      email,
      password,
      color
    });
    return response.data;
  },

  async getCurrentUser() {
    const response = await api.get('/auth/me');
    return response.data.user;
  },

  async refreshToken(refreshToken) {
    const response = await api.post('/auth/refresh', { refreshToken });
    return response.data;
  },

  async verifyEmail(token) {
    const response = await api.get(`/auth/verify-email?token=${token}`);
    return response.data;
  },

  async resendVerification() {
    const response = await api.post('/auth/resend-verification');
    return response.data;
  },

  async forgotPassword(email) {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  async resetPassword(token, newPassword) {
    const response = await api.post('/auth/reset-password', { token, newPassword });
    return response.data;
  },

  async changePassword(newPassword) {
    const response = await api.post('/auth/change-password', { newPassword });
    return response.data;
  },

  async logout(refreshToken) {
    const response = await api.post('/auth/logout', { refreshToken });
    return response.data;
  }
};
