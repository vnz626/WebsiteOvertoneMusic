import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  RefreshCw,
  Truck,
  CheckCircle2,
  Lock,
} from "lucide-react";
import api from "../../api";
import { formatRupiah } from "../../utils/format";
import { useAuth } from "../../auth/AuthContext";
import toast from "react-hot-toast";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";

export default function StoreStockLookup() {
  const { user } = useAuth();
  const [data, setData] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Transfer Request Modal
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [toBranchId, setToBranchId] = useState(2);
  const [requestQty, setRequestQty] = useState(2);
  const [requestNotes, setRequestNotes] = useState("");
  const [submittingTransfer, setSubmittingTransfer] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  function loadStocks() {
    setLoading(true);
    api
      .get("/store/branch-stocks")
      .then((res) => {
        setData(res.data?.data || []);
        setBranches(res.data?.branches || []);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadStocks();
    // Default branch from current active shift
    api
      .get("/store/shift/current")
      .then((res) => {
        if (res.data?.data?.branch_id) {
          setToBranchId(res.data.data.branch_id);
        }
      })
      .catch(() => {});
  }, []);

  const categories = useMemo(() => {
    const defaultCats = [
      "Cinema & Mirrorless Cameras",
      "Cinema & Prime Lenses",
      "Gimbals & Camera Stabilizers",
      "Studio & Cinema Lighting",
      "Wireless & Broadcast Audio",
      "Monitors & Field Recorders",
    ];
    const dataCats = Array.from(new Set(data.map((d) => d.category).filter(Boolean)));
    const allUnique = Array.from(new Set([...defaultCats, ...dataCats]));
    return ["all", ...allUnique];
  }, [data]);

  const filtered = data.filter((item) => {
    const matchSearch =
      !search ||
      item.sku_code.toLowerCase().includes(search.toLowerCase()) ||
      item.product_name.toLowerCase().includes(search.toLowerCase()) ||
      item.variant_name.toLowerCase().includes(search.toLowerCase()) ||
      item.brand_name.toLowerCase().includes(search.toLowerCase());

    const matchCat = selectedCategory === "all" || item.category === selectedCategory;
    return matchSearch && matchCat;
  });

  function handleOpenTransferModal(variant) {
    setSelectedVariant(variant);
    setRequestQty(2);
    setRequestNotes(`Penambahan stok ${variant.sku_code} dari Gudang Pusat`);
    setTransferModalOpen(true);
    setSuccessMsg("");
  }

  function handleSubmitTransfer(e) {
    e.preventDefault();
    if (!selectedVariant) return;
    setSubmittingTransfer(true);

    api
      .post("/store/stock-transfers", {
        variant_id: selectedVariant.variant_id,
        to_branch_id: toBranchId,
        qty: parseInt(requestQty),
        notes: requestNotes,
      })
      .then((res) => {
        setSuccessMsg(res.data?.message || "Pengajuan transfer stok berhasil dikirim ke Gudang Pusat!");
        setTimeout(() => {
          setTransferModalOpen(false);
          setSuccessMsg("");
        }, 1500);
      })
      .catch((err) => {
        toast.error(err.response?.data?.message || "Gagal mengajukan transfer stok");
      })
      .finally(() => setSubmittingTransfer(false));
  }

  return (
    <div className="min-h-screen bg-canvas p-4 sm:p-6 lg:p-8 text-ink font-sans">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-sm bg-ink text-canvas">
            <Search size={18} aria-hidden="true" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-ink">
                Cek Ketersediaan Stok Lintas Showroom &amp; Gudang
              </h1>
              <Badge variant="neutral">
                <Lock size={10} className="mr-1 inline" aria-hidden="true" /> READ-ONLY STAFF
              </Badge>
            </div>
            <p className="text-xs text-ink-secondary mt-0.5">
              Matriks ketersediaan stok fisik real-time di Gudang Pusat dan 5 Cabang Showroom Focalpoint.pro
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={loadStocks}
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} aria-hidden="true" />
          <span>Segarkan Data</span>
        </Button>
      </div>

      {/* Search & Category Filter */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
          <input
            type="text"
            placeholder="Cari SKU, nama produk, brand Fender, Gibson, Taylor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ot-input w-full pl-10 pr-4 py-2 text-xs"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-sm text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? "bg-ink text-canvas"
                  : "bg-surface border border-line text-ink-secondary hover:bg-surface-muted hover:text-ink"
              }`}
            >
              {cat === "all" ? "Semua Kategori" : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Stock Matrix Table */}
      <div className="overflow-hidden rounded-md border border-line bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-ink">
            <thead className="bg-surface-muted border-b border-line text-[10px] font-bold uppercase tracking-wider text-ink-muted">
              <tr>
                <th className="px-4 py-3.5">Instrumen &amp; Varian SKU</th>
                <th className="px-4 py-3.5">Brand Principal</th>
                <th className="px-3 py-3.5 text-center bg-canvas text-ink border-x border-line">
                  Gudang Pusat (Cikarang)
                </th>
                <th className="px-3 py-3.5 text-center">Senayan City</th>
                <th className="px-3 py-3.5 text-center">PIK Avenue</th>
                <th className="px-3 py-3.5 text-center">Bandung</th>
                <th className="px-3 py-3.5 text-center">Surabaya</th>
                <th className="px-3 py-3.5 text-center">Bali</th>
                <th className="px-3 py-3.5 text-center font-bold">Total Stok</th>
                <th className="px-4 py-3.5 text-right">Aksi Permintaan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-ink-muted">
                    Memuat matriks stok multi-cabang...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-ink-muted">
                    Tidak ada instrumen yang cocok dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const getQty = (branchNameSnippet) => {
                    const b = (item.branch_stocks || []).find((s) =>
                      s.branch_name?.toLowerCase().includes(branchNameSnippet.toLowerCase())
                    );
                    return b ? b.stock : 0;
                  };

                  const whStock = getQty("cikarang");
                  const scStock = getQty("senayan");
                  const pikStock = getQty("pik");
                  const bdgStock = getQty("bandung");
                  const sbyStock = getQty("surabaya");
                  const baliStock = getQty("bali");

                  const renderBadge = (qty, isWh = false) => {
                    if (qty === 0) {
                      return <Badge variant="rose">0</Badge>;
                    }
                    if (qty <= 2 && !isWh) {
                      return <Badge variant="amber">{qty}</Badge>;
                    }
                    return (
                      <Badge variant={isWh ? "neutral" : "teal"}>
                        {qty}
                      </Badge>
                    );
                  };

                  return (
                    <tr key={item.variant_id} className="hover:bg-surface-muted/50 transition-colors tabular-nums">
                      {/* Name & SKU */}
                      <td className="px-4 py-3 max-w-[240px]">
                        <p className="font-bold text-ink truncate">{item.product_name}</p>
                        <p className="text-[11px] text-ink-secondary truncate mt-0.5">
                          {item.color_finish || item.variant_name}
                        </p>
                        <span className="font-mono text-[10px] text-ink-muted uppercase">{item.sku_code}</span>
                      </td>

                      {/* Brand */}
                      <td className="px-4 py-3 text-ink-secondary">
                        <span className="font-semibold text-ink">{item.brand_name}</span>
                        <p className="text-[10px] text-ink-muted">{formatRupiah(item.price)}</p>
                      </td>

                      {/* Central Warehouse */}
                      <td className="px-3 py-3 text-center bg-canvas/60 border-x border-line">
                        {renderBadge(whStock, true)}
                      </td>

                      {/* 5 Showrooms */}
                      <td className="px-3 py-3 text-center">{renderBadge(scStock)}</td>
                      <td className="px-3 py-3 text-center">{renderBadge(pikStock)}</td>
                      <td className="px-3 py-3 text-center">{renderBadge(bdgStock)}</td>
                      <td className="px-3 py-3 text-center">{renderBadge(sbyStock)}</td>
                      <td className="px-3 py-3 text-center">{renderBadge(baliStock)}</td>

                      {/* Total */}
                      <td className="px-3 py-3 text-center font-bold text-ink">
                        {item.total_stock} Unit
                      </td>

                      {/* Action Request */}
                      <td className="px-4 py-3 text-right">
                        <Button
                          type="button"
                          variant="secondary"
                          size="xs"
                          onClick={() => handleOpenTransferModal(item)}
                        >
                          <Truck size={12} aria-hidden="true" />
                          <span>Ajukan Restock</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL PENGAJUAN TRANSFER KE GUDANG PUSAT */}
      <Modal
        open={transferModalOpen && !!selectedVariant}
        onClose={() => setTransferModalOpen(false)}
        title="Ajukan Permintaan Stok ke Gudang"
        maxWidth="max-w-md"
      >
        {selectedVariant && (
          <div>
            {successMsg ? (
              <div className="py-6 text-center space-y-2">
                <CheckCircle2 size={36} className="mx-auto text-status-success" aria-hidden="true" />
                <p className="text-xs font-bold text-ink">{successMsg}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitTransfer} className="space-y-4 text-xs">
                {/* Target SKU Summary Card */}
                <div className="rounded-sm bg-canvas p-3.5 border border-line space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                    Instrumen yang Diminta
                  </span>
                  <p className="font-display font-bold text-ink">{selectedVariant.product_name}</p>
                  <p className="text-[11px] text-ink-secondary tabular-nums">
                    Varian: {selectedVariant.color_finish || selectedVariant.variant_name} ({selectedVariant.sku_code})
                  </p>
                  <p className="text-[10px] text-ink-muted font-medium pt-1">
                    Asal Distribusi: <strong className="text-ink">Gudang Pusat (Cikarang)</strong>
                  </p>
                </div>

                {/* Showroom Destination */}
                <div>
                  <label className="block font-bold text-ink mb-1">Showroom Cabang Tujuan</label>
                  <select
                    value={toBranchId}
                    onChange={(e) => setToBranchId(parseInt(e.target.value))}
                    className="ot-input w-full px-3 py-2 text-xs font-medium"
                  >
                    {branches
                      .filter((b) => b.branch_type !== "warehouse")
                      .map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.city})
                        </option>
                      ))}
                  </select>
                </div>

                {/* Qty */}
                <div>
                  <label className="block font-bold text-ink mb-1">Jumlah Unit yang Diminta</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={requestQty}
                    onChange={(e) => setRequestQty(e.target.value)}
                    className="ot-input w-full px-3 py-2 text-xs font-bold tabular-nums"
                    required
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block font-bold text-ink mb-1">Catatan Pengajuan</label>
                  <input
                    type="text"
                    value={requestNotes}
                    onChange={(e) => setRequestNotes(e.target.value)}
                    placeholder="Contoh: Stok display menipis, banyak peminat walk-in"
                    className="ot-input w-full px-3 py-2 text-xs"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setTransferModalOpen(false)}
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={submittingTransfer}
                  >
                    {submittingTransfer ? "Mengirim..." : "Kirim Pengajuan ke Gudang"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
