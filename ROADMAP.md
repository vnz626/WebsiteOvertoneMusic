# Developer Notes: Roadmap Fitur Overtone Music Store

Versi 1.0 · 22 Oktober 2026 · Backend Flask + SQLAlchemy + MySQL · Frontend React + Vite + Tailwind

## 0. Ruang Lingkup

**Dikerjakan:** semua fitur customer dan internal yang sudah disetujui dari analisis fitur.

**Tidak dikerjakan:** Hutang Dagang (AP) aging, Supplier Scorecard, 2FA staf.

Dampaknya:

- DSS tetap 5 kriteria (C1–C5), tanpa kriteria baru dari scorecard supplier.
- Tanpa 2FA, keamanan login internal ditutup dengan rate limit, lockout, dan audit log (lihat 1.8).

## 1. Konvensi Umum

- **Database:** tabel baru wajib ber-prefix subsistem (`oas__`, `kms__`, `tps__`, `mis__`, `dss__`), utf8mb4, ada `created_at` dan `updated_at`. Uang selalu `DECIMAL(15,2)`, tidak boleh float. Waktu disimpan UTC, ditampilkan Asia/Jakarta.
- **Migrasi:** satu skrip per fitur `backend/migrate_<fitur>.py` yang idempotent (cek tabel/kolom sebelum CREATE/ALTER), mengikuti pola `migrate_kms_dual_scope.py`. Data awal di `seed_<fitur>.py`. Disarankan adopsi Flask-Migrate sebelum Fase 2 karena jumlah tabel bertambah banyak.
- **Backend:** satu blueprint per domain di `backend/app/api/`, model di `models/models.py` (MIS di `mis_models.py`), RBAC lewat validator di `security.py`. Ikuti format response endpoint yang sudah ada. Semua kalkulasi harga, diskon, pajak, dan stok dilakukan di backend; frontend hanya menampilkan.
- **Mutasi stok** hanya lewat satu service `stock_service` (dibuat di Fase 2) yang menulis `tps__inventory_logs`. Dilarang update qty langsung dari endpoint.
- **Aksi sensitif** (harga, role, approval, bayar, refund, adjustment stok, clearance) wajib memanggil `audit.log_action()` setelah 1.1 selesai.
- **Frontend:** halaman di `frontend/src/pages/<role>/`, rute di `App.jsx` dibungkus `ProtectedRoute`, menu internal ditambah di drawer `InternalLayout` sesuai role. Pakai komponen `components/ui`, mode light, Plus Jakarta Sans/Inter. Setiap halaman wajib punya state loading (Skeleton), kosong, dan error.
- **Rahasia** (kunci gateway, SMTP, WhatsApp) hanya di `.env`, tidak masuk repo.
- **Definition of Done tiap fitur:** migrasi + seeder, endpoint dengan validasi dan RBAC, UI lengkap tiga state, audit log, README diperbarui (endpoint, rute, tabel), diuji manual dengan akun demo yang relevan.

## 2. Ringkasan Fase

| Fase | Tema | Fitur | Prasyarat |
| --- | --- | --- | --- |
| 1 | Fondasi bisnis & kontrol | 1.1–1.8 | Tidak ada |
| 2 | Operasional showroom & gudang | 2.0–2.8 | Fase 1 (audit log, notifikasi, gateway) |
| 3 | Pertumbuhan pelanggan | 3.1–3.9 | Fase 1 (notifikasi), Fase 2 (stok per cabang, serial) |
| 4 | Analitik & optimasi | 4.1–4.4 | Fase 2–3 (data transaksi sudah terkumpul) |

Estimasi relatif per fitur: **S** ≤ 2 hari, **M** 3–5 hari, **L** 1–2 minggu (1 developer fullstack).

## 3. Keputusan yang Harus Diambil Sebelum Mulai

