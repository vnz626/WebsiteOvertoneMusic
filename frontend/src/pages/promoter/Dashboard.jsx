import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../../api";
import DashboardLayout from "../../components/layout/DashboardLayout";
import Card, { StatCard } from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import { SkeletonGrid } from "../../components/ui/Skeleton";
import { errorMessage, formatDate, formatRupiah } from "../../utils/format";

export default function PromoterDashboard() {
  const [stats, setStats] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([api.get("/promoter/stats"), api.get("/promoter/events")])
      .then(([s, e]) => {
        setStats(s.data.data);
        setEvents(e.data.data || []);
      })
      .catch((err) => toast.error(errorMessage(err, "Gagal memuat data promoter")))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  async function remove(id) {
    if (!window.confirm("Hapus event ini?")) return;
    try {
      await api.delete(`/promoter/events/${id}`);
      toast.success("Event dihapus");
      load();
    } catch (err) {
      toast.error(errorMessage(err, "Gagal menghapus event"));
    }
  }

  return (
    <DashboardLayout
      title="Promoter Dashboard"
      subtitle="Event yang kamu ajukan beserta performa penjualannya"
      actions={
        <Link to="/promoter/events/new">
          <Button>+ Ajukan Event</Button>
        </Link>
      }
    >
      {loading ? (
        <SkeletonGrid count={4} />
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total Event" value={stats?.total_events ?? 0} hint={`${stats?.pending_events ?? 0} menunggu persetujuan`} />
            <StatCard label="Event Disetujui" value={stats?.approved_events ?? 0} />
            <StatCard label="Tiket Terjual" value={stats?.tickets_sold ?? 0} />
            <StatCard label="Pendapatan" value={formatRupiah(stats?.revenue)} hint="Hanya transaksi lunas" />
          </div>

          <h2 className="mb-3 mt-8 text-lg font-bold">Daftar Event</h2>
          {events.length === 0 ? (
            <EmptyState
              title="Belum ada event"
              description="Ajukan event pertamamu, nanti admin yang menyetujui."
              action={<Link to="/promoter/events/new"><Button>Ajukan Event</Button></Link>}
            />
          ) : (
            <Card className="overflow-x-auto p-0">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-slate-50 text-ts-muted dark:bg-surface-high/40">
                  <tr>
                    <th className="px-5 py-3">Event</th>
                    <th className="px-5 py-3">Tanggal</th>
                    <th className="px-5 py-3">Harga</th>
                    <th className="px-5 py-3">Terjual</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((e) => (
                    <tr key={e.id} className="border-t border-slate-100 dark:border-white/10">
                      <td className="px-5 py-3 font-medium">
                        {e.name}
                        {e.status === "rejected" && e.rejection_note && (
                          <p className="mt-1 text-xs text-red-500">Alasan: {e.rejection_note}</p>
                        )}
                      </td>
                      <td className="px-5 py-3">{formatDate(e.event_date)}</td>
                      <td className="px-5 py-3">{formatRupiah(e.price)}</td>
                      <td className="px-5 py-3">{e.tickets_sold}/{e.quota}</td>
                      <td className="px-5 py-3"><Badge status={e.status} /></td>
                      <td className="px-5 py-3">
                        <div className="flex gap-2">
                          <Link to={`/promoter/events/${e.id}/edit`}>
                            <Button variant="ghost" className="px-3 py-1.5 text-xs">Edit</Button>
                          </Link>
                          <Link to={`/promoter/events/${e.id}/tiers`}>
                            <Button variant="ghost" className="px-3 py-1.5 text-xs">Tier Tiket</Button>
                          </Link>
                          <Button variant="danger" className="px-3 py-1.5 text-xs" onClick={() => remove(e.id)}>
                            Hapus
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
