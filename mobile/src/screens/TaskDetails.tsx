// mobile/src/screens/TaskDetails.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../app/RootNavigator';
import { api } from '../api/client';

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
  stPending: 'ආරම්භ නොකළේ',
  stInProgress: 'ක්‍රියාත්මකයි',
  stBlocked: 'අවහිර විය',
  stDone: 'සම්පුර්ණයි',
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
function siFromCode(code: DetailDTO['status']) {
  switch (code) {
    case 'pending': return S.stPending;
    case 'in_progress': return S.stInProgress;
    case 'blocked': return S.stBlocked;
    case 'done':
    case 'completed': return S.stDone;
    default: return S.unknown;
  }
}
const toServerStatus = (s: 'pending'|'in_progress'|'blocked'|'done') =>
  s === 'done' ? 'completed' : s;

export default function TaskDetails({ route }: Props) {
  const id = route.params?.id as string;

  const [task, setTask] = useState<DetailDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
    if (!task || saving) return;
    const prev = task.status;
    setTask({ ...task, status: next }); // optimistic
    setSaving(true);
    try {
      await api.patch(`/tasks/${id}/status`, { status: toServerStatus(next) });
    } catch (e: any) {
      setTask({ ...task, status: prev });
      Alert.alert('දෝෂය', e?.message || 'තත්ත්වය යාවත්කාලීන කිරීමට නොමැත');
    } finally {
      setSaving(false);
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
        වර්තමාන තත්ත්වය: {siFromCode(task.status)}
      </Text>

      {/* Sinhala-only status buttons */}
      <View style={{ gap: 10 }}>
        <StatusBtn text={S.stPending} onPress={() => changeStatus('pending')} disabled={saving} />
        <StatusBtn text={S.stInProgress} onPress={() => changeStatus('in_progress')} disabled={saving} />
        <StatusBtn text={S.stBlocked} onPress={() => changeStatus('blocked')} disabled={saving} />
        <StatusBtn text={S.stDone} onPress={() => changeStatus('done')} disabled={saving} />
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
function StatusBtn({ text, onPress, disabled }: { text: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: 'center',
        backgroundColor: '#1d4ed8',
        opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
      })}
    >
      <Text style={{ color: 'white', fontWeight: '700' }}>{text}</Text>
    </Pressable>
  );
}
