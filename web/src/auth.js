// src/auth.js
import api from "./api.js";

const KEY = "sf_auth";

/** Persist auth (token + user) */
export function setAuth(payload) {
  localStorage.setItem(KEY, JSON.stringify(payload || {}));
}

/** Read auth safely */
export function getAuth() {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}"); }
  catch { return {}; }
}

/** Clear auth */
export function clearAuth() {
  localStorage.removeItem(KEY);
}

/** True if we have any token */
export function isAuthed() {
  const a = getAuth();
  return Boolean(a?.token);
}

/** Extract role from any saved shape */
export function getStoredRole() {
  const a = getAuth();
  // Support both legacy and new shapes
  // legacy: { token, role, name, id }
  // new:    { token, user: { role, ... } }
  return a?.user?.role ?? a?.role ?? null;
}

/**
 * Ensure we have a fresh user (and role) from the server.
 * - If token exists but role is missing or stale, fetch /auth/me
 * - On success, rewrite storage to new canonical shape: { token, user }
 * - On 401, clears storage
 * Returns: { ok: boolean, user?: object }
 */
export async function ensureMe() {
  const a = getAuth();
  if (!a?.token) return { ok: false };

  try {
    const { data: me } = await api.get("/auth/me");
    // Canonicalize saved shape
    setAuth({ token: a.token, user: me });
    return { ok: true, user: me };
  } catch (e) {
    // Token invalid/expired → clear
    clearAuth();
    return { ok: false };
  }
}

/** True if the (possibly legacy) storage indicates manager */
export function isManager() {
  const role = getStoredRole();
  return role === "manager";
}