- **Payment gateway:** Midtrans atau Xendit (pilih satu, bungkus di `providers/payment.py`).
- **Provider WhatsApp:** API resmi WhatsApp Business atau agregator (mis. Fonnte); bungkus di `providers/whatsapp.py` agar bisa diganti.
- **Penyimpanan file** (foto retur, review, trade-in, servis): disk lokal `uploads/` atau S3-compatible. Bungkus di `storage.py` sejak awal.
- **Job background:** mulai dengan APScheduler (tanpa infrastruktur tambahan). Pindah ke Celery + Redis bila volume notifikasi besar.
- **Metode HPP** saat barang masuk: rekomendasi moving average; konfirmasi ke Finance.
- **Harga katalog sudah termasuk PPN atau belum** (menentukan perhitungan di 2.7).

---

# FASE 1: Fondasi Bisnis & Kontrol

Tujuan: pembayaran nyata, komunikasi ke pelanggan, jejak audit, dan infrastruktur yang dipakai fitur lain.

## 1.1 Audit Log (M)

**Backend**

- Tabel `oas__audit_logs`: id, actor_type (staff/customer/system), actor_id, actor_role, action, entity_type, entity_id, before_json, after_json, ip, user_agent, created_at. Index `(entity_type, entity_id)` dan `(actor_id, created_at)`.
- Helper `app/audit.py` dengan `log_action(action, entity_type, entity_id, before=None, after=None)` yang mengambil actor dari JWT dan IP dari request.
- Pasang di: ubah produk/harga, apply/remove clearance, ubah role, suspend/aktifkan akun, approve PO, bayar PO, refund, adjustment stok, login internal (sukses dan gagal), ekspor data.
- Endpoint (super_admin): `GET /api/admin/audit-logs` (filter actor, action, entity, rentang tanggal, paginasi) dan `GET /api/admin/audit-logs/export` (CSV).
- Append-only: tidak ada endpoint update atau delete.

**Frontend**

- Halaman `/admin/audit-logs`: tabel dengan filter, modal detail yang menampilkan diff before/after, tombol ekspor. Tambahkan ke drawer super_admin.

**Selesai bila:** mengubah harga produk dan approve PO langsung muncul di audit log lengkap dengan nilai sebelum dan sesudah.

## 1.2 Notification Center (M) - [SELESAI]

**Backend**

- Tabel `oas__notifications` sudah diperluas dengan kolom: `recipient_type`, `recipient_id`, `recipient_role`, `type`, `title`, `body`, `link`, `is_read`, `read_at`, `dedupe_key`.
- Service `notify(recipient, type, title, body, link, dedupe_key=None)` di `backend/app/notifications.py` dengan deduplikasi 24 jam.
- Event awal aktif: PO menunggu approval (`notify_po_pending_approval` ke manager), stok kritis (`notify_low_stock` ke gudang), antrean live chat (`notify_live_chat_queue` ke toko), refund diajukan (`notify_refund_submitted` ke finance & toko), dan update status pesanan ke customer.
- Endpoints: `GET /api/notifications`, `GET /api/notifications/unread-count`, `POST /api/notifications/<id>/read`, `POST /api/notifications/read-all`, `POST /api/notifications/test-trigger`.

**Frontend**

- Komponen `NotificationBell` terpasang di topbar drawer `InternalLayout` dan Navbar publik. Polling unread count tiap 30 detik.
- Halaman riwayat `/notifications` dengan filter tab (Semua, Belum Dibaca, Stok Gudang, Approval PO, Status Pesanan, Support & Chat, Refund).

**Selesai bila:** staf gudang menerima notifikasi otomatis saat stok varian turun di bawah batas minimal, dan klik notifikasi membuka halaman terkait. (Teruji: Verified)

## 1.3 Notifikasi Pesanan & Tracking (Email + WhatsApp) (M) - [SELESAI]

**Backend**

