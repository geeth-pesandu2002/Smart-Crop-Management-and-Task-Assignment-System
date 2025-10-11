// mobile/src/db/index.ts
import * as SQLite from 'expo-sqlite';
import { createStatements } from './schema';

export const db = SQLite.openDatabaseSync('smartfarm.db');

/** Ensure all tables exist. Call once on app start (bootstrap). */
export function ensureDb() {
  db.withTransactionSync(() => {
    // Run schema statements (should include tasks, etc.)
    for (const sql of createStatements) db.execSync(sql);

    // Safety: also ensure meta exists even if omitted from schema
    db.execSync('CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT)');
  });
}
