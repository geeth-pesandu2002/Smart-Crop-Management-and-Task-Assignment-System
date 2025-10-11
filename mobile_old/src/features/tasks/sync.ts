import { fetchMyTasksSince, patchTaskStatus } from '../../api/tasks';
import { getLastSync, setLastSync } from '../../storage/repo/metaRepo';
import { upsertTasks, enqueueMutation, flushMutations } from '../../storage/repo/tasksRepo';

export async function syncNow() {
  // 1) push queued writes
  await flushMutations(async (url, method, body) => {
    if (method === 'PATCH' && url.endsWith('/status')) {
      await patchTaskStatus(body.id, body.status);
    }
  });

  // 2) pull changes
  const last = await getLastSync(); // ms timestamp
  const serverTasks = await fetchMyTasksSince(last);
  await upsertTasks(
    serverTasks.map((t) => ({
      id: t._id,
      title: t.title,
      status: t.status,
      plot_id: t.plotId ?? null,
      notes: t.description ?? null,
      updated_at: new Date(t.updatedAt).getTime(),
    }))
  );
  await setLastSync(Date.now());
}

export async function updateTaskStatusOffline(
  id: string,
  status: 'in_progress' | 'completed' | 'pending' | 'blocked'
) {
  await enqueueMutation(`/tasks/${id}/status`, 'PATCH', { id, status });
}
