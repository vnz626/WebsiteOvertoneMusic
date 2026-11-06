import { useState, useEffect, useCallback } from "react";
import {
  ShieldAlert,
  Search,
  Download,
  RefreshCw,
  Eye,
  FileCode,
  AlertTriangle,
  Laptop,
} from "lucide-react";
import api from "../../api";
import toast from "react-hot-toast";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import { StatCard } from "../../components/ui/Card";

function getActionStatus(action) {
  if (!action) return "neutral";
  if (action.includes("APPROVE") || action.includes("ACTIVATE") || action.includes("UNBLOCK") || action.includes("SUCCESS")) {
    return "completed";
  }
  if (action.includes("REJECT") || action.includes("SUSPEND") || action.includes("BLOCK") || action.includes("FAILED")) {
    return "danger";
  }
  if (action.includes("UPDATE") || action.includes("CLEARANCE") || action.includes("ADJUST")) {
    return "warning";
  }
  return "info";
}

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [pagination, setPagination] = useState({ total: 0, page: 1, per_page: 20, pages: 1 });
  const [kpis, setKpis] = useState({ total_logs: 0, today_logs: 0, staff_logs: 0, sensitive_actions: 0 });

  // Filters
  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Detail Modal
  const [selectedLog, setSelectedLog] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchLogs = useCallback(
    async (pageToLoad = 1) => {
      setLoading(true);
      setErrorMsg("");
      try {
        const params = {
          page: pageToLoad,
          per_page: pagination.per_page,
        };
        if (actionFilter) params.action = actionFilter;
        if (entityFilter) params.entity_type = entityFilter;
        if (roleFilter) params.actor_role = roleFilter;
        if (searchQuery) params.q = searchQuery;
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;

        const res = await api.get("/admin/audit-logs", { params });
        setLogs(res.data?.data || []);
        setPagination(res.data?.pagination || { total: 0, page: 1, per_page: 20, pages: 1 });
        if (res.data?.kpis) {
          setKpis(res.data.kpis);
        }
      } catch (err) {
        console.error("Gagal memuat audit logs:", err);
        setErrorMsg(err.response?.data?.message || "Gagal memuat log audit sistem.");
      } finally {
        setLoading(false);
      }
    },
    [actionFilter, entityFilter, roleFilter, searchQuery, startDate, endDate, pagination.per_page]
  );

  useEffect(() => {
    fetchLogs(1);
  }, [fetchLogs]);

  const handleExportCsv = () => {
    const params = new URLSearchParams();
    if (actionFilter) params.append("action", actionFilter);
    if (entityFilter) params.append("entity_type", entityFilter);
    if (roleFilter) params.append("actor_role", roleFilter);
    if (searchQuery) params.append("q", searchQuery);
    if (startDate) params.append("start_date", startDate);
    if (endDate) params.append("end_date", endDate);

    const token = localStorage.getItem("token") || localStorage.getItem("jwt");
    const downloadUrl = `/api/admin/audit-logs/export?${params.toString()}`;

    fetch(downloadUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Gagal mengunduh file CSV");
        return res.blob();
      })
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      })
      .catch((err) => {
        toast.error(err.message || "Gagal mengunduh file CSV");
      });
  };

  const handleResetFilters = () => {
    setActionFilter("");
    setEntityFilter("");
    setRoleFilter("");
    setSearchQuery("");
    setStartDate("");
    setEndDate("");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-line pb-5">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent flex items-center gap-1.5 mb-1">
            <ShieldAlert size={13} aria-hidden="true" /> Security &amp; Compliance Hub
          </span>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-ink">
            Audit Trail &amp; Log Aktivitas Sistem
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-ink-secondary max-w-2xl">
            Catatan kronologis append-only seluruh perubahan harga produk, persetujuan PO, pembayaran, refund, clearance promo, dan autentikasi staf OAS Focalpoint.pro.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => fetchLogs(pagination.page)}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} aria-hidden="true" /> Muat Ulang
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleExportCsv}
          >
            <Download size={14} aria-hidden="true" /> Ekspor CSV
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Log Tercatat"
          value={Number(kpis.total_logs || 0).toLocaleString("id-ID")}
          hint="Append-only records"
        />
        <StatCard
          label="Aktivitas Hari Ini"
          value={Number(kpis.today_logs || 0).toLocaleString("id-ID")}
          hint="Sejak 00:00 UTC"
        />
        <StatCard
          label="Aksi Staf Internal"
          value={Number(kpis.staff_logs || 0).toLocaleString("id-ID")}
          hint="Divisi internal OAS"
        />
        <StatCard
          label="Aksi Sensitif"
          value={Number(kpis.sensitive_actions || 0).toLocaleString("id-ID")}
          hint="Harga, PO, Clearance, Role"
        />
      </div>

      {/* Filter Panel */}
      <div className="bg-surface p-4 sm:p-5 rounded-md border border-line space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Input */}
          <div className="relative">
            <label htmlFor="audit-search-input" className="sr-only">Cari aksi, entitas, aktor, atau IP</label>
            <Search size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
            <input
              id="audit-search-input"
              type="search"
              placeholder="Cari aksi, entitas, aktor, IP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ot-input pl-9"
            />
          </div>

          {/* Filter Aksi */}
          <div>
            <label htmlFor="audit-action-filter" className="sr-only">Filter Aksi</label>
            <select
              id="audit-action-filter"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="ot-input"
            >
              <option value="">Semua Aksi</option>
              <option value="UPDATE_PRICE">Update Harga (UPDATE_PRICE)</option>
              <option value="APPROVE_PO">Approve PO (APPROVE_PO)</option>
              <option value="PAY_PO">Bayar PO (PAY_PO)</option>
              <option value="PROCESS_REFUND">Proses Refund (PROCESS_REFUND)</option>
              <option value="APPLY_CLEARANCE">Terapkan Clearance (APPLY_CLEARANCE)</option>
              <option value="REVOKE_CLEARANCE">Batalkan Clearance</option>
              <option value="ADJUST_STOCK">Penyesuaian Stok (ADJUST_STOCK)</option>
              <option value="DISPATCH_ORDER">Kirim Pesanan (DISPATCH_ORDER)</option>
              <option value="UPDATE_STAFF_ROLE">Ganti Role Staf</option>
              <option value="SUSPEND_STAFF">Suspend Staf</option>
              <option value="LOGIN_STAFF_SUCCESS">Login Sukses</option>
              <option value="LOGIN_STAFF_FAILED">Login Gagal</option>
            </select>
          </div>

          {/* Filter Entitas */}
          <div>
            <label htmlFor="audit-entity-filter" className="sr-only">Filter Entitas</label>
            <select
              id="audit-entity-filter"
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="ot-input"
            >
              <option value="">Semua Entitas</option>
              <option value="product_variant">Product Variant (SKU)</option>
              <option value="product">Product Master</option>
              <option value="purchase_order">Purchase Order (PO)</option>
              <option value="order">Order Transaksi</option>
              <option value="clearance">Clearance Promo</option>
              <option value="staff">Staf Internal</option>
              <option value="customer">Pelanggan</option>
            </select>
          </div>

          {/* Filter Role */}
          <div>
            <label htmlFor="audit-role-filter" className="sr-only">Filter Role</label>
            <select
              id="audit-role-filter"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="ot-input"
            >
              <option value="">Semua Role</option>
              <option value="super_admin">Super Administrator</option>
              <option value="manager">Retail General Manager</option>
              <option value="finance">Finance Controller</option>
              <option value="warehouse_staff">Warehouse Lead</option>
              <option value="store_staff">Store Staff</option>
            </select>
          </div>

          {/* Reset Button */}
          <div className="flex items-center">
            <Button
              type="button"
              variant="secondary"
              onClick={handleResetFilters}
              className="w-full"
            >
              Reset Filter
            </Button>
          </div>
        </div>
      </div>

      {/* Error message */}
      {errorMsg && (
        <div role="alert" className="p-4 rounded-sm bg-status-danger-bg border border-status-danger/30 text-xs text-status-danger flex items-center gap-2">
          <AlertTriangle size={15} aria-hidden="true" />
          {errorMsg}
        </div>
      )}

      {/* Logs Table */}
      <div className="bg-surface rounded-md border border-line overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr>
                <th className="py-3 px-4">Waktu (UTC)</th>
                <th className="py-3 px-4">Aksi</th>
                <th className="py-3 px-4">Aktor / Role</th>
                <th className="py-3 px-4">Entitas Terkait</th>
                <th className="py-3 px-4">IP Address</th>
                <th className="py-3 px-4 text-center">State Diff</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {loading ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={idx}>
                    <td colSpan={6} className="py-4 px-4">
                      <div className="h-4 skeleton rounded-xs w-3/4" />
                    </td>
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-ink-muted">
                    <FileCode size={28} className="mx-auto mb-2 text-ink-muted" aria-hidden="true" />
                    Tidak ada data log yang sesuai dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const formattedDate = log.created_at
                    ? log.created_at.replace("T", " ").slice(0, 19)
                    : "-";

                  return (
                    <tr key={log.id}>
                      {/* Waktu */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px] text-ink-secondary tabular-nums">
                        {formattedDate}
                      </td>

                      {/* Aksi */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <Badge status={getActionStatus(log.action)}>
                          {log.action}
                        </Badge>
                      </td>

                      {/* Aktor */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-ink">{log.actor_name}</div>
                        <div className="text-[10px] text-ink-muted font-mono">
                          {log.actor_role ? `@${log.actor_role}` : log.actor_type}
                        </div>
                      </td>

                      {/* Entitas */}
                      <td className="py-3.5 px-4 tabular-nums">
                        <span className="font-mono text-ink bg-surface-muted border border-line px-1.5 py-0.5 rounded-xs text-[11px]">
                          {log.entity_type}
                        </span>
                        {log.entity_id && (
                          <span className="ml-1 text-ink-muted text-[11px] font-mono">#{log.entity_id}</span>
                        )}
                      </td>

                      {/* IP Address */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px] text-ink-muted tabular-nums">
                        {log.ip || "127.0.0.1"}
                      </td>

                      {/* State Diff Action */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setSelectedLog(log);
                            setModalOpen(true);
                          }}
                        >
                          <Eye size={12} aria-hidden="true" /> Diff State
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-line flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-ink-secondary tabular-nums">
          <div>
            Menampilkan {logs.length} dari total{" "}
            <span className="font-bold text-ink">{pagination.total}</span> catatan log
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => fetchLogs(pagination.page - 1)}
            >
              Sebelumnya
            </Button>
            <span className="px-2 font-mono text-xs font-bold text-ink">
              Hal {pagination.page} / {pagination.pages || 1}
            </span>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={pagination.page >= pagination.pages}
              onClick={() => fetchLogs(pagination.page + 1)}
            >
              Berikutnya
            </Button>
          </div>
        </div>
      </div>

      {/* Modal Diff Viewer (Before vs After) */}
      <Modal
        open={modalOpen && Boolean(selectedLog)}
        onClose={() => setModalOpen(false)}
        title={
          selectedLog
            ? `Rincian Perubahan State: ${selectedLog.entity_type} ${selectedLog.entity_id ? `#${selectedLog.entity_id}` : ""}`
            : "Rincian Perubahan State"
        }
        description={selectedLog ? `Log ID #${selectedLog.id} • Aksi: ${selectedLog.action}` : ""}
        size="xl"
      >
        {selectedLog && (
          <div className="space-y-4">
            {/* Meta Information Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-surface-muted rounded-sm border border-line text-xs tabular-nums">
              <div>
                <span className="text-[10px] uppercase font-bold text-ink-muted block">Aktor</span>
                <span className="font-semibold text-ink">{selectedLog.actor_name}</span>
                <span className="text-[10px] text-ink-muted block">({selectedLog.actor_role || selectedLog.actor_type})</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-ink-muted block">Waktu Tercatat</span>
                <span className="font-mono text-ink text-[11px]">
                  {selectedLog.created_at ? selectedLog.created_at.replace("T", " ").slice(0, 19) : "-"}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-ink-muted block">IP Address</span>
                <span className="font-mono text-ink">{selectedLog.ip || "127.0.0.1"}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-ink-muted block">Tipe Aktor</span>
                <span className="font-mono text-ink capitalize">{selectedLog.actor_type}</span>
              </div>
            </div>

            {/* User Agent */}
            {selectedLog.user_agent && (
              <div className="text-[11px] text-ink-secondary bg-surface-muted px-3 py-2 rounded-xs border border-line font-mono truncate flex items-center gap-1.5">
                <Laptop size={12} className="shrink-0 text-ink-muted" aria-hidden="true" />
                <span className="truncate">{selectedLog.user_agent}</span>
              </div>
            )}

            {/* Diff Box: Before vs After */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Before State */}
              <div className="flex flex-col border border-status-danger/30 rounded-sm overflow-hidden bg-status-danger-bg/40">
                <div className="bg-status-danger-bg px-3.5 py-2 border-b border-status-danger/30 text-xs font-bold text-status-danger flex items-center justify-between">
                  <span>State Sebelum (Before)</span>
                  <span className="text-[10px] font-mono uppercase">Old State</span>
                </div>
                <div className="p-3.5 flex-1 overflow-x-auto">
                  {selectedLog.before_json ? (
                    <pre className="text-[11px] font-mono text-ink whitespace-pre-wrap break-words leading-relaxed tabular-nums">
                      {JSON.stringify(selectedLog.before_json, null, 2)}
                    </pre>
                  ) : (
                    <p className="text-xs text-ink-muted italic">Tidak ada state sebelumnya (Data baru / Initial State)</p>
                  )}
                </div>
              </div>

              {/* After State */}
              <div className="flex flex-col border border-status-success/30 rounded-sm overflow-hidden bg-status-success-bg/40">
                <div className="bg-status-success-bg px-3.5 py-2 border-b border-status-success/30 text-xs font-bold text-status-success flex items-center justify-between">
                  <span>State Sesudah (After)</span>
                  <span className="text-[10px] font-mono uppercase">New State</span>
                </div>
                <div className="p-3.5 flex-1 overflow-x-auto">
                  {selectedLog.after_json ? (
                    <pre className="text-[11px] font-mono text-ink whitespace-pre-wrap break-words leading-relaxed tabular-nums">
                      {JSON.stringify(selectedLog.after_json, null, 2)}
                    </pre>
                  ) : (
                    <p className="text-xs text-ink-muted italic">State kosong</p>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-line flex justify-end">
              <Button type="button" variant="primary" size="sm" onClick={() => setModalOpen(false)}>
                Tutup Jendela Diff
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
