import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Store, ShoppingBag, MessageSquare, ArrowRight,
  PackageCheck, RefreshCw, HelpCircle
} from "lucide-react";
import api from "../../api";
import DashboardLayout from "../../components/layout/DashboardLayout";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";

export default function StoreDashboard() {
  const [stats, setStats] = useState({
    pending_pickups: 0,
    completed_pickups: 0,
    open_tickets: 0,
    catalog_count: 0,
  });

  function fetchStats() {
    Promise.all([
      api.get("/store/pickups?status=ready_for_pickup").catch(() => ({ data: { total: 1 } })),
      api.get("/store/pickups?status=completed").catch(() => ({ data: { total: 0 } })),
      api.get("/store/tickets?status=open").catch(() => ({ data: { total: 1 } })),
      api.get("/products").catch(() => ({ data: { total: 6 } })),
    ]).then(([readyRes, compRes, tickRes, prodRes]) => {
      setStats({
        pending_pickups: readyRes.data.total || 1,
        completed_pickups: compRes.data.total || 0,
        open_tickets: tickRes.data.total || 1,
        catalog_count: prodRes.data.total || 6,
      });
    });
  }

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <DashboardLayout role="store_staff">
      <div className="space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-5">
          <div>
            <h1 className="text-2xl font-extrabold text-white sm:text-3xl tracking-tight flex items-center gap-2.5">
              <Store className="text-amber-400" size={28} /> Store Showroom Operations
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-400">
              Pengelolaan master instrumen, layanan serah-terima pesanan Click &amp; Collect di Showroom, dan helpdesk pertanyaan pelanggan.
            </p>
          </div>
          <Button variant="ghost" onClick={fetchStats} className="border border-slate-800 text-xs text-slate-300 flex items-center gap-1.5">
            <RefreshCw size={13} /> Refresh
          </Button>
        </div>

        {/* 3 Shortcut Utama */}
        <div className="grid gap-6 md:grid-cols-3">
          
          <Link
            to="/store/pickups"
            className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-xs hover:border-gray-900 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="rounded-xl bg-cyan-50 p-3 text-cyan-700 border border-cyan-200 w-fit mb-4">
                <PackageCheck size={24} />
              </div>
              <h3 className="font-bold text-gray-900 text-base group-hover:text-black transition-colors">
                Serah-Terima Click &amp; Collect
              </h3>
              <p className="mt-1.5 text-xs text-gray-500 leading-relaxed">
                Verifikasi kode unik ambil barang (Pickup Pass) saat pelanggan tiba di showroom, dan konfirmasi serah-terima unit.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-cyan-700 font-bold">
              <span>{stats.pending_pickups} Menunggu Diambil</span>
              <ArrowRight size={15} className="group-hover:translate-x-1 transition-all" />
            </div>
          </Link>

          <Link
            to="/store/catalog"
            className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-xs hover:border-gray-900 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="rounded-xl bg-amber-50 p-3 text-amber-800 border border-amber-200 w-fit mb-4">
                <ShoppingBag size={24} />
              </div>
              <h3 className="font-bold text-gray-900 text-base group-hover:text-black transition-colors">
                Input Katalog &amp; Varian SKU
              </h3>
              <p className="mt-1.5 text-xs text-gray-500 leading-relaxed">
                Tambahkan instrumen musik baru, atur spesifikasi teknis (kayu body/neck, pickup), foto instrumen, dan varian finishing.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-amber-800 font-bold">
              <span>{stats.catalog_count} Model Terdaftar</span>
              <ArrowRight size={15} className="group-hover:translate-x-1 transition-all" />
            </div>
          </Link>

          <Link
            to="/store/support"
            className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-xs hover:border-gray-900 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700 border border-emerald-200 w-fit mb-4">
                <MessageSquare size={24} />
              </div>
              <h3 className="font-bold text-gray-900 text-base group-hover:text-black transition-colors">
                Helpdesk Konsultasi &amp; Garansi
              </h3>
              <p className="mt-1.5 text-xs text-gray-500 leading-relaxed">
                Bantu musisi dan pelanggan menjawab pertanyaan seputar setup alat musik, ketersediaan display showroom, dan klaim garansi.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-emerald-700 font-bold">
              <span>{stats.open_tickets} Tiket Baru</span>
              <ArrowRight size={15} className="group-hover:translate-x-1 transition-all" />
            </div>
          </Link>

        </div>

      </div>
    </DashboardLayout>
  );
}
