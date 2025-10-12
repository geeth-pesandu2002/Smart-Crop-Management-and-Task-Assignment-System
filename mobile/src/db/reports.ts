import { db } from './index';


export function createReport(opts: {
  userId: string;
  userName?: string;
  field: string;
  date: number;
  issueType: string;
  description?: string;
  photoUrl?: string;
  voiceUrl?: string;
}) {
  // Simple id fallback: timestamp + random
  const id = `r_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
  const createdAt = Date.now();
  db.withTransactionSync(() => {
    // execSync typically accepts a single SQL string for the synchronous binding in this project setup
    const sql = `INSERT INTO reports (id,userId,userName,field,date,issueType,description,photoUrl,voiceUrl,createdAt,dirty) VALUES ('${id}','${String(
      opts.userId
    ).replace(/'/g, "''")}','${String(opts.userName || '').replace(/'/g, "''")}','${String(opts.field).replace(/'/g, "''")}',${Number(
      opts.date
    )},'${String(opts.issueType).replace(/'/g, "''")}','${String(opts.description || '').replace(/'/g, "''")}','${String(
      opts.photoUrl || ''
    ).replace(/'/g, "''")}','${String(opts.voiceUrl || '').replace(/'/g, "''")}','${createdAt}',1)`;
    db.execSync(sql);
  });
  return id;
}

export function listReports() {
  const rows: any[] = [];
  // Use a single execSync call and inspect its returned structure
  // Try a non-transactional exec. The TypeScript defs for execSync are imprecise so use any.
  try {
    const res = (db as any).execSync('SELECT * FROM reports ORDER BY createdAt DESC');
    // res may be an array of result sets (res[0].values), or an object with rows._array
    if (Array.isArray(res) && res[0] && res[0].values) {
      rows.push(...res[0].values);
    } else if (res && (res as any).rows && Array.isArray((res as any).rows._array)) {
      rows.push(...(res as any).rows._array);
    }
  } catch (e) {
    // ignore and return empty
  }
  return rows;
}
