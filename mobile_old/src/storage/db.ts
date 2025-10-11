// Modern Expo SQLite (async) helpers
import * as SQLite from 'expo-sqlite';

let _db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync('smartfarm.db');
  return _db;
}

// run INSERT/UPDATE/DELETE/CREATE
export async function exec(sql: string, params: any[] = []): Promise<void> {
  const db = await getDb();
  await db.runAsync(sql, params);
}

// query multiple rows
export async function queryAll<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const db = await getDb();
  return await db.getAllAsync<T>(sql, params);
}

// query single row (normalize null -> undefined for convenience)
export async function queryFirst<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
  const db = await getDb();
  const row = await db.getFirstAsync<T>(sql, params); // row: T | null
  return row ?? undefined; // fix: map null to undefined
}
