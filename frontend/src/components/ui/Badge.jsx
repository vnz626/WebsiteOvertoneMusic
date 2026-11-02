const TONES = {
  primary: "bg-surface-muted text-ink border border-line-strong",
  accent: "bg-accent-subtle text-accent border border-accent/30",
  gold: "bg-status-warning-bg text-status-warning-text border border-status-warning-border",
  success: "bg-status-success-bg text-status-success-text border border-status-success-border",
  warning: "bg-status-warning-bg text-status-warning-text border border-status-warning-border",
  danger: "bg-status-danger-bg text-status-danger-text border border-status-danger-border",
  info: "bg-status-info-bg text-status-info-text border border-status-info-border",
  muted: "bg-surface-muted text-ink-secondary border border-line",
};

/** Peta status backend -> tampilan badge dengan teks jelas (Aturan E & G). */
const STATUS_MAP = {
  approved: ["success", "Disetujui"],
  pending: ["warning", "Menunggu"],
  rejected: ["danger", "Ditolak"],
  paid: ["success", "Lunas"],
  completed: ["success", "Selesai"],
  shipped: ["info", "Dikirim"],
  ready_for_pickup: ["info", "Siap Diambil"],
  processing: ["warning", "Diproses"],
  cancelled: ["danger", "Dibatalkan"],
  failed: ["danger", "Ditolak"],
  menunggu_verifikasi: ["warning", "Menunggu Verifikasi"],
};

export default function Badge({ children, tone = "primary", status, className = "" }) {
  const [mappedTone, label] = STATUS_MAP[status] || [];
  const activeTone = mappedTone || tone;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-xs px-2.5 py-0.5 text-[11px] font-bold tracking-wide whitespace-nowrap ${TONES[activeTone] || TONES.primary
        } ${className}`}
    >
      <span
        className="h-1.5 w-1.5 rounded-full bg-current opacity-80 shrink-0"
        aria-hidden="true"
      />
      <span>{children || label || status || "-"}</span>
    </span>
  );
}
