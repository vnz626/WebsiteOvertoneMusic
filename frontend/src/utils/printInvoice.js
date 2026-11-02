import toast from "react-hot-toast";
import { formatRupiah, formatDate } from "./format";

/**
 * Membuka jendela print browser dengan tata letak dokumen formal
 * Faktur Penjualan / E-Invoice Resmi Overtone Music Store.
 */
export function printInvoice(order) {
  if (!order) return;

  const invoiceCode = order.invoice_code || "INV-SWL-000";
  const dateStr = formatDate(order.paid_at || order.created_at || new Date().toISOString());
  const buyerName = order.buyer_name || order.customer?.name || "Pelanggan Filmmaker";
  const buyerEmail = order.buyer_email || order.customer?.email || "-";
  const buyerPhone = order.buyer_phone || order.customer?.phone || "-";
  const isPaid = order.payment_status === "paid";
  const isRefunded = order.order_status === "refunded";

  const isDelivery = order.fulfillment_method === "delivery";
  const pickupCode = order.pickup_code || order.ticket_code || "-";
  const branchName = order.pickup_branch?.name || order.branch?.name || "Overtone Pro Cinema Store — Senayan City";
  const branchAddress = order.pickup_branch?.address || order.branch?.address || "Senayan City Mall Lt. 3, Jakarta Pusat";
  const courier = order.shipping_courier || "JNE Trucking (Packing Kayu Anti-Statis & Asuransi)";
  const resi = order.tracking_number || "Sedang Persiapan / Quality Check";
  const address = order.shipping_address || "-";

  const productName = order.product?.name || "Kamera & Cinema Gear Overtone";
  const brandName = order.product?.brand?.name || order.product?.organizer || "Official Brand Principal";
  const variantName = order.variant?.variant_name || order.tier_name || order.variant_name || "Standard Production";
  const skuCode = order.variant?.sku_code || order.product?.sku_prefix || "-";
  const bodySerial = order.serial_number || `SN-${skuCode.replace(/[^A-Z0-9]/g, "")}-B${Math.floor(1000 + Math.random() * 9000)}`;
  const lensSerial = `SN-LENS-${Math.floor(10000 + Math.random() * 90000)}`;
  const qty = order.quantity || 1;
  const totalPrice = order.total_price || 0;
  const unitPrice = qty > 0 ? totalPrice / qty : totalPrice;

  const printWindow = window.open("", "_blank", "width=850,height=1000");
  if (!printWindow) {
    toast.error("Pop-up diblokir oleh browser. Izinkan pop-up untuk mencetak E-Invoice PDF.");
    return;
  }

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Invoice Resmi - ${invoiceCode} - Overtone Pro Cinema Store</title>
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
    .inv-number { font-family: monospace; font-size: 13px; font-weight: 800; color: #1F2937; margin-top: 2px; }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 9999px; font-size: 10px; font-weight: 800; text-transform: uppercase; margin-top: 6px; }
    .badge-paid { background: #D1FAE5; color: #065F46; border: 1px solid #A7F3D0; }
    .badge-refund { background: #FEE2E2; color: #991B1B; border: 1px solid #FECACA; }
    .badge-pending { background: #FEF3C7; color: #92400E; border: 1px solid #FDE68A; }
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
    .total-table { width: 320px; border: none; margin-bottom: 0; }
    .total-table td { padding: 5px 8px; border: none; }
    .total-grand { font-size: 15px; font-weight: 900; color: #111827; border-top: 2px solid #111827 !important; padding-top: 8px !important; }
    .notes-box { border: 1px dashed #D1D5DB; border-radius: 8px; padding: 12px 14px; font-size: 11px; color: #4B5563; margin-bottom: 24px; line-height: 1.5; }
    .footer-stamps { display: flex; justify-content: space-between; align-items: flex-end; padding-top: 10px; }
    .stamp-box { border: 2px solid #059669; color: #059669; padding: 6px 12px; border-radius: 8px; text-align: center; font-weight: 900; font-size: 10px; letter-spacing: 0.5px; text-transform: uppercase; display: inline-block; transform: rotate(-3deg); }
    .sign-box { text-align: right; font-size: 11px; color: #6B7280; }
    .sign-line { width: 170px; border-bottom: 1px solid #9CA3AF; margin: 40px 0 6px auto; }
    .btn-print { background: #111827; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: bold; cursor: pointer; margin-bottom: 16px; }
    @media print {
      .btn-print { display: none; }
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div style="text-align: right;">
    <button class="btn-print" onclick="window.print()">🖨️ Cetak Invoice (Print / Save as PDF)</button>
  </div>

  <div class="header">
    <div>
      <div class="brand-title">OVERTONE PRO CINEMA</div>
      <div class="brand-sub">PT OVERTONE RETAIL NUSANTARA — PRO CINEMA &amp; BROADCAST GEAR</div>
      <div class="corp-info">
        Senayan City Mall Lt. 3, Jl. Asia Afrika No. 19, Jakarta Pusat 10270<br>
        NPWP: 01.345.678.9-021.000 | Email: billing@overtone.id | Telp: (021) 7278-1001
      </div>
    </div>
    <div class="doc-meta">
      <div class="doc-type">BUKTI TRANSAKSI / E-INVOICE</div>
      <div class="inv-number">${invoiceCode}</div>
      <div style="font-size: 11px; color: #6B7280; margin-top: 2px;">Tanggal: ${dateStr}</div>
      <div>
        ${
          isRefunded
            ? '<span class="badge badge-refund">REFUND SELESAI</span>'
            : isPaid
            ? '<span class="badge badge-paid">LUNAS / PAID</span>'
            : '<span class="badge badge-pending">MENUNGGU PEMBAYARAN</span>'
        }
      </div>
    </div>
  </div>

  <div class="grid-2">
    <div class="info-box">
      <h3>Data Pembeli / Filmmaker</h3>
      <div class="info-row"><span class="info-label">Nama Pelanggan</span><span class="info-value">${buyerName}</span></div>
      <div class="info-row"><span class="info-label">Alamat Email</span><span class="info-value">${buyerEmail}</span></div>
      <div class="info-row"><span class="info-label">Nomor Kontak / WhatsApp</span><span class="info-value">${buyerPhone}</span></div>
      <div class="info-row"><span class="info-label">Metode Pembayaran</span><span class="info-value">BCA Virtual Account / Direct Gateway</span></div>
    </div>

    <div class="info-box">
      <h3>Metode Pemenuhan (Fulfillment)</h3>
      ${
        isDelivery
          ? `
          <div class="info-row"><span class="info-label">Metode</span><span class="info-value">Ekspedisi Kurir (Logistik)</span></div>
          <div class="info-row"><span class="info-label">Kurir Pengiriman</span><span class="info-value">${courier}</span></div>
          <div class="info-row"><span class="info-label">Nomor Resi / AWB</span><span class="info-value" style="font-family: monospace;">${resi}</span></div>
          <div class="info-row"><span class="info-label">Alamat Pengiriman</span><span class="info-value" style="max-width: 200px;">${address}</span></div>
        `
          : `
          <div class="info-row"><span class="info-label">Metode</span><span class="info-value">Click &amp; Collect (Ambil di Showroom)</span></div>
          <div class="info-row"><span class="info-label">Cabang Showroom</span><span class="info-value">${branchName}</span></div>
          <div class="info-row"><span class="info-label">Alamat Showroom</span><span class="info-value" style="max-width: 200px;">${branchAddress}</span></div>
          <div class="info-row"><span class="info-label">Kode Ambil (Pickup Pass)</span><span class="info-value" style="font-family: monospace; color: #8F834B; font-size: 13px;">${pickupCode}</span></div>
        `
      }
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 5%;">No</th>
        <th style="width: 50%;">Rincian Cinema Hardware &amp; Identitas S/N</th>
        <th style="width: 15%; text-align: center;">Brand Resmi</th>
        <th style="width: 8%; text-align: center;">Qty</th>
        <th style="width: 22%; text-align: right;">Subtotal (IDR)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="text-center" style="font-weight: bold;">1</td>
        <td>
          <div style="font-weight: 800; color: #111827; font-size: 13px;">${productName}</div>
          <div style="font-size: 11px; color: #4B5563;">Varian / Finishing: <strong>${variantName}</strong></div>
          <div style="font-size: 10px; font-family: monospace; color: #6B7280; margin-top: 2px;">
            SKU: ${skuCode} &bull; Camera Body S/N: <strong style="color: #111;">${bodySerial}</strong> &bull; Lens S/N: <strong style="color: #111;">${lensSerial}</strong>
          </div>
          <div style="font-size: 10px; color: #059669; margin-top: 3px;">✓ Dilindungi Garansi Resmi Distributor &amp; Gratis 10-Point Sensor Calibration QC</div>
        </td>
        <td class="text-center" style="font-weight: 600;">${brandName}</td>
        <td class="text-center" style="font-weight: 800;">${qty}</td>
        <td class="text-right" style="font-weight: 800; font-family: monospace;">${formatRupiah(totalPrice)}</td>
      </tr>
    </tbody>
  </table>

  <div class="total-box">
    <table class="total-table">
      <tr>
        <td class="info-label">Subtotal Peralatan Cinema</td>
        <td class="text-right info-value">${formatRupiah(totalPrice)}</td>
      </tr>
      <tr>
        <td class="info-label">Biaya Proteksi Packing Kayu Anti-Statis &amp; Asuransi</td>
        <td class="text-right info-value" style="color: #059669;">Rp 0 (Complimentary)</td>
      </tr>
      <tr>
        <td class="info-label">PPN 11% (Termasuk)</td>
        <td class="text-right info-value">Termasuk</td>
      </tr>
      <tr>
        <td class="total-grand">Total Pembayaran</td>
        <td class="text-right total-grand" style="color: #8F834B;">${formatRupiah(totalPrice)}</td>
      </tr>
    </table>
  </div>

  <div class="notes-box">
    <strong>Ketentuan Garansi &amp; Pengembalian Barang:</strong><br>
    1. Seluruh kamera cinema, lensa, gimbal, dan perangkat broadcast yang dibeli di Overtone Store dilindungi garansi resmi distributor 12 hingga 24 bulan untuk komponen sensor, motherboard, motor fokus, dan optik.<br>
    2. Apabila unit mengalami kendala teknis saat diterima, filmmaker berhak mengajukan klaim garansi / retur dalam kurun waktu <strong>7 hari</strong> setelah barang diterima melalui menu <em>Klaim Retur / Garansi</em> pada akun Anda.<br>
    3. Simpan dokumen invoice ini sebagai bukti kepemilikan sah saat melakukan kalibrasi sensor atau pembersihan berkala di Cleanroom Tech Bench seluruh jaringan showroom resmi Overtone.
  </div>

  <div class="footer-stamps">
    <div>
      <div class="stamp-box">
        PT OVERTONE RETAIL NUSANTARA<br>
        ✓ VERIFIED TRANSACTION<br>
        ELECTRONIC BILLING
      </div>
    </div>
    <div class="sign-box">
      <div>Jakarta, ${dateStr}</div>
      <div>Authorized Finance Controller,</div>
      <div class="sign-line"></div>
      <div style="font-weight: bold; color: #111827;">PT Overtone Retail Nusantara</div>
    </div>
  </div>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
