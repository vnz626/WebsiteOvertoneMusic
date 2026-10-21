export default function EmptyState({ title = "Belum ada data", description, action }) {
  return (
    <div className="rounded-2xl border border-dashed border-ts-perforated p-12 text-center dark:border-white/15">
      <h3 className="font-jakarta text-lg font-bold text-ts-ink dark:text-white">{title}</h3>
      {description && <p className="mt-2 text-sm text-ts-muted dark:text-slate-400">{description}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
