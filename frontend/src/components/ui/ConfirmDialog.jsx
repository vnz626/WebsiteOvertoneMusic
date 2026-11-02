import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from "react";
import { AlertTriangle, HelpCircle, X } from "lucide-react";

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [dialogState, setDialogState] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "Lanjutkan",
    cancelText: "Batal",
    isDanger: false,
  });

  const resolverRef = useRef(null);
  const confirmBtnRef = useRef(null);

  const confirm = useCallback(
    ({
      title = "Konfirmasi Tindakan",
      message = "Apakah Anda yakin ingin melanjutkan tindakan ini?",
      confirmText = "Lanjutkan",
      cancelText = "Batal",
      isDanger = false,
    } = {}) => {
      if (typeof arguments[0] === "string") {
        message = arguments[0];
        title = "Konfirmasi Tindakan";
      }

      return new Promise((resolve) => {
        resolverRef.current = resolve;
        setDialogState({
          isOpen: true,
          title,
          message,
          confirmText,
          cancelText,
          isDanger,
        });
      });
    },
    []
  );

  const handleConfirm = useCallback(() => {
    setDialogState((prev) => ({ ...prev, isOpen: false }));
    if (resolverRef.current) resolverRef.current(true);
  }, []);

  const handleCancel = useCallback(() => {
    setDialogState((prev) => ({ ...prev, isOpen: false }));
    if (resolverRef.current) resolverRef.current(false);
  }, []);

  useEffect(() => {
    if (!dialogState.isOpen) return;
    confirmBtnRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") handleCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dialogState.isOpen, handleCancel]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {dialogState.isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#181614]/70 font-sans"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
          aria-describedby="confirm-dialog-desc"
        >
          <div className="w-full max-w-md rounded-lg border border-line-strong bg-surface p-6 shadow-lg">
            <div className="flex items-start gap-3.5">
              <div
                className={`flex-shrink-0 w-10 h-10 rounded-sm flex items-center justify-center border ${
                  dialogState.isDanger
                    ? "bg-status-danger-bg text-status-danger-text border-status-danger-border"
                    : "bg-status-warning-bg text-status-warning-text border-status-warning-border"
                }`}
                aria-hidden="true"
              >
                {dialogState.isDanger ? <AlertTriangle size={20} /> : <HelpCircle size={20} />}
              </div>
              <div className="flex-1">
                <h3
                  id="confirm-dialog-title"
                  className="font-display text-base font-bold tracking-tight text-ink"
                >
                  {dialogState.title}
                </h3>
                <p
                  id="confirm-dialog-desc"
                  className="text-xs sm:text-sm text-ink-secondary mt-1.5 leading-relaxed"
                >
                  {dialogState.message}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCancel}
                aria-label="Tutup konfirmasi"
                className="text-ink-muted hover:text-ink transition-colors duration-fast p-1 rounded-sm"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>

            <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-line">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 rounded-sm border border-line-strong bg-surface text-xs font-bold text-ink hover:bg-surface-muted transition-colors duration-fast"
              >
                {dialogState.cancelText}
              </button>
              <button
                ref={confirmBtnRef}
                type="button"
                onClick={handleConfirm}
                className={`px-4 py-2 rounded-sm text-xs font-bold transition-colors duration-fast ${
                  dialogState.isDanger
                    ? "bg-status-danger-text text-surface hover:opacity-90"
                    : "bg-accent text-accent-on hover:bg-accent-hover"
                }`}
              >
                {dialogState.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    return async (opts) => {
      const msg = typeof opts === "string" ? opts : opts?.message || "Lanjutkan?";
      return window.confirm(msg);
    };
  }
  return ctx;
}

export default ConfirmProvider;
