# OVERTONE MUSIC STORE
### Sistem Enterprise Retail & Inventaris Instrumen Musik Multi-Brand (Model Swee Lee)

Platform enterprise e-commerce dan manajemen operasional ritel instrumen musik berstandar multi-brand terpadu. Sistem ini mengintegrasikan seluruh rantai bisnis ritel instrumen: mulai dari pengadaan barang dari brand/supplier resmi (Purchase Order), manajemen inventaris fisik dan nomor seri di gudang, operasional showroom dan serah-terima unit (Click & Collect), konsultasi live concierge & helpdesk, simulasi aging deadstock & promo clearance, audit transaksi penjualan dan refund, hingga laporan keuangan laba rugi eksekutif (P&L) yang dapat diekspor sebagai PDF resmi.

Arsitektur sistem dibangun dalam satu kesatuan 5 Subsistem Informasi Enterprise Terpadu:
- **TPS (Transaction Processing System)**: Pemrosesan transaksi checkout pelanggan, reservasi stok, verifikasi pembayaran, katalog diskon clearance harga coret, dan pencatatan kasir.
- **OAS (Office Automation System)**: Manajemen staf internal, perizinan role (RBAC), alur pengajuan & persetujuan PO, kartu mutasi stok, konsol interaksi live chat staf showroom, serta navigasi clean Off-Canvas Hamburger Drawer.
- **KMS (Knowledge Management System)**: **Dual-Scope KMS** yang memisahkan **Customer Knowledge Base** (panduan musisi & tips gear publik) dengan **Internal Staff SOP** (Standar Operasional Prosedur resmi antar divisi internal berorientasi kode dokumen dan tingkat urgensi).
- **MIS (Management Information System)**: Analitik eksekutif omset penjualan, perbandingan harga pokok penjualan (HPP / COGS), margin keuntungan kotor, tren pergerakan kategori gear, serta modul **Deadstock Aging & Clearance Promo Simulator**.
- **DSS (Decision Support System)**: Sistem pendukung keputusan prioritas pengadaan dan restock instrumen ritel menggunakan metode **Hybrid AHP (Analytic Hierarchy Process)** untuk pembobotan 5 kriteria multi-dimensi dan **TOPSIS (Technique for Order Preference by Similarity to Ideal Solution)** dengan optimasi alokasi anggaran belanja PO.

---

## Arsitektur 5 Subsistem Enterprise (Subfolder phpMyAdmin: `__`)

Seluruh tabel database menggunakan konvensi pemisah **Double Underscore (`__`)** sehingga sidebar phpMyAdmin secara otomatis mengelompokkannya ke dalam subfolder pohon terorganisir:

| Subsistem | Tabel Database Fisik | Ruang Lingkup & Fungsi Utama |
|---|---|---|
| **OAS (Internal Staff & Workflow)** | `oas__staff`, `oas__announcements`, `oas__notifications`, `oas__support_tickets`, `oas__support_messages`, `oas__system_settings` | Pemisahan akun staf internal dengan pelanggan. Alur kerja approval purchase order, mutasi stok, tiket helpdesk & live concierge chat handover (`bot_active` -> `waiting_agent` -> `live_chat` -> `resolved`), dan kolaborasi antar divisi. |
| **KMS (Dual-Scope Knowledge & SOP)** | `kms__brands_suppliers`, `kms__categories`, `kms__articles`, `kms__article_feedback`, `kms__faqs` | Direktori brand resmi distributor (Fender, Gibson, Yamaha, Roland, AKAI, dll.), basis artikel publik musisi, serta **SOP Operasional Internal Staf** (dilengkapi `audience_type`, `target_role`, `sop_code`, `priority_level`). |
| **TPS (Catalog, Orders & Branches)** | `tps__products`, `tps__product_variants`, `tps__customers`, `tps__orders`, `tps__wishlists`, `tps__store_branches`, `tps__purchase_orders`, `tps__inventory_logs` | Master katalog instrumen, varian SKU (warna, finishing, kayu body/neck), keranjang & checkout, pengiriman ekspedisi, reservasi Click & Collect showroom, audit serial number, serta integrasi harga diskon clearance promo. |
| **MIS (Executive Reporting & Clearance)** | `mis__daily_metrics`, `mis__executive_reports`, `mis__product_performance`, `mis__sales_summary` | Agregasi data penjualan ritel, gross revenue, net margin, analisis laba kotor per model instrumen, dan pelaporan keuangan formal, terintegrasi dengan simulator aging deadstock. |
| **DSS (Restock Prioritization)** | `dss__criteria`, `dss__subcriteria_ranges`, `dss__ahp_matrices`, `dss__sessions`, `dss__topsis_results` | Master 5 kriteria (C1-C5), rentang subkriteria, matriks perbandingan berpasangan Saaty 5x5 (AHP), header simulasi alokasi kuota anggaran PO, dan matriks perangkingan preferensi varian instrumen (TOPSIS). |

