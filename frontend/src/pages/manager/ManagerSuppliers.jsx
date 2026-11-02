import React, { useState, useEffect } from "react";
import {
  Building2,
  Plus,
  Search,
  RefreshCw,
  Edit,
  Globe,
  Mail,
  Phone,
  ExternalLink,
} from "lucide-react";
import api from "../../api";
import toast from "react-hot-toast";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";

export default function ManagerSuppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    country: "United States",
    description: "",
    website: "",
    contact_email: "",
    contact_phone: "",
    logo_url: "",
  });
  const [submitting, setSubmitting] = useState(false);

  function loadSuppliers() {
    setLoading(true);
    api
      .get("/manager/suppliers")
      .then((res) => {
        setSuppliers(res.data?.data || []);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadSuppliers();
  }, []);

  const filtered = suppliers.filter(
    (s) =>
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.country && s.country.toLowerCase().includes(search.toLowerCase())) ||
      (s.contact_email && s.contact_email.toLowerCase().includes(search.toLowerCase()))
  );

  function handleOpenCreate() {
    setEditingSupplier(null);
    setForm({
      name: "",
      slug: "",
      country: "United States",
      description: "",
      website: "",
      contact_email: "",
      contact_phone: "",
      logo_url: "",
    });
    setModalOpen(true);
  }

  function handleOpenEdit(s) {
    setEditingSupplier(s);
    setForm({
      name: s.name,
      slug: s.slug,
      country: s.country || "United States",
      description: s.description || "",
      website: s.website || "",
      contact_email: s.contact_email || "",
      contact_phone: s.contact_phone || "",
      logo_url: s.logo_url || "",
    });
    setModalOpen(true);
  }

  function handleSave(e) {
    e.preventDefault();
    setSubmitting(true);
    const apiCall = editingSupplier
      ? api.put(`/manager/suppliers/${editingSupplier.id}`, form)
      : api.post("/manager/suppliers", form);

    apiCall
      .then(() => {
        setModalOpen(false);
        loadSuppliers();
      })
      .catch((err) => {
        toast.error(err.response?.data?.message || "Gagal menyimpan brand/supplier");
      })
      .finally(() => setSubmitting(false));
  }

  function handleToggleActive(s) {
    api
      .put(`/manager/suppliers/${s.id}`, { is_active: !s.is_active })
      .then(() => loadSuppliers())
      .catch(() => toast.error("Gagal mengubah status aktif"));
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="accent">Otoritas Manager</Badge>
            <Badge variant="neutral">Principal &amp; Brand Registry</Badge>
          </div>
          <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Administrasi Brand &amp; Vendor Supplier Resmi
          </h1>
          <p className="mt-1 text-xs text-ink-secondary sm:text-sm">
            Pusat data distributor resmi cinema cameras, lenses &amp; broadcast gear (Sony, RED, Canon,
            DJI, Aputure, Rode, Atomos, Sennheiser)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm" onClick={handleOpenCreate}>
            <Plus size={15} aria-hidden="true" />
            Daftarkan Brand Baru
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={loadSuppliers}
            title="Segarkan Data"
          >
            <RefreshCw
              size={14}
              className={loading ? "animate-spin" : ""}
              aria-hidden="true"
            />
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search
          size={15}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
          aria-hidden="true"
        />
        <input
          type="text"
          placeholder="Cari Brand, Principal Supplier, Negara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Cari Brand, Principal Supplier, atau Negara"
          className="w-full rounded-sm border border-line bg-surface py-2 pl-9 pr-4 text-xs text-ink placeholder:text-ink-muted focus:border-ink focus:outline-none"
        />
      </div>

      {/* Suppliers Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full rounded-md border border-line bg-surface p-12 text-center text-xs text-ink-muted">
            Memuat daftar brand &amp; supplier resmi...
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full rounded-md border border-line bg-surface p-12 text-center text-xs text-ink-muted">
            Tidak ada brand yang sesuai dengan pencarian.
          </div>
        ) : (
          filtered.map((s) => (
            <div
              key={s.id}
              className="flex flex-col justify-between rounded-md border border-line bg-surface p-5 transition-colors hover:border-line-strong"
            >
              <div>
                <div className="mb-2 flex items-start justify-between gap-2">
                  <span className="rounded-xs border border-line bg-surface-muted px-2 py-0.5 font-mono text-[10px] font-bold text-ink-secondary">
                    {s.slug}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleToggleActive(s)}
                    className={`inline-flex items-center gap-1 rounded-xs border px-2 py-0.5 text-[10px] font-bold transition-colors ${s.is_active
                      ? "border-status-success/30 bg-status-success/10 text-status-success"
                      : "border-line bg-surface-muted text-ink-muted"
                      }`}
                  >
                    {s.is_active ? "Aktif" : "Non-Aktif"}
                  </button>
                </div>

                <h3 className="font-display text-sm font-bold text-ink">{s.name}</h3>
                <p className="mt-0.5 text-[11px] font-medium text-ink-muted">
                  {s.country || "Internasional"}
                </p>
                <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-ink-secondary">
                  {s.description}
                </p>

                <div className="mt-3.5 space-y-1.5 border-t border-line pt-3 text-[11px] text-ink-secondary">
                  {s.website && (
                    <a
                      href={s.website}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 transition-colors hover:text-accent"
                    >
                      <Globe size={13} className="text-ink-muted" aria-hidden="true" />
                      <span className="truncate">{s.website}</span>
                      <ExternalLink
                        size={10}
                        className="text-ink-muted"
                        aria-hidden="true"
                      />
                    </a>
                  )}
                  {s.contact_email && (
                    <div className="flex items-center gap-1.5">
                      <Mail size={13} className="text-ink-muted" aria-hidden="true" />
                      <span className="truncate">{s.contact_email}</span>
                    </div>
                  )}
                  {s.contact_phone && (
                    <div className="flex items-center gap-1.5 tabular-nums">
                      <Phone size={13} className="text-ink-muted" aria-hidden="true" />
                      <span>{s.contact_phone}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted tabular-nums">
                  {s.products_count || 0} Model Terdaftar
                </span>
                <Button
                  type="button"
                  variant="secondary"
                  size="xs"
                  onClick={() => handleOpenEdit(s)}
                >
                  <Edit size={12} aria-hidden="true" />
                  Edit Data
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL BRAND/SUPPLIER */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          editingSupplier
            ? "Edit Brand / Supplier"
            : "Daftarkan Brand / Supplier Baru"
        }
        size="md"
      >
        <form onSubmit={handleSave} className="space-y-3.5 text-xs">
          <div>
            <label className="font-bold text-ink">Nama Resmi Brand / Perusahaan</label>
            <input
              type="text"
              placeholder="Contoh: Sony Cinema Line / RED Digital Cinema Inc."
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="ot-input mt-1 text-xs"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-ink">Slug Identitas</label>
              <input
                type="text"
                placeholder="fender"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                className="ot-input mt-1 text-xs lowercase"
              />
            </div>
            <div>
              <label className="font-bold text-ink">Negara Asal</label>
              <input
                type="text"
                placeholder="United States / Japan"
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                className="ot-input mt-1 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="font-medium text-ink-secondary">
              Deskripsi / Portofolio Brand
            </label>
            <textarea
              rows={2}
              placeholder="Deskripsi singkat lini cinema camera bodies, cine prime lenses, gimbal, atau pro broadcast audio..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="ot-input mt-1 text-xs"
            />
          </div>

          <div>
            <label className="font-medium text-ink-secondary">Website Resmi</label>
            <input
              type="url"
              placeholder="https://www.fender.com"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
              className="ot-input mt-1 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-medium text-ink-secondary">
                Email Korespondensi B2B
              </label>
              <input
                type="email"
                placeholder="b2b@brand.com"
                value={form.contact_email}
                onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                className="ot-input mt-1 text-xs"
              />
            </div>
            <div>
              <label className="font-medium text-ink-secondary">Telepon Kontak</label>
              <input
                type="text"
                placeholder="+1-800-xxx"
                value={form.contact_phone}
                onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                className="ot-input mt-1 text-xs"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-line pt-3">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setModalOpen(false)}
            >
              Batal
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={submitting}>
              Simpan Brand Supplier
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
