// src/auth.js
import api from "./api.js";

const KEY = "sf_auth";

/** Persist auth (token + user) */
export function setAuth(payload) {
  localStorage.setItem(KEY, JSON.stringify(payload || {}));
}

/** Alias for older code that imports `saveAuth` */
export { setAuth as saveAuth };   // <-- add this line

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
  // legacy: { token, role, name, id }  |  new: { token, user: { role, ... } }
  return a?.user?.role ?? a?.role ?? null;
}

/** Heal storage using /auth/me when we have a token but role is missing/stale */
export async function ensureMe() {
  const a = getAuth();
  if (!a?.token) return { ok: false };

  try {
    const { data: me } = await api.get("/auth/me");
    setAuth({ token: a.token, user: me });
    return { ok: true, user: me };
  } catch {
    clearAuth();
    return { ok: false };
  }
}

/** Manager check */
export function isManager() {
  return getStoredRole() === "manager";
}
