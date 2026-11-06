export default function DashboardLayout({ title, subtitle, actions, children }) {
  return (
    <div className="w-full min-h-[calc(100vh-56px)] bg-canvas text-ink">
      <div className="w-full px-4 py-6 sm:px-6 md:py-8 lg:px-8 max-w-7xl mx-auto">
        {(title || actions) && (
          <header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 border border-accent/25 px-2.5 py-0.5 text-[10px] font-bold text-accent uppercase tracking-widest">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" aria-hidden="true" />
                  Enterprise Console &bull; 6 Subsistem
                </span>
              </div>
              {title && (
                <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink md:text-3xl">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="mt-1.5 text-xs sm:text-sm text-ink-secondary max-w-3xl leading-relaxed">
                  {subtitle}
                </p>
              )}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
          </header>
        )}
        {children}
      </div>
    </div>
  );
}
