// mobile/src/db/meta.ts
import { db } from './index';

let ready = false;
function ensure() {
  if (ready) return;
  db.runSync(`CREATE TABLE IF NOT EXISTS meta (
    key   TEXT PRIMARY KEY,
    value TEXT
  )`);
  ready = true;
}

/** Read a string value from meta, or null if not set */
export function getMeta(key: string): string | null {
  ensure();
  const rows = db.getAllSync<{ value: string }>(
    'SELECT value FROM meta WHERE key=? LIMIT 1',
    [key]
  );
  return rows[0]?.value ?? null;
}

/** Upsert a meta value (numbers/booleans are stored as strings) */
export function setMeta(
  key: string,
  value: string | number | boolean | null
): void {
  ensure();
  const v = value == null ? null : String(value);
  db.runSync(
    `INSERT INTO meta(key, value)
     VALUES(?, ?)
     ON CONFLICT(key) DO UPDATE SET value=excluded.value`,
    [key, v]
  );
}

/** Delete a meta key */
export function delMeta(key: string): void {
  ensure();
  db.runSync('DELETE FROM meta WHERE key=?', [key]);
}

/** Optional: clear all auth-related keys in one go */
export function clearAuthMeta() {
  delMeta('auth_token');
  delMeta('user_id');
  delMeta('user_name');
  delMeta('user_role');
}
