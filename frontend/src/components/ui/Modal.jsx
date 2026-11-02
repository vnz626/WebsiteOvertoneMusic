import { useEffect, useRef } from "react";
import { X } from "lucide-react";

/**
 * Komponen Modal Aksesibel (Aturan H & L rulesdesain.md):
 * - Mengunci fokus di dalam modal saat terbuka
 * - Menutup dengan tombol Escape
 * - Mengembalikan fokus ke elemen pemicu saat ditutup
 * - Scrim terukur tanpa glassmorphism blur
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = "max-w-lg",
}) {
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    previousFocusRef.current = document.activeElement;

    const timer = setTimeout(() => {
      const focusable = dialogRef.current?.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      focusable?.focus();
    }, 20);

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose?.();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", handleKeyDown);
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === "function") {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#181614]/70"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        ref={dialogRef}
        className={`w-full ${maxWidth} rounded-lg border border-line-strong bg-surface text-ink shadow-lg overflow-hidden flex flex-col max-h-[90vh]`}
      >
        {(title || onClose) && (
          <div className="flex items-start justify-between gap-4 border-b border-line bg-surface-muted px-6 py-4">
            <div>
              {title && (
                <h2 id="modal-title" className="font-display text-lg font-bold text-ink">
                  {title}
                </h2>
              )}
              {subtitle && <p className="mt-0.5 text-xs text-ink-secondary">{subtitle}</p>}
            </div>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Tutup dialog"
                className="rounded-sm p-1.5 text-ink-muted hover:bg-surface-subtle hover:text-ink transition-colors duration-fast"
              >
                <X size={18} aria-hidden="true" />
              </button>
            )}
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2.5 border-t border-line bg-surface-muted px-6 py-3.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

