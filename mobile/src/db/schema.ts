export const createStatements = [
  `CREATE TABLE IF NOT EXISTS tasks(
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL,        -- pending | in_progress | done | blocked
    updatedAt INTEGER NOT NULL,  -- epoch millis
    dirty INTEGER NOT NULL DEFAULT 0
  );`,
  `CREATE TABLE IF NOT EXISTS meta(
    key TEXT PRIMARY KEY,
    value TEXT
  );`
];
