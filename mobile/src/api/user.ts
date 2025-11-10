// mobile/src/api/user.ts
import { api } from './client';

export async function getCurrentUserProfile() {
  return api.get('/users/me');
}
