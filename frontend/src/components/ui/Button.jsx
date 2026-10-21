const VARIANTS = {
  primary: "bg-ts-primary text-white shadow-md hover:bg-ts-container hover:shadow-lg",
  secondary: "bg-ts-lime text-ts-void hover:brightness-95",
  danger: "bg-rose-500 text-white hover:bg-rose-600",
  ghost:
    "bg-transparent text-ts-ink border border-ts-subtle hover:bg-ts-low dark:text-slate-200 dark:border-white/10 dark:hover:bg-surface-high",
};

export default function Button({ children, variant = "primary", className = "", ...props }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-6 py-2.5 text-sm font-bold transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant] || VARIANTS.primary} ${className}`}
    >
      {children}
    </button>
  );
}
