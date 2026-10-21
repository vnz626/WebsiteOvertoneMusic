# OVERTONE MUSIC STORE
### Sistem Enterprise Retail & Inventaris Instrumen Musik Multi-Brand (Model Swee Lee)

Platform enterprise e-commerce dan manajemen operasional ritel instrumen musik berstandar multi-brand terpadu. Sistem ini mengintegrasikan seluruh rantai bisnis ritel instrumen: mulai dari pengadaan barang dari brand/supplier resmi (Purchase Order), manajemen inventaris fisik dan nomor seri di gudang, operasional showroom dan serah-terima unit (Click & Collect), audit transaksi penjualan dan refund, hingga laporan keuangan laba rugi eksekutif (P&L) yang dapat diekspor sebagai PDF.

Arsitektur sistem dibangun dalam satu kesatuan 4 Subsistem Informasi Enterprise:
- **TPS (Transaction Processing System)**: Pemrosesan transaksi checkout pelanggan, reservasi stok, verifikasi pembayaran, dan pencatatan kasir.
- **OAS (Office Automation System)**: Manajemen staf internal, perizinan role (RBAC), alur pengajuan & persetujuan PO, kartu mutasi stok, serta notifikasi otomatis.
- **KMS (Knowledge Management System)**: Manajemen direktori brand resmi, sertifikasi authorized dealer, serta pusat bantuan setup instrumen & garansi.
- **MIS (Management Information System)**: Analitik eksekutif omset penjualan, perbandingan harga pokok penjualan (HPP / COGS), margin keuntungan kotor, dan tren pergerakan kategori gear.

---

## Arsitektur 4 Subsistem Enterprise

| Subsistem | Tabel Database Fisik | Ruang Lingkup & Fungsi Utama |
|---|---|---|
| **OAS (Internal Staff & Workflow)** | `oas_staff`, `oas_announcements` | Pemisahan akun staf internal dengan pelanggan. Alur kerja approval purchase order, mutasi stok, dan kolaborasi antar divisi. |
| **KMS (Knowledge & Suppliers)** | `kms_brands_suppliers`, `kms_articles` | Direktori brand distributor resmi (Fender, Gibson, Yamaha, Roland, AKAI, dll.), sertifikat dealer, artikel panduan setup luthier, dan helpdesk garansi. |
| **TPS (Catalog, Orders & Branches)** | `tps_products`, `tps_product_variants`, `tps_customers`, `tps_orders`, `tps_store_branches`, `tps_inventory_logs` | Master katalog instrumen, varian SKU (warna, finishing, kayu body/neck), keranjang & checkout, pengiriman ekspedisi, reservasi Click & Collect showroom, dan audit log serial number. |
| **MIS (Executive Reporting)** | `mis_daily_metrics`, `mis_executive_reports` | Agregasi data penjualan ritel, gross revenue, net margin, analisis laba kotor per kategori instrumen, dan pelaporan keuangan. |

---

## Fitur Utama Berdasarkan Modul

### 1. Etalase Publik & Pengalaman Berbelanja (Customer TPS)
- **Desain Editorial Minimalis**: Tampilan Full Light Mode bergaya modern editorial ritel musik dengan tipografi Plus Jakarta Sans & Inter.
- **Brand Partner Infinite Marquee**: Ticker berjalan logo-logo brand resmi (Numark, Hercules, AKAI Professional, Alesis, Gibson, Epiphone, Kramer, Donner, Hartke, HeadRush, M-Audio, Olympia, Fender, Yamaha, Roland, Marshall, Shure) yang berjalan secara berkesinambungan ke kiri tanpa jeda.
- **Katalog Terstruktur & Filter Lanjutan**: Eksplorasi berdasarkan instrumen (Electric Guitar, Acoustic Guitar, Bass, Drum, Keyboard & Synth, Amplifiers, Pro Audio), rentang harga, ketersediaan stok, dan brand.
- **Detail Spesifikasi Luthier**: Informasi teknis instrumen (tipe kayu body & neck, konfigurasi pickup, radius fretboard, rasio tuning machine, dan masa garansi resmi).
- **Dual Fulfillment Option**:
  - *Click & Collect*: Pelanggan memilih showroom terdekat, mendapatkan Pickup Pass berisikan kode unik, dan mengambil unit secara langsung dengan fasilitas gratis unboxing & setup.
  - *Pengiriman Ekspedisi*: Pengiriman aman menggunakan kurir logistik (JNE Trucking) lengkap dengan opsi packing kayu berasuransi dan pelacakan nomor resi real-time.
