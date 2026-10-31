import { LEVEL_LABEL } from '../services/format.js';

export default function RiskBadge({ level }) {
  return <span className={`badge badge-${level.toLowerCase()}`}>{LEVEL_LABEL[level] || level}</span>;
}
