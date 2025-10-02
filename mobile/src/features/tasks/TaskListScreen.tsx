import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, RefreshControl } from 'react-native';
import { useTranslation } from 'react-i18next';
import { listTasks, type TaskRow } from '../../storage/repo/tasksRepo';
import { syncNow } from './sync';

export default function TaskListScreen({ navigation }: any) {
  const { t } = useTranslation();
  const [items, setItems] = useState<TaskRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    const rows = await listTasks();
    setItems(rows);
  }

  useEffect(() => {
    (async () => {
      await syncNow();
      await load();
    })();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await syncNow();
    await load();
    setRefreshing(false);
  };

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 22, marginBottom: 12 }}>{t('tasks.title')}</Text>

      <FlatList<TaskRow>
        data={items}
        keyExtractor={(x: TaskRow) => x.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }: { item: TaskRow }) => (
          <Pressable onPress={() => navigation.navigate('TaskDetail', { id: item.id })}>
            <View style={{ paddingVertical: 10, borderBottomWidth: 1 }}>
              <Text style={{ fontSize: 16 }}>{item.title}</Text>
              <Text>{item.status}</Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}
