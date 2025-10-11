import { exec } from './db';

export async function ensureTables() {
  await exec(`CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    status TEXT NOT NULL,
    plot_id TEXT,
    notes TEXT,
    updated_at INTEGER NOT NULL
  );`);

  await exec(`CREATE TABLE IF NOT EXISTS mutations (
    id TEXT PRIMARY KEY,
    url TEXT NOT NULL,
    method TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );`);

  await exec(`CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY,
    value TEXT
  );`);
}
