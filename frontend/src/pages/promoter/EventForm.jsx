import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Wand2 } from "lucide-react";
import api from "../../api";
import DashboardLayout from "../../components/layout/DashboardLayout";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import FileUpload from "../../components/ui/FileUpload";
import { useMeta } from "../../utils/useMeta";
import { errorMessage } from "../../utils/format";

const EMPTY = {
  name: "", description: "", category: "", location: "", city: "",
  venue_map_url: "", image_url: "",
  event_date: "", event_time: "", organizer: "", instagram_url: "",
  price: 0, quota: 0,
};

export default function EventForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { categories, cities } = useMeta();
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    api
      .get("/promoter/events")
      .then((res) => {
        const found = (res.data.data || []).find((e) => String(e.id) === String(id));
        if (found) setForm({ ...EMPTY, ...found, event_date: found.event_date || "" });
        else toast.error("Event tidak ditemukan");
      })
      .catch((err) => toast.error(errorMessage(err)));
  }, [id, isEdit]);

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  function autoFillMapsLink() {
    const q = [form.location, form.city, "Indonesia"].filter(Boolean).join(", ");
    if (!q) {
      toast.error("Isi lokasi & kota dulu");
      return;
    }
    update("venue_map_url", `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`);
  }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    const payload = { ...form, price: Number(form.price), quota: Number(form.quota) };
    try {
      if (isEdit) await api.put(`/promoter/events/${id}`, payload);
      else await api.post("/promoter/events", payload);
      toast.success(isEdit ? "Event diperbarui" : "Event diajukan, menunggu persetujuan admin");
      navigate("/promoter/dashboard");
    } catch (err) {
      toast.error(errorMessage(err, "Gagal menyimpan event"));
    } finally {
      setSaving(false);
    }
  }

  const field =
    "w-full rounded-xl border border-ts-subtle px-4 py-2.5 outline-none focus:border-ts-primary dark:border-white/10 dark:bg-surface-container dark:text-white";

  return (
    <DashboardLayout title={isEdit ? "Edit Event" : "Ajukan Event Baru"}>
      <Card className="max-w-2xl">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Nama event *</label>
            <input className={`${field} mt-1`} value={form.name} onChange={(e) => update("name", e.target.value)} required />
          </div>
          <div>
            <label className="text-sm font-medium">Deskripsi</label>
            <textarea rows={4} className={`${field} mt-1`} value={form.description || ""} onChange={(e) => update("description", e.target.value)} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Jenis event *</label>
              <select className={`${field} mt-1`} value={form.category || ""} onChange={(e) => update("category", e.target.value)} required>
                <option value="">Pilih jenis event</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Kota *</label>
              <select className={`${field} mt-1`} value={form.city || ""} onChange={(e) => update("city", e.target.value)} required>
                <option value="">Pilih kota</option>
                {cities.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Nama venue</label>
              <input className={`${field} mt-1`} placeholder="mis. Istora Senayan" value={form.location || ""} onChange={(e) => update("location", e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Penyelenggara</label>
              <input className={`${field} mt-1`} value={form.organizer || ""} onChange={(e) => update("organizer", e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Tanggal *</label>
              <input type="date" className={`${field} mt-1`} value={form.event_date} onChange={(e) => update("event_date", e.target.value)} required />
            </div>
            <div>
              <label className="text-sm font-medium">Jam</label>
              <input className={`${field} mt-1`} placeholder="19:00 WIB" value={form.event_time || ""} onChange={(e) => update("event_time", e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Harga tiket (Rp)</label>
              <input type="number" min={0} className={`${field} mt-1`} value={form.price} onChange={(e) => update("price", e.target.value)} required />
            </div>
            <div>
              <label className="text-sm font-medium">Kuota tiket</label>
              <input type="number" min={0} className={`${field} mt-1`} value={form.quota} onChange={(e) => update("quota", e.target.value)} required />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Link Google Maps venue</label>
            <div className="mt-1 flex gap-2">
              <input className={field} placeholder="https://maps.google.com/..." value={form.venue_map_url || ""} onChange={(e) => update("venue_map_url", e.target.value)} />
              <Button type="button" variant="ghost" className="shrink-0 px-3" onClick={autoFillMapsLink} title="Buat otomatis dari venue + kota">
                <Wand2 size={16} />
              </Button>
            </div>
            <p className="mt-1 text-xs text-slate-400">Dipakai untuk tombol "Rute ke Lokasi" di halaman detail event.</p>
          </div>

          <FileUpload
            label="Poster event"
            accept="image/*"
            value={form.image_url}
            onUploaded={(url) => update("image_url", url)}
          />
          <div>
            <label className="text-sm font-medium">Instagram</label>
            <input className={`${field} mt-1`} placeholder="https://instagram.com/..." value={form.instagram_url || ""} onChange={(e) => update("instagram_url", e.target.value)} />
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={saving}>{saving ? "Menyimpan..." : "Simpan"}</Button>
            <Button type="button" variant="ghost" onClick={() => navigate("/promoter/dashboard")}>Batal</Button>
          </div>
        </form>
      </Card>
    </DashboardLayout>
  );
}
