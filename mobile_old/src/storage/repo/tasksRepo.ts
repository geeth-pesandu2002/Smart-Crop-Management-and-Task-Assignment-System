import { exec, queryAll, queryFirst } from '../db';

export type TaskRow = {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'blocked' | 'completed';
  plot_id?: string | null;
  notes?: string | null;
  updated_at: number;
};

type MutationRow = {
  id: string;
  url: string;
  method: 'POST' | 'PUT' | 'PATCH';
  body: string; // JSON
  created_at: number;
};

export async function upsertTasks(tasks: TaskRow[]) {
  const sql = `INSERT OR REPLACE INTO tasks (id, title, status, plot_id, notes, updated_at)
               VALUES (?, ?, ?, ?, ?, ?)`;
  for (const t of tasks) {
    await exec(sql, [t.id, t.title, t.status, t.plot_id ?? null, t.notes ?? null, t.updated_at]);
  }
}

export async function listTasks(): Promise<TaskRow[]> {
  return await queryAll<TaskRow>(`SELECT * FROM tasks ORDER BY updated_at DESC`);
}

export async function getTask(id: string): Promise<TaskRow | undefined> {
  return await queryFirst<TaskRow>(`SELECT * FROM tasks WHERE id=?`, [id]);
}

export async function setTaskStatusLocal(id: string, status: TaskRow['status'], updatedAt: number) {
  await exec(`UPDATE tasks SET status=?, updated_at=? WHERE id=?`, [status, updatedAt, id]);
}

// queue
export async function enqueueMutation(url: string, method: 'POST' | 'PUT' | 'PATCH', body: any) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await exec(
    `INSERT INTO mutations (id, url, method, body, created_at) VALUES (?, ?, ?, ?, ?)`,
    [id, url, method, JSON.stringify(body), Date.now()]
  );
}

export async function flushMutations(
  fetcher: (url: string, method: string, body: any) => Promise<void>
) {
  const rows = await queryAll<MutationRow>(`SELECT * FROM mutations ORDER BY created_at ASC`);
  for (const m of rows) {
    try {
      await fetcher(m.url, m.method, JSON.parse(m.body));
      await exec(`DELETE FROM mutations WHERE id=?`, [m.id]);
    } catch {
      break; // offline; try later
    }
  }
}
