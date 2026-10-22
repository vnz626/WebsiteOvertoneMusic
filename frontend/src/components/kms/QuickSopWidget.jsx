import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, ArrowRight, ShieldCheck, AlertTriangle } from "lucide-react";
import api from "../../api";

export default function QuickSopWidget({ role = "staff", linkTo = "/warehouse/sop" }) {
  const [sops, setSops] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/kms/internal-sops")
      .then((res) => {
        const list = res?.data?.data || [];
        setSops(list.slice(0, 3));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (!loading && sops.length === 0) return null;

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-xs">
      <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-700">
            <BookOpen size={16} />
          </span>
          <h3 className="font-jakarta text-sm font-extrabold text-gray-900">
            📌 SOP &amp; Prosedur Divisi Anda
          </h3>
        </div>

        <Link
          to={linkTo}
          className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 hover:text-black transition"
        >
          Lihat Semua SOP <ArrowRight size={13} />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {sops.map((sop) => (
          <Link
            key={sop.id}
            to={linkTo}
            className="group rounded-2xl border border-gray-100 bg-[#FAF9F5] p-3.5 hover:border-amber-600/40 hover:bg-white transition shadow-2xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <span className="font-mono text-[10px] font-black text-amber-800 bg-amber-100/70 px-1.5 py-0.5 rounded">
                  {sop.sop_code || "SOP"}
                </span>
                {sop.priority_level === "critical" ? (
                  <span className="text-[9px] font-black uppercase text-red-600 flex items-center gap-0.5">
                    <AlertTriangle size={10} /> Critical
                  </span>
                ) : (
                  <span className="text-[9px] font-bold uppercase text-gray-500">
                    {sop.priority_level}
                  </span>
                )}
              </div>
              <h4 className="font-bold text-xs text-gray-900 group-hover:text-amber-800 transition line-clamp-2">
                {sop.title}
              </h4>
            </div>

            <span className="mt-3 text-[10px] text-gray-400 group-hover:text-amber-700 transition flex items-center gap-1 font-semibold">
              Baca panduan <ArrowRight size={10} />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
