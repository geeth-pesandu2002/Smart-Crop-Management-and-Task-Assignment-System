import { db } from './index';

export type Task = {
  id: string;
  title: string;
  description?: string | null;
  status: 'pending' | 'in_progress' | 'done' | 'blocked';
  updatedAt: number;
  dirty: 0 | 1;
};

export function upsertTask(t: Task) {
  db.runSync(
    `INSERT INTO tasks(id, title, description, status, updatedAt, dirty)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       title=excluded.title,
       description=excluded.description,
       status=excluded.status,
       updatedAt=excluded.updatedAt,
       dirty=excluded.dirty`,
    [t.id, t.title, t.description ?? null, t.status, t.updatedAt, t.dirty]
  );
}

// Helper to normalize row values coming from SQLite (string/number)
function normalize(row: any): Task {
  return {
    id: String(row.id),
    title: String(row.title),
    description: row.description ?? null,
    status: row.status as Task['status'],
    updatedAt: Number(row.updatedAt),
    dirty: Number(row.dirty) as 0 | 1,
  };
}

export function listTasks(): Task[] {
  const rows = db.getAllSync(
    `SELECT id, title, description, status, updatedAt, dirty
     FROM tasks ORDER BY updatedAt DESC`
  );
  return rows.map(normalize);
}

export function getTask(id: string): Task | undefined {
  const rows = db.getAllSync(
    `SELECT id, title, description, status, updatedAt, dirty
     FROM tasks WHERE id = ? LIMIT 1`,
    [id]
  );
  const row = rows[0];
  return row ? normalize(row) : undefined;
}

export function setTaskStatus(id: string, status: Task['status']) {
  const now = Date.now();
  db.runSync(`UPDATE tasks SET status=?, updatedAt=?, dirty=1 WHERE id=?`, [status, now, id]);
}

export function seedIfEmpty() {
  const count = db.getAllSync<{ c: number }>('SELECT COUNT(*) as c FROM tasks')[0].c;
  if (Number(count) > 0) return;

  const now = Date.now();
  upsertTask({
    id: '1',
    title: 'ජලසම්පාදනය පරික්ෂා කිරීම',
    description: null,
    status: 'pending',
    updatedAt: now,
    dirty: 0,
  });
  upsertTask({
    id: '2',
    title: 'පළිබෝධ පරීක්ෂාව',
    description: null,
    status: 'in_progress',
    updatedAt: now - 1000,
    dirty: 0,
  });
}