---

## Fitur Utama Berdasarkan Modul

### 1. Etalase Publik & Pengalaman Berbelanja (Customer TPS)
- **Desain Editorial Minimalis**: Tampilan Full Light Mode bergaya modern editorial ritel musik dengan tipografi Plus Jakarta Sans & Inter.
- **Brand Partner Infinite Marquee**: Ticker berjalan logo-logo brand resmi (Numark, Hercules, AKAI Professional, Alesis, Gibson, Epiphone, Kramer, Donner, Hartke, HeadRush, M-Audio, Olympia, Fender, Yamaha, Roland, Marshall, Shure) yang berjalan secara berkesinambungan ke kiri tanpa jeda.
- **Floating Gear Concierge & Live Support Widget (Swee Lee Inspired)**:
  - Tombol melayang di pojok kanan bawah halaman publik dengan avatar ramah *Overtone Gear Specialist*.
  - **Quick Topic Pills**: Pertanyaan instan seputar setup gitar/luthier, pengiriman ekspedisi, ketersediaan display showroom, dan simulasi cicilan instrumen (dijawab otomatis oleh KMS Auto-Responder).
  - **Live Agent Handover**: Pelanggan dapat meminta eskalasi langsung ke staf toko (*"Hubungi Live Agent"*). Widget otomatis masuk ke antrean (*waiting queue*) dan tersambung ke ruang *Private Live Chat* real-time saat staf showroom mengonfirmasi chat di dashboard.
- **Katalog Terstruktur & Filter Lanjutan**: Eksplorasi berdasarkan instrumen (Electric Guitar, Acoustic Guitar, Bass, Drum, Keyboard & Synth, Amplifiers, Pro Audio), rentang harga, ketersediaan stok, dan brand.
- **Integrasi Promo Clearance Harga Coret**: Produk berstatus clearance menampilkan badge diskon persentase dan harga coret orisinil yang tersinkronisasi otomatis dari simulator manajemen.
- **Dual Fulfillment Option**:
  - *Click & Collect*: Pelanggan memilih showroom terdekat, mendapatkan Pickup Pass berisikan kode unik, dan mengambil unit secara langsung dengan fasilitas gratis unboxing & setup.
  - *Pengiriman Ekspedisi*: Pengiriman aman menggunakan kurir logistik (JNE Trucking) lengkap dengan opsi packing kayu berasuransi dan pelacakan nomor resi real-time.
- **User Pill Dropdown & Manajemen Profil**:
  - Profil Saya: Pengaturan data musisi, kontak telepon, dan alamat lengkap pengiriman yang otomatis tersinkronisasi saat proses checkout.
  - Wishlist: Akses cepat ke koleksi instrumen yang tersimpan.
  - Log Out dengan penegasan aksi.
- **Direktori Showroom Resmi (Showrooms Page)**:
  - Informasi 5 flagship showroom (Jakarta Senayan City, Jakarta PIK Avenue, Bandung Dago, Surabaya Tunjungan Plaza 6, dan Bali Seminyak) lengkap dengan jam operasional, tautan Google Maps, tombol konsultasi WhatsApp, dan daftar fasilitas (Soundproof Testing Room, Luthier Bench, Synthesizer Wall, Piano Lounge).

---

### 2. Navigasi Internal Dashboard (Clean Off-Canvas Hamburger Drawer)
- **Isolasi Penuh Area Internal**: Seluruh rute dashboard staf internal (`/admin/*`, `/manager/*`, `/finance/*`, `/warehouse/*`, `/store/*`) tidak lagi menampilkan navbar katalog publik maupun search bar belanja.
- **Slide-Over Hamburger Drawer**:
  - Drawer slide-over modern dengan backdrop blur gelap yang dapat dibuka melalui tombol hamburger di topbar.
  - Header profil staf aktif menampilkan inisial avatar, nama lengkap, badge role berwarna tematik, dan tombol logout cepat.
  - Daftar navigasi menu terstruktur secara presisi sesuai dengan penugasan divisi pengguna.
  - Dukungan tombol keyboard `Escape` dan tombol close `X` untuk menutup drawer secara instan.
