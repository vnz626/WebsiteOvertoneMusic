import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  FileCheck2,
  CheckCircle2,
  XCircle,
  Clock,
  Truck,
  Building2,
  Eye,
  X,
  Printer,
} from "lucide-react";
import api from "../../api";
import { formatRupiah, formatDate, errorMessage } from "../../utils/format";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";

export default function PoApproval() {
  const [pos, setPos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedPo, setSelectedPo] = useState(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadPurchaseOrders();
  }, []);

  async function loadPurchaseOrders() {
    setLoading(true);
    try {
      const res = await api.get("/po");
      const rawList = res.data?.data || [];
      const mapped = rawList.map((po) => ({
        ...po,
        supplier_name: po.supplier?.name || po.supplier_name || "Official Supplier",
        created_by: po.requester?.name || po.created_by || "Warehouse Staff",
        items_count: po.items?.length || 1,
        total_amount: Number(po.total_cost || po.total_amount || 0),
        payment_status:
          po.status === "paid" || po.status === "received" ? "paid" : "unpaid",
        items: po.items || [
          {
            id: po.id,
            product_name: po.product?.name || "Cinema Hardware",
            sku: po.tier?.sku_code || po.tier?.tier_name || "-",
            variant_name: po.tier?.variant_name || po.tier?.tier_name || "Standard",
            qty_ordered: po.quantity || 1,
            unit_cost: Number(po.unit_cost || 0),
            subtotal: Number(po.total_cost || 0),
          },
        ],
      }));
      setPos(mapped);
    } catch (err) {
      toast.error(errorMessage(err, "Gagal memuat daftar Purchase Order"));
    } finally {
      setLoading(false);
    }
  }

  function handleViewDetail(po) {
    setSelectedPo(po);
  }

  async function handleApproveOrReject(poId, action) {
    setProcessing(true);
    try {
      const res =
        action === "approve"
          ? await api.post(`/po/${poId}/approve`)
          : await api.post(`/po/${poId}/reject`, {
              reason: "Ditolak oleh Retail General Manager",
            });
      toast.success(res.data?.message || "Purchase Order berhasil diproses");
      setSelectedPo(null);
      await loadPurchaseOrders();
    } catch (err) {
      toast.error(errorMessage(err, "Gagal memproses persetujuan PO"));
    } finally {
      setProcessing(false);
    }
  }

  const filteredPos = pos.filter((p) => {
    if (statusFilter === "ALL") return true;
    if (statusFilter === "draft")
      return ["draft", "pending_approval", "pending"].includes(p.status);
    return p.status === statusFilter;
  });

  function getStatusVariant(status) {
    switch (status) {
      case "draft":
      case "pending":
      case "pending_approval":
        return "warning";
      case "approved":
      case "paid":
      case "sent_to_supplier":
        return "info";
      case "received":
        return "success";
      case "rejected":
      case "cancelled":
        return "danger";
      default:
        return "neutral";
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      {/* HEADER */}
      <div className="flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-accent">
            Procurement Approval Gate
          </span>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Otorisasi &amp; Persetujuan Purchase Order (PO)
          </h1>
          <p className="mt-1 text-xs text-ink-secondary sm:text-sm">
            Tinjau dan setujui pengajuan restock cinema gear dari staf gudang maupun hasil
            simulasi DSS TOPSIS.
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {[
            { id: "ALL", label: "Semua PO" },
            { id: "draft", label: "Menunggu Persetujuan" },
            { id: "approved", label: "Disetujui (Siap Kirim)" },
            { id: "received", label: "Barang Diterima" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`rounded-sm px-3.5 py-2 text-xs font-semibold transition-colors ${
                statusFilter === tab.id
                  ? "bg-ink text-canvas"
                  : "border border-line bg-surface text-ink-secondary hover:border-line-strong hover:text-ink"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* TABEL PO */}
      <div className="overflow-hidden rounded-md border border-line bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-line bg-surface-muted text-[11px] font-bold uppercase tracking-wider text-ink-muted">
              <tr>
                <th className="px-4 py-3.5">Nomor PO</th>
                <th className="px-4 py-3.5">Supplier / Brand</th>
                <th className="px-4 py-3.5">Tanggal</th>
                <th className="px-4 py-3.5 text-center">Jumlah Item</th>
                <th className="px-4 py-3.5 text-right">Total Nilai PO</th>
                <th className="px-4 py-3.5 text-center">Status Pembayaran</th>
                <th className="px-4 py-3.5 text-center">Status PO</th>
                <th className="px-4 py-3.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-ink-muted">
                    Memuat dokumen Purchase Order...
                  </td>
                </tr>
              ) : filteredPos.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-ink-muted">
                    Tidak ada dokumen Purchase Order pada filter ini.
                  </td>
                </tr>
              ) : (
                filteredPos.map((po) => (
                  <tr key={po.id} className="hover:bg-surface-muted/50">
                    <td className="px-4 py-3.5 font-mono font-bold text-ink tabular-nums">
                      {po.po_number}
                    </td>
                    <td className="px-4 py-3.5 font-bold text-ink">{po.supplier_name}</td>
                    <td className="px-4 py-3.5 text-ink-secondary tabular-nums">
                      {formatDate(po.created_at)}
                    </td>
                    <td className="px-4 py-3.5 text-center font-bold text-ink tabular-nums">
                      {po.quantity || po.items_count} unit
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-ink tabular-nums">
                      {formatRupiah(po.total_amount)}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <Badge variant={po.payment_status === "paid" ? "success" : "warning"}>
                        {po.payment_status === "paid" ? "LUNAS" : "BELUM DIBAYAR"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <Badge variant={getStatusVariant(po.status)}>
                        {po.status.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <Button
                        variant="secondary"
                        size="xs"
                        onClick={() => handleViewDetail(po)}
                      >
                        <Eye size={13} aria-hidden="true" />
                        Periksa &amp; Otorisasi
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DETAIL & APPROVAL PO */}
      <Modal
        open={Boolean(selectedPo)}
        onClose={() => setSelectedPo(null)}
        title={selectedPo ? selectedPo.po_number : "Detail Purchase Order"}
        size="lg"
      >
        {selectedPo && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3 text-xs text-ink-secondary">
              <span>
                Supplier: <b className="text-ink">{selectedPo.supplier_name}</b>
              </span>
              <span>
                Diajukan oleh: <b className="text-ink">{selectedPo.created_by}</b>
              </span>
            </div>

            {selectedPo.notes && (
              <div className="rounded-sm border border-line bg-surface-muted p-3 text-xs text-ink-secondary">
                <b className="text-ink">Catatan Pengajuan:</b> {selectedPo.notes}
              </div>
            )}

            <div className="max-h-72 overflow-y-auto rounded-sm border border-line">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-line bg-surface-muted text-[11px] font-bold text-ink-muted">
                  <tr>
                    <th className="p-3">SKU &amp; Cinema Hardware</th>
                    <th className="p-3 text-center">Qty Pesan</th>
                    <th className="p-3 text-right">Harga Beli Unit</th>
                    <th className="p-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line tabular-nums">
                  {(selectedPo.items || []).map((item) => (
                    <tr key={item.id}>
                      <td className="p-3">
                        <p className="font-bold text-ink">{item.product_name}</p>
                        <p className="font-mono text-[11px] text-ink-muted">
                          {item.sku} • {item.variant_name}
                        </p>
                      </td>
                      <td className="p-3 text-center font-bold text-ink">
                        {item.qty_ordered} unit
                      </td>
                      <td className="p-3 text-right font-mono text-ink-secondary">
                        {formatRupiah(item.unit_cost)}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-ink">
                        {formatRupiah(item.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="tabular-nums">
                <span className="text-xs text-ink-muted">Total Nilai Otorisasi PO:</span>
                <p className="font-display text-xl font-bold text-ink">
                  {formatRupiah(selectedPo.total_amount)}
                </p>
              </div>

              {["draft", "pending", "pending_approval"].includes(selectedPo.status) ? (
                <div className="flex items-center gap-2">
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={processing}
                    onClick={() => handleApproveOrReject(selectedPo.id, "reject")}
                  >
                    <XCircle size={15} aria-hidden="true" />
                    Tolak PO
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={processing}
                    onClick={() => handleApproveOrReject(selectedPo.id, "approve")}
                  >
                    <CheckCircle2 size={15} aria-hidden="true" />
                    Setujui &amp; Teruskan ke Finance
                  </Button>
                </div>
              ) : (
                <Badge variant="info">
                  Status Saat Ini: {selectedPo.status.toUpperCase()}
                </Badge>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
