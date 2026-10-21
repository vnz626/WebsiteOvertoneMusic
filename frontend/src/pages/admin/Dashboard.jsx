import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../../api";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { StatCard } from "../../components/ui/Card";
import { SkeletonGrid } from "../../components/ui/Skeleton";
import { errorMessage, formatRupiah } from "../../utils/format";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/admin/stats")
      .then((res) => setStats(res.data.data))
      .catch((err) => toast.error(errorMessage(err, "Gagal memuat statistik")))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout
      title="Admin Dashboard"
      subtitle="Ringkasan seluruh aktivitas platform Ticksy"
    >

      {loading ? (
        <SkeletonGrid count={6} />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard label="Total Pengguna" value={stats?.total_users ?? 0} />
          <StatCard label="Total Event" value={stats?.total_events ?? 0} hint={`${stats?.approved_events ?? 0} disetujui`} />
          <StatCard label="Menunggu Persetujuan" value={stats?.pending_events ?? 0} />
          <StatCard label="Tiket Terjual" value={stats?.tickets_sold ?? 0} />
          <StatCard label="Pendapatan" value={formatRupiah(stats?.revenue)} />
          <StatCard label="Pembayaran Belum Diverifikasi" value={stats?.pending_payments ?? 0} />
        </div>
      )}
    </DashboardLayout>
  );
}
