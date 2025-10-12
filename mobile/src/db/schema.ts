export const createStatements = [
  `CREATE TABLE IF NOT EXISTS tasks(
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL,        -- pending | in_progress | done | blocked
    updatedAt INTEGER NOT NULL,  -- epoch millis
    dirty INTEGER NOT NULL DEFAULT 0
  );`,
  `CREATE TABLE IF NOT EXISTS reports(
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    userName TEXT,
    field TEXT NOT NULL,
    date INTEGER NOT NULL,
    issueType TEXT NOT NULL,
    description TEXT,
    photoUrl TEXT,
    voiceUrl TEXT,
    createdAt INTEGER NOT NULL,
    dirty INTEGER NOT NULL DEFAULT 1
  );`,
  `CREATE TABLE IF NOT EXISTS meta(
    key TEXT PRIMARY KEY,
    value TEXT
  );`
];
