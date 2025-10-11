// src/sync/sync.ts
import * as Network from 'expo-network';
import { db } from '../db';
import type { Task } from '../db/tasks';
import { setMeta, getMeta } from '../db/meta'; // <-- import getMeta too

function getDirtyTasks(): Task[] {
  const rows = db.getAllSync<Task>(
    `SELECT id, title, description, status, updatedAt, dirty
     FROM tasks WHERE dirty=1`
  );
  return rows.map(r => ({
    id: String(r.id),
    title: String(r.title),
    description: r.description ?? null,
    status: r.status as Task['status'],
    updatedAt: Number(r.updatedAt),
    dirty: Number(r.dirty) as 0 | 1,
  }));
}

export async function isOnline(): Promise<boolean> {
  const state = await Network.getNetworkStateAsync();
  return !!state.isConnected && (state.isInternetReachable ?? true);
}

export async function syncNow(): Promise<{ pushed: number; online: boolean }> {
  const online = await isOnline();
  if (!online) return { pushed: 0, online: false };

  const dirty = getDirtyTasks();

  // Simulated push — mark as clean locally.
  db.withTransactionSync(() => {
    for (const t of dirty) {
      db.runSync(`UPDATE tasks SET dirty=0 WHERE id=?`, [t.id]);
    }
  });

  setMeta('lastSyncAt', String(Date.now()));
  return { pushed: dirty.length, online: true };
}

export function getLastSyncLabel(): string {
  const v = getMeta('lastSyncAt'); // <-- now imported
  if (!v) return 'කවදාවත් නැත';
  const d = new Date(Number(v));
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
