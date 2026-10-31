export default function EmptyState({ icon: Icon, title, children }) {
  return (
    <div className="empty">
      {Icon && <Icon size={28} aria-hidden="true" />}
      <h3>{title}</h3>
      <div>{children}</div>
    </div>
  );
}
