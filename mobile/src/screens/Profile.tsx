import React, { useEffect, useState } from 'react';
// Simple English-to-Sinhala name mapping
const sinhalaNameMap: Record<string, string> = {
  'Ajith Kumara': 'අජිත් කුමාර',
  'Nimal Perera': 'නිමල් පෙරේරා',
  'Sunil Silva': 'සුනිල් සිල්වා',
  // Add more mappings as needed
};

// Sinhala gender mapping
const sinhalaGenderMap: Record<string, string> = {
  'male': 'පුරුෂ',
  'female': 'ස්ත්‍රී',
  'other': 'වෙනත්',
};

function toSinhalaName(name: string): string {
  return sinhalaNameMap[name?.trim()] || name;
}
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { getMeta, setMeta } from '../db/meta';
import { getCurrentUserProfile } from '../api/user';
const fields = [
  { key: 'user_id', label: 'පරිශීලක අංකය' },
  { key: 'user_name', label: 'නම' },
  { key: 'user_role', label: 'භූමිකාව' },
  { key: 'user_phone', label: 'දුරකථන අංකය' },
  { key: 'user_gender', label: 'ස්ත්‍රී/පුරුෂ භාවය' },
  { key: 'user_address', label: 'ලිපිනය' },
  { key: 'user_joined', label: 'එක්වූ දිනය' },
];

function formatDate(val?: string) {
  if (!val) return '';
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return d.toLocaleDateString();
}

export default function Profile({ navigation }: any) {
  const [user, setUser] = useState<any>({});

  useEffect(() => {
    // Try to load user info from backend first
    (async () => {
      try {
        const profile = await getCurrentUserProfile();
        if (profile) {
          setUser({
            user_id: profile.userId,
            user_name: profile.name,
            user_role: profile.role,
            user_phone: profile.phone,
            user_gender: profile.gender,
            user_address: profile.address,
            user_joined: profile.joinedAt,
          });
          return;
        }
      } catch (e) {
        // fallback to meta if backend fails
      }
      const info: any = {};
      for (const f of fields) {
        info[f.key] = getMeta(f.key) || '';
      }
      setUser(info);
    })();
  }, []);

  function logout() {
    setMeta('auth_token', null);
    setMeta('user_id', null);
    setMeta('user_name', null);
    setMeta('user_role', null);
    setMeta('user_email', null);
    setMeta('user_phone', null);
    setMeta('user_gender', null);
    setMeta('user_address', null);
    setMeta('user_joined', null);
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.profileCard}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{user.user_name?.[0]?.toUpperCase() || '?'}</Text>
        </View>
  <Text style={styles.name}>{user.user_name ? toSinhalaName(user.user_name) : 'නම නොමැත'}</Text>
  <Text style={styles.role}>{user.user_role ? (user.user_role === 'staff' ? 'කාර්ය මණ්ඩලය' : user.user_role === 'manager' ? ' කළමනාකරු' : user.user_role === 'supervisor' ? 'අධීක්ෂක' : user.user_role) : ''}</Text>
      </View>
      <View style={styles.infoSection}>
        {fields.map(f => (
          f.key !== 'user_name' && f.key !== 'user_role' && f.key !== 'user_email' && (
            <View key={f.key} style={styles.infoRow}>
              <Text style={styles.infoLabel}>{f.label}</Text>
              <Text style={styles.infoValue}>
                {(() => {
                  const val = user[f.key];
                  if (f.key === 'user_joined') {
                    return val ? formatDate(val) : 'නොමැත';
                  }
                  if (f.key === 'user_gender') {
                    return val ? sinhalaGenderMap[val.toLowerCase()] || val : 'නොමැත';
                  }
                  return val && val !== '-' ? val : 'නොමැත';
                })()}
              </Text>
            </View>
          )
        ))}
      </View>
      <Pressable onPress={logout} style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.8 }] }>
        <Text style={styles.logoutText}>ඉවත් වන්න</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f8fa' },
  content: { padding: 24, alignItems: 'center' },
  profileCard: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#e0e7ef',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 32, fontWeight: '700', color: '#2563eb' },
  name: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  role: { fontSize: 16, color: '#5aa15a', marginBottom: 8 },
  infoSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: { fontWeight: '600', color: '#555' },
  infoValue: { color: '#222' },
  logoutBtn: {
    backgroundColor: '#5aa15a',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 10,
    alignSelf: 'center',
    marginTop: 12,
  },
  logoutText: { color: 'white', fontWeight: '700', fontSize: 16 },
});