- **Minimal Topbar**: Menampilkan tombol hamburger, judul halaman dinamis (Page Name), dan indikator status akun aktif.

---

### 3. Dual-Scope Knowledge Management System (KMS & SOP Staf)
Sistem KMS kini beroperasi secara **Dual-Scope** yang memisahkan panduan pelanggan dengan SOP operasional staf OAS:
- **Customer Knowledge Base (Publik)**:
  - Endpoint `GET /api/kms/articles` & `GET /api/kms/public-articles` terisolasi ketat hanya menyajikan artikel `audience_type == 'customer'`. Dokumen rahasia perusahaan tidak akan bocor ke publik.
- **Internal Staff SOP (Khusus Pegawai OAS)**:
  - Tersedia di portal `/warehouse/sop`, `/store/sop`, `/manager/sop`, `/finance/sop`, dan `/admin/sop`.
  - Terdistribusi otomatis ke staf berdasarkan role JWT login: menampilkan gabungan **SOP Khusus Divisinya** + **SOP Umum Perusahaan (`all_internal`)**.
  - Dilengkapi tab filter interaktif: *Semua SOP Saya*, *SOP Khusus Divisi*, *SOP Umum Perusahaan*, dan *SOP Kritis*, serta pencarian kata kunci real-time.
  - Badge pembeda jelas: badge divisi (emas/hitam) vs badge umum (abu-abu), kode dokumen resmi (`SOP-WH-001`, `SOP-ST-001`, `SOP-FN-001`), dan badge urgensi (`Standard`, `Mandatory`, `Critical`).
  - **Document Reader Modal**: Tampilan baca langkah-demi-langkah yang rapi, tombol cetak dokumen SOP, serta tombol verifikasi *"Tandai Telah Dibaca & Dipahami"* dengan penyimpanan status lokal di browser.
- **Widget Ringkas di Dashboard Divisi (`QuickSopWidget`)**:
  - Terpasang pada dashboard utama Warehouse, Store, Finance, dan MIS Manager: menampilkan 3 SOP divisi terpenting dan tombol pintas *"Lihat Semua SOP"*.
- **Pusat Manajemen KMS Super Admin (`/admin/kms`)**:
  - Desain Full Light Mode Editorial Minimalist dengan ringkasan KPI metrics.
  - Tab filter 3 ruang lingkup: *Semua Dokumen*, *Artikel Pelanggan (Public)*, dan *SOP Internal Staf* (beserta pill filter divisi).
  - Form dialog Tambah/Edit dengan Segmented Radio Card dual-scope dan input kondisional (Target Divisi, Kode SOP, Tingkat Kepentingan).

---

### 4. Deadstock Aging & Clearance Promo Simulator (MIS × Finance × TPS)
Modul simulasi strategis untuk mengatasi modal beku inventaris ritel di `/manager/clearance` dan `/finance/clearance`:
- **Klasifikasi Umur Inventaris (Aging Bucket)**:
  * 🟢 **Fresh (<90 hari)**: Perputaran sehat, tidak memerlukan intervensi diskon.
  * 🟡 **Slow-Moving (90 - 180 hari)**: Mulai melambat, kandidat promo musiman.
  * 🔴 **Deadstock / Dormant (>180 hari)**: Modal inventaris beku kritis yang perlu segera dilikuidasi.
- **Indikator Metrik Finansial**:
  * Total Modal Beku (Frozen Capital) berdasarkan HPP/COGS.
  * Proyeksi Nilai Pemulihan Kas (Cash Recovery Projection).
  * Potensi Kerugian / Potongan Margin Kotor (Margin Sacrifice).
- **Simulasi 3 Tier Diskon Clearance**:
  * **Tier A (15% Diskon)**: Diskon ringan untuk inventaris 90-120 hari.
  * **Tier B (25% Diskon)**: Diskon moderat untuk inventaris 121-180 hari.
  * **Tier C (40% Diskon Clearance)**: Likuidasi agresif untuk instrumen dormant >180 hari di atas batas HPP.
