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
      title="Super Administrator Dashboard"
      subtitle="Ringkasan aktivitas ekosistem Focalpoint.pro Cinema Enterprise (TPS · OAS · KMS · MIS · DSS · ES)"
    >
      {loading ? (
        <SkeletonGrid count={6} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard label="Total Akun Terdaftar" value={stats?.total_users ?? 0} />
          <StatCard label="Total SKU Katalog" value={stats?.total_events ?? 0} hint={`${stats?.approved_events ?? 0} aktif di etalase`} />
          <StatCard label="Menunggu Approval" value={stats?.pending_events ?? 0} />
          <StatCard label="Unit Cinema Gear Terjual" value={stats?.tickets_sold ?? 0} />
          <StatCard label="Total Pendapatan Bruto" value={formatRupiah(stats?.revenue)} />
          <StatCard label="Transaksi Menunggu Verifikasi" value={stats?.pending_payments ?? 0} />
        </div>
      )}
    </DashboardLayout>
  );
}
