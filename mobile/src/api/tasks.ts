// mobile/src/api/tasks.ts
import { api } from './client';
import type { Task } from '../db/tasks';

// Map local status to server status
const toRemoteStatus = (s: Task['status']) => (s === 'done' ? 'completed' : s);

/** PATCH /api/tasks/:id/status */
export function updateTaskStatus(id: string, status: Task['status']) {
  return api.patch(`/tasks/${id}/status`, { status: toRemoteStatus(status) });
}

/** GET /api/tasks/mine?since=... (optional helper if you want to use it) */
export function fetchMyTasksSince(sinceMs: number) {
  return api.get(`/tasks/mine?since=${sinceMs || 0}`);
}
