import { Loader2 } from 'lucide-react';

export default function Spinner({ label = 'Loading' }) {
  return (
    <span className="spinner" role="status">
      <Loader2 className="spin" size={18} aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