- **Eksekusi Langsung ke TPS Katalog**:
  * Tombol *"Terapkan Promo ke Katalog Publik"* langsung mengaktifkan flag `is_clearance_sale`, menetapkan persentase diskon, dan menampilkan harga coret di etalase musisi.
  * Tombol *"Batalkan Promo"* untuk memulihkan harga instrumen ke harga normal.

---

### 5. Modul Gudang & Logistik (Warehouse Staff)
- **Monitoring Stok Fisik & Serial Number**: Pemantauan kuota inventaris fisik per model instrumen dan varian SKU.
- **Kartu Stok & Adjustment Opname**: Pencatatan mutasi kuantitas masuk/keluar, nomor seri instrumen (serial number), dan audit log opname.
- **Stok Menipis (Restock Alerts)**: Indikator otomatis untuk instrumen dengan sisa unit kritis (di bawah ambang batas minimal).
- **Pengadaan Barang (Purchase Order)**: Pembuatan pengajuan restock instrumen baru ke brand/supplier resmi yang diteruskan ke Manager untuk persetujuan.
- **Pemrosesan Ekspedisi**: Antarmuka quality check, packing kayu instrumen, dan penginputan nomor resi pengiriman kurir.
- **Widget & Portal SOP Gudang**: Akses langsung ke dokumen standar packing kayu berasuransi (`SOP-WH-001`) dan penerimaan barang supplier (`SOP-WH-002`).

---

### 6. Modul Toko & Showroom (Store Staff)
- **Live Chat Console & Helpdesk (`/store/support` & `/store/live-chat`)**:
  - Menerima permintaan konsultasi dari widget musisi di katalog publik.
  - Tombol *"Terima / Konfirmasi Chat"* untuk menghubungkan staf dengan pelanggan secara private real-time.
  - Penutupan sesi chat dengan resolusi bantuan resmi.
- **Serah-Terima Click & Collect**: Verifikasi kode unik ambil barang (Pickup Pass) saat musisi tiba di showroom dan konfirmasi serah-terima unit beserta checklist setup 10-titik luthier.
- **Manajemen Katalog & SKU**: Pembuatan produk baru, spesifikasi teknis kayu dan pickup, galeri foto, dan varian finishing.
- **Widget & Portal SOP Showroom**: Akses cepat ke prosedur Click & Collect (`SOP-ST-001`) dan penanganan klaim garansi (`SOP-ST-002`).

---

### 7. Modul Manajemen & Persetujuan (Retail General Manager)
- **Approval Purchase Order (PO)**: Peninjauan pengajuan pengadaan barang dari staf gudang sebelum diteruskan ke bagian Finance untuk pelunasan tagihan supplier.
- **Approval Master Produk Katalog**: Verifikasi kelayakan spesifikasi teknis dan penetapan harga instrumen baru sebelum dipublikasikan ke etalase publik.
- **MIS Executive Dashboard**: Pemantauan ringkasan omset penjualan harian, pergerakan unit terjual, perbandingan COGS, dan pangsa pasar instrumen terlaris.
- **Deadstock Simulator**: Analisis instrumen mengendap dan penentuan strategi clearance promo.
- **Widget & Portal SOP Manajerial**: Akses panduan evaluasi DSS restock dan batas aman diskon clearance (`SOP-MG-001`).

---

### 8. Modul Keuangan & Akuntansi (Finance Controller)
- **Halaman Mandiri Tanpa Tabs**: Setiap modul operasional keuangan memiliki rute halaman mandiri:
  - *Laporan Keuangan & Laba Rugi (`/finance/dashboard` atau `/finance/laporan`)*: Metrik omset kotor, total HPP (COGS), laba kotor, persentase gross margin, dan rincian profitabilitas per model instrumen.
  - *Ekspor Laporan PDF*: Tombol cetak/ekspor dokumen resmi laporan laba rugi berformat formal standar akuntansi yang mencakup kop perusahaan, tabel finansial, serta kolom persetujuan bertanda tangan Finance Controller dan General Manager.
  - *Deadstock & Clearance Simulator (`/finance/clearance`)*: Evaluasi dampak margin terhadap likuidasi stok lama.
  - *Pembayaran PO Supplier (`/finance/po`)*: Eksekusi pelunasan tagihan supplier resmi berstatus approved dengan input nomor referensi transfer bank dan catatan pembukuan.
  - *Refund Retur Pesanan (`/finance/refunds`)*: Persetujuan pengembalian dana pelanggan retur yang secara otomatis memulihkan stok fisik instrumen kembali ke inventaris gudang.
  - *Audit Transaksi Penjualan (`/finance/transactions`)*: Buku besar audit trail seluruh pesanan masuk, metode fulfillment kasir, dan status pembayaran.
  - *Widget & Portal SOP Keuangan*: Akses SOP verifikasi PO dan pencairan refund (`SOP-FN-001`).