- **User Pill Dropdown & Manajemen Profil**:
  - Profil Saya: Pengaturan data musisi, kontak telepon, dan alamat lengkap pengiriman yang otomatis tersinkronisasi saat proses checkout.
  - Wishlist: Akses cepat ke koleksi instrumen yang tersimpan.
  - Log Out dengan penegasan aksi.
- **Direktori Showroom Resmi (Showrooms Page)**:
  - Informasi 5 flagship showroom (Jakarta Senayan City, Jakarta PIK Avenue, Bandung Dago, Surabaya Tunjungan Plaza 6, dan Bali Seminyak) lengkap dengan jam operasional, tautan Google Maps, tombol konsultasi WhatsApp, dan daftar fasilitas (Soundproof Testing Room, Luthier Bench, Synthesizer Wall, Piano Lounge).

### 2. Modul Gudang & Logistik (Warehouse Staff)
- **Monitoring Stok Fisik & Serial Number**: Pemantauan kuota inventaris fisik per model instrumen dan varian SKU.
- **Kartu Stok & Adjustment Opname**: Pencatatan mutasi kuantitas masuk/keluar, nomor seri instrumen (serial number), dan audit log opname.
- **Stok Menipis (Restock Alerts)**: Indikator otomatis untuk instrumen dengan sisa unit kritis (di bawah ambang batas minimal).
- **Pengadaan Barang (Purchase Order)**: Pembuatan pengajuan restock instrumen baru ke brand/supplier resmi yang diteruskan ke Manager untuk persetujuan.
- **Pemrosesan Ekspedisi**: Antarmuka quality check, packing kayu instrumen, dan penginputan nomor resi pengiriman kurir.

### 3. Modul Manajemen & Persetujuan (Retail General Manager)
- **Approval Purchase Order (PO)**: Peninjauan pengajuan pengadaan barang dari staf gudang sebelum diteruskan ke bagian Finance untuk pelunasan tagihan supplier.
- **Approval Master Produk Katalog**: Verifikasi kelayakan spesifikasi teknis dan penetapan harga instrumen baru sebelum dipublikasikan ke etalase publik.
- **MIS Executive Dashboard**: Pemantauan ringkasan omset penjualan harian, pergerakan unit terjual, perbandingan COGS, dan pangsa pasar instrumen terlaris.

### 4. Modul Keuangan & Akuntansi (Finance Controller)
- **Halaman Mandiri Tanpa Tabs**: Setiap modul operasional keuangan memiliki rute halaman mandiri:
  - *Laporan Keuangan & Laba Rugi (`/finance/dashboard` atau `/finance/laporan`)*: Metrik omset kotor, total HPP (COGS), laba kotor, persentase gross margin, dan rincian profitabilitas per model instrumen.
  - *Ekspor Laporan PDF*: Tombol cetak/ekspor dokumen resmi laporan laba rugi berformat formal standar akuntansi yang mencakup kop perusahaan, tabel finansial, serta kolom persetujuan bertanda tangan Finance Controller dan General Manager.
  - *Pembayaran PO Supplier (`/finance/po`)*: Eksekusi pelunasan tagihan supplier resmi berstatus approved dengan input nomor referensi transfer bank dan catatan pembukuan.
  - *Refund Retur Pesanan (`/finance/refunds`)*: Persetujuan pengembalian dana pelanggan retur yang secara otomatis memulihkan stok fisik instrumen kembali ke inventaris gudang.
  - *Audit Transaksi Penjualan (`/finance/transactions`)*: Buku besar audit trail seluruh pesanan masuk, metode fulfillment kasir, dan status pembayaran.

### 5. Modul Hak Akses & Administrasi Akun (Super Administrator)
- **Manajemen Akun Terisolasi (OAS vs TPS)**:
  - *Manajemen Staf Internal (OAS)*: Pembuatan akun pegawai, penggantian penugasan role (Super Admin, Manager, Finance, Warehouse Staff, Store Staff), dan penonaktifan sementara (suspend).
  - *Direktori Musisi & Pelanggan (TPS)*: Monitoring akun pelanggan publik, nomor kontak, riwayat alamat, dan hak pemblokiran akun bermasalah.

