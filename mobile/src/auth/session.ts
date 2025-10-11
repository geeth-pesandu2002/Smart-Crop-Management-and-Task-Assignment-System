// mobile/src/auth/session.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export type User = { id: string; name: string; email: string; role: string };
export type AuthState = { token: string; user: User };

const KEY = 'auth_state';

export async function saveAuth(auth: AuthState) {
  await AsyncStorage.setItem(KEY, JSON.stringify(auth));
}

export async function getAuth(): Promise<AuthState | null> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function clearAuth() {
  await AsyncStorage.removeItem(KEY);
}
