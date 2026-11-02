export default function Card({ children, className = "", ...props }) {
  return (
    <div
      {...props}
      className={`rounded-md border border-line bg-surface p-5 shadow-xs transition-colors duration-fast ${className}`}
    >
      {children}
    </div>
  );
}

export function StatCard({ label, value, hint, icon: Icon }) {
  return (
    <Card className="hover:border-line-strong">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">{label}</p>
        {Icon && <Icon size={16} className="text-ink-muted shrink-0" aria-hidden="true" />}
      </div>
      <p className="mt-2 font-display text-2xl font-bold text-ink tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-secondary">{hint}</p>}
    </Card>
  );
}
