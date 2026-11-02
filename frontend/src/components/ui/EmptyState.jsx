export default function EmptyState({ title = "Belum ada data", description, action }) {
  return (
    <div className="rounded-md border border-dashed border-line-strong bg-surface p-10 text-center">
      <h3 className="font-display text-base font-bold text-ink">{title}</h3>
      {description && (
        <p className="mt-1.5 text-xs text-ink-secondary max-w-sm mx-auto leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
