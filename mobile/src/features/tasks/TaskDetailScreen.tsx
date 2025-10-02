import React, { useEffect, useState } from 'react';
import { View, Text, Button } from 'react-native';
import { getTask, setTaskStatusLocal, type TaskRow } from '../../storage/repo/tasksRepo';
import { updateTaskStatusOffline } from './sync';

export default function TaskDetailScreen({ route, navigation }: any) {
  const { id } = route.params as { id: string };
  const [task, setTask] = useState<TaskRow | undefined>(undefined);

  useEffect(() => { (async () => setTask(await getTask(id)))(); }, [id]);

  async function setStatus(status: TaskRow['status']) {
    const now = Date.now();
    await setTaskStatusLocal(id, status, now);
    await updateTaskStatusOffline(id, status);
    setTask(await getTask(id));
    navigation.goBack();
  }

  if (!task) return <View style={{ padding: 16 }}><Text>Loading...</Text></View>;

  return (
    <View style={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 18 }}>{task.title}</Text>
      <Text>තත්ත්වය: {task.status}</Text>
      <Button title="ඇරඹුම" onPress={() => setStatus('in_progress')} />
      <Button title="සම්පූර්ණ කරන්න" onPress={() => setStatus('completed')} />
    </View>
  );
}
