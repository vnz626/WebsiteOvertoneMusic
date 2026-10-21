const TONES = {
  primary: "bg-ts-primary/10 text-ts-primary dark:text-brand-400",
  success: "bg-emerald-100 text-emerald-700",
  warning: "bg-amber-100 text-amber-700",
  danger: "bg-rose-100 text-rose-600",
  muted: "bg-ts-low text-ts-muted dark:bg-surface-high dark:text-slate-300",
};

/** Peta status backend -> tampilan badge. */
const STATUS_MAP = {
  approved: ["success", "Disetujui"],
  pending: ["warning", "Menunggu"],
  rejected: ["danger", "Ditolak"],
  paid: ["success", "Lunas"],
  failed: ["danger", "Ditolak"],
  menunggu_verifikasi: ["warning", "Menunggu verifikasi"],
};

export default function Badge({ children, tone = "primary", status }) {
  const [mappedTone, label] = STATUS_MAP[status] || [];
  return (
    <span
      className={`inline-block rounded-full px-3 py-1 text-[11px] font-extrabold ${TONES[mappedTone || tone] || TONES.primary}`}
    >
      {children || label || status || "-"}
    </span>
  );
}