- Tabel `oas__notification_outbox`: channel (email/whatsapp), to_address, template_key, payload_json, status (pending/sent/failed), attempts, last_error, scheduled_at, sent_at.
- Worker outbox mandiri di `backend/app/services/outbox_service.py` dengan retry maksimal 3 kali. Provider WhatsApp di `backend/app/providers/whatsapp.py` (simulasi dev & integrasi API).
- Template di `backend/app/services/notif_templates.py`: HTML email editorial dan teks WhatsApp untuk trigger `order_created`, `payment_confirmed`, `packed`, `shipped` (nomor resi), `ready_for_pickup` (pickup code), `picked_up`, dan `refund_processed`.
- Tabel `tps__order_status_history`: order_id, status, note, actor, created_at. Dicatat otomatis setiap terjadi mutasi status pesanan.
- Endpoints: `GET /api/orders/<invoice_code>/timeline` (login) dan `GET /api/orders/track?invoice=&contact=` (tamu publik).
- Kolom preferensi notifikasi `notify_email`, `notify_whatsapp` di `tps__customers` & endpoint `PUT /api/auth/profile`.

**Frontend**

- Halaman `/orders/:invoice` dengan stepper timeline dan link/salin resi kurir. Halaman `/track` publik untuk tamu.
- Tombol "Lacak Timeline" di kartu pesanan `/orders` (`MyTickets.jsx`).
- Toggle preferensi notifikasi email & WhatsApp di `ProfileModal`.

**Selesai bila:** order dibuat sampai dikirim menghasilkan email dan WA yang benar di tiap tahap, dan kegagalan kirim tercatat serta di-retry tanpa memblokir request checkout. (Teruji: Verified)

## 1.4 Payment Gateway (L)

**Backend**

- Tabel `tps__payments`: id, order_id, provider (midtrans/xendit/manual), provider_ref, method, amount, status (pending/paid/failed/expired/refunded), paid_at, expires_at, raw_payload_json. Satu order boleh punya beberapa baris (dipakai POS di 2.1 untuk split payment dengan provider `manual`).
- Tambah kolom order: `payment_status`, `payment_expires_at`.
- Endpoint: `POST /api/payments/create` (ambil total dari DB, bukan dari client; kembalikan snap token atau redirect URL), `POST /api/payments/webhook` (tanpa JWT, wajib verifikasi signature, idempotent berdasarkan provider_ref + status), `GET /api/payments/<order_id>/status`.
- Reservasi stok ditahan saat pending dan dilepas otomatis oleh job per menit bila expired (batas bayar default 24 jam, atur di `oas__system_settings`).
- Refund: finance memicu refund ke API gateway dari modul refund yang ada; bila metode tidak mendukung, tandai refund manual dengan nomor referensi.
- Konfigurasi sandbox vs production lewat `.env`. Jangan pernah percaya status pembayaran yang dikirim frontend.

**Frontend**

- Checkout: langkah pembayaran dengan Snap popup atau redirect. Halaman `/payment/finish` yang polling status. Countdown batas bayar dan tombol 'Bayar Ulang'.
- `/finance/transactions`: tambah kolom metode bayar dan status gateway.

**Selesai bila:** webhook yang dikirim dua kali tidak menyebabkan double paid atau stok ganda, dan order yang kedaluwarsa melepas stok reservasi.

## 1.5 Retur / Klaim dari Pelanggan (M) - [SELESAI]

**Backend**

- Tabel `tps__return_requests`: id, return_number, order_id, customer_id, reason_code, description, status (requested/approved/rejected/received/refunded), resolution (refund/replace/repair), reviewed_by, review_note, received_by, received_note, refund_amount, refunded_by, refunded_at, created_at, updated_at. Tabel `tps__return_request_photos`.
- Aturan: hanya order berstatus `delivered` atau `completed` atau Click & Collect `collected`, dalam jendela retur (`return_window_days` di `oas__system_settings`, default 7).
- Endpoint customer: `POST /api/returns`, `GET /api/returns/my`, `GET /api/returns/<id>`.
- Endpoint staf: `GET /api/returns/store/queue`, `POST /api/returns/<id>/review` (approve/reject), `GET /api/returns/warehouse/queue`, `POST /api/returns/<id>/receive` (cek fisik & restock otomatis ke inventaris kartu stok gudang). Terintegrasi dengan `POST /api/finance/orders/<id>/refund`.
- Audit log & notifikasi multi-role (Store, Warehouse, Finance, Customer).

