// mobile/src/api/client.ts
import { API_URL, API_TIMEOUT, API_TOKEN } from '../config/env';
import { getMeta } from '../db/meta';

// Build absolute URL from a relative path
function buildUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_URL.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

function buildAuthHeader(): Record<string, string> {
  // Prefer token saved after login; fall back to .env token if provided
  const raw = (getMeta('auth_token') as string | null) || API_TOKEN || '';
  if (!raw) return {};
  const value = raw.startsWith('Bearer ') ? raw : `Bearer ${raw}`;
  return { Authorization: value };
}

async function fetchJSON(path: string, init: RequestInit) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(init.headers as Record<string, string> | undefined),
      ...buildAuthHeader(),
    };

    const res = await fetch(buildUrl(path), {
      ...init,
      headers,
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status} ${res.statusText} – ${text}`);
    }
    if (res.status === 204) return null;
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  get: (path: string) => fetchJSON(path, { method: 'GET' }),
  post: (path: string, body?: any) =>
    fetchJSON(path, { method: 'POST', body: body == null ? undefined : JSON.stringify(body) }),
  patch: (path: string, body?: any) =>
    fetchJSON(path, { method: 'PATCH', body: body == null ? undefined : JSON.stringify(body) }),
  put: (path: string, body?: any) =>
    fetchJSON(path, { method: 'PUT', body: body == null ? undefined : JSON.stringify(body) }),
  delete: (path: string) => fetchJSON(path, { method: 'DELETE' }),
};
