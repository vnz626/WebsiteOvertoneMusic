import { useEffect, useState } from "react";
import { Boxes, PackageCheck, RefreshCw, Search } from "lucide-react";
import api from "../../api";
import Sidebar from "../../components/layout/Sidebar";
import Badge from "../../components/ui/Badge";

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
      (l.serial_number && l.serial_number.toLowerCase().includes(search.toLowerCase())) ||
      (l.reference_id && l.reference_id.toLowerCase().includes(search.toLowerCase()))
    );
  });

  function changeTypeBadge(type) {
    switch (type) {
      case "po_received":
        return <Badge variant="teal">Restock Masuk (PO)</Badge>;
      case "sale_delivery":
        return <Badge variant="blue">Penjualan Ekspedisi</Badge>;
      case "sale_pickup":
        return <Badge variant="purple">Penjualan Showroom</Badge>;
      case "stock_adjustment":
        return <Badge variant="amber">Koreksi Opname</Badge>;
      case "return_refund":
        return <Badge variant="rose">Retur / Refund</Badge>;
      default:
        return <Badge>{type}</Badge>;
    }
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar />
      <main className="flex-1 p-6 md:p-10">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ts-primary/10 text-ts-primary dark:bg-brand-400/10 dark:text-brand-400">
                  <PackageCheck size={20} />
                </span>
                <h1 className="font-jakarta text-2xl font-extrabold text-ts-ink dark:text-white">
                  Kartu Mutasi Stok & Serial Number
                </h1>
              </div>
              <p className="mt-1 text-sm text-ts-muted dark:text-slate-400">
                Audit trail lengkap mutasi barang masuk, keluar, nomor seri fisik instrumen, dan operator penanggung jawab.
              </p>
            </div>
            <button
              onClick={loadLogs}
              className="inline-flex items-center gap-2 rounded-xl border border-ts-subtle bg-white px-4 py-2 text-xs font-bold text-ts-ink shadow-sm hover:bg-ts-low dark:border-white/10 dark:bg-surface-container dark:text-white"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
          </div>

          <div className="mt-6 max-w-md">
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ts-muted" />
              <input
                type="text"
                placeholder="Cari serial number, no PO / invoice, atau produk..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-ts-subtle bg-white py-2.5 pl-10 pr-4 text-xs font-medium text-ts-ink outline-none transition focus:border-ts-primary dark:border-white/10 dark:bg-surface-container dark:text-white"
              />
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-ts-subtle bg-white shadow-sm dark:border-white/10 dark:bg-surface-container">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-ts-subtle bg-ts-low/60 font-bold uppercase tracking-wider text-ts-muted dark:border-white/10 dark:bg-surface-high">
                <tr>
                  <th className="py-3.5 px-4">Waktu & Referensi</th>
                  <th className="py-3.5 px-4">Instrumen & Varian</th>
                  <th className="py-3.5 px-4">Nomor Seri Fisik (SN)</th>
                  <th className="py-3.5 px-4 text-center">Tipe Mutasi</th>
                  <th className="py-3.5 px-4 text-center">Kuantitas</th>
                  <th className="py-3.5 px-4">Operator / Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ts-subtle dark:divide-white/5 font-medium">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-ts-muted">
                      Memuat data mutasi...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-ts-muted">
                      Belum ada catatan mutasi inventaris.
                    </td>
                  </tr>
                ) : (
                  filtered.map((log) => (
                    <tr key={log.id} className="hover:bg-ts-low/30 transition dark:hover:bg-white/5">
                      <td className="py-3.5 px-4">
                        <p className="font-mono font-bold text-ts-ink dark:text-white">{log.reference_id || "-"}</p>
                        <span className="text-[11px] text-ts-muted">
                          {log.created_at ? new Date(log.created_at).toLocaleString("id-ID") : "-"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-ts-ink dark:text-white">{log.product_name}</p>
                        {log.variant_name && (
                          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                            {log.variant_name}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-ts-primary dark:text-brand-400">
                        {log.serial_number || "-"}
                      </td>
                      <td className="py-3.5 px-4 text-center">{changeTypeBadge(log.change_type)}</td>
                      <td className="py-3.5 px-4 text-center font-extrabold text-sm">
                        <span className={log.quantity_change > 0 ? "text-emerald-600 font-black" : "text-rose-600 font-black"}>
                          {log.quantity_change > 0 ? `+${log.quantity_change}` : log.quantity_change} unit
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-ts-ink dark:text-white">{log.operator_name || "Sistem"}</p>
                        <p className="text-[11px] text-ts-muted truncate max-w-xs">{log.notes || "-"}</p>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