---

### 9. Modul Hak Akses & Administrasi Akun (Super Administrator)
- **Manajemen Akun Terisolasi (OAS vs TPS)**:
  - *Manajemen Staf Internal (OAS)*: Pembuatan akun pegawai, penggantian penugasan role (Super Admin, Manager, Finance, Warehouse Staff, Store Staff), dan penonaktifan sementara (suspend).
  - *Direktori Musisi & Pelanggan (TPS)*: Monitoring akun pelanggan publik, nomor kontak, riwayat alamat, dan hak pemblokiran akun bermasalah.
- **Dual-Scope KMS Master Management (`/admin/kms`)**: Pembuatan dan kurasi artikel publik pelanggan maupun dokumen SOP rahasia operasional staf seluruh divisi.

---

## Akun Demo untuk Pengujian Sistem

Seluruh akun demo telah disiapkan melalui database seeder internal:

| Role Akses | Email / Username | Password | Rute Utama & Ruang Lingkup Hak Akses |
|---|---|---|---|
| **Super Administrator** | `admin` (atau `admin@sweelee.id`) | `password123` | `/admin/dashboard`, `/admin/users`, `/admin/kms`, `/admin/sop` (Kontrol sistem menyeluruh, RBAC staf, approval katalog, dan KMS dual-scope). |
| **Retail General Manager** | `manager` (atau `manager@sweelee.id`) | `password123` | `/admin/mis`, `/manager/dss`, `/manager/clearance`, `/manager/po`, `/manager/sop` (MIS Dashboard, DSS restock, simulasi clearance promo, approval PO). |
| **Finance Controller** | `finance` (atau `finance@sweelee.id`) | `password123` | `/finance/dashboard`, `/finance/clearance`, `/finance/po`, `/finance/refunds`, `/finance/transactions`, `/finance/sop` (Laporan P&L, cetak PDF, bayar PO, audit transaksi). |
| **Warehouse Lead** | `warehouse` (atau `warehouse@sweelee.id`) | `password123` | `/warehouse/inventory`, `/warehouse/dss`, `/warehouse/po`, `/warehouse/orders`, `/warehouse/logs`, `/warehouse/sop` (Kartu stok, serial number, pengajuan PO, resi kurir). |
| **Store Showroom Staff** | `store` (atau `store@sweelee.id`) | `password123` | `/store/support`, `/store/catalog`, `/store/pickups`, `/store/sop` (Live chat console, serah-terima Click & Collect, input varian SKU). |
| **Pelanggan / Musisi (TPS)** | `customer@sweelee.id` | `password123` | `/`, `/catalog`, `/products/:id`, `/checkout`, `/help`, `/tickets` (Katalog etalase, live concierge widget, checkout ekspedisi/pickup). |

> [!NOTE]
> Portal masuk untuk staf internal (`super_admin`, `manager`, `finance`, `warehouse_staff`, `store_staff`) dapat diakses melalui rute `/internal/portal`, sedangkan musisi dan pelanggan umum masuk melalui `/login`.

---

## Prasyarat Lingkungan Pengembangan

1. **MySQL Server**: Tersedia melalui XAMPP atau instalasi MySQL lokal mandiri (Port default 3306).
2. **Python**: Versi 3.10 atau lebih tinggi.
3. **Node.js**: Versi 18.x atau lebih tinggi (disertai npm).

---

## Panduan Instalasi & Menjalankan Sistem

### 1. Konfigurasi Database MySQL
Pastikan modul MySQL pada control panel XAMPP telah aktif.
Buat database bernama `overtone_store` (atau jalankan script seeder yang otomatis membuatnya):
```sql
CREATE DATABASE IF NOT EXISTS overtone_store CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Setup Backend (Flask REST API)
Buka terminal dan arahkan ke direktori backend:
```bash
cd backend

