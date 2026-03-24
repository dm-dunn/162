import api from './api';

export const leagueService = {
  async getMyLeagues() {
    const response = await api.get('/leagues');
    return response.data;
  },

  async createLeague(name) {
    const response = await api.post('/leagues', { name });
    return response.data;
  },

  async getLeague(id) {
    const response = await api.get(`/leagues/${id}`);
    return response.data;
  },

  async inviteMembers(leagueId, emails) {
    const response = await api.post(`/leagues/${leagueId}/invite`, { emails });
    return response.data;
  },

  async getInviteInfo(token) {
    const response = await api.get(`/leagues/invite/info?token=${token}`);
    return response.data;
  },

  async joinLeague(token) {
    const response = await api.post('/leagues/join', { token });
    return response.data;
  },

  async leaveLeague(leagueId) {
    const response = await api.post(`/leagues/${leagueId}/leave`);
    return response.data;
  },

  async removeMember(leagueId, userId) {
    const response = await api.delete(`/leagues/${leagueId}/members/${userId}`);
    return response.data;
  },

  async getStandings(leagueId) {
    const response = await api.get(`/leagues/${leagueId}/standings`);
    return response.data;
  },

  async getProgression(leagueId) {
    const response = await api.get(`/leagues/${leagueId}/progression`);
    return response.data;
  }
};
