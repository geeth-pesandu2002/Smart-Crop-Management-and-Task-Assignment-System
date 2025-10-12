// mobile/src/core/status.ts
// Centralized status -> Sinhala label mapping
export const S = {
  stPending: 'ආරම්භ නොකළේ',
  stInProgress: 'ක්‍රියාත්මකයි',
  stBlocked: 'අවහිර විය',
  stDone: 'සම්පුර්ණයි',
  unknown: '—',
};

export function statusToLabel(code?: string | null) {
  switch ((code || '').toLowerCase()) {
    case 'pending': return S.stPending;
    case 'in_progress': return S.stInProgress;
    case 'blocked': return S.stBlocked;
    case 'done':
    case 'completed': return S.stDone;
    default: return S.unknown;
  }
}

export const toServerStatus = (s: 'pending'|'in_progress'|'blocked'|'done') =>
  s === 'done' ? 'completed' : s;

// color for quick visual scanning
export function statusColor(code?: string | null) {
  switch ((code || '').toLowerCase()) {
    case 'pending': return '#6b7280'; // gray
    case 'in_progress': return '#f59e0b'; // amber
    case 'blocked': return '#ef4444'; // red
    case 'done':
    case 'completed': return '#10b981'; // green
    default: return '#6b7280';
  }
}
