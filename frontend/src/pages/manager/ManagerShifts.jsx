import React, { useState, useEffect } from "react";
import {
  Users,
  Clock,
  MapPin,
  Headphones,
  Store,
  Search,
  Calendar,
} from "lucide-react";
import Badge from "../../components/ui/Badge";

export default function ManagerShifts() {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterMode, setFilterMode] = useState("all");
  const [filterBranch, setFilterBranch] = useState("all");
  const [search, setSearch] = useState("");

  const fetchShifts = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/manager/shifts", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await res.json();
      if (data.status === "success") {
        setShifts(data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShifts();
  }, []);

  const filtered = shifts.filter((s) => {
    const matchMode = filterMode === "all" || s.work_mode === filterMode;
    const matchBranch = filterBranch === "all" || s.branch_name === filterBranch;
    const matchSearch =
      !search ||
      (s.staff_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (s.staff_email || "").toLowerCase().includes(search.toLowerCase()) ||
      (s.branch_name || "").toLowerCase().includes(search.toLowerCase());
    return matchMode && matchBranch && matchSearch;
  });

  const activeCount = shifts.filter((s) => s.status === "active").length;
  const offlineCount = shifts.filter((s) => s.status === "active" && s.work_mode === "offline_store").length;
  const onlineCount = shifts.filter((s) => s.status === "active" && s.work_mode === "online_cs").length;

  const branches = Array.from(new Set(shifts.map((s) => s.branch_name).filter(Boolean)));

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto font-sans bg-canvas text-ink min-h-screen space-y-6">
      {/* Header */}
      <div className="pb-5 border-b border-line">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-accent">
          <Clock className="w-4 h-4" aria-hidden="true" /> Manager Operations Oversight
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-ink mt-1">
          Pantauan Absensi &amp; Shift Mode Staf
        </h1>
        <p className="text-xs sm:text-sm text-ink-secondary mt-1">
          Monitoring kehadiran real-time staf toko (Offline Showroom Staff vs Online CS Staff) di seluruh cabang Overtone.
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 tabular-nums">
        <div className="p-4 bg-surface border border-line rounded-md">
          <div className="flex items-center justify-between text-ink-muted text-[11px] font-bold uppercase tracking-wider">
            <span>Staf Bertugas Aktif</span>
            <Users className="w-4 h-4" aria-hidden="true" />
          </div>
          <div className="font-display text-2xl font-bold text-ink mt-2">{activeCount} Orang</div>
          <span className="text-xs text-status-success font-semibold mt-1 block">&bull; Sedang On-Duty</span>
        </div>

        <div className="p-4 bg-surface border border-line rounded-md">
          <div className="flex items-center justify-between text-accent text-[11px] font-bold uppercase tracking-wider">
            <span>Showroom Offline</span>
            <Store className="w-4 h-4" aria-hidden="true" />
          </div>
          <div className="font-display text-2xl font-bold text-ink mt-2">{offlineCount} Orang</div>
          <span className="text-xs text-ink-secondary mt-1 block">Standby Kasir &amp; Display Toko</span>
        </div>

        <div className="p-4 bg-surface border border-line rounded-md">
          <div className="flex items-center justify-between text-ink-secondary text-[11px] font-bold uppercase tracking-wider">
            <span>Online CS &amp; Concierge</span>
            <Headphones className="w-4 h-4" aria-hidden="true" />
          </div>
          <div className="font-display text-2xl font-bold text-ink mt-2">{onlineCount} Orang</div>
          <span className="text-xs text-ink-secondary mt-1 block">Helpdesk &amp; Retur Online</span>
        </div>

        <div className="p-4 bg-surface border border-line rounded-md">
          <div className="flex items-center justify-between text-ink-muted text-[11px] font-bold uppercase tracking-wider">
            <span>Total Log Shift</span>
            <Calendar className="w-4 h-4" aria-hidden="true" />
          </div>
          <div className="font-display text-2xl font-bold text-ink mt-2">{shifts.length} Sesi</div>
          <span className="text-xs text-ink-muted mt-1 block">Riwayat terekam</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-surface border border-line rounded-md p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full md:w-auto">
          <Search className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
          <input
            type="text"
            placeholder="Cari nama staf atau cabang..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ot-input pl-9 pr-4 py-2 text-xs w-full"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value)}
            className="ot-input p-2 text-xs"
          >
            <option value="all">Semua Mode Kerja</option>
            <option value="offline_store">Offline Showroom</option>
            <option value="online_cs">Online CS</option>
          </select>

          <select
            value={filterBranch}
            onChange={(e) => setFilterBranch(e.target.value)}
            className="ot-input p-2 text-xs"
          >
            <option value="all">Semua Cabang</option>
            {branches.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Shift Table */}
      <div className="bg-surface border border-line rounded-md overflow-hidden">
        {loading ? (
          <div className="text-center py-20 text-xs text-ink-muted">Memuat data absensi &amp; shift...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-xs text-ink-muted">Tidak ada data shift yang cocok.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-line bg-surface-muted text-ink-muted uppercase tracking-wider font-bold text-[10px]">
                  <th className="py-3.5 px-4">Nama Staf</th>
                  <th className="py-3.5 px-4">Status Shift</th>
                  <th className="py-3.5 px-4">Mode Kerja</th>
                  <th className="py-3.5 px-4">Penempatan Cabang</th>
                  <th className="py-3.5 px-4">Waktu Check-In</th>
                  <th className="py-3.5 px-4">Waktu Check-Out</th>
                  <th className="py-3.5 px-4">Catatan Operasional</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-ink">
                {filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-surface-muted/50 transition-colors tabular-nums">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-ink">{s.staff_name}</div>
                      <div className="text-[11px] text-ink-secondary">{s.staff_email}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      {s.status === "active" ? (
                        <Badge variant="teal">Aktif Bertugas</Badge>
                      ) : (
                        <Badge variant="neutral">Selesai (Off-Duty)</Badge>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      {s.work_mode === "offline_store" ? (
                        <span className="inline-flex items-center gap-1.5 text-accent font-semibold">
                          <Store className="w-3.5 h-3.5" aria-hidden="true" /> Showroom Offline
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-ink font-semibold">
                          <Headphones className="w-3.5 h-3.5" aria-hidden="true" /> Online CS Specialist
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 font-medium text-ink">
                        <MapPin className="w-3.5 h-3.5 text-ink-muted" aria-hidden="true" />
                        {s.branch_name || "Virtual / Head Office"}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[11px] text-ink-secondary">
                      {s.clock_in
                        ? new Date(s.clock_in).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })
                        : "-"}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[11px] text-ink-secondary">
                      {s.clock_out
                        ? new Date(s.clock_out).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })
                        : "Masih On-Duty"}
                    </td>

                    <td className="py-3.5 px-4 text-ink-secondary italic max-w-xs truncate">
                      {s.notes || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
