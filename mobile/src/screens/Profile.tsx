import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { setMeta } from '../db/meta';

export default function Profile({ navigation }: any) {
  function logout() {
    setMeta('auth_token', null);
    setMeta('user_id', null);
    setMeta('user_name', null);
    setMeta('user_role', null);
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 12 }}>පැරෝල්</Text>
      <Text style={{ marginBottom: 12 }}>මෙහි ඔබගේ පරිශීලක තොරතුරු, සැකසුම් හා පිටවීමේ ක්‍රියාකාරකම් දැක්විය හැකිය.</Text>

      <Pressable onPress={logout} style={({ pressed }) => ({ backgroundColor: '#5aa15a', padding: 12, borderRadius: 10, opacity: pressed ? 0.8 : 1 })}>
        <Text style={{ color: 'white', fontWeight: '700' }}>ඉවත්වෙන්න</Text>
      </Pressable>
    </View>
  );
}
