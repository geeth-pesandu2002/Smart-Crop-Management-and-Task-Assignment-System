// mobile/src/features/tasks/TaskDetailScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, ScrollView } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { listTasks, type TaskRow } from '../../storage/repo/tasksRepo';

// Extend the repo type locally with optional fields we might have in SQLite
type TaskRowWithExtras = TaskRow & {
  description?: string | null;
  priority?: string | null;
  dueDate?: string | null; // or Date | null depending on how you store it
};

export default function TaskDetailScreen() {
  const route = useRoute<any>();
  const id = route.params?.id as string | undefined;

  const [task, setTask] = useState<TaskRowWithExtras | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const rows = await listTasks(); // reuse existing repo call
        const found = rows.find(r => r.id === id) as TaskRowWithExtras | undefined;
        if (mounted) setTask(found ?? null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [id]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!task) {
    return (
      <View style={{ flex: 1, padding: 16 }}>
        <Text style={{ fontSize: 18 }}>Task not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Text style={{ fontSize: 22, marginBottom: 8 }}>{task.title}</Text>
      <Text style={{ marginBottom: 4 }}>Status: {task.status}</Text>
      {task.priority ? <Text style={{ marginBottom: 4 }}>Priority: {task.priority}</Text> : null}
      {task.dueDate ? <Text style={{ marginBottom: 12 }}>Due: {String(task.dueDate)}</Text> : null}
      <Text style={{ fontSize: 16 }}>
        {task.description ?? '(no description)'}
      </Text>
    </ScrollView>
  );
}