# Buat virtual environment Python
python -m venv venv

# Aktivasi virtual environment
# Pada Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# Pada Windows (Command Prompt):
.\venv\Scripts\activate.bat
# Pada Linux / macOS:
source venv/bin/activate

# Install seluruh dependensi
pip install -r requirements.txt

# Jalankan skrip inisialisasi & seeder katalog instrumen ritel Swee Lee
python seed_sweelee_retail.py

# Jalankan seeder SOP internal dual-scope KMS
python seed_internal_sops.py

# Jalankan server API backend Flask
python run.py
```
Backend API akan aktif melayani request di: `http://127.0.0.1:5000`

### 3. Setup Frontend (React + Vite + Tailwind CSS)
Buka terminal baru dan arahkan ke direktori frontend:
```bash
cd frontend

# Install seluruh paket dependensi Node.js
npm install

# Jalankan server pengembangan Vite
npm run dev
```
Aplikasi web frontend akan aktif di: `http://localhost:5173`

---

## Ringkasan Endpoint REST API Backend

### Autentikasi & Profil Pengguna (`/api/auth`)
- `POST /api/auth/login`: Autentikasi akun pelanggan publik (email & password).
- `POST /api/auth/admin/login`: Autentikasi staf internal OAS (username & password).
- `POST /api/auth/register`: Pendaftaran akun musisi / pelanggan baru.
- `GET /api/auth/me`: Verifikasi sesi token JWT aktif dan profil pengguna.
- `PUT /api/auth/profile`: Pembaruan nama, nomor telepon, dan alamat pengiriman pelanggan.

### Dual-Scope Knowledge Management System (`/api/kms` & `/api/admin/kms`)
- `GET /api/kms/articles`: Katalog artikel panduan publik pelanggan (terisolasi ketat, SOP internal dilarang tampil).
- `GET /api/kms/public-articles`: Alias endpoint artikel publik untuk FAQ dan pusat bantuan musisi.
- `GET /api/kms/articles/<id>`: Detail isi artikel (verifikasi hak akses jika berstatus dokumen internal).
- `GET /api/kms/internal-sops`: Distribusi dokumen SOP staf internal berdasar role JWT (`target_role == current_user.role` atau `all_internal`).
- `GET|POST /api/admin/kms/articles`: Endpoint Super Admin untuk melihat seluruh dokumen atau membuat panduan publik/SOP internal baru.
- `PUT|DELETE /api/admin/kms/articles/<id>`: Endpoint Super Admin untuk mengedit atau menghapus dokumen KMS/SOP.

### Live Chat Concierge & Helpdesk Tiket (`/api/store` & `/api/oas`)
- `POST /api/store/support/chat-handover`: Eskalasi sesi bot ke antrean staf showroom (*waiting agent*).
- `GET /api/store/support/active-chats`: Daftar antrean chat masuk untuk dikonfirmasi staf showroom.
- `POST /api/store/support/confirm-chat`: Staf mengambil alih sesi chat menjadi *live chat*.
- `POST /api/store/support/messages`: Pengiriman pesan real-time antara musisi dan staf showroom.

### Deadstock Aging & Clearance Promo Simulator (`/api/clearance`)
- `GET /api/clearance/aging-analysis`: Analisis aging inventaris fisik (<90 hari, 90-180 hari, >180 hari), nilai modal beku, dan margin HPP.
- `GET /api/clearance/tiers`: Rekomendasi 3 tier promo diskon clearance (Tier A, Tier B, Tier C).
- `POST /api/clearance/apply-tier`: Penerapan diskon clearance ke produk TPS (menampilkan harga coret di etalase publik).
- `POST /api/clearance/remove-tier`: Pembatalan diskon clearance (harga kembali normal).

### Katalog Publik & Transaksi (`/api`)
- `GET /api/events`: Daftar katalog instrumen musik dengan dukungan filter kategori, brand, status, dan pencarian teks.
- `GET /api/events/<id>`: Rincian spesifikasi instrumen, galeri gambar, dan varian SKU aktif.
- `POST /api/orders`: Pembuatan transaksi pesanan baru (Click & Collect atau Ekspedisi).
- `GET /api/orders/my`: Riwayat pesanan dan status invoice pengguna yang sedang login.
- `GET /api/orders/<invoice_code>`: Informasi detail pesanan, kode pickup showroom, atau nomor resi kurir.

