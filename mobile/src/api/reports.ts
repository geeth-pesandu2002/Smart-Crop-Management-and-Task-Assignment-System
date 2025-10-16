import { api } from './client';

// API_URL already includes the '/api' prefix in mobile config, so use relative paths
export function createReport(payload: any) {
  return api.post('/reports', payload);
}

export function listReports() {
  return api.get('/reports');
}

export function getReport(id: string) {
  return api.get(`/reports/${id}`);
}
