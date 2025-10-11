// mobile/src/sync/taskSync.ts
import { api } from '../api/client';
import { getMeta, setMeta } from '../db/meta';
import { db } from '../db';
import { upsertTask, Task } from '../db/tasks';

/** Map backend -> local Task['status'] */
function normalizeStatus(s: any): Task['status'] {
  if (s === 'completed') return 'done';
  return (s as Task['status']) || 'pending';
}

/** Map local -> backend status for PATCH fallback */
function toServerStatus(s: Task['status']): 'pending' | 'in_progress' | 'blocked' | 'completed' {
  return s === 'done' ? 'completed' : (s as any);
}

/** Format “last sync” as YYYY-MM-DD HH:mm (local time) */
export function getLastSyncLabel(): string {
  const v = getMeta('lastSyncAt');
  if (!v) return '—';
  const ts = Number(v);
  if (!Number.isFinite(ts)) return String(v);
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Pull tasks visible to this user/device (watermark: tasks_last_pull) */
export async function pullMineFromServer(): Promise<number> {
  const since = Number(getMeta('tasks_last_pull') || '0') || 0;

  // Prefer the mobile-sync API; fallback to legacy /mine (array)
  let rows: any[] = [];
  try {
    const res: { tasks?: any[] } = await api.get(`/tasks/mobile-sync/pull?since=${since}`);
    rows = Array.isArray(res?.tasks) ? res.tasks : [];
  } catch {
    // legacy
    rows = await api.get(`/tasks/mine?since=${since}`);
  }

  for (const r of rows) {
    const t: Task = {
      id: String(r.id || r._id),
      title: r.title || '',
      description: r.description ?? null,
      status: normalizeStatus(r.status),
      updatedAt: new Date(r.updatedAt || r.createdAt || Date.now()).getTime(),
      dirty: 0,
    };
    upsertTask(t);
  }

  // advance watermark + update last sync clock
  const now = String(Date.now());
  setMeta('tasks_last_pull', now);
  setMeta('lastSyncAt', now);

  return rows.length;
}

/** Push locally changed (dirty) tasks to the server. */
export async function pushDirtyToServer(): Promise<number> {
  // include updatedAt if your table has it; if not, we’ll default it below
  const dirty = db.getAllSync<{ id: string; status: Task['status']; updatedAt?: number }>(
    `SELECT id, status, updatedAt FROM tasks WHERE dirty=1 ORDER BY updatedAt ASC`
  );

  if (dirty.length === 0) return 0;

  // Try batch endpoint first
  try {
    const updates = dirty.map((r) => ({
      id: r.id,
      status: r.status,                       // server converts 'done' -> 'completed'
      updatedAt: r.updatedAt ?? Date.now(),   // provide client timestamp if we have one
    }));
    const resp: any = await api.post('/tasks/mobile-sync/push', { updates });
    const accepted: string[] = Array.isArray(resp?.acceptedIds) ? resp.acceptedIds : [];

    if (accepted.length > 0) {
      const placeholders = accepted.map(() => '?').join(',');
      db.runSync(`UPDATE tasks SET dirty=0 WHERE id IN (${placeholders})`, accepted);
    }
    return accepted.length;
  } catch {
    // Fallback: per-row PATCH /tasks/:id/status
    let okCount = 0;
    for (const r of dirty) {
      try {
        await api.patch(`/tasks/${encodeURIComponent(r.id)}/status`, {
          status: toServerStatus(r.status),
        });
        db.runSync(`UPDATE tasks SET dirty=0 WHERE id=?`, [r.id]);
        okCount++;
      } catch {
        // keep as dirty; continue
      }
    }
    return okCount;
  }
}

/** Quick reachability check */
async function isOnline(): Promise<boolean> {
  try {
    await api.get('/health'); // -> { ok: true }
    return true;
  } catch {
    return false;
  }
}

export type SyncResult = { pushed: number; pulled: number; online: boolean };

/** Full sync orchestration (safe to call from UI). Always stamps lastSyncAt. */
export async function syncNow(): Promise<SyncResult> {
  const online = await isOnline();
  let pushed = 0;
  let pulled = 0;

  try {
    if (online) {
      try { pushed = await pushDirtyToServer(); } catch { pushed = 0; }
      try { pulled = await pullMineFromServer(); } catch { pulled = 0; }
    }
    return { pushed, pulled, online };
  } finally {
    setMeta('lastSyncAt', String(Date.now())); // show the attempt time regardless of result
  }
}
