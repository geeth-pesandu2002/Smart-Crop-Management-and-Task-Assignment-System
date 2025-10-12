// mobile/src/screens/TaskDetails.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, Alert, ActivityIndicator, ScrollView, Animated } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../app/RootNavigator';
import { api } from '../api/client';
import { statusToLabel, toServerStatus as toServerStatusHelper } from '../core/status';

type Props = NativeStackScreenProps<RootStackParamList, 'TaskDetails'>;

type DetailDTO = {
  id: string;
  title: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'blocked' | 'done' | 'completed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  dueDate: number | null;     // ms since epoch
  plotCode: string | null;
  updatedAt: number;
};

// Sinhala labels
const S = {
  screenTitle: 'විස්තර',
  taskNo: 'කාර්ය අංකය',
  title: 'මාතෘකාව',
  summary: 'සාරාංශය',
  priority: 'ප්‍රමුඛතාව',
  plot: 'වගා කොටස',
  due: 'නියමිත දිනය',
  unknown: '—',
  pLow: 'අඩු',
  pNormal: 'සාමාන්‍ය',
  pHigh: 'ඉහළ',
  pUrgent: 'හදිසි',
};

// helpers
function prioritySi(p?: string | null) {
  switch ((p || '').toLowerCase()) {
    case 'low': return S.pLow;
    case 'high': return S.pHigh;
    case 'urgent': return S.pUrgent;
    default: return S.pNormal;
  }
}
function fmtDate(ms?: number | null) {
  if (!ms) return S.unknown;
  const d = new Date(ms);
  if (isNaN(d.getTime())) return S.unknown;
  return d.toLocaleDateString('si-LK', { year: 'numeric', month: '2-digit', day: '2-digit' });
}
// short human-friendly code like 0001 from Mongo _id
function shortCode(id: string) {
  const tail = id?.slice(-6) || '0';
  const n = parseInt(tail, 16) % 10000;
  return String(n).padStart(4, '0');
}
const toServerStatus = toServerStatusHelper;

export default function TaskDetails({ route }: Props) {
  const id = route.params?.id as string;

  const [task, setTask] = useState<DetailDTO | null>(null);
  const [loading, setLoading] = useState(true);
  // track which status (if any) is currently being saved so only that button shows loading
  const [savingStatus, setSavingStatus] = useState<string | null>(null);

  const prettyId = useMemo(() => shortCode(id), [id]);

  // pull richer detail (title/description/priority/plot/dueDate)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const data = await api.get(`/tasks/mobile/${id}`);
        if (mounted) setTask(data as DetailDTO);
      } catch (e: any) {
        if (mounted) Alert.alert('දෝෂය', e?.message || 'කාර්යය ලබා ගැනීමට නොහැකි විය');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [id]);

  async function changeStatus(next: 'pending'|'in_progress'|'blocked'|'done') {
    if (!task || savingStatus) return; // already saving one
    const prev = task.status;
    setTask({ ...task, status: next }); // optimistic
    setSavingStatus(next);
    try {
      await api.patch(`/tasks/${id}/status`, { status: toServerStatus(next) });
    } catch (e: any) {
      setTask({ ...task, status: prev });
      Alert.alert('දෝෂය', e?.message || 'තත්ත්වය යාවත්කාලීන කිරීමට නොමැත');
    } finally {
      setSavingStatus(null);
    }
  }

  if (loading || !task) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
      <Text style={{ fontSize: 20, fontWeight: '700', marginBottom: 12 }}>{S.screenTitle}</Text>

      {/* top facts */}
      <View style={{ gap: 8 }}>
        <Row label={S.taskNo} value={`#${prettyId}`} />
        <Row label={S.title} value={task.title || S.unknown} />
        <Row label={S.summary} value={task.description || S.unknown} />
        <Row label={S.priority} value={prioritySi(task.priority)} />
        <Row label={S.plot} value={task.plotCode || S.unknown} />
        <Row label={S.due} value={fmtDate(task.dueDate)} />
      </View>

      {/* current status */}
      <Text style={{ marginTop: 16, marginBottom: 8, opacity: 0.7 }}>
        වර්තමාන තත්ත්වය: {statusToLabel(task.status)}
      </Text>

      {/* Sinhala-only status buttons */}
      <View style={{ gap: 10 }}>
        <StatusBtn
          text={statusToLabel('pending')}
          onPress={() => changeStatus('pending')}
          loading={savingStatus === 'pending'}
          active={task.status === 'pending'}
        />
        <StatusBtn
          text={statusToLabel('in_progress')}
          onPress={() => changeStatus('in_progress')}
          loading={savingStatus === 'in_progress'}
          active={task.status === 'in_progress'}
        />
        <StatusBtn
          text={statusToLabel('blocked')}
          onPress={() => changeStatus('blocked')}
          loading={savingStatus === 'blocked'}
          active={task.status === 'blocked'}
        />
        <StatusBtn
          text={statusToLabel('done')}
          onPress={() => changeStatus('done')}
          loading={savingStatus === 'done'}
          active={task.status === 'done' || task.status === 'completed'}
        />
      </View>
    </ScrollView>
  );
}

// subcomponents
function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ backgroundColor: 'white', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e5e7eb' }}>
      <Text style={{ fontSize: 12, color: '#6b7280' }}>{label}</Text>
      <Text style={{ fontSize: 16, marginTop: 2 }}>{value}</Text>
    </View>
  );
}
function StatusBtn({ text, onPress, loading, active }: { text: string; onPress: () => void; loading?: boolean; active?: boolean }) {
  const scale = useRef(new Animated.Value(active ? 1.03 : 1)).current;

  // animate when `active` changes
  useEffect(() => {
    Animated.timing(scale, {
      toValue: active ? 1.03 : 1,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [active]);

  return (
    <Animated.View style={{ transform: [{ scale }], borderRadius: 10, overflow: 'visible', borderWidth: active ? 2 : 0, borderColor: active ? '#065f46' : 'transparent' }}>
      <Pressable
        onPress={onPress}
        disabled={!!loading}
        style={({ pressed }) => ({
          paddingVertical: 14,
          borderRadius: 10,
          alignItems: 'center',
          backgroundColor: '#16a34a', // green to match other buttons
          opacity: loading ? 0.6 : pressed ? 0.85 : 1,
          flexDirection: 'row',
          justifyContent: 'center',
          paddingHorizontal: 12,
        })}
      >
        {loading ? (
          <ActivityIndicator color="white" style={{ marginRight: 8 }} />
        ) : null}
        <Text style={{ color: 'white', fontWeight: '700' }}>{text}</Text>
      </Pressable>
    </Animated.View>
  );
}