**Frontend**

- Customer: tombol 'Klaim Retur / Garansi' di `/orders` (`MyTickets.jsx`) dan detail pesanan, form modal (pilih order eligible, kategori kendala, deskripsi, upload URL foto bukti), halaman pelacakan `/returns` (`CustomerReturns.jsx`).
- Toko: antrean review `/store/returns` (`StoreReturns.jsx`) di drawer navigasi internal staf toko.
- Gudang: tab penerimaan retur `/warehouse/returns` (`WarehouseReturns.jsx`) di drawer navigasi staf gudang.
- Finance: halaman `/finance/refunds` menampilkan referensi return request, nomor RMA, alasan, dan status penerimaan fisik unit.

**Selesai bila:** satu retur berjalan penuh dari pengajuan customer -> review toko -> penerimaan & restock gudang -> pencairan refund finance. (Teruji: Verified E2E)

## 1.6 SOP Acknowledgment ke Database (S) - [SELESAI]

**Backend**

- Tabel `kms__sop_acknowledgements`: staff_id, article_id, article_version, acknowledged_at, unique constraint `(staff_id, article_id, article_version)`.
- Kolom `version` (int default 1) di `kms__articles`, otomatis bertambah (+1) setiap judul/konten/target SOP diedit di admin sehingga staf wajib membaca ulang.
- Endpoints: `POST /api/kms/internal-sops/<id>/acknowledge`; `GET /api/kms/internal-sops` dilengkapi field `acknowledged`, `acknowledged_at`, `version`, `needs_reack`.
- Admin: `GET /api/kms/admin/kms/sop-compliance` berisi ringkasan kepatuhan organisasi, matriks staf × SOP, dan analisis per dokumen SOP.
- Data migrasi database sukses dieksekusi di `migrate_returns_and_sop_ack.py`.

**Frontend**

- Reader modal di `InternalSopPortal.jsx`: tombol 'Tandai Telah Dibaca & Dipahami' tersambung langsung ke database audit (menghapus localStorage). Badge 'Versi baru belum dibaca ulang' saat versi dokumen naik.
- `QuickSopWidget.jsx`: menampilkan badge jumlah SOP belum dibaca secara real-time dari API.
- Tab 'Matriks Kepatuhan Staf (Compliance)' di `/admin/kms` (`KmsManager.jsx`) dengan KPI kepatuhan, tabel status per staf, dan tabel persentase pemahaman per SOP.

**Selesai bila:** admin bisa memantau siapa yang belum membaca SOP, dan edit materi SOP otomatis mereset status baca staf. (Teruji: Verified E2E)

## 1.7 Ekspor CSV / Excel Generik (S)

**Backend**

- Helper `app/export.py`: CSV lewat streaming generator, XLSX lewat openpyxl. Parameter `?format=csv|xlsx` pada: finance transactions, warehouse logs, inventory, audit logs, MIS product performance.
- Ekspor memakai filter yang sama dengan tampilan, maksimal 50.000 baris, dan dicatat di audit log.

**Frontend**

- Komponen `ExportButton` di `components/ui`, dipasang di semua tabel internal terkait.

## 1.8 Hardening Login (tanpa 2FA) (S)

**Backend**

- Rate limit login dengan Flask-Limiter (5 percobaan per menit per IP + username) di `/api/auth/login` dan `/api/auth/admin/login`.
- Lockout 15 menit setelah 5 kegagalan berturut-turut; kegagalan dan lockout masuk audit log.
- Seeder produksi tidak boleh memakai `password123`; password awal dari `.env` dan wajib diganti saat login pertama (`must_change_password`).
- Header keamanan dasar dan CORS dibatasi ke domain frontend.

