import toast from "react-hot-toast";
import { formatRupiah, formatDate } from "./format";

/**
 * Membuka jendela print browser dengan tata letak dokumen formal
 * Purchase Order (PO) B2B Resmi PT Overtone Retail Nusantara.
 */
export function printPurchaseOrder(po) {
  if (!po) return;

  const poNumber = po.po_number || `PO-OVT-202610-${po.id || "001"}`;
  const dateStr = formatDate(po.created_at || new Date().toISOString());
  const supplierName = po.supplier?.name || "Official Cinema Brand Principal / Distributor";
  const supplierDesc = po.supplier?.description || "Authorized Cinema Cameras & Broadcast Equipment Distributor";
  const supplierEmail = po.supplier?.contact_email || "supply@distributor.com";
  const supplierPhone = po.supplier?.contact_phone || "+62-21-500-CINEMA";
  const destBranch = po.destination_branch?.name || "Overtone Central Distribution Center - Cikarang";
  const destAddress = po.destination_branch?.address || "Kawasan Industri MM2100 Blok C-10, Cikarang Barat, Bekasi";

  const productName = po.product?.name || "Kamera & Cinema Hardware";
  const variantName = po.variant?.variant_name || "Standard Production SKU";
  const skuCode = po.variant?.sku_code || po.product?.sku_prefix || "SKU-OVERTONE-01";
  const qty = po.quantity || 1;
  const unitCost = po.unit_cost || 0;
  const totalCost = po.total_cost || (qty * unitCost);

  const statusLabel =
    po.status === "received"
      ? "BARANG TELAH DITERIMA (RECEIVED)"
      : po.status === "paid"
      ? "LUNAS DIBAYAR FINANCE (PAID)"
      : po.status === "approved"
      ? "DISETUJUI MANAGER (APPROVED)"
      : "MENUNGGU PERSETUJUAN (SUBMITTED)";

  const printWindow = window.open("", "_blank", "width=850,height=1000");
  if (!printWindow) {
    toast.error("Pop-up diblokir browser. Izinkan pop-up untuk mencetak dokumen Purchase Order PDF.");
    return;
  }

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Purchase Order - ${poNumber} - PT Overtone Retail Nusantara</title>
  <style>
    @page { size: A4 portrait; margin: 15mm 20mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #111827; background: #fff; margin: 0; padding: 20px; font-size: 13px; line-height: 1.5; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #111827; padding-bottom: 16px; margin-bottom: 20px; }
    .brand-title { font-size: 20px; font-weight: 900; letter-spacing: -0.5px; text-transform: uppercase; color: #111; }
    .brand-sub { font-size: 11px; font-weight: 700; color: #8F834B; letter-spacing: 0.5px; }
    .corp-info { font-size: 11px; color: #4B5563; margin-top: 4px; line-height: 1.4; }
    .doc-meta { text-align: right; }
    .doc-type { font-size: 18px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #111827; }
    .po-number { font-family: monospace; font-size: 14px; font-weight: 800; color: #8F834B; margin-top: 2px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 10px; font-weight: 800; text-transform: uppercase; margin-top: 6px; }
    .badge-approved { background: #DBEAFE; color: #1E40AF; border: 1px solid #BFDBFE; }
    .badge-paid { background: #D1FAE5; color: #065F46; border: 1px solid #A7F3D0; }
    .badge-received { background: #EDE9FE; color: #5B21B6; border: 1px solid #DDD6FE; }
    .badge-submitted { background: #FEF3C7; color: #92400E; border: 1px solid #FDE68A; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
    .info-box { background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 12px 14px; }
    .info-box h3 { margin: 0 0 8px 0; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; color: #6B7280; border-bottom: 1px solid #E5E7EB; padding-bottom: 4px; }
    .info-row { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 11px; }
    .info-label { color: #6B7280; font-weight: 500; }
    .info-value { color: #111827; font-weight: 700; text-align: right; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th { background: #111827; color: #ffffff; text-align: left; padding: 9px 12px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; }
    td { padding: 11px 12px; border-bottom: 1px solid #E5E7EB; font-size: 12px; vertical-align: top; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .total-box { display: flex; justify-content: flex-end; margin-bottom: 24px; }
    .total-table { width: 340px; border: none; margin-bottom: 0; }
    .total-table td { padding: 5px 8px; border: none; }
    .total-grand { font-size: 15px; font-weight: 900; color: #111827; border-top: 2px solid #111827 !important; padding-top: 8px !important; }
    .notes-box { border: 1px dashed #D1D5DB; border-radius: 8px; padding: 12px 14px; font-size: 11px; color: #4B5563; margin-bottom: 28px; line-height: 1.5; }
    .sign-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-top: 20px; text-align: center; }
    .sign-card { border: 1px solid #E5E7EB; border-radius: 8px; padding: 12px; background: #FAFAFA; }
    .sign-role { font-size: 10px; font-weight: 800; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 35px; }
    .sign-name { font-weight: 800; font-size: 12px; color: #111827; border-top: 1px solid #9CA3AF; padding-top: 4px; }
    .sign-dept { font-size: 10px; color: #6B7280; }
    .btn-print { background: #111827; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: bold; cursor: pointer; margin-bottom: 16px; }
    @media print {
      .btn-print { display: none; }
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div style="text-align: right;">
    <button class="btn-print" onclick="window.print()">Cetak Dokumen PO (Print / Save as PDF)</button>
  </div>

  <div class="header">
    <div>
      <div class="brand-title">PT OVERTONE RETAIL NUSANTARA</div>
      <div class="brand-sub">PROCUREMENT &amp; SUPPLY CHAIN DEPARTMENT</div>
      <div class="corp-info">
        Headquarters: Senayan City Mall Lt. 3, Jl. Asia Afrika No. 19, Jakarta Pusat 10270<br>
        NPWP: 01.345.678.9-021.000 | Email: procurement@overtone.id | Telp: (021) 7278-1001
      </div>
    </div>
    <div class="doc-meta">
      <div class="doc-type">PURCHASE ORDER (PO)</div>
      <div class="po-number">${poNumber}</div>
      <div style="font-size: 11px; color: #6B7280; margin-top: 2px;">Tanggal Terbit: ${dateStr}</div>
      <div>
        <span class="badge ${
          po.status === "received"
            ? "badge-received"
            : po.status === "paid"
            ? "badge-paid"
            : po.status === "approved"
            ? "badge-approved"
            : "badge-submitted"
        }">
          ${statusLabel}
        </span>
      </div>
    </div>
  </div>

  <div class="grid-2">
    <div class="info-box">
      <h3>Vendor / Supplier Resmi</h3>
      <div class="info-row"><span class="info-label">Nama Vendor / Brand</span><span class="info-value">${supplierName}</span></div>
      <div class="info-row"><span class="info-label">Badan Usaha</span><span class="info-value">${supplierDesc}</span></div>
      <div class="info-row"><span class="info-label">Email Kontak</span><span class="info-value">${supplierEmail}</span></div>
      <div class="info-row"><span class="info-label">Nomor Telepon</span><span class="info-value">${supplierPhone}</span></div>
    </div>

    <div class="info-box">
      <h3>Tujuan Pengiriman Gudang</h3>
      <div class="info-row"><span class="info-label">Lokasi Penerimaan</span><span class="info-value">${destBranch}</span></div>
      <div class="info-row"><span class="info-label">Alamat Bongkar Muat</span><span class="info-value" style="max-width: 220px;">${destAddress}</span></div>
      <div class="info-row"><span class="info-label">Metode Delivery</span><span class="info-value">Dedicated Cargo / Wood Palletized</span></div>
      <div class="info-row"><span class="info-label">Syarat Pembayaran</span><span class="info-value">Net 30 / Transfer Bank Pasca Approval</span></div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 5%;">No</th>
        <th style="width: 45%;">Deskripsi Instrumen &amp; Varian SKU</th>
        <th style="width: 15%; text-align: center;">Kode SKU</th>
        <th style="width: 10%; text-align: center;">Qty (Unit)</th>
        <th style="width: 25%; text-align: right;">Total Nilai PO (IDR)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="text-center" style="font-weight: bold;">1</td>
        <td>
          <div style="font-weight: 800; color: #111827; font-size: 13px;">${productName}</div>
          <div style="font-size: 11px; color: #4B5563;">Varian / Finishing: <strong>${variantName}</strong></div>
          <div style="font-size: 10px; color: #6B7280; margin-top: 3px;">Brand Principal: ${supplierName}</div>
        </td>
        <td class="text-center" style="font-family: monospace; font-weight: 600;">${skuCode}</td>
        <td class="text-center" style="font-weight: 800; font-size: 13px;">${qty} Unit</td>
        <td class="text-right" style="font-weight: 800; font-family: monospace; font-size: 13px;">${formatRupiah(totalCost)}</td>
      </tr>
    </tbody>
  </table>

  <div class="total-box">
    <table class="total-table">
      <tr>
        <td class="info-label">Subtotal Nilai Pengadaan</td>
        <td class="text-right info-value">${formatRupiah(totalCost)}</td>
      </tr>
      <tr>
        <td class="info-label">Pajak Pertambahan Nilai (PPN 11%)</td>
        <td class="text-right info-value" style="color: #6B7280;">Sesuai Faktur Pajak Vendor</td>
      </tr>
      <tr>
        <td class="total-grand">Total Tagihan PO</td>
        <td class="text-right total-grand" style="color: #8F834B;">${formatRupiah(totalCost)}</td>
      </tr>
    </table>
  </div>

  <div class="notes-box">
    <strong>Instruksi &amp; Ketentuan Pengiriman Barang:</strong><br>
    1. Surat Jalan &amp; Faktur Tagihan asli wajib dilampirkan bersama unit fisik instrumen saat tiba di gerbang logistik gudang.<br>
    2. Seluruh unit instrumen wajib menggunakan kemasan karton asli pabrikan lengkap dengan serial number yang terbaca jelas.<br>
    3. Penerimaan resmi (Goods Receipt) hanya diakui setelah tim QC Warehouse Overtone menandatangani berita acara serah terima.<br>
    ${po.notes ? `4. Catatan Khusus Pengadaan: <em>${po.notes}</em>` : ""}
  </div>

  <div class="sign-grid">
    <div class="sign-card">
      <div class="sign-role">Diajukan Oleh (Requester)</div>
      <div class="sign-name">${po.requester_name || "Warehouse Lead"}</div>
      <div class="sign-dept">Warehouse &amp; Inventory Lead</div>
    </div>
    <div class="sign-card">
      <div class="sign-role">Disetujui Oleh (Approver)</div>
      <div class="sign-name">${po.approver_name || "General Manager"}</div>
      <div class="sign-dept">Retail General Manager</div>
    </div>
    <div class="sign-card">
      <div class="sign-role">Pelunasan (Settlement)</div>
      <div class="sign-name">${po.payer_name || "Finance Controller"}</div>
      <div class="sign-dept">Finance &amp; Treasury Controller</div>
    </div>
  </div>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
