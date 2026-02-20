import api from './api';

export const getRuns = async (params?: {
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}) => {
  const response = await api.get('/runs', { params });
  return response.data;
};

export const getRun = async (id: number) => {
  const response = await api.get(`/runs/${id}`);
  return response.data;
};

export const uploadRun = async (file: File, name?: string) => {
  const formData = new FormData();
  formData.append('file', file);
  if (name) formData.append('name', name);
  const response = await api.post('/runs/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

export const deleteRun = async (id: number) => {
  const response = await api.delete(`/runs/${id}`);
  return response.data;
};

// Strava
export const getStravaAuthUrl = async () => {
  const response = await api.get('/strava/auth');
  return response.data;
};

export const triggerStravaSync = async () => {
  const response = await api.post('/strava/sync');
  return response.data;
};

export const getStravaStatus = async () => {
  const response = await api.get('/strava/status');
  return response.data;
};

// Parkrun
export const getParkrunResults = async (params?: {
  startDate?: string;
  endDate?: string;
  runnerName?: string;
  limit?: number;
  offset?: number;
}) => {
  const response = await api.get('/parkrun/results', { params });
  return response.data;
};

export const scrapeParkrun = async (daysBack?: number) => {
  const response = await api.post('/parkrun/scrape', { daysBack });
  return response.data;
};

export const getParkrunSchedule = async () => {
  const response = await api.get('/parkrun/schedule');
  return response.data;
};

export const updateParkrunSchedule = async (body: { schedule?: string; enabled?: boolean }) => {
  const response = await api.put('/parkrun/schedule', body);
  return response.data;
};

export const getParkrunRunnerStats = async (runnerName: string) => {
  const response = await api.get(`/parkrun/runner/${encodeURIComponent(runnerName)}`);
  return response.data;
};

// Stats
export const getStatsSummary = async (days?: number) => {
  const response = await api.get('/stats/summary', { params: { days } });
  return response.data;
};

export const getPaceProgress = async (period?: 'weekly' | 'monthly') => {
  const response = await api.get('/stats/progress', { params: { period } });
  return response.data;
};

export const getLocationStats = async (radiusMeters?: number) => {
  const response = await api.get('/stats/by-location', { params: { radius_meters: radiusMeters } });
  return response.data;
};

export const getConsistencyStats = async (days?: number) => {
  const response = await api.get('/stats/consistency', { params: { days } });
  return response.data;
};

export const getPersonalRecords = async () => {
  const response = await api.get('/stats/personal-records');
  return response.data;
};

export const predict5K = async () => {
  const response = await api.get('/stats/predict-5k');
  return response.data;
};

export const getWeeklyDistance = async (weeks?: number) => {
  const response = await api.get('/stats/weekly-distance', { params: { weeks } });
  return response.data;
};

// Recommendations
export interface RecommendationResponse {
  currentStats: {
    weeklyAverage: number;
    currentRunsPerWeek: number;
    last4Weeks: { week: string; distance: number; runs: number }[];
  };
  recommendations: Array<{
    weekStart: string;
    targetDistance: number;
    runs: Array<{
      date: string;
      type: 'easy' | 'long' | 'tempo' | 'rest';
      distance?: number;
      duration?: number;
      notes: string;
    }>;
  }>;
  rationale: string;
}

export const getRecommendations = async (weeks?: number, goalDistance?: number) => {
  const params: any = {};
  if (weeks) params.weeks = weeks;
  if (goalDistance) params.goalDistance = goalDistance;
  const response = await api.get('/recommendations', { params });
  return response.data as RecommendationResponse;
};
