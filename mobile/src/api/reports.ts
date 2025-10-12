import { api } from './client';

export function createReport(payload: any) {
  return api.post('/api/reports', payload);
}

export function listReports() {
  return api.get('/api/reports');
}

export function getReport(id: string) {
  return api.get(`/api/reports/${id}`);
}
