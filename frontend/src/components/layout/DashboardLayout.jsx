export default function DashboardLayout({ title, subtitle, actions, children }) {
  return (
    <div className="w-full min-h-[calc(100vh-56px)] bg-canvas">
      <div className="w-full px-4 py-6 sm:px-6 md:py-8 lg:px-10 max-w-7xl mx-auto">
        {(title || actions) && (
          <header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
            <div>
              {title && (
                <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink md:text-3xl">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="mt-1 text-xs sm:text-sm text-ink-secondary editorial-measure">
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
