import { http } from './http';

export type LoginResponse = { token: string; user: any };

export async function login(username: string, password: string) {
  const { data } = await http.post<LoginResponse>('/auth/login', { username, password });
  return data;
}
