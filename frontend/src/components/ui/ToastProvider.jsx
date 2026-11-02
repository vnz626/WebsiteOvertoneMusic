import React, { createContext, useContext, useCallback } from "react";
import { Toaster, toast as hotToast } from "react-hot-toast";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

const ToastContext = createContext(null);

export const toast = {
  success: (msg, opts = {}) => {
    return hotToast.custom(
      (t) => (
        <div
          role="status"
          aria-live="polite"
          className={`${
            t.visible ? "animate-enter" : "animate-leave"
          } max-w-md w-full bg-surface border border-status-success-border shadow-md rounded-md pointer-events-auto flex items-center p-3.5 gap-3 font-sans`}
        >
          <div
            className="flex-shrink-0 w-8 h-8 rounded-sm bg-status-success-bg text-status-success-text flex items-center justify-center border border-status-success-border"
            aria-hidden="true"
          >
            <CheckCircle2 size={18} />
          </div>
          <div className="flex-1 text-xs font-bold text-ink leading-snug">{msg}</div>
          <button
            type="button"
            onClick={() => hotToast.dismiss(t.id)}
            aria-label="Tutup notifikasi"
            className="flex-shrink-0 text-ink-muted hover:text-ink transition-colors duration-fast p-1 rounded-sm"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      ),
      { duration: 3500, ...opts }
    );
  },
  error: (msg, opts = {}) => {
    return hotToast.custom(
      (t) => (
        <div
          role="alert"
          aria-live="assertive"
          className={`${
            t.visible ? "animate-enter" : "animate-leave"
          } max-w-md w-full bg-surface border border-status-danger-border shadow-md rounded-md pointer-events-auto flex items-center p-3.5 gap-3 font-sans`}
        >
          <div
            className="flex-shrink-0 w-8 h-8 rounded-sm bg-status-danger-bg text-status-danger-text flex items-center justify-center border border-status-danger-border"
            aria-hidden="true"
          >
            <AlertCircle size={18} />
          </div>
          <div className="flex-1 text-xs font-bold text-ink leading-snug">{msg}</div>
          <button
            type="button"
            onClick={() => hotToast.dismiss(t.id)}
            aria-label="Tutup pesan galat"
            className="flex-shrink-0 text-ink-muted hover:text-ink transition-colors duration-fast p-1 rounded-sm"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      ),
      { duration: 4000, ...opts }
    );
  },
  info: (msg, opts = {}) => {
    return hotToast.custom(
      (t) => (
        <div
          role="status"
          aria-live="polite"
          className={`${
            t.visible ? "animate-enter" : "animate-leave"
          } max-w-md w-full bg-surface border border-line-strong shadow-md rounded-md pointer-events-auto flex items-center p-3.5 gap-3 font-sans`}
        >
          <div
            className="flex-shrink-0 w-8 h-8 rounded-sm bg-accent-subtle text-accent flex items-center justify-center border border-accent/30"
            aria-hidden="true"
          >
            <Info size={18} />
          </div>
          <div className="flex-1 text-xs font-bold text-ink leading-snug">{msg}</div>
          <button
            type="button"
            onClick={() => hotToast.dismiss(t.id)}
            aria-label="Tutup informasi"
            className="flex-shrink-0 text-ink-muted hover:text-ink transition-colors duration-fast p-1 rounded-sm"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      ),
      { duration: 3500, ...opts }
    );
  },
};

export function ToastProvider({ children }) {
  const showToast = useCallback((msg, type = "info") => {
    if (type === "success") return toast.success(msg);
    if (type === "error") return toast.error(msg);
    return toast.info(msg);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, toast }}>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
        }}
      />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) return { showToast: toast.info, toast };
  return ctx;
}

export default ToastProvider;
