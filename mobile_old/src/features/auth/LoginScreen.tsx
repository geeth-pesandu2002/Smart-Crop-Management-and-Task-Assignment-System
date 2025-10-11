import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert } from 'react-native';
import { login } from '../../api/auth';
import { setAuthToken } from '../../api/http';

export default function LoginScreen({ navigation }: any) {
  const [u, setU] = useState('staff1@farm.com'); // for quick testing
  const [p, setP] = useState('pass123');
  const [busy, setBusy] = useState(false);

  async function onLogin() {
    try {
      setBusy(true);
      const res = await login(u, p);
      setAuthToken(res.token);
      navigation.replace('Tasks');
    } catch (e: any) {
      Alert.alert('Login failed', e?.message || 'Error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 24 }}>පිවිසුම</Text>
      <Text>ඊමේල්</Text>
      <TextInput value={u} onChangeText={setU} autoCapitalize="none" style={{ borderWidth: 1, padding: 8 }} />
      <Text>මුරපදය</Text>
      <TextInput value={p} onChangeText={setP} secureTextEntry style={{ borderWidth: 1, padding: 8 }} />
      <Button title={busy ? '...' : 'පිවිසෙන්න'} onPress={onLogin} disabled={busy} />
    </View>
  );
}
