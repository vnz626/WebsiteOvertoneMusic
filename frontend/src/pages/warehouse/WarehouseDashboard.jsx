import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Package,
  Truck,
  FileText,
  AlertTriangle,
  ArrowRight,
  ClipboardList,
  RefreshCw,
  Boxes,
} from "lucide-react";
import api from "../../api";
import DashboardLayout from "../../components/layout/DashboardLayout";
import Button from "../../components/ui/Button";
import { SkeletonGrid } from "../../components/ui/Skeleton";

export default function WarehouseDashboard() {
  const [stats, setStats] = useState({
    total_skus: 0,
    low_stock_skus: 0,
    pending_dispatch: 0,
    pending_po: 0,
  });
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchWarehouseStats = useCallback(() => {
    setLoading(true);
    setErrorMsg("");

    Promise.allSettled([
      api.get("/warehouse/summary"),
      api.get("/po?status=approved"),
    ])
      .then(([summaryResult, poResult]) => {
        let totalSkus = 0;
        let lowStockSkus = 0;
        let pendingDispatch = 0;
        let pendingPo = 0;

        if (summaryResult.status === "fulfilled" && summaryResult.value?.data) {
          const s =
            summaryResult.value.data?.data || summaryResult.value.data || {};
          totalSkus = Number(s?.total_skus ?? 0);
          lowStockSkus = Number(s?.low_stock_skus ?? 0);
          pendingDispatch = Number(s?.pending_dispatch ?? 0);
        }

        if (poResult.status === "fulfilled" && poResult.value?.data) {
          const pData = poResult.value.data;
          if (typeof pData?.total === "number") {
            pendingPo = pData.total;
          } else if (Array.isArray(pData?.data)) {
            pendingPo = pData.data.length;
          } else if (Array.isArray(pData)) {
            pendingPo = pData.length;
          }
        }

        setStats({
          total_skus: totalSkus,
          low_stock_skus: lowStockSkus,
          pending_dispatch: pendingDispatch,
          pending_po: pendingPo,
        });
      })
      .catch((err) => {
        console.error("Gagal memuat statistik warehouse:", err);
        setErrorMsg("Sebagian data statistik belum dapat dimuat dari server.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchWarehouseStats();
  }, [fetchWarehouseStats]);

  const refreshAction = (
    <Button variant="secondary" size="sm" onClick={fetchWarehouseStats}>
      <RefreshCw
        size={13}
        className={loading ? "animate-spin" : ""}
        aria-hidden="true"
      />
      Refresh Data
    </Button>
  );

  return (
    <DashboardLayout
      title="Warehouse & Inventory Center"
      subtitle="Pusat monitoring stok fisik cinema & broadcast gear, pengajuan restock PO, dan pemrosesan packing ekspedisi Overtone Pro Cinema."
      actions={refreshAction}
    >
      <div className="space-y-6">
        {errorMsg && (
          <div className="rounded-sm border border-status-warning/30 bg-status-warning/10 p-4 text-xs text-status-warning">
            {errorMsg}
          </div>
        )}

        {/* 4 Kartu KPI Gudang */}
        {loading ? (
          <SkeletonGrid count={4} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 tabular-nums">
            <div className="rounded-md border border-line bg-surface p-5">
              <div className="mb-2 flex items-center justify-between text-xs text-ink-muted">
                <span className="font-bold uppercase tracking-wider">
                  Total Varian SKU
                </span>
                <Package size={16} className="text-ink-secondary" aria-hidden="true" />
              </div>
              <p className="font-display text-2xl font-bold text-ink">
                {stats?.total_skus ?? 0}
              </p>
              <p className="mt-1 text-[11px] text-ink-secondary">
                Stok hardware aktif terdaftar
              </p>
            </div>

            <div className="rounded-md border border-status-warning/30 bg-status-warning/5 p-5">
              <div className="mb-2 flex items-center justify-between text-xs text-status-warning">
                <span className="font-bold uppercase tracking-wider">
                  Peringatan Stok Menipis
                </span>
                <AlertTriangle size={16} aria-hidden="true" />
              </div>
              <p className="font-display text-2xl font-bold text-status-warning">
                {stats?.low_stock_skus ?? 0} SKU
              </p>
              <p className="mt-1 text-[11px] text-ink-secondary">
                Segera ajukan Purchase Order (PO)
              </p>
            </div>

            <div className="rounded-md border border-line bg-surface p-5">
              <div className="mb-2 flex items-center justify-between text-xs text-ink-muted">
                <span className="font-bold uppercase tracking-wider">
                  Perlu Dipacking &amp; Resi
                </span>
                <Truck size={16} className="text-status-success" aria-hidden="true" />
              </div>
              <p className="font-display text-2xl font-bold text-ink">
                {stats?.pending_dispatch ?? 0} Paket
              </p>
              <p className="mt-1 text-[11px] text-ink-secondary">
                Pesanan online kirim ekspedisi
              </p>
            </div>

            <div className="rounded-md border border-line bg-surface p-5">
              <div className="mb-2 flex items-center justify-between text-xs text-ink-muted">
                <span className="font-bold uppercase tracking-wider">
                  PO Restock Disetujui
                </span>
                <ClipboardList size={16} className="text-accent" aria-hidden="true" />
              </div>
              <p className="font-display text-2xl font-bold text-ink">
                {stats?.pending_po ?? 0} PO
              </p>
              <p className="mt-1 text-[11px] text-ink-secondary">
                Menunggu barang tiba dari supplier
              </p>
            </div>
          </div>
        )}

        {/* Shortcut Navigasi Cepat Modul Warehouse */}
        <div className="grid gap-5 md:grid-cols-2">
          <Link
            to="/warehouse/inventory"
            className="group flex items-start gap-4 rounded-md border border-line bg-surface p-5 transition-colors hover:border-line-strong"
          >
            <div className="rounded-sm border border-line bg-surface-muted p-3 text-ink">
              <Boxes size={22} aria-hidden="true" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-base font-bold text-ink transition-colors group-hover:text-accent">
                  Kartu Stok Fisik &amp; Serial Number
                </h3>
                <ArrowRight
                  size={16}
                  className="text-ink-muted transition-transform group-hover:translate-x-1 group-hover:text-ink"
                  aria-hidden="true"
                />
              </div>
              <p className="mt-1 text-xs leading-relaxed text-ink-secondary">
                Pantau ketersediaan unit tiap varian SKU, lakukan
                penyesuaian stok opname manual, dan catat nomor seri (SN)
                hardware fisik.
              </p>
            </div>
          </Link>

          <Link
            to="/warehouse/po"
            className="group flex items-start gap-4 rounded-md border border-line bg-surface p-5 transition-colors hover:border-line-strong"
          >
            <div className="rounded-sm border border-line bg-surface-muted p-3 text-ink">
              <ClipboardList size={22} aria-hidden="true" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-base font-bold text-ink transition-colors group-hover:text-accent">
                  Purchase Orders (PO) Pengadaan Barang
                </h3>
                <ArrowRight
                  size={16}
                  className="text-ink-muted transition-transform group-hover:translate-x-1 group-hover:text-ink"
                  aria-hidden="true"
                />
              </div>
              <p className="mt-1 text-xs leading-relaxed text-ink-secondary">
                Ajukan PO pengadaan cinema gear ke supplier / distributor resmi (Sony, RED,
                Canon, DJI), dan konfirmasi penerimaan barang untuk
                auto-increment stok.
              </p>
            </div>
          </Link>

          <Link
            to="/warehouse/orders"
            className="group flex items-start gap-4 rounded-md border border-line bg-surface p-5 transition-colors hover:border-line-strong"
          >
            <div className="rounded-sm border border-line bg-surface-muted p-3 text-ink">
              <Truck size={22} aria-hidden="true" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-base font-bold text-ink transition-colors group-hover:text-accent">
                  Packing &amp; Input Nomor Resi Ekspedisi
                </h3>
                <ArrowRight
                  size={16}
                  className="text-ink-muted transition-transform group-hover:translate-x-1 group-hover:text-ink"
                  aria-hidden="true"
                />
              </div>
              <p className="mt-1 text-xs leading-relaxed text-ink-secondary">
                Daftar pesanan online delivery. Tandai status packing kayu
                selesai dan masukkan nomor resi kurir (JNE/SiCepat) agar
                pelanggan dapat melacak pesanan.
              </p>
            </div>
          </Link>

          <Link
            to="/warehouse/logs"
            className="group flex items-start gap-4 rounded-md border border-line bg-surface p-5 transition-colors hover:border-line-strong"
          >
            <div className="rounded-sm border border-line bg-surface-muted p-3 text-ink">
              <FileText size={22} aria-hidden="true" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-base font-bold text-ink transition-colors group-hover:text-accent">
                  Audit Trail Mutasi Stok (Inventory Logs)
                </h3>
                <ArrowRight
                  size={16}
                  className="text-ink-muted transition-transform group-hover:translate-x-1 group-hover:text-ink"
                  aria-hidden="true"
                />
              </div>
              <p className="mt-1 text-xs leading-relaxed text-ink-secondary">
                Riwayat kronologis mutasi keluar-masuk stok: penerimaan PO
                supplier, penjualan online delivery, serah-terima Offline Store,
                dan retur refund.
              </p>
            </div>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
