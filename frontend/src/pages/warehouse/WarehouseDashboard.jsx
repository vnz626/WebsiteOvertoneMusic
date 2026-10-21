import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Package, Truck, FileText, AlertTriangle, ArrowRight,
  ClipboardList, CheckCircle2, RefreshCw, Boxes, BarChart2
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
  const navigate = useNavigate();

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
          const s = summaryResult.value.data?.data || summaryResult.value.data || {};
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
    <Button
      variant="outline"
      onClick={fetchWarehouseStats}
      className="border-gray-300 dark:border-slate-700 text-xs text-gray-700 dark:text-slate-200 flex items-center gap-1.5 hover:bg-gray-100 dark:hover:bg-slate-800"
    >
      <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh Data
    </Button>
  );

  return (
    <DashboardLayout
      title="Warehouse & Inventory Center"
      subtitle="Pusat monitoring stok fisik instrumen musik, pengajuan restock PO, dan pemrosesan packing ekspedisi Overtone Music Store."
      actions={refreshAction}
    >
      <div className="space-y-6">
        {errorMsg && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
            {errorMsg}
          </div>
        )}

        {/* 4 Kartu KPI Gudang */}
        {loading ? (
          <SkeletonGrid count={4} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900/70 p-5 shadow-sm">
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-slate-400 mb-2">
                <span className="font-medium">Total Varian SKU</span>
                <Package size={17} className="text-gray-700 dark:text-slate-300" />
              </div>
              <p className="text-2xl font-extrabold text-gray-900 dark:text-white font-mono">
                {stats?.total_skus ?? 0}
              </p>
              <p className="text-[11px] text-gray-500 dark:text-slate-500 mt-1">Stok instrumen aktif terdaftar</p>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-950/20 p-5 shadow-sm">
              <div className="flex items-center justify-between text-xs text-amber-800 dark:text-amber-300 mb-2">
                <span className="font-medium">Peringatan Stok Menipis</span>
                <AlertTriangle size={17} className="text-amber-600 dark:text-amber-400" />
              </div>
              <p className="text-2xl font-extrabold text-amber-700 dark:text-amber-400 font-mono">
                {stats?.low_stock_skus ?? 0} SKU
              </p>
              <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80 mt-1">Segera ajukan Purchase Order (PO)</p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900/70 p-5 shadow-sm">
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-slate-400 mb-2">
                <span className="font-medium">Perlu Dipacking &amp; Resi</span>
                <Truck size={17} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-2xl font-extrabold text-gray-900 dark:text-white font-mono">
                {stats?.pending_dispatch ?? 0} Paket
              </p>
              <p className="text-[11px] text-gray-500 dark:text-slate-500 mt-1">Pesanan online kirim ekspedisi</p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900/70 p-5 shadow-sm">
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-slate-400 mb-2">
                <span className="font-medium">PO Restock Disetujui</span>
                <ClipboardList size={17} className="text-blue-600 dark:text-cyan-400" />
              </div>
              <p className="text-2xl font-extrabold text-gray-900 dark:text-white font-mono">
                {stats?.pending_po ?? 0} PO
              </p>
              <p className="text-[11px] text-gray-500 dark:text-slate-500 mt-1">Menunggu barang tiba dari supplier</p>
            </div>
          </div>
        )}

        {/* Shortcut Navigasi Cepat Modul Warehouse */}
        <div className="grid gap-5 md:grid-cols-2">
          
          <Link
            to="/warehouse/inventory"
            className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:border-gray-900 dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-slate-600 transition-all flex items-start gap-4"
          >
            <div className="rounded-xl bg-gray-100 p-3 text-gray-800 dark:bg-slate-800 dark:text-slate-200 border border-gray-200 dark:border-slate-700">
              <Boxes size={24} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900 dark:text-white text-base group-hover:text-[#8C7A5B] transition-colors">
                  Kartu Stok Fisik &amp; Serial Number
                </h3>
                <ArrowRight size={16} className="text-gray-400 group-hover:text-gray-900 group-hover:translate-x-1 transition-all" />
              </div>
              <p className="mt-1 text-xs text-gray-600 dark:text-slate-400 leading-relaxed">
                Pantau ketersediaan unit tiap varian SKU warna, lakukan penyesuaian stok opname manual, dan catat nomor seri (SN) instrumen fisik.
              </p>
            </div>
          </Link>

          <Link
            to="/warehouse/po"
            className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:border-gray-900 dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-slate-600 transition-all flex items-start gap-4"
          >
            <div className="rounded-xl bg-gray-100 p-3 text-gray-800 dark:bg-slate-800 dark:text-slate-200 border border-gray-200 dark:border-slate-700">
              <ClipboardList size={24} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900 dark:text-white text-base group-hover:text-[#8C7A5B] transition-colors">
                  Purchase Orders (PO) Pengadaan Barang
                </h3>
                <ArrowRight size={16} className="text-gray-400 group-hover:text-gray-900 group-hover:translate-x-1 transition-all" />
              </div>
              <p className="mt-1 text-xs text-gray-600 dark:text-slate-400 leading-relaxed">
                Ajukan PO pengadaan instrumen musik ke supplier (Fender, Gibson, Roland, Yamaha), dan konfirmasi penerimaan barang untuk auto-increment stok.
              </p>
            </div>
          </Link>

          <Link
            to="/warehouse/orders"
            className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:border-gray-900 dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-slate-600 transition-all flex items-start gap-4"
          >
            <div className="rounded-xl bg-gray-100 p-3 text-gray-800 dark:bg-slate-800 dark:text-slate-200 border border-gray-200 dark:border-slate-700">
              <Truck size={24} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900 dark:text-white text-base group-hover:text-[#8C7A5B] transition-colors">
                  Packing &amp; Input Nomor Resi Ekspedisi
                </h3>
                <ArrowRight size={16} className="text-gray-400 group-hover:text-gray-900 group-hover:translate-x-1 transition-all" />
              </div>
              <p className="mt-1 text-xs text-gray-600 dark:text-slate-400 leading-relaxed">
                Daftar pesanan online delivery. Tandai status packing kayu selesai dan masukkan nomor resi kurir (JNE/SiCepat) agar pelanggan dapat melacak pesanan.
              </p>
            </div>
          </Link>

          <Link
            to="/warehouse/logs"
            className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:border-gray-900 dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-slate-600 transition-all flex items-start gap-4"
          >
            <div className="rounded-xl bg-gray-100 p-3 text-gray-800 dark:bg-slate-800 dark:text-slate-200 border border-gray-200 dark:border-slate-700">
              <FileText size={24} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900 dark:text-white text-base group-hover:text-[#8C7A5B] transition-colors">
                  Audit Trail Mutasi Stok (Inventory Logs)
                </h3>
                <ArrowRight size={16} className="text-gray-400 group-hover:text-gray-900 group-hover:translate-x-1 transition-all" />
              </div>
              <p className="mt-1 text-xs text-gray-600 dark:text-slate-400 leading-relaxed">
                Riwayat kronologis mutasi keluar-masuk stok: penerimaan PO supplier, penjualan online delivery, serah-terima showroom, dan retur refund.
              </p>
            </div>
          </Link>

        </div>

      </div>
    </DashboardLayout>
  );
}
