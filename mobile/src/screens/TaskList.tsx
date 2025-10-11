// mobile/src/screens/TaskList.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Pressable, RefreshControl, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../app/RootNavigator';
import { useTasks } from '../core/hooks';
import { syncNow } from '../sync/taskSync';
import { db } from '../db';
import { setMeta } from '../db/meta';

type Props = NativeStackScreenProps<RootStackParamList, 'TaskList'>;

function getLastSyncLabel(): string {
  const rows = db.getAllSync<{ value: string }>(
    'SELECT value FROM meta WHERE key=? LIMIT 1',
    ['lastSyncAt']
  );
  const v = rows[0]?.value;
  if (!v) return 'කවදාවත් නැත';
  const d = new Date(Number(v));
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export default function TaskList({ navigation }: Props) {
  const { data: tasks = [], isFetching, refetch } = useTasks();
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(getLastSyncLabel());

  // Keep "last sync" fresh when task data changes
  useEffect(() => {
    setLastSync(getLastSyncLabel());
  }, [tasks]);

  const onSync = async () => {
    setSyncing(true);
    try {
      const res = await syncNow(); // { pushed, pulled, online }
      await refetch();
      setLastSync(getLastSyncLabel());
      if (!res.online) {
        Alert.alert('සමමුහුර්ත කිරීම', 'ඔබ දැන් offline බව පෙනේ.');
      } else {
        Alert.alert('සමමුහුර්ත විය', `පළ කළා: ${res.pushed} | ලබාගත්: ${res.pulled}`);
      }
    } catch (e: any) {
      Alert.alert('දෝෂය', String(e?.message ?? e));
    } finally {
      setSyncing(false);
    }
  };

  const onLogout = () => {
    // 🧹 wipe local cache so next login doesn't see previous user's tasks
    try { db.runSync('DELETE FROM tasks'); } catch {}
    setMeta('tasks_last_pull', null);
    setMeta('lastSyncAt', null);

    // clear auth
    setMeta('auth_token', null);
    setMeta('user_id', null);
    setMeta('user_name', null);
    setMeta('user_role', null);

    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  // Shared green button style (matches your login/logout theme)
  const greenBtn = (disabled?: boolean) => ({
    backgroundColor: '#22c55e',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    opacity: disabled ? 0.6 : 1,
  });

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <View
        style={{
          marginBottom: 12,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Text style={{ opacity: 0.7 }}>අවසාන සමමුහුර්ත: {lastSync}</Text>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          {/* Green Sync button */}
          <Pressable
            onPress={onSync}
            disabled={syncing}
            style={({ pressed }) => ({
              ...greenBtn(syncing),
              opacity: syncing ? 0.4 : pressed ? 0.65 : 1,
            })}
          >
            <Text style={{ color: 'white', fontWeight: '500' }}>
              {syncing ? 'සමමුහුර්ත වෙමින්...' : 'සමමුහුර්ත කරන්න'}
            </Text>
          </Pressable>

          {/* Green Logout button (Sinhala) */}
          <Pressable
            onPress={onLogout}
            style={({ pressed }) => ({
              ...greenBtn(false),
              opacity: pressed ? 1 : 1,
            })}
          >
            <Text style={{ color: 'white', fontWeight: '700' }}>ඉවත්වෙන්න</Text>
          </Pressable>
        </View>
      </View>

      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} />}
        renderItem={({ item }) => (
          <Pressable onPress={() => navigation.navigate('TaskDetails', { id: item.id })}>
            <View
              style={{
                padding: 16,
                borderWidth: 1,
                borderRadius: 12,
                marginBottom: 12,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Text style={{ fontSize: 18 }}>{item.title}</Text>
                {Number(item.dirty) === 1 ? (
                  <Text style={{ fontSize: 12, color: '#d97706' }}>🔶 නොසම්මුහුර්ත</Text>
                ) : (
                  <Text style={{ fontSize: 12, opacity: 0.6 }}>✓ සම්මුහුර්ත</Text>
                )}
              </View>
              <Text style={{ opacity: 0.7, marginTop: 4 }}>({item.status})</Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={<Text style={{ opacity: 0.6 }}>කාර්යයන් නොමැත</Text>}
      />
    </View>
  );
}
