import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, ArrowRight, AlertTriangle } from "lucide-react";
import api from "../../api";

export default function QuickSopWidget({ role = "staff", linkTo = "/warehouse/sop" }) {
  const [sops, setSops] = useState([]);
  const [allSops, setAllSops] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/kms/internal-sops")
      .then((res) => {
        const list = res?.data?.data || [];
        setAllSops(list);
        setSops(list.slice(0, 3));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (!loading && sops.length === 0) return null;

  const unackCount = allSops.filter((s) => !s.acknowledged || s.needs_reack).length;

  return (
    <section
      aria-label="Ringkasan SOP Divisi"
      className="rounded-md border border-line bg-surface p-5 shadow-xs"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3 mb-4">
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-sm bg-accent-subtle text-accent border border-accent/30"
            aria-hidden="true"
          >
            <BookOpen size={15} />
          </span>
          <h3 className="font-display text-sm font-bold text-ink">
            SOP &amp; Prosedur Operasional Divisi
          </h3>
          {unackCount > 0 && (
            <span className="rounded-xs bg-status-warning-bg border border-status-warning-border text-status-warning-text px-2 py-0.5 text-[10px] font-bold tabular-nums">
              {unackCount} Belum Dikonfirmasi
            </span>
          )}
        </div>

        <Link
          to={linkTo}
          className="inline-flex items-center gap-1 text-xs font-bold text-accent hover:underline"
        >
          <span>Lihat Semua SOP ({allSops.length})</span>
          <ArrowRight size={13} aria-hidden="true" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {sops.map((sop) => (
          <Link
            key={sop.id}
            to={linkTo}
            className="group rounded-sm border border-line bg-surface-muted p-3.5 hover:border-line-strong hover:bg-surface transition-colors duration-fast flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <span className="tabular-nums text-[10px] font-bold text-ink bg-surface border border-line px-1.5 py-0.5 rounded-xs">
                  {sop.sop_code || "SOP"} v{sop.version || 1}
                </span>
                {sop.needs_reack ? (
                  <span className="text-[10px] font-bold text-status-warning-text bg-status-warning-bg border border-status-warning-border px-1.5 py-0.5 rounded-xs">
                    Pembaruan Revisi
                  </span>
                ) : sop.priority_level === "critical" ? (
                  <span className="text-[10px] font-bold uppercase text-status-danger-text flex items-center gap-1">
                    <AlertTriangle size={11} aria-hidden="true" />
                    <span>Kritis</span>
                  </span>
                ) : (
                  <span className="text-[10px] font-bold uppercase text-ink-muted">
                    {sop.priority_level}
                  </span>
                )}
              </div>
              <h4 className="font-display font-bold text-xs text-ink group-hover:text-accent transition-colors duration-fast line-clamp-2">
                {sop.title}
              </h4>
            </div>

            <div className="mt-3 flex items-center justify-between text-[11px]">
              <span
                className={
                  sop.acknowledged && !sop.needs_reack
                    ? "text-status-success-text font-bold"
                    : "text-ink-muted font-medium"
                }
              >
                {sop.acknowledged && !sop.needs_reack ? "Sudah Dipahami" : "Wajib Dibaca"}
              </span>
              <span className="text-accent font-bold flex items-center gap-0.5">
                <span>Buka Dokumen</span>
                <ArrowRight size={11} aria-hidden="true" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
