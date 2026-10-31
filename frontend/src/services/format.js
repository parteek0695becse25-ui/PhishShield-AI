export const LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export const LEVEL_LABEL = { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', CRITICAL: 'Critical' };

export const LEVEL_COLOR = {
  LOW: 'var(--low)',
  MEDIUM: 'var(--medium)',
  HIGH: 'var(--high)',
  CRITICAL: 'var(--critical)',
};

export function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function typeLabel(type) {
  return type === 'URL' ? 'URL' : 'Message';
}
