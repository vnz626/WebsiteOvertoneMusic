import { useEffect, useState } from "react";
import { PackageCheck, RefreshCw, Search } from "lucide-react";
import api from "../../api";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";

export default function WarehouseInventoryLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  function loadLogs() {
    setLoading(true);
    api
      .get("/warehouse/logs")
      .then((res) => {
        const d = res?.data?.data;
        setLogs(Array.isArray(d) ? d : []);
      })
      .catch((err) => {
        console.error(err);
        setLogs([]);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadLogs();
  }, []);

  const safeLogs = Array.isArray(logs) ? logs : [];
  const filtered = safeLogs.filter((l) => {
    if (!l) return false;
    return (
      !search ||
      l.product_name?.toLowerCase().includes(search.toLowerCase()) ||
      (l.serial_number &&
        l.serial_number.toLowerCase().includes(search.toLowerCase())) ||
      (l.reference_id &&
        l.reference_id.toLowerCase().includes(search.toLowerCase()))
    );
  });

  function changeTypeBadge(type) {
    switch (type) {
      case "po_received":
        return <Badge variant="success">Restock Masuk (PO)</Badge>;
      case "sale_delivery":
        return <Badge variant="info">Penjualan Ekspedisi</Badge>;
      case "sale_pickup":
        return <Badge variant="accent">Penjualan Offline Store</Badge>;
      case "stock_adjustment":
        return <Badge variant="warning">Koreksi Opname</Badge>;
      case "return_refund":
        return <Badge variant="danger">Retur / Refund</Badge>;
      default:
        return <Badge variant="neutral">{type}</Badge>;
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-line pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="accent">Immutable Stock Ledger</Badge>
            <Badge variant="neutral">Serial Number Traceability</Badge>
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Kartu Mutasi Stok &amp; Serial Number
          </h1>
          <p className="mt-1 text-xs text-ink-secondary sm:text-sm">
            Audit trail lengkap mutasi barang masuk, keluar, nomor seri fisik
            cinema gear, dan operator penanggung jawab.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={loadLogs}>
          <RefreshCw
            size={14}
            className={loading ? "animate-spin" : ""}
            aria-hidden="true"
          />
          Refresh
        </Button>
      </div>

      {/* Search */}
      <div className="max-w-md">
        <div className="relative">
          <Search
            size={15}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
            aria-hidden="true"
          />
          <input
            type="text"
            placeholder="Cari serial number, no PO / invoice, atau produk..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Cari serial number, nomor PO, invoice, atau produk"
            className="w-full rounded-sm border border-line bg-surface py-2 pl-9 pr-4 text-xs text-ink placeholder:text-ink-muted focus:border-ink focus:outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-md border border-line bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-line bg-surface-muted text-[11px] font-bold uppercase tracking-wider text-ink-muted">
              <tr>
                <th className="px-4 py-3.5">Waktu &amp; Referensi</th>
                <th className="px-4 py-3.5">Cinema Gear &amp; Varian</th>
                <th className="px-4 py-3.5">Nomor Seri Fisik (SN)</th>
                <th className="px-4 py-3.5 text-center">Tipe Mutasi</th>
                <th className="px-4 py-3.5 text-center">Kuantitas</th>
                <th className="px-4 py-3.5">Operator / Catatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line font-medium tabular-nums">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-ink-muted">
                    Memuat data mutasi...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-ink-muted">
                    Belum ada catatan mutasi inventaris.
                  </td>
                </tr>
              ) : (
                filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-surface-muted/50">
                    <td className="px-4 py-3.5">
                      <p className="font-mono font-bold text-ink">
                        {log.reference_id || "-"}
                      </p>
                      <span className="text-[11px] text-ink-secondary">
                        {log.created_at
                          ? new Date(log.created_at).toLocaleString("id-ID")
                          : "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-ink">{log.product_name}</p>
                      {log.variant_name && (
                        <span className="text-[11px] font-bold text-status-success">
                          {log.variant_name}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 font-mono font-bold text-accent">
                      {log.serial_number || "-"}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {changeTypeBadge(log.change_type)}
                    </td>
                    <td className="px-4 py-3.5 text-center text-sm font-bold">
                      <span
                        className={
                          log.quantity_change > 0
                            ? "font-bold text-status-success"
                            : "font-bold text-status-danger"
                        }
                      >
                        {log.quantity_change > 0
                          ? `+${log.quantity_change}`
                          : log.quantity_change}{" "}
                        unit
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-ink">
                        {log.operator_name || "Sistem"}
                      </p>
                      <p className="max-w-xs truncate text-[11px] text-ink-secondary">
                        {log.notes || "-"}
                      </p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
