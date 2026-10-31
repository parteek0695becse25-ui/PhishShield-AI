export default function StatCard({ icon: Icon, label, value, hint, tone }) {
  return (
    <div className={`stat ${tone ? `stat-${tone}` : ''}`}>
      <div className="stat-head">
        {Icon && <Icon size={18} aria-hidden="true" />}
        <span>{label}</span>
      </div>
      <div className="stat-value">{value}</div>
      {hint && <div className="stat-hint">{hint}</div>}
    </div>
  );
}
