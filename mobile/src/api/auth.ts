// mobile/src/api/auth.ts
import { api } from './client';

export async function login(email: string, password: string) {
  const res = await api.post('/auth/login', { email, password });
  // expected shape: { token, user }
  return res.data as { token: string; user: { id: string; name: string; email: string; role: string } };
}