### Gudang & Inventaris (`/api/warehouse`)
- `GET /api/warehouse/inventory`: Monitoring persediaan fisik per produk dan per varian SKU.
- `GET /api/warehouse/summary`: Metrik ringkas total SKU, jumlah stok kritis, dan pesanan siap kirim.
- `POST /api/warehouse/logs`: Pencatatan mutasi stok opname dan pembaruan nomor seri fisik.
- `GET /api/warehouse/logs`: Audit trail riwayat pergerakan stok barang.
- `GET|POST /api/warehouse/po`: Pemantauan dan pengajuan Purchase Order baru ke supplier.
- `POST /api/warehouse/orders/<id>/dispatch`: Pembaruan nomor resi kurir ekspedisi untuk pesanan kirim.

### Keuangan & Akuntansi (`/api/finance`)
- `GET /api/finance/pnl`: Laporan komprehensif laba rugi, total omset, COGS pengadaan, dan margin per model instrumen.
- `GET /api/finance/pos`: Daftar tagihan Purchase Order supplier yang siap dibayar atau telah lunas.
- `POST /api/finance/pos/<id>/pay`: Konfirmasi pelunasan tagihan supplier dengan nomor referensi transfer.
- `GET /api/finance/refunds`: Daftar pesanan retur yang memerlukan persetujuan pengembalian dana.
- `POST /api/finance/orders/<id>/refund`: Eksekusi pengembalian dana pelanggan dan sinkronisasi pemulihan stok unit ke inventaris.
- `GET /api/finance/transactions`: Audit log transaksi penjualan ritel.

### Sistem Pendukung Keputusan / DSS Restock Prioritization (`/api/dss`)
- `GET /api/dss/config`: Master 5 kriteria multi-dimensi (C1-C5), rentang subkriteria, bobot AHP, dan status konsistensi CR.
- `POST /api/dss/ahp-matrix`: Update pairwise comparison Saaty 5x5, kalkulasi eigenvector bobot prioritas, dan uji konsistensi CR (CR <= 0.10).
- `POST /api/dss/run-simulation`: Eksekusi perhitungan TOPSIS lengkap, perangkingan preferensi varian instrumen, optimasi batas kuota anggaran belanja PO, serta audit matrix step-by-step.
- `GET /api/dss/sessions`: Riwayat sesi simulasi pengadaan tersimpan.
- `GET /api/dss/sessions/<id>`: Detail sesi simulasi beserta matriks ranking seluruh SKU instrumen.
- `POST /api/dss/generate-po/<id>`: Konversi otomatis varian dalam kuota anggaran (within budget) menjadi Purchase Order resmi siap diapprove.

### Manajemen Staf & Administrasi (`/api/admin`)
- `GET /api/admin/staff`: Daftar seluruh pegawai internal OAS dengan filter role.
- `POST /api/admin/staff`: Pendaftaran akun pegawai internal baru.
- `PUT /api/admin/staff/<id>/role`: Perubahan hak akses penugasan role pegawai internal.
- `POST /api/admin/staff/<id>/toggle-status`: Penangguhan (suspend) atau pengaktifan kembali akun staf.
- `GET /api/admin/customers`: Daftar direktori musisi/pelanggan terdaftar di subsistem TPS.
- `POST /api/admin/customers/<id>/toggle-status`: Pemblokiran atau pembukaan blokir akun pelanggan.

---

## Struktur Direktori Proyek

