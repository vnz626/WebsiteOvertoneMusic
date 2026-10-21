import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, Plus, Edit2, Trash2, Tag, Ticket, CheckCircle, AlertCircle } from "lucide-react";
import api from "../../api";
import DashboardLayout from "../../components/layout/DashboardLayout";
import Card, { StatCard } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import { SkeletonGrid } from "../../components/ui/Skeleton";
import { errorMessage, formatRupiah } from "../../utils/format";

export default function TicketTiers() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingTier, setEditingTier] = useState(null);

  const [form, setForm] = useState({ tier_name: "", price: "", quota: "" });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [eventRes, tiersRes] = await Promise.all([
        api.get(`/promoter/events`).then(res => (res.data.data || []).find(e => String(e.id) === String(id))),
        api.get(`/promoter/events/${id}/tiers`)
      ]);
      setEvent(eventRes || null);
      setTiers(tiersRes.data.data || []);
    } catch (err) {
      toast.error(errorMessage(err, "Gagal memuat data tier"));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.tier_name.trim()) {
      toast.error("Nama tier wajib diisi");
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/promoter/events/${id}/tiers`, {
        tier_name: form.tier_name,
        price: Number(form.price) || 0,
        quota: Number(form.quota) || 0
      });
      toast.success("Tier tiket berhasil ditambahkan");
      setForm({ tier_name: "", price: "", quota: "" });
      loadData();
    } catch (err) {
      toast.error(errorMessage(err, "Gagal menambah tier"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate(e) {
    e.preventDefault();
    if (!editingTier || !editingTier.tier_name.trim()) return;
    setSubmitting(true);
    try {
      await api.put(`/promoter/tiers/${editingTier.id}`, {
        tier_name: editingTier.tier_name,
        price: Number(editingTier.price) || 0,
        quota: Number(editingTier.quota) || 0
      });
      toast.success("Tier tiket berhasil diperbarui");
      setEditingTier(null);
      loadData();
    } catch (err) {
      toast.error(errorMessage(err, "Gagal memperbarui tier"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(t) {
    if (t.tickets_sold > 0) {
      toast.error("Tier yang sudah memiliki tiket terjual tidak dapat dihapus!");
      return;
    }
    if (!window.confirm(`Hapus tier "${t.tier_name}"?`)) return;
    try {
      await api.delete(`/promoter/tiers/${t.id}`);
      toast.success("Tier tiket berhasil dihapus");
      loadData();
    } catch (err) {
      toast.error(errorMessage(err, "Gagal menghapus tier"));
    }
  }

  const totalTierQuota = tiers.reduce((acc, t) => acc + (t.quota || 0), 0);
  const totalTierSold = tiers.reduce((acc, t) => acc + (t.tickets_sold || 0), 0);
  const fieldClass = "w-full rounded-xl border border-ts-subtle px-4 py-2.5 outline-none focus:border-ts-primary dark:border-white/10 dark:bg-surface-container dark:text-white";

  return (
    <DashboardLayout
      title="Kelola Ticket Tier"
      subtitle={event ? `Kategori tier & variasi harga tiket untuk "${event.name}"` : "Kategori tier tiket event"}
      actions={
        <Link to="/promoter/dashboard">
          <Button variant="ghost" className="flex items-center gap-2">
            <ArrowLeft size={16} /> Kembali ke Dashboard
          </Button>
        </Link>
      }
    >
      {loading ? (
        <SkeletonGrid count={3} />
      ) : (
        <>
          {/* Ringkasan Performa Tier */}
          <div className="mb-6 grid gap-5 sm:grid-cols-3">
            <StatCard label="Total Kategori Tier" value={tiers.length} hint="Kategori harga aktif" />
            <StatCard label="Total Kuota Teralokasi" value={totalTierQuota} hint={`Event max quota: ${event?.quota || 0}`} />
            <StatCard label="Tiket Terjual per Tier" value={totalTierSold} hint={`${totalTierQuota - totalTierSold} tiket tersisa`} />
          </div>

          <div className="grid gap-8 lg:grid-cols-12">
            {/* Form Tambah Tier */}
            <div className="lg:col-span-4">
              <Card>
                <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
                  <Plus size={18} className="text-ts-primary dark:text-brand-400" />
                  Tambah Tier Baru
                </h3>
                <p className="mt-1 text-xs text-ts-muted dark:text-slate-400">
                  Tentukan kategori tier (mis. VIP, Presale, Festival) dan harganya.
                </p>

                <form onSubmit={handleAdd} className="mt-5 space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Nama Tier *</label>
                    <input
                      className={`${fieldClass} mt-1`}
                      placeholder="Contoh: CAT 1 / VIP / Presale"
                      value={form.tier_name}
                      onChange={(e) => setForm({ ...form, tier_name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Harga Per Tiket (Rp) *</label>
                    <input
                      type="number"
                      min={0}
                      className={`${fieldClass} mt-1`}
                      placeholder="150000"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Kuota Tiket *</label>
                    <input
                      type="number"
                      min={1}
                      className={`${fieldClass} mt-1`}
                      placeholder="100"
                      value={form.quota}
                      onChange={(e) => setForm({ ...form, quota: e.target.value })}
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? "Menyimpan..." : "Tambah Tier"}
                  </Button>
                </form>
              </Card>
            </div>

            {/* List Tier & Modal Edit */}
            <div className="lg:col-span-8">
              <Card className="p-0">
                <div className="border-b border-slate-100 p-5 dark:border-white/10/60">
                  <h3 className="font-bold text-slate-900 dark:text-white">Daftar Ticket Tier</h3>
                  <p className="text-xs text-ts-muted dark:text-slate-400">
                    Semua variasi tier yang ditawarkan untuk pembeli
                  </p>
                </div>

                {tiers.length === 0 ? (
                  <div className="p-8">
                    <EmptyState
                      title="Belum Ada Tier Tiket"
                      description="Tambahkan kategori tier pertama untuk event ini menggunakan form di samping."
                    />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-ts-muted dark:bg-surface-high/40">
                        <tr>
                          <th className="px-5 py-3">Kategori Tier</th>
                          <th className="px-5 py-3">Harga</th>
                          <th className="px-5 py-3">Kuota</th>
                          <th className="px-5 py-3">Terjual</th>
                          <th className="px-5 py-3">Sisa</th>
                          <th className="px-5 py-3 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                        {tiers.map((t) => (
                          <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-surface-high/20">
                            <td className="px-5 py-3 font-semibold text-slate-900 dark:text-white">
                              <span className="inline-flex items-center gap-1.5">
                                <Tag size={14} className="text-brand-500" />
                                {t.tier_name}
                              </span>
                            </td>
                            <td className="px-5 py-3 font-medium text-ts-primary dark:text-brand-400">
                              {formatRupiah(t.price)}
                            </td>
                            <td className="px-5 py-3 text-slate-700 dark:text-slate-300">{t.quota}</td>
                            <td className="px-5 py-3 text-slate-700 dark:text-slate-300">{t.tickets_sold || 0}</td>
                            <td className="px-5 py-3">
                              <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                                t.remaining_quota <= 0
                                  ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                                  : "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                              }`}>
                                {t.remaining_quota <= 0 ? "Sold Out" : `${t.remaining_quota} tiket`}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  className="p-2 text-xs"
                                  onClick={() => setEditingTier(t)}
                                  title="Edit Tier"
                                >
                                  <Edit2 size={14} />
                                </Button>
                                <Button
                                  variant="danger"
                                  className="p-2 text-xs"
                                  onClick={() => handleRemove(t)}
                                  disabled={t.tickets_sold > 0}
                                  title={t.tickets_sold > 0 ? "Tier tidak dapat dihapus karena sudah ada penjualan" : "Hapus Tier"}
                                >
                                  <Trash2 size={14} />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>
          </div>

          {/* Modal Edit Tier */}
          {editingTier && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
              <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-surface-container">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Edit Tier Tiket</h3>
                <p className="mt-1 text-xs text-ts-muted dark:text-slate-400">
                  Ubah rincian kategori tier {editingTier.tier_name}
                </p>

                <form onSubmit={handleUpdate} className="mt-4 space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Nama Tier</label>
                    <input
                      className={`${fieldClass} mt-1`}
                      value={editingTier.tier_name}
                      onChange={(e) => setEditingTier({ ...editingTier, tier_name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Harga (Rp)</label>
                    <input
                      type="number"
                      min={0}
                      className={`${fieldClass} mt-1`}
                      value={editingTier.price}
                      onChange={(e) => setEditingTier({ ...editingTier, price: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Kuota</label>
                    <input
                      type="number"
                      min={editingTier.tickets_sold || 0}
                      className={`${fieldClass} mt-1`}
                      value={editingTier.quota}
                      onChange={(e) => setEditingTier({ ...editingTier, quota: e.target.value })}
                      required
                    />
                    {editingTier.tickets_sold > 0 && (
                      <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                        * Minimal kuota tidak boleh lebih kecil dari jumlah tiket terjual ({editingTier.tickets_sold} tiket).
                      </p>
                    )}
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button type="submit" className="flex-1" disabled={submitting}>
                      {submitting ? "Menyimpan..." : "Simpan Perubahan"}
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => setEditingTier(null)}>
                      Batal
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
