import React, { useState, useEffect } from "react";
import {
  Users,
  Clock,
  MapPin,
  Headphones,
  Store,
  CheckCircle2,
  Search,
  Calendar,
  Receipt,
  RotateCcw,
} from "lucide-react";
import api from "../../api";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";

export default function StaffShiftRecap() {
  const [shifts, setShifts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const [filterMode, setFilterMode] = useState("all");
  const [filterBranch, setFilterBranch] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");

  const fetchShifts = async () => {
    try {
      setLoading(true);
      const res = await api.get("/manager/staff-shifts");
      const resData = res.data || {};
      if (resData.status === "success" || Array.isArray(resData.data)) {
        setShifts(resData.data || []);
        setSummary(resData.summary || resData.kpi || null);
      }
    } catch (err) {
      console.error("Error fetching staff shifts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShifts();
  }, []);

  const filteredShifts = shifts.filter((s) => {
    const sMode = s.shift_mode || s.work_mode;
    const matchMode = filterMode === "all" || sMode === filterMode;
    const matchBranch =
      filterBranch === "all" ||
      (s.branch_name && s.branch_name === filterBranch) ||
      (!s.branch_name && filterBranch === "none");
    const matchStatus = filterStatus === "all" || s.status === filterStatus;
    const matchSearch =
      !search ||
      (s.staff_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (s.staff_email || "").toLowerCase().includes(search.toLowerCase()) ||
      (s.branch_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (s.notes || "").toLowerCase().includes(search.toLowerCase());
    return matchMode && matchBranch && matchStatus && matchSearch;
  });

  const activeCount =
    summary?.active_count ?? shifts.filter((s) => s.status === "active").length;
  const offlineCount =
    summary?.offline_count ??
    shifts.filter(
      (s) =>
        s.status === "active" &&
        (s.shift_mode === "offline_store" || s.work_mode === "offline_store")
    ).length;
  const onlineCount =
    summary?.online_count ??
    shifts.filter(
      (s) =>
        s.status === "active" &&
        (s.shift_mode === "online_cs" || s.work_mode === "online_cs")
    ).length;
  const totalHoursMonth =
    summary?.total_hours_month ??
    shifts.reduce((acc, s) => acc + (s.duration_hours || 0), 0);

  const branches = Array.from(
    new Set(shifts.map((s) => s.branch_name).filter(Boolean))
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      {/* Header Editorial */}
      <div className="flex flex-col gap-4 border-b border-line pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="accent">Manajemen Operasional &amp; Pengawasan Shift</Badge>
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink md:text-3xl">
            Rekap Shift &amp; Absensi Staf
          </h1>
          <p className="mt-1 text-xs text-ink-secondary sm:text-sm">
            Monitoring kehadiran, durasi kerja, dan produktivitas kasir POS staf Offline
            Store maupun tim Online CS.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={fetchShifts} disabled={loading}>
          <RotateCcw
            size={14}
            className={loading ? "animate-spin" : ""}
            aria-hidden="true"
          />
          Refresh Data
        </Button>
      </div>

      {/* 4 Kartu KPI Ringkas */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-md border border-line bg-surface p-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
              Staf Sedang Bertugas
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-sm border border-status-success/30 bg-status-success/10 text-status-success">
              <Users size={15} aria-hidden="true" />
            </div>
          </div>
          <div className="mt-3 tabular-nums">
            <span className="font-display text-2xl font-bold text-ink">
              {activeCount}
            </span>
            <span className="ml-1.5 text-xs font-medium text-ink-secondary">
              Staf Aktif
            </span>
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-status-success">
            <span className="h-2 w-2 rounded-full bg-status-success" />
            Sedang On-Duty (Active Shift)
          </p>
        </div>

        <div className="rounded-md border border-line bg-surface p-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
              Offline Store
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-sm border border-accent/30 bg-accent-subtle text-accent">
              <Store size={15} aria-hidden="true" />
            </div>
          </div>
          <div className="mt-3 tabular-nums">
            <span className="font-display text-2xl font-bold text-ink">
              {offlineCount}
            </span>
            <span className="ml-1.5 text-xs font-medium text-ink-secondary">
              Staf Toko
            </span>
          </div>
          <p className="mt-2 text-[11px] font-semibold text-accent">
            Standby Kasir POS &amp; Display
          </p>
        </div>

        <div className="rounded-md border border-line bg-surface p-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
              Online CS Support
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-sm border border-line bg-surface-muted text-ink">
              <Headphones size={15} aria-hidden="true" />
            </div>
          </div>
          <div className="mt-3 tabular-nums">
            <span className="font-display text-2xl font-bold text-ink">
              {onlineCount}
            </span>
            <span className="ml-1.5 text-xs font-medium text-ink-secondary">
              Staf CS
            </span>
          </div>
          <p className="mt-2 text-[11px] font-semibold text-ink-secondary">
            Live Chat &amp; Helpdesk Pelanggan
          </p>
        </div>

        <div className="rounded-md border border-line bg-surface p-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
              Total Jam Kerja / Sesi
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-sm border border-line bg-surface-muted text-ink">
              <Calendar size={15} aria-hidden="true" />
            </div>
          </div>
          <div className="mt-3 tabular-nums">
            <span className="font-display text-2xl font-bold text-ink">
              {typeof totalHoursMonth === "number"
                ? totalHoursMonth.toFixed(1)
                : totalHoursMonth}
            </span>
            <span className="ml-1.5 text-xs font-medium text-ink-secondary">
              Jam ({shifts.length} Sesi)
            </span>
          </div>
          <p className="mt-2 text-[11px] font-medium text-ink-muted">
            Akumulasi sesi shift bulan ini
          </p>
        </div>
      </div>

      {/* Filter Panel & Search */}
      <div className="rounded-md border border-line bg-surface p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1">
            <Search
              size={15}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
              aria-hidden="true"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama staf, email, cabang Offline Store, atau catatan shift..."
              aria-label="Cari nama staf, email, cabang, atau catatan shift"
              className="w-full rounded-sm border border-line bg-canvas py-2 pl-9 pr-4 text-xs text-ink placeholder:text-ink-muted focus:border-ink focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value)}
              aria-label="Filter Mode Kerja"
              className="rounded-sm border border-line bg-canvas px-3 py-2 text-xs font-semibold text-ink focus:border-ink focus:outline-none"
            >
              <option value="all">Semua Mode Kerja</option>
              <option value="offline_store">Offline Store</option>
              <option value="online_cs">Online CS Support</option>
            </select>

            <select
              value={filterBranch}
              onChange={(e) => setFilterBranch(e.target.value)}
              aria-label="Filter Cabang"
              className="rounded-sm border border-line bg-canvas px-3 py-2 text-xs font-semibold text-ink focus:border-ink focus:outline-none"
            >
              <option value="all">Semua Cabang</option>
              {branches.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              aria-label="Filter Status Shift"
              className="rounded-sm border border-line bg-canvas px-3 py-2 text-xs font-semibold text-ink focus:border-ink focus:outline-none"
            >
              <option value="all">Semua Status</option>
              <option value="active">Sedang Aktif (On-Duty)</option>
              <option value="completed">Selesai (Clocked-Out)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabel Rekapitulasi Absensi Pegawai */}
      <div className="overflow-hidden rounded-md border border-line bg-surface">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="font-display text-sm font-bold text-ink">
              Daftar Rekapitulasi Presensi &amp; Shift
            </span>
            <Badge variant="neutral">{filteredShifts.length} Sesi</Badge>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3 p-12 text-center">
            <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-ink border-t-transparent" />
            <p className="text-xs font-medium text-ink-muted">
              Memuat data absensi staf...
            </p>
          </div>
        ) : filteredShifts.length === 0 ? (
          <div className="space-y-2 p-12 text-center">
            <Users size={32} className="mx-auto text-ink-muted" aria-hidden="true" />
            <p className="text-sm font-bold text-ink">Tidak Ada Data Shift</p>
            <p className="mx-auto max-w-sm text-xs text-ink-secondary">
              Tidak ditemukan data shift absensi pegawai dengan kriteria filter saat ini.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-line bg-surface-muted text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                <tr>
                  <th className="px-5 py-3">Nama Staf &amp; Akun</th>
                  <th className="px-4 py-3">Mode Penugasan</th>
                  <th className="px-4 py-3">Lokasi Cabang</th>
                  <th className="px-4 py-3">Waktu Clock-In</th>
                  <th className="px-4 py-3">Waktu Clock-Out</th>
                  <th className="px-4 py-3">Durasi Kerja</th>
                  <th className="px-4 py-3">Transaksi POS</th>
                  <th className="px-4 py-3">Catatan Shift</th>
                  <th className="px-5 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredShifts.map((shift) => {
                  const isStore =
                    (shift.shift_mode || shift.work_mode) === "offline_store";
                  const isActive = shift.status === "active";
                  return (
                    <tr
                      key={shift.id}
                      className="transition-colors hover:bg-surface-muted/50"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-line bg-surface-muted text-xs font-bold text-ink">
                            {(shift.staff_name || "S").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold leading-tight text-ink">
                              {shift.staff_name || "Staf Toko"}
                            </p>
                            <p className="text-[10px] text-ink-muted">
                              {shift.staff_email || "store@overtone.id"} •{" "}
                              {shift.staff_role || "store_staff"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        {isStore ? (
                          <Badge variant="accent">
                            <Store size={11} aria-hidden="true" />
                            Offline Store
                          </Badge>
                        ) : (
                          <Badge variant="info">
                            <Headphones size={11} aria-hidden="true" />
                            Online CS Support
                          </Badge>
                        )}
                      </td>

                      <td className="px-4 py-3.5 font-medium text-ink-secondary">
                        {shift.branch_name ? (
                          <div className="flex items-center gap-1">
                            <MapPin
                              size={12}
                              className="shrink-0 text-accent"
                              aria-hidden="true"
                            />
                            <span className="max-w-[150px] truncate">
                              {shift.branch_name}
                            </span>
                          </div>
                        ) : (
                          <span className="italic text-ink-muted">
                            Layanan Cloud / Online
                          </span>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5 font-medium text-ink-secondary tabular-nums">
                        {shift.clock_in_at_formatted || shift.clock_in_at
                          ? new Date(shift.clock_in_at).toLocaleString("id-ID", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "-"}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5 font-medium text-ink-secondary tabular-nums">
                        {shift.clock_out_at ? (
                          new Date(shift.clock_out_at).toLocaleString("id-ID", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        ) : (
                          <span className="font-bold text-status-success">
                            Sedang Bertugas
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 font-bold text-ink tabular-nums">
                        {shift.duration ||
                          (shift.duration_hours
                            ? `${shift.duration_hours.toFixed(1)} Jam`
                            : "-")}
                      </td>

                      <td className="px-4 py-3.5 tabular-nums">
                        <span className="inline-flex items-center gap-1 rounded-xs border border-line bg-surface-muted px-2 py-0.5 text-[11px] font-bold text-ink">
                          <Receipt
                            size={12}
                            className="text-ink-muted"
                            aria-hidden="true"
                          />
                          {shift.pos_transactions_count || 0} Trx
                        </span>
                      </td>

                      <td className="max-w-[220px] px-4 py-3.5">
                        <p
                          className="truncate text-[11px] text-ink-secondary"
                          title={shift.notes || ""}
                        >
                          {shift.notes || "-"}
                        </p>
                      </td>

                      <td className="px-5 py-3.5 text-center">
                        {isActive ? (
                          <Badge variant="success">Sedang Aktif</Badge>
                        ) : (
                          <Badge variant="neutral">Selesai</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
