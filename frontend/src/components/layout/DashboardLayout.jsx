export default function DashboardLayout({ title, subtitle, actions, children }) {
  return (
    <div className="w-full min-h-[calc(100vh-56px)] bg-transparent">
      <div className="w-full p-6 md:p-8 lg:px-10 max-w-7xl mx-auto">
        {(title || actions) && (
          <header className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-gray-200 pb-5">
            <div>
              {title && <h1 className="font-jakarta text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">{title}</h1>}
              {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
            </div>
            {actions}
          </header>
        )}
        {children}
      </div>
    </div>
  );
}