---

## Akun Demo untuk Pengujian Sistem

Seluruh akun demo telah disiapkan melalui database seeder internal:

| Role Akses | Email / Username | Password | Ruang Lingkup Hak Akses |
|---|---|---|---|
| **Super Administrator** | `admin` (atau `admin@sweelee.id`) | `password123` | Akses sistem menyeluruh, RBAC akun pegawai, approval katalog, dan KMS. |
| **Retail General Manager** | `manager` (atau `manager@sweelee.id`) | `password123` | MIS Dashboard, persetujuan PO restock supplier, dan approval harga katalog. |
| **Finance Controller** | `finance` (atau `finance@sweelee.id`) | `password123` | Laporan P&L, cetak PDF laba rugi, pembayaran PO supplier, audit penjualan, dan refund. |
| **Warehouse Lead** | `warehouse` (atau `warehouse@sweelee.id`) | `password123` | Kartu stok fisik, input nomor seri instrumen, pengajuan PO supplier, dan input resi ekspedisi. |
| **Store Showroom Staff** | `store` (atau `store@sweelee.id`) | `password123` | Input varian SKU katalog, verifikasi kode ambil Click & Collect, dan helpdesk garansi. |
| **Pelanggan / Musisi (TPS)** | `customer@sweelee.id` | `password123` | Eksplorasi katalog, checkout instrumen, pembayaran simulasi, dan pelacakan pesanan. |

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
Buat database bernama `ticketing_event` (atau sesuaikan dengan konfigurasi koneksi pada file `.env` backend):
```sql
CREATE DATABASE IF NOT EXISTS ticketing_event CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
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
│   │   │   ├── admin.py           # Endpoint administrasi akun & RBAC pegawai internal
│   │   │   ├── auth.py            # Endpoint autentikasi, registrasi & update profil
│   │   │   ├── events.py          # Master katalog produk & varian SKU instrumen
│   │   │   ├── finance.py         # Laporan laba rugi P&L, bayar PO, refund, audit transaksi
│   │   │   ├── manager.py         # Approval PO restock dan pengaturan operasional
│   │   │   ├── orders.py          # Transaksi checkout, kasir, click & collect, ekspedisi
│   │   │   ├── promoter.py        # Pengelolaan katalog produk bagi store showroom staff
│   │   │   ├── warehouse.py       # Stok fisik gudang, serial number, packing & nomor resi
│   │   │   └── ...
│   │   ├── models/
│   │   │   └── models.py          # Definisi ORM 4 subsistem (OAS, KMS, TPS, MIS)
│   │   ├── extensions.py          # SQLAlchemy, JWTManager, Mail
│   │   └── security.py            # Skema RBAC dan validator perizinan role
│   ├── seed_sweelee_retail.py     # Database seeder instrumen musik ritel Swee Lee
│   ├── requirements.txt           # Daftar dependensi modul Python backend
│   └── run.py                     # Entry point server Flask
│
├── frontend/
│   ├── src/
│   │   ├── auth/                  # AuthContext, penyimpanan token sesi, ProtectedRoute
│   │   ├── components/
│   │   │   ├── home/              # HeroCarousel, BrandTicker infinite marquee, Editorial
│   │   │   ├── layout/            # Navbar wordmark, Footer informasi brand, Sidebar menu
│   │   │   ├── profile/           # ProfileModal untuk input & update alamat musisi
│   │   │   └── ui/                # Badge, Card, Button, Skeleton, Modal dialog
│   │   ├── pages/
│   │   │   ├── admin/             # Dashboard super admin, UserManagement full light mode
│   │   │   ├── customer/          # Home, Catalog, ProductDetail, Checkout, MyTickets, Showrooms
│   │   │   ├── finance/           # FinanceReports (cetak PDF), FinancePoPayments, FinanceRefunds, FinanceTransactions
│   │   │   ├── manager/           # PoApproval, MISDashboard, EventAnalytics
│   │   │   ├── store/             # StoreCatalog, ClickAndCollect pickup pass, SupportHelpdesk
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
