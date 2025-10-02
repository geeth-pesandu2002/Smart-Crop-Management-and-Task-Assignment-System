import { http } from './http';

export type ServerTask = {
  _id: string;
  title: string;
  description?: string;
  plotId?: string;
  status: 'pending' | 'in_progress' | 'blocked' | 'completed';
  priority?: 'low' | 'normal' | 'high';
  updatedAt: string; // ISO
};

export async function fetchMyTasksSince(since: number) {
  // works even if backend ignores ?since= (we'll full fetch)
  const { data } = await http.get<ServerTask[]>(`/tasks/mine?since=${since}`);
  return data;
}

export async function patchTaskStatus(id: string, status: ServerTask['status']) {
  const { data } = await http.patch<ServerTask>(`/tasks/${id}/status`, { status });
  return data;
}
