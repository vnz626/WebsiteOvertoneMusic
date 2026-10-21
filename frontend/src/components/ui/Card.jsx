export default function Card({ children, className = "", ...props }) {
  return (
    <div
      {...props}
      className={`rounded-2xl border border-ts-subtle bg-white p-5 shadow-sm dark:border-white/10 dark:bg-surface-container ${className}`}
    >
      {children}
    </div>
  );
}

export function StatCard({ label, value, hint }) {
  return (
    <Card className="transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-ts-primary/10">
      <p className="text-xs font-semibold uppercase tracking-wider text-ts-muted dark:text-slate-400">{label}</p>
      <p className="mt-2 font-jakarta text-2xl font-extrabold text-ts-ink dark:text-white">{value}</p>
      {hint && <p className="mt-1 text-xs text-ts-muted">{hint}</p>}
    </Card>
  );
}
