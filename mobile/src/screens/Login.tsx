// mobile/src/screens/Login.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { api } from '../api/client';
import { getMeta, setMeta } from '../db/meta';
import { pullMineFromServer } from '../sync/taskSync';
import { db } from '../db';

const PIN_LENGTH = 4;

export default function Login() {
  const nav = useNavigation<any>();

  // User can type staff ID (FS-0001 / SV-0001) OR email
  const [idOrEmail, setIdOrEmail] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  // Prefill with last login id/email
  useEffect(() => {
    const last = getMeta('last_login_id');
    if (typeof last === 'string' && last.trim()) setIdOrEmail(last);
  }, []);

  const isEmail = useMemo(() => /\S+@\S+\.\S+/.test(idOrEmail.trim()), [idOrEmail]);
  const canUnlock = idOrEmail.trim().length > 0 && pin.length === PIN_LENGTH && !loading;

  function handleDigit(d: string) {
    if (loading) return;
    setPin((prev) => (prev + d).slice(0, PIN_LENGTH));
  }
  function handleClear() {
    if (loading) return;
    setPin('');
  }
  function handleBackspace() {
    if (loading) return;
    setPin((s) => s.slice(0, -1));
  }

  // Auto-submit on 4th digit
  useEffect(() => {
    if (pin.length === PIN_LENGTH && idOrEmail.trim()) {
      const t = setTimeout(() => doLogin(), 120);
      return () => clearTimeout(t);
    }
  }, [pin]); // eslint-disable-line react-hooks/exhaustive-deps

  async function doLogin() {
    if (!canUnlock) return;
    setLoading(true);

    const raw = idOrEmail.trim();
    const payload = isEmail ? { email: raw.toLowerCase(), pin } : { userId: raw.toUpperCase(), pin };

    try {
      let data: any;
      try {
        data = await api.post('/auth/login-staff', payload);
      } catch {
        data = await api.post('/auth/staff-login', payload);
      }

      const token = data?.token;
      const user = data?.user || {};
      if (!token) throw new Error('Token සෙවීම අසාර්ථක විය');

      // If switching users, clear local tasks so old user's items don't show
      const prevUserId = getMeta('user_id');
      const nextUserId = String(user._id || '');
      if (!prevUserId || String(prevUserId) !== nextUserId) {
        try { db.runSync('DELETE FROM tasks'); } catch {}
        setMeta('tasks_last_pull', null);
        setMeta('lastSyncAt', null);
      }

      setMeta('auth_token', token);
      setMeta('last_login_id', raw);
      if (user._id) setMeta('user_id', String(user._id));
      if (user.name) setMeta('user_name', String(user.name));
      if (user.role) setMeta('user_role', String(user.role));

      await pullMineFromServer();
      nav.reset({ index: 0, routes: [{ name: 'TaskList' }] });
    } catch (e: any) {
      const msg =
        e?.response?.data?.error ||
        e?.message ||
        'පිවිසුම අසාර්ථක විය. කරුණාකර ඇතුළත් කළ දත්ත පරීක්ෂා කරන්න.';
      Alert.alert('පිවිසුම අසාර්ථකයි', String(msg));
      setPin('');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#eaf5e2' }}>
      {/* Minimal green header: icon + Sinhala app name */}
      <View
        style={{
          backgroundColor: '#5aa15a',
          paddingTop: 44,
          paddingBottom: 16,
          paddingHorizontal: 16,
          borderBottomLeftRadius: 24,
          borderBottomRightRadius: 24,
          shadowColor: '#000',
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 4,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ fontSize: 20, color: 'white' }}>🌾</Text>
          <Text style={{ fontSize: 20, color: 'white', marginLeft: 8 }}>ක්ෂේත්‍ර යෙදුම</Text>
        </View>
      </View>

      {/* Body: only ID field, PIN boxes, keypad, and login button */}
      <View style={{ padding: 18, gap: 14, flex: 1 }}>
        {/* ID / Email */}
        <View style={{ gap: 6 }}>
          <Text style={{ fontWeight: '600' }}>යූසර අංකය / ඊමේල්</Text>
          <TextInput
            placeholder="FS-0001 හෝ manager@farm.com"
            value={idOrEmail}
            onChangeText={setIdOrEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            style={{
              backgroundColor: 'white',
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 12,
              borderWidth: 1,
              borderColor: '#e4e4e7',
            }}
            editable={!loading}
          />
        </View>

        {/* PIN boxes */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 6 }}>
          {Array.from({ length: PIN_LENGTH }).map((_, i) => {
            const filled = i < pin.length;
            return (
              <View
                key={i}
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 10,
                  backgroundColor: 'white',
                  borderWidth: 1.5,
                  borderColor: filled ? '#5aa15a' : '#d4d4d8',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 24 }}>{filled ? '•' : ' '}</Text>
              </View>
            );
          })}
        </View>

        {/* Keypad */}
        <View style={{ marginTop: 10, gap: 10 }}>
          {[
            ['1', '2', '3'],
            ['4', '5', '6'],
            ['7', '8', '9'],
            ['clear', '0', 'back'],
          ].map((row, idx) => (
            <View key={idx} style={{ flexDirection: 'row', gap: 12, justifyContent: 'center' }}>
              {row.map((label) => {
                const isAction = label === 'clear' || label === 'back';
                const onPress =
                  label === 'clear' ? handleClear : label === 'back' ? handleBackspace : () => handleDigit(label);
                return (
                  <Pressable
                    key={label}
                    onPress={onPress}
                    disabled={loading}
                    style={({ pressed }) => ({
                      width: 82,
                      height: 62,
                      borderRadius: 14,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: isAction ? '#f3f4f6' : 'white',
                      borderWidth: 1,
                      borderColor: '#e5e7eb',
                      opacity: pressed || loading ? 0.6 : 1,
                      shadowColor: '#000',
                      shadowOpacity: 0.05,
                      shadowRadius: 6,
                      elevation: 1,
                    })}
                  >
                    {label === 'clear' ? (
                      <Text style={{ fontWeight: '700' }}>🧹</Text>
                    ) : label === 'back' ? (
                      <Text style={{ fontWeight: '700' }}>⌫</Text>
                    ) : (
                      <Text style={{ fontSize: 20, fontWeight: '700' }}>{label}</Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>

        {/* Login button */}
        <View style={{ marginTop: 8, paddingHorizontal: 6 }}>
          <Pressable
            onPress={doLogin}
            disabled={!canUnlock}
            style={({ pressed }) => ({
              height: 56,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: canUnlock ? '#2E7D32' : '#A5C3A6',
              opacity: pressed ? 0.85 : 1,
            })}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>පිවිසෙන්න</Text>
            )}
          </Pressable>
          <Text style={{ textAlign: 'center', marginTop: 10, opacity: 0.6 }}>PIN ඉලක්කම් 4 යි</Text>
        </View>
      </View>
    </View>
  );
}
