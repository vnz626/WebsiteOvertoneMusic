import Sidebar from "./Sidebar";

export default function DashboardLayout({ title, subtitle, actions, children }) {
  return (
    <div className="home-surface flex min-h-[calc(100vh-57px)] flex-col md:flex-row">
      <Sidebar />
      <main className="min-w-0 flex-1 p-6 md:p-8 lg:px-12">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-3 border-b border-ts-subtle pb-6 dark:border-white/10">
          <div>
            <h1 className="font-jakarta text-2xl font-bold tracking-tight text-ts-ink dark:text-white md:text-3xl">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-ts-muted dark:text-slate-400">{subtitle}</p>}
          </div>
          {actions}
        </header>
        {children}
      </main>
    </div>
  );
}