```
Ticksy V4/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── admin.py           # Endpoint administrasi akun, RBAC staf & alias KMS Super Admin
│   │   │   ├── auth.py            # Endpoint autentikasi, registrasi & update profil
│   │   │   ├── clearance.py       # Endpoint simulasi aging deadstock & promo clearance
│   │   │   ├── dss.py             # Endpoint algoritma Hybrid AHP & TOPSIS, audit matriks & batch PO
│   │   │   ├── events.py          # Master katalog produk & varian SKU instrumen
│   │   │   ├── finance.py         # Laporan laba rugi P&L, bayar PO, refund, audit transaksi
│   │   │   ├── kms.py             # Dual-Scope KMS: panduan musisi publik vs. SOP operasional staf OAS
│   │   │   ├── mis_dashboard.py   # Executive MIS dashboard harian & grafik performa
│   │   │   ├── orders.py          # Transaksi checkout, kasir, click & collect, ekspedisi
│   │   │   ├── po.py              # Alur Purchase Order antar divisi
│   │   │   ├── products.py        # Katalog instrumen musik publik & varian SKU
│   │   │   ├── store.py           # Helpdesk, live chat console & verifikasi Click & Collect showroom
│   │   │   ├── warehouse.py       # Stok fisik gudang, serial number, packing & nomor resi
│   │   │   └── ...
│   │   ├── models/
│   │   │   ├── models.py          # Definisi ORM 5 subsistem ber-prefix ganda (__): OAS, KMS, TPS, DSS
│   │   │   └── mis_models.py      # Definisi ORM subsistem MIS (mis__*)
│   │   ├── extensions.py          # SQLAlchemy, JWTManager, Mail
│   │   ├── seed_dss.py            # Seeder 5 kriteria AHP-TOPSIS, matriks 5x5 Saaty, dan simulasi awal
│   │   └── security.py            # Skema RBAC, make_token, dan validator perizinan role
│   ├── migrate_kms_dual_scope.py  # Skrip migrasi kolom audience_type, target_role, sop_code, priority_level
│   ├── seed_internal_sops.py      # Seeder 7 dokumen SOP resmi divisi staf internal
│   ├── seed_sweelee_retail.py     # Database seeder komprehensif Overtone Music Store (overtone_store)
│   ├── requirements.txt           # Daftar dependensi modul Python backend
│   └── run.py                     # Entry point server Flask
│
├── frontend/
│   ├── src/
│   │   ├── auth/                  # AuthContext, penyimpanan token sesi, ProtectedRoute
│   │   ├── components/
│   │   │   ├── home/              # HeroCarousel, BrandTicker infinite marquee, Editorial
│   │   │   ├── kms/               # QuickSopWidget ("📌 SOP & Prosedur Divisi Anda")
│   │   │   ├── layout/            # Navbar publik, Footer, InternalLayout (Off-Canvas Hamburger Drawer)
│   │   │   ├── profile/           # ProfileModal untuk input & update alamat musisi
│   │   │   ├── support/           # FloatingConciergeWidget (Live Support & KMS Auto-Responder)
│   │   │   └── ui/                # Badge, Card, Button, Skeleton, Modal dialog
│   │   ├── pages/
│   │   │   ├── admin/             # Dashboard super admin, UserManagement, KmsManager (Dual-Scope)
│   │   │   ├── clearance/         # DeadstockClearanceSimulator (MIS x Finance x TPS)
│   │   │   ├── customer/          # Home, Catalog, ProductDetail, Checkout, MyTickets, Showrooms
│   │   │   ├── dss/               # SmartRestockDSS: Hybrid AHP & TOPSIS 3 tab interaktif
│   │   │   ├── finance/           # FinanceReports (cetak PDF), FinancePoPayments, FinanceRefunds, FinanceTransactions
│   │   │   ├── internal/          # InternalSopPortal (Dokumen SOP operasional khusus divisi staf)
│   │   │   ├── manager/           # PoApproval, MISDashboard, EventAnalytics
│   │   │   ├── store/             # StoreCatalog, ClickAndCollect pickup pass, SupportHelpdesk (Live Chat)
│   │   │   ├── warehouse/         # Inventory kartu stok, PurchaseOrders, DeliveryOrders, Logs
│   │   │   ├── Login.jsx          # Form autentikasi musisi / pelanggan
│   │   │   └── InternalLogin.jsx  # Form portal staf internal OAS
│   │   ├── styles/
│   │   │   └── globals.css        # Konfigurasi Tailwind, typography, keyframes marquee
│   │   ├── App.jsx                # Pemetaan seluruh rute aplikasi
│   │   └── main.jsx               # Inisialisasi React DOM & enforcement full light mode
│   ├── package.json               # Dependensi Node.js frontend
│   └── vite.config.js             # Konfigurasi bundler Vite
│
└── README.md                      # Dokumentasi komprehensif sistem Overtone Music Store
```

---

## Lisensi & Atribusi
Hak Cipta © 2026 **PT Overtone Retail Nusantara**.
Seluruh merek dagang, logo brand instrumen, dan penamaan produk merupakan hak milik dari masing-masing prinsipal distributor resmi terkait.