**Frontend**

- Pesan error lockout yang jelas dan halaman ganti password paksa untuk akun `must_change_password`.

---

# FASE 2: Operasional Showroom & Gudang

Tujuan: penjualan walk-in, kontrol stok per cabang dan per serial, penerimaan barang, dan layanan servis.

## 2.0 Prasyarat: Stok per Cabang & Unit Serial (M)
## 2.1 POS Walk-in (L)
## 2.2 Scan QR / Barcode (S–M)
## 2.3 Transfer Stok Antar Cabang (M)
## 2.4 Goods Receipt Note / GRN (M)
## 2.5 RMA ke Supplier (M)
## 2.6 Work Order Servis (M)
## 2.7 Faktur PPN & Rekonsiliasi Gateway (M)
## 2.8 Live Chat WebSocket (M)

---

# FASE 3: Pertumbuhan Pelanggan

Tujuan: meningkatkan konversi, retensi, dan membuka sumber stok baru (trade-in).

## 3.1 Review & Rating Produk (M)
## 3.2 Alert Stok & Harga (S–M)
## 3.3 Booking Test Room / Luthier Bench (M)
## 3.4 Cicilan (L)
## 3.5 Registrasi Garansi berbasis Serial (S–M)
## 3.6 Trade-in dan Appraisal (L)
## 3.7 Voucher, Loyalty, dan Bundling (L)
## 3.8 Perbandingan Produk (S)
## 3.9 Search Autocomplete & Rekomendasi Dasar (M)

---

# FASE 4: Analitik & Optimasi

Tujuan: memanfaatkan data transaksi yang sudah terkumpul untuk target, perencanaan stok, dan anggaran.

## 4.1 Target Penjualan per Cabang & Leaderboard (M)
## 4.2 Forecast Demand Sederhana (M–L)
## 4.3 Budget vs Actual Pengadaan (M)
## 4.4 Rekomendasi 'Sering Dibeli Bersama' (S–M)

---

# Backlog Opsional (belum dijadwalkan)

Pre-order produk baru, gift card (bisa memakai `tps__wallet_ledger`), event/workshop showroom, dan web push notification.

# Lampiran A: Tabel Baru per Subsistem

- **OAS:** `audit_logs`, `notification_outbox`, perluasan `notifications` dan `system_settings`.
- **KMS:** `sop_acknowledgements` (+ kolom `version` di `articles`).
- **TPS:** `order_status_history`, `payments`, `return_requests` (+photos), `branch_stock`, `inventory_units`, `pos_shifts`, `stock_transfers` (+items), `goods_receipts` (+items), `supplier_rmas` (+items), `service_orders` (+items, photos), `invoices`, `reconciliations` (+lines), `product_reviews` (+photos, votes), `product_alerts`, `showroom_resources`, `bookings`, `installment_plans`, `warranties`, `tradein_requests` (+photos), `vouchers` (+redemptions), `loyalty_ledger`, `wallet_ledger`, `bundles` (+items), `product_specs`, `search_logs`, `product_affinity`.
- **MIS:** `sales_targets`, `demand_forecasts`, `forecast_accuracy`, `budgets`.

# Lampiran B: Checklist Uji Lintas Fitur

- Webhook gateway dikirim dua kali: tidak ada double paid dan tidak ada stok ganda.
- Dua kasir menjual serial yang sama bersamaan: hanya satu yang berhasil.
- Dua pelanggan booking slot yang sama: satu ditolak.
- Order kedaluwarsa: reservasi stok lepas, voucher dan poin kembali.
- Refund atau retur: stok, voucher, poin, dan garansi ikut tersesuaikan.
- Setiap endpoint internal menolak role yang salah (uji dengan tiap akun demo).
- Semua aksi sensitif tercatat di audit log.
- Perubahan SOP menaikkan versi dan mereset status baca.
