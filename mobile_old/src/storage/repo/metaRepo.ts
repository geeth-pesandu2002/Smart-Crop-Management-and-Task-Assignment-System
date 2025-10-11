import { exec, queryFirst } from '../db';

export async function getLastSync(): Promise<number> {
  const row = await queryFirst<{ value: string }>(`SELECT value FROM meta WHERE key='lastSync'`);
  return row ? Number(row.value || 0) : 0;
}

export async function setLastSync(ts: number) {
  await exec(`INSERT OR REPLACE INTO meta (key, value) VALUES ('lastSync', ?)`, [String(ts)]);
}
