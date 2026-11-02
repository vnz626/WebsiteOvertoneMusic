import { Loader2 } from "lucide-react";

const VARIANTS = {
  primary:
    "bg-accent text-accent-on border border-accent hover:bg-accent-hover hover:border-accent-hover active:opacity-90",
  ink:
    "bg-ink text-surface border border-ink hover:opacity-90 active:opacity-85",
  secondary:
    "bg-surface-muted text-ink border border-line hover:bg-surface-subtle hover:border-line-strong active:opacity-90",
  outline:
    "border border-line-strong bg-surface text-ink hover:bg-surface-muted hover:border-ink active:opacity-90",
  danger:
    "bg-status-danger-text text-surface border border-status-danger-text hover:opacity-90 active:opacity-85",
  ghost:
    "bg-transparent text-ink-secondary border border-transparent hover:bg-surface-muted hover:text-ink active:opacity-90",
};

export default function Button({
  children,
  variant = "primary",
  loading = false,
  disabled = false,
  className = "",
  type = "button",
  ...props
}) {
  const isDisabled = disabled || loading;
  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-sm px-4 py-2.5 text-xs font-bold tracking-wide transition-colors duration-fast focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-55 ${
        VARIANTS[variant] || VARIANTS.primary
      } ${className}`}
    >
      {loading && <Loader2 size={14} className="animate-spin shrink-0" aria-hidden="true" />}
      {children}
    </button>
  );
}
