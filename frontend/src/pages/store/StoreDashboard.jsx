import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Store,
  ShoppingBag,
  MessageSquare,
  ArrowRight,
  PackageCheck,
  RefreshCw,
} from "lucide-react";
import api from "../../api";
import DashboardLayout from "../../components/layout/DashboardLayout";
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-line pb-5 gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl tracking-tight flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-sm bg-ink text-canvas">
                <Store size={18} aria-hidden="true" />
              </span>
              <span>Store Showroom Operations</span>
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-ink-secondary">
              Pengelolaan master cinema gear, layanan serah-terima pesanan Click &amp; Collect di Showroom, dan helpdesk broadcast gear.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={fetchStats}
          >
            <RefreshCw size={13} aria-hidden="true" />
            <span>Refresh</span>
          </Button>
        </div>

        {/* 3 Shortcut Utama */}
        <div className="grid gap-6 md:grid-cols-3">
          <Link
            to="/store/pickups"
            className="group rounded-md border border-line bg-surface p-6 hover:border-ink transition-colors flex flex-col justify-between"
          >
            <div>
              <div className="rounded-sm bg-surface-muted p-3 text-ink border border-line w-fit mb-4">
                <PackageCheck size={22} aria-hidden="true" />
              </div>
              <h3 className="font-display font-bold text-ink text-base group-hover:text-accent transition-colors">
                Serah-Terima Click &amp; Collect
              </h3>
              <p className="mt-1.5 text-xs text-ink-secondary leading-relaxed">
                Verifikasi kode unik ambil barang (Pickup Pass) saat pelanggan tiba di showroom, dan konfirmasi serah-terima unit.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-line flex items-center justify-between text-xs text-accent font-bold tabular-nums">
              <span>{stats.pending_pickups} Menunggu Diambil</span>
              <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" aria-hidden="true" />
            </div>
          </Link>

          <Link
            to="/store/catalog"
            className="group rounded-md border border-line bg-surface p-6 hover:border-ink transition-colors flex flex-col justify-between"
          >
            <div>
              <div className="rounded-sm bg-surface-muted p-3 text-ink border border-line w-fit mb-4">
                <ShoppingBag size={22} aria-hidden="true" />
              </div>
              <h3 className="font-display font-bold text-ink text-base group-hover:text-accent transition-colors">
                Input Katalog &amp; Varian SKU
              </h3>
              <p className="mt-1.5 text-xs text-ink-secondary leading-relaxed">
                Tambahkan cinema gear baru, atur spesifikasi teknis (sensor format, lens mount, video output), foto hardware, dan varian SKU.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-line flex items-center justify-between text-xs text-accent font-bold tabular-nums">
              <span>{stats.catalog_count} Model Terdaftar</span>
              <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" aria-hidden="true" />
            </div>
          </Link>

          <Link
            to="/store/support"
            className="group rounded-md border border-line bg-surface p-6 hover:border-ink transition-colors flex flex-col justify-between"
          >
            <div>
              <div className="rounded-sm bg-surface-muted p-3 text-ink border border-line w-fit mb-4">
                <MessageSquare size={22} aria-hidden="true" />
              </div>
              <h3 className="font-display font-bold text-ink text-base group-hover:text-accent transition-colors">
                Helpdesk Konsultasi &amp; Garansi
              </h3>
              <p className="mt-1.5 text-xs text-ink-secondary leading-relaxed">
                Bantu filmmaker dan pelanggan menjawab pertanyaan seputar setup cinema gear &amp; sensor QC, ketersediaan display showroom, dan klaim garansi.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-line flex items-center justify-between text-xs text-accent font-bold tabular-nums">
              <span>{stats.open_tickets} Tiket Baru</span>
              <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" aria-hidden="true" />
            </div>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
