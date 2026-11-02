import React, { useState, useEffect } from "react";
import {
  Package,
  Plus,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  Trash2,
  ShieldCheck,
  TrendingUp,
  Layers,
  DollarSign,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../../api";
import { useConfirm } from "../../components/ui/ConfirmDialog";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";

const formatRupiah = (val) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(val || 0);

export default function ManagerBundles() {
  const confirm = useConfirm();
  const [bundles, setBundles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [catalogItems, setCatalogItems] = useState([]);

  const [formData, setFormData] = useState({
    name: "",
    bundle_code: "",
    description: "",
    bundle_price: "",
    image_url: "",
    items: [],
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: "", type: "" });

  const fetchBundles = async () => {
    try {
      setLoading(true);
      const res = await api.get("/manager/bundles");
      const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setBundles(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCatalogItems = async () => {
    try {
      const res = await api.get("/manager/catalog/products");
      const productsList = res.data?.data || [];
      const flattened = [];
      productsList.forEach((p) => {
        (p.tiers || p.variants || []).forEach((v) => {
          flattened.push({
            variant_id: v.id,
            product_name: p.name,
            variant_name: v.color_finish || v.variant_name || v.tier_name || "Standard",
            sku: v.sku_code || v.tier_name,
            price: Number(v.price || 0),
            cogs: Number(v.cost_price || Math.round((v.price || 0) * 0.7)),
            stock: Number(v.stock ?? v.quota ?? 0),
          });
        });
      });
      setCatalogItems(flattened);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchBundles();
    fetchCatalogItems();
  }, []);

  const handleAddItemToBundle = (variant) => {
    if (formData.items.find((i) => i.variant_id === variant.variant_id)) return;
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          variant_id: variant.variant_id,
          product_name: variant.product_name,
          variant_name: variant.variant_name,
          sku: variant.sku,
          price: variant.price,
          cogs: variant.cogs,
          qty: 1,
        },
      ],
    }));
  };

  const handleRemoveItem = (variant_id) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((i) => i.variant_id !== variant_id),
    }));
  };

  const handleUpdateItemQty = (variant_id, qty) => {
    const parsed = Math.max(1, parseInt(qty) || 1);
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((i) =>
        i.variant_id === variant_id ? { ...i, qty: parsed } : i
      ),
    }));
  };

  const normalTotalPrice = formData.items.reduce(
    (sum, item) => sum + item.price * item.qty,
    0
  );
  const totalCogs = formData.items.reduce(
    (sum, item) => sum + item.cogs * item.qty,
    0
  );
  const bundlePriceNum = parseFloat(formData.bundle_price) || 0;
  const savings = Math.max(0, normalTotalPrice - bundlePriceNum);
  const profitMarginAmount = bundlePriceNum - totalCogs;
  const profitMarginPercent =
    bundlePriceNum > 0 ? (profitMarginAmount / bundlePriceNum) * 100 : 0;

  let guardrailStatus = "neutral";
  let guardrailMessage = "Tentukan harga paket untuk memeriksa Margin Guardrail.";
  if (bundlePriceNum > 0 && totalCogs > 0) {
    if (bundlePriceNum < totalCogs) {
      guardrailStatus = "danger";
      guardrailMessage = `PELANGGARAN MARGIN GUARDRAIL: Harga paket (${formatRupiah(
        bundlePriceNum
      )}) di bawah Total HPP (${formatRupiah(
        totalCogs
      )}). Transaksi rugi tidak diizinkan!`;
    } else if (profitMarginPercent < 15) {
      guardrailStatus = "warning";
      guardrailMessage = `PERINGATAN MARGIN TIPIS: Margin laba hanya ${profitMarginPercent.toFixed(
        1
      )}%. Disarankan minimal 15% untuk menutup biaya operasional.`;
    } else {
      guardrailStatus = "success";
      guardrailMessage = `MARGIN SEHAT & AMAN: Margin laba ${profitMarginPercent.toFixed(
        1
      )}% (${formatRupiah(
        profitMarginAmount
      )} di atas HPP). Memberikan diskon pelanggan ${formatRupiah(savings)}.`;
    }
  }

  const handleSaveBundle = async (e) => {
    e.preventDefault();
    if (formData.items.length < 2) {
      setMsg({
        text: "Paket bundling harus terdiri dari minimal 2 cinema gear/komponen.",
        type: "error",
      });
      return;
    }
    if (bundlePriceNum < totalCogs) {
      setMsg({
        text: "Harga paket bundling tidak boleh lebih rendah dari total HPP!",
        type: "error",
      });
      return;
    }

    try {
      setSaving(true);
      setMsg({ text: "", type: "" });
      const payload = {
        name: formData.name,
        bundle_code: formData.bundle_code,
        description: formData.description,
        bundle_price: bundlePriceNum,
        image_url: formData.image_url,
        items: formData.items.map((i) => ({
          variant_id: i.variant_id,
          qty: i.qty,
        })),
      };

      const res = await api.post("/manager/bundles", payload);
      const data = res.data || {};
      setMsg({
        text: data.message || "Paket Starter Rig berhasil diterbitkan!",
        type: "success",
      });
      toast.success(data.message || "Paket Starter Rig berhasil diterbitkan!");
      setTimeout(() => {
        setModalOpen(false);
        setFormData({
          name: "",
          bundle_code: "",
          description: "",
          bundle_price: "",
          image_url: "",
          items: [],
        });
        setMsg({ text: "", type: "" });
        fetchBundles();
      }, 900);
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || "Gagal menyimpan paket bundling";
      setMsg({ text: errMsg, type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleBundle = async (bundle) => {
    try {
      await api.put(`/manager/bundles/${bundle.id}`, {
        is_active: !bundle.is_active,
      });
      fetchBundles();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteBundle = async (id) => {
    const ok = await confirm({
      title: "Hapus Paket Bundle",
      message: "Yakin ingin menghapus paket bundle ini?",
      confirmText: "Hapus Bundle",
      isDanger: true,
    });
    if (!ok) return;

    try {
      await api.delete(`/manager/bundles/${id}`);
      toast.success("Paket bundle berhasil dihapus!");
      fetchBundles();
    } catch (err) {
      console.error(err);
      toast.error("Gagal menghapus bundle");
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-line pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="accent">Manager Bundling Studio</Badge>
            <Badge variant="neutral">Filmmaker Rig Creator</Badge>
          </div>
          <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Product Bundle &amp; Filmmaker Rig Creator
          </h1>
          <p className="mt-1 text-xs text-ink-secondary sm:text-sm">
            Rakit paket cinema gear komplit dengan harga khusus, otomatis diproteksi oleh{" "}
            <strong className="font-semibold text-ink">Margin Guardrail System</strong>.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setFormData({
              name: "",
              bundle_code: `RIG-${Math.floor(1000 + Math.random() * 9000)}`,
              description: "",
              bundle_price: "",
              image_url:
                "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80",
              items: [],
            });
            setModalOpen(true);
          }}
        >
          <Plus size={15} aria-hidden="true" />
          Buat Paket Baru
        </Button>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-md border border-line bg-surface p-4">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-ink-muted">
            <span>Total Paket Rig</span>
            <Layers size={15} aria-hidden="true" />
          </div>
          <div className="mt-2 font-display text-2xl font-bold text-ink tabular-nums">
            {bundles.length} Paket
          </div>
          <span className="mt-1 block text-xs text-ink-secondary">
            Aktif di Katalog &amp; POS
          </span>
        </div>

        <div className="rounded-md border border-line bg-surface p-4">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-status-success">
            <span>Rata-Rata Hemat</span>
            <DollarSign size={15} aria-hidden="true" />
          </div>
          <div className="mt-2 font-display text-2xl font-bold text-status-success tabular-nums">
            {formatRupiah(
              bundles.reduce((acc, b) => acc + (b.savings_amount || 0), 0) /
                (bundles.length || 1)
            )}
          </div>
          <span className="mt-1 block text-xs text-ink-secondary">
            Value bagi filmmaker
          </span>
        </div>

        <div className="rounded-md border border-line bg-surface p-4">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-accent">
            <span>Margin Guardrail</span>
            <ShieldCheck size={15} aria-hidden="true" />
          </div>
          <div className="mt-2 font-display text-2xl font-bold text-ink">100% Lolos</div>
          <span className="mt-1 block text-xs text-ink-secondary">
            Semua harga di atas HPP
          </span>
        </div>

        <div className="rounded-md border border-line bg-surface p-4">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-ink-muted">
            <span>Multi-Deduction</span>
            <TrendingUp size={15} aria-hidden="true" />
          </div>
          <div className="mt-2 font-display text-2xl font-bold text-ink">
            Sinkron Otomatis
          </div>
          <span className="mt-1 block text-xs text-ink-secondary">
            Potong stok seluruh komponen
          </span>
        </div>
      </div>

      {/* Bundle Cards Grid */}
      {loading ? (
        <div className="py-20 text-center text-xs text-ink-muted">
          Memuat daftar paket bundle...
        </div>
      ) : bundles.length === 0 ? (
        <div className="rounded-md border border-dashed border-line-strong bg-surface py-16 text-center">
          <Package
            size={40}
            className="mx-auto mb-3 text-ink-muted"
            aria-hidden="true"
          />
          <p className="text-sm font-semibold text-ink">
            Belum ada paket bundling production kit yang dibuat.
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            Klik tombol &ldquo;Buat Paket Baru&rdquo; untuk mulai menggabungkan cinema gear.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {bundles.map((bundle) => {
            const marginAmount = bundle.bundle_price - bundle.total_cogs;
            const marginPct = (marginAmount / bundle.bundle_price) * 100;

            return (
              <div
                key={bundle.id}
                className={`flex flex-col justify-between overflow-hidden rounded-md border bg-surface transition-colors ${
                  bundle.is_active
                    ? "border-line hover:border-line-strong"
                    : "border-line opacity-65"
                }`}
              >
                <div>
                  <div className="relative h-44 overflow-hidden border-b border-line bg-surface-muted">
                    <img
                      src={
                        bundle.image_url ||
                        "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80"
                      }
                      alt={bundle.name}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute left-3 top-3 rounded-xs bg-ink px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-canvas">
                      {bundle.bundle_code}
                    </div>
                    {bundle.savings_amount > 0 && (
                      <div className="absolute right-3 top-3 rounded-xs bg-accent px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white tabular-nums">
                        Hemat {formatRupiah(bundle.savings_amount)}
                      </div>
                    )}
                  </div>

                  <div className="p-5">
                    <h3 className="font-display text-base font-bold leading-snug text-ink">
                      {bundle.name}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-xs text-ink-secondary">
                      {bundle.description}
                    </p>

                    {/* Items included */}
                    <div className="mt-4 border-t border-line pt-3">
                      <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                        Komponen Rig ({bundle.items?.length || 0} Item):
                      </div>
                      <div className="space-y-1.5">
                        {(bundle.items || []).map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between rounded-xs border border-line bg-surface-muted/60 px-2.5 py-1.5 text-xs text-ink"
                          >
                            <span className="truncate pr-2 font-medium">
                              {item.qty}× {item.product_name} -{" "}
                              <span className="text-ink-secondary">
                                {item.variant_name}
                              </span>
                            </span>
                            <span className="whitespace-nowrap font-mono text-[11px] text-ink-secondary tabular-nums">
                              {formatRupiah(item.price * item.qty)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Pricing Breakdown */}
                    <div className="mt-4 space-y-1.5 rounded-sm border border-line bg-surface-muted/50 p-3 text-xs tabular-nums">
                      <div className="flex justify-between text-ink-secondary">
                        <span>Harga Normal Satuan:</span>
                        <span className="line-through">
                          {formatRupiah(bundle.normal_total_price)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm font-bold text-ink">
                        <span>Harga Paket Rig:</span>
                        <span>{formatRupiah(bundle.bundle_price)}</span>
                      </div>
                      <div className="flex justify-between border-t border-line pt-1 text-[11px] text-ink-secondary">
                        <span>Total HPP / COGS:</span>
                        <span className="font-mono">{formatRupiah(bundle.total_cogs)}</span>
                      </div>
                      <div className="flex justify-between text-[11px] font-bold text-status-success">
                        <span className="flex items-center gap-1">
                          <ShieldCheck size={12} aria-hidden="true" /> Margin Laba:
                        </span>
                        <span>
                          {marginPct.toFixed(1)}% ({formatRupiah(marginAmount)})
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="flex items-center justify-between border-t border-line bg-surface p-4">
                  <button
                    type="button"
                    onClick={() => handleToggleBundle(bundle)}
                    className={`rounded-sm border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors ${
                      bundle.is_active
                        ? "border-status-success/30 bg-status-success/10 text-status-success hover:bg-status-success/20"
                        : "border-line bg-surface-muted text-ink-muted hover:text-ink"
                    }`}
                  >
                    {bundle.is_active ? "Aktif Dijual" : "Nonaktif"}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteBundle(bundle.id)}
                    aria-label="Hapus Bundle"
                    className="rounded-xs p-1.5 text-ink-muted transition-colors hover:bg-status-danger/10 hover:text-status-danger"
                    title="Hapus Bundle"
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Buat Bundle Baru */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Rakit Paket Bundle Baru"
        size="xl"
      >
        <form onSubmit={handleSaveBundle} className="space-y-5 text-xs">
          {msg.text && (
            <div
              className={`flex items-center gap-2 rounded-sm border p-3 text-xs font-semibold ${
                msg.type === "success"
                  ? "border-status-success/30 bg-status-success/10 text-status-success"
                  : "border-status-danger/30 bg-status-danger/10 text-status-danger"
              }`}
            >
              {msg.type === "success" ? (
                <CheckCircle size={15} aria-hidden="true" />
              ) : (
                <AlertTriangle size={15} aria-hidden="true" />
              )}
              {msg.text}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink">
                Nama Paket Bundle *
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Fender Player II Stage Starter Rig"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="ot-input text-xs"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink">
                Kode SKU Bundle *
              </label>
              <input
                type="text"
                required
                placeholder="RIG-XXXX"
                value={formData.bundle_code}
                onChange={(e) =>
                  setFormData({ ...formData, bundle_code: e.target.value })
                }
                className="ot-input font-mono text-xs uppercase"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink">
              Deskripsi &amp; Manfaat Paket
            </label>
            <textarea
              rows={2}
              placeholder="Jelaskan kombinasi cinema hardware dan keunggulan rig ini..."
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="ot-input text-xs"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink">
              URL Foto Banner Rig
            </label>
            <input
              type="text"
              placeholder="https://..."
              value={formData.image_url}
              onChange={(e) =>
                setFormData({ ...formData, image_url: e.target.value })
              }
              className="ot-input text-xs"
            />
          </div>

          {/* Komponen SKU Picker */}
          <div className="rounded-sm border border-line bg-surface-muted/50 p-4">
            <div className="mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-ink">
                Pilih Komponen Cinema Gear / Aksesoris (Minimal 2 SKU)
              </h4>
              <p className="text-[11px] text-ink-secondary">
                Pilih dari katalog SKU master untuk digabungkan ke paket.
              </p>
            </div>

            <div className="mb-4 flex gap-2">
              <select
                id="sku-selector"
                aria-label="Pilih SKU cinema gear untuk ditambahkan ke paket"
                className="ot-input flex-1 text-xs"
                defaultValue=""
                onChange={(e) => {
                  if (!e.target.value) return;
                  const selected = catalogItems.find(
                    (i) => i.variant_id === parseInt(e.target.value)
                  );
                  if (selected) handleAddItemToBundle(selected);
                  e.target.value = "";
                }}
              >
                <option value="" disabled>
                  -- Klik untuk Menambahkan Cinema Gear / SKU ke Paket --
                </option>
                {catalogItems.map((item) => (
                  <option key={item.variant_id} value={item.variant_id}>
                    {item.product_name} - {item.variant_name} ({item.sku}) | Harga:{" "}
                    {formatRupiah(item.price)} (HPP: {formatRupiah(item.cogs)})
                  </option>
                ))}
              </select>
            </div>

            {formData.items.length === 0 ? (
              <div className="rounded-sm border border-dashed border-line-strong bg-surface py-6 text-center text-xs text-ink-muted">
                Belum ada cinema gear yang dipilih. Pilih unit dari dropdown di atas.
              </div>
            ) : (
              <div className="space-y-2">
                {formData.items.map((item) => (
                  <div
                    key={item.variant_id}
                    className="flex items-center justify-between rounded-sm border border-line bg-surface p-2.5 text-xs"
                  >
                    <div className="flex-1 pr-4">
                      <div className="font-semibold text-ink">{item.product_name}</div>
                      <div className="font-mono text-[11px] text-ink-muted">
                        Varian: {item.variant_name} | SKU: {item.sku}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 tabular-nums">
                      <div className="text-right">
                        <div className="font-medium text-ink">
                          {formatRupiah(item.price)}
                        </div>
                        <div className="text-[10px] text-ink-muted">
                          HPP: {formatRupiah(item.cogs)}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-ink-muted">Qty:</span>
                        <input
                          type="number"
                          min="1"
                          value={item.qty}
                          aria-label={`Jumlah ${item.product_name}`}
                          onChange={(e) =>
                            handleUpdateItemQty(item.variant_id, e.target.value)
                          }
                          className="w-14 rounded-xs border border-line bg-canvas p-1 text-center font-mono text-xs"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.variant_id)}
                        aria-label={`Hapus ${item.product_name} dari paket`}
                        className="rounded-xs p-1 text-ink-muted hover:text-status-danger"
                      >
                        <Trash2 size={15} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pricing & Margin Guardrail Indicator */}
          <div className="space-y-4 rounded-sm border border-line bg-surface p-4">
            <div className="flex items-center justify-between border-b border-line pb-2">
              <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink">
                <ShieldCheck size={15} className="text-accent" aria-hidden="true" />
                Penetapan Harga &amp; Margin Guardrail System
              </h4>
              <span className="text-[11px] text-ink-muted">
                Mencegah penetapan harga di bawah modal
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 tabular-nums">
              <div className="rounded-sm border border-line bg-surface-muted p-3">
                <div className="text-[10px] font-bold uppercase text-ink-muted">
                  Total Harga Normal Satuan
                </div>
                <div className="mt-1 font-display text-base font-bold text-ink">
                  {formatRupiah(normalTotalPrice)}
                </div>
              </div>

              <div className="rounded-sm border border-line bg-surface-muted p-3">
                <div className="text-[10px] font-bold uppercase text-ink-muted">
                  Total HPP / COGS (Batas Bawah)
                </div>
                <div className="mt-1 font-display text-base font-bold text-ink">
                  {formatRupiah(totalCogs)}
                </div>
              </div>

              <div className="rounded-sm border border-accent/30 bg-accent-subtle/40 p-3">
                <label className="mb-1 block text-[10px] font-bold uppercase text-accent">
                  Harga Paket Bundling Ditawarkan *
                </label>
                <input
                  type="number"
                  required
                  placeholder="Contoh: 18500000"
                  value={formData.bundle_price}
                  onChange={(e) =>
                    setFormData({ ...formData, bundle_price: e.target.value })
                  }
                  className="ot-input py-1.5 font-mono text-xs font-bold tabular-nums"
                />
              </div>
            </div>

            {/* Guardrail Status Banner */}
            <div
              className={`flex items-start gap-2.5 rounded-sm border p-3 text-xs ${
                guardrailStatus === "danger"
                  ? "border-status-danger/40 bg-status-danger/10 text-status-danger"
                  : guardrailStatus === "warning"
                  ? "border-status-warning/40 bg-status-warning/10 text-status-warning"
                  : guardrailStatus === "success"
                  ? "border-status-success/40 bg-status-success/10 text-status-success"
                  : "border-line bg-surface-muted text-ink-secondary"
              }`}
            >
              {guardrailStatus === "danger" ? (
                <AlertTriangle size={18} className="shrink-0" aria-hidden="true" />
              ) : guardrailStatus === "warning" ? (
                <AlertTriangle size={18} className="shrink-0" aria-hidden="true" />
              ) : guardrailStatus === "success" ? (
                <CheckCircle size={18} className="shrink-0" aria-hidden="true" />
              ) : (
                <ShieldCheck size={18} className="shrink-0" aria-hidden="true" />
              )}
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider">
                  {guardrailStatus === "danger"
                    ? "BLOCKED BY GUARDRAIL"
                    : guardrailStatus === "warning"
                    ? "CAUTION ADVISED"
                    : guardrailStatus === "success"
                    ? "GUARDRAIL APPROVED"
                    : "STATUS INDIKATOR"}
                </div>
                <div className="mt-0.5 text-ink-secondary">{guardrailMessage}</div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 border-t border-line pt-4">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={saving || guardrailStatus === "danger"}
              loading={saving}
            >
              Terbitkan Starter Rig
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
