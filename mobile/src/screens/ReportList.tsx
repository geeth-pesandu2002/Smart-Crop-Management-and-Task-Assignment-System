import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, Image } from 'react-native';
import { listReports } from '../db/reports';
import { useTranslation } from 'react-i18next';

export default function ReportList({ navigation }: any) {
  const { t } = useTranslation();
  const [rows, setRows] = useState<any[]>([]);

  function refresh() {
    try {
      const r = listReports();
      setRows(r);
    } catch {
      setRows([]);
    }
  }

  useEffect(() => {
    const unsub = navigation.addListener('focus', refresh);
    refresh();
    return unsub;
  }, [navigation]);

  return (
    <View style={{ flex: 1, padding: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text style={{ fontWeight: '700', fontSize: 18 }}>{t('report')}</Text>
        <Pressable onPress={() => navigation.navigate('ReportCreate')} style={{ backgroundColor: '#22c55e', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }}>
          <Text style={{ color: 'white', fontWeight: '700' }}>{t('saveReport')}</Text>
        </Pressable>
      </View>

      <FlatList data={rows} keyExtractor={(i) => i.id} renderItem={({ item }) => (
        <View style={{ backgroundColor: '#fff', padding: 10, borderRadius: 8, marginBottom: 8 }}>
          <Text style={{ fontWeight: '700' }}>{item.issueType} — {item.field}</Text>
          <Text style={{ color: '#666', marginTop: 6 }}>{new Date(item.date).toLocaleDateString()}</Text>
          {item.description ? <Text style={{ marginTop: 6 }}>{item.description}</Text> : null}
          {item.photoUrl ? <Image source={{ uri: item.photoUrl }} style={{ width: '100%', height: 140, marginTop: 8, borderRadius: 6 }} /> : null}
        </View>
      )} />
    </View>
  );
}
