import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listTasks, getTask, setTaskStatus, Task } from '../../db/tasks';

export const useTasks = () =>
  useQuery({
    queryKey: ['tasks'],
    queryFn: () => listTasks(),
  });

export const useTask = (id: string) =>
  useQuery({
    queryKey: ['task', id],
    queryFn: () => getTask(id)!,
    enabled: !!id,
  });

export const useUpdateTaskStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: Task['status'] }) =>
      Promise.resolve(setTaskStatus(id, status)),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['task', vars.id] });
    },
  });
};
