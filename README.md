# OVERTONE PRO CINEMA STORE
### Sistem Enterprise Retail & Inventaris Cinema Cameras, Lenses & Broadcast Gear (Model Focus Nusantara & B&H Photo)

Platform enterprise e-commerce dan manajemen operasional ritel kamera bioskop, lensa sinema, 4-axis stabilizers, tata cahaya studio, dan perangkat audio broadcast multi-brand terpadu. Sistem ini mengintegrasikan seluruh mata rantai bisnis ritel sinematografi profesional: mulai dari pengadaan barang dari prinsipal/distributor resmi (Purchase Order), manajemen inventaris fisik dan nomor seri sensor di gudang pusat, operasional showroom dan uji serah-terima unit (Click & Collect di Studio Camera Test Bay), konsultasi live concierge & helpdesk teknis, simulasi aging deadstock & promo clearance berkawal margin, audit transaksi penjualan dan retur garansi, notifikasi multi-channel (In-App, Email, WhatsApp) dengan worker outbox asinkron, hingga laporan keuangan laba rugi eksekutif (P&L) yang dapat diekspor sebagai PDF resmi.

Arsitektur sistem dibangun dalam satu kesatuan 5 Subsistem Informasi Enterprise Terpadu:
- **TPS (Transaction Processing System)**: Pemrosesan transaksi checkout filmmaker, reservasi stok, verifikasi pembayaran, katalog diskon clearance harga coret, alur pengajuan klaim retur pelanggan, timeline status pesanan, kasir Showroom POS dengan auto-deduct paket bundling, dan pencatatan transaksi offline.
- **OAS (Office Automation System)**: Manajemen staf internal, perizinan role (RBAC), alur pengajuan & persetujuan PO, kartu mutasi stok inventaris fisik dan nomor seri (Body & Lens S/N), antrean outbox pengiriman pesan asinkron, konsol interaksi live chat staf showroom, log audit append-only seluruh aksi sensitif, presensi shift staf toko, serta navigasi clean Off-Canvas Hamburger Drawer.
- **KMS (Knowledge Management System)**: **Dual-Scope KMS** yang memisahkan **Customer Knowledge Base** (panduan filmmaker, tips rigging, dan kalibrasi sensor publik) dengan **Internal Staff SOP** (Standar Operasional Prosedur resmi antar divisi internal berorientasi kode dokumen, tingkat urgensi, konfirmasi pemahaman database, dan **Matriks Kepatuhan Staf / Compliance**).
- **MIS (Management Information System)**: Analitik eksekutif omset penjualan, perbandingan harga pokok penjualan (HPP / COGS), margin keuntungan kotor, tren pergerakan kategori cinema gear, serta modul **Deadstock Aging & Clearance Promo Simulator**.
- **DSS (Decision Support System)**: Sistem pendukung keputusan prioritas pengadaan dan restock cinema hardware ritel menggunakan metode **Hybrid AHP (Analytic Hierarchy Process)** untuk pembobotan 5 kriteria multi-dimensi dan **TOPSIS (Technique for Order Preference by Similarity to Ideal Solution)** dengan optimasi alokasi anggaran belanja PO berbatas pagu dana.

---

## Arsitektur 5 Subsistem Enterprise (Subfolder phpMyAdmin: `__`)

Seluruh tabel database menggunakan konvensi pemisah **Double Underscore (`__`)** sehingga sidebar phpMyAdmin secara otomatis mengelompokkannya ke dalam subfolder pohon terorganisir:

| Subsistem | Tabel Database Fisik | Ruang Lingkup & Fungsi Utama |
|---|---|---|
| **OAS (Internal Staff, Workflow & Security)** | `oas__staff`, `oas__announcements`, `oas__notifications`, `oas__notification_outbox`, `oas__support_tickets`, `oas__support_messages`, `oas__system_settings`, `oas__audit_logs`, `oas__staff_shifts` | Pemisahan akun staf internal dengan pelanggan. Alur kerja approval purchase order distributor, mutasi stok, tiket helpdesk & live concierge chat handover (`bot_active` -> `waiting_agent` -> `live_chat` -> `resolved`), kolaborasi antar divisi, antrean outbox pengiriman pesan asinkron (`oas__notification_outbox`), jejak audit trail seluruh aksi sensitif (`oas__audit_logs`), shift operasional staf showroom, serta pengamanan login internal. |
| **KMS (Dual-Scope Knowledge & Compliance)** | `kms__brands_suppliers`, `kms__categories`, `kms__articles`, `kms__article_feedback`, `kms__faqs`, `kms__sop_acknowledgements` | Direktori brand resmi distributor (Sony Cinema Line, RED Digital Cinema, Canon Professional, DJI Enterprise, Aputure, Rode, Atomos, Sennheiser), basis artikel publik filmmaker, **SOP Operasional Internal Staf** (dilengkapi `audience_type`, `target_role`, `sop_code`, `priority_level`, `version`), konfirmasi pemahaman database (`kms__sop_acknowledgements`), dan analisis matriks kepatuhan staf. |
| **TPS (Catalog, Orders, Returns, Bundles & Branches)** | `tps__products`, `tps__product_variants`, `tps__product_reviews`, `tps__bundles`, `tps__bundle_items`, `tps__customers`, `tps__orders`, `tps__order_status_history`, `tps__wishlists`, `tps__store_branches`, `tps__purchase_orders`, `tps__inventory_logs`, `tps__branch_stocks`, `tps__stock_transfers`, `tps__return_requests`, `tps__return_request_photos` | Master katalog cinema hardware, varian SKU (mount type, sensor format, resolusi video), curated indie filmmaker production kits, keranjang & checkout, pengiriman ekspedisi kurir, reservasi Click & Collect showroom, audit serial number sensor & lensa, integrasi harga diskon clearance promo, preferensi notifikasi customer (`notify_email`, `notify_whatsapp`), rekam jejak timeline status pesanan (`tps__order_status_history`), dan siklus klaim retur teknis (`tps__return_requests`). |
| **MIS (Executive Reporting & Clearance)** | `mis__daily_metrics`, `mis__executive_reports`, `mis__product_performance`, `mis__sales_summary` | Agregasi data penjualan ritel, gross revenue, net margin, analisis laba kotor per model kamera & lensa, pelaporan keuangan formal, dan simulator aging deadstock. |
| **DSS (Restock Prioritization)** | `dss__criteria`, `dss__subcriteria_ranges`, `dss__ahp_matrices`, `dss__sessions`, `dss__topsis_results` | Master 5 kriteria (C1-C5), rentang subkriteria, matriks perbandingan berpasangan Saaty 5x5 (AHP), header simulasi alokasi kuota anggaran PO, dan matriks perangkingan preferensi varian hardware (TOPSIS). |

---

## Fitur Utama Berdasarkan Modul

### 1. Etalase Publik & Pengalaman Berbelanja (Customer TPS)
- **Desain Editorial Minimalis**: Tampilan Full Light Mode bernuansa premium editorial visual dengan tipografi Plus Jakarta Sans, Outfit, dan DM Sans dengan palet kertas krem hangat, tinta arang, dan aksen bronze emas `#8C7A5B`.
- **Brand Partner Infinite Marquee**: Ticker berjalan logo-logo prinsipal distributor kamera sinema & broadcast resmi (Sony Cinema Line, RED Digital Cinema, Canon Professional, DJI Enterprise, Aputure Lighting, Rode Microphones, Atomos Monitor-Recorders, Sennheiser Broadcast, ARRI, Blackmagic Design, Cooke Optics, ZEISS Cinematography) yang berjalan secara berkesinambungan tanpa jeda.
- **Hero Carousel & Editorial Manifesto**: 
  - Showcase kamera sinema flagship: Sony FX3 Cinema Line, Canon CN-E Cinema Primes, DJI Ronin 4D 6K 4-Axis, dan fasilitas Cleanroom Sensor Tech Bench.
  - Manifesto komitmen kualitas: 10-Point Sensor Calibration, Dead Pixel Scan, aperture check f/22, dan kalibrasi flens fokus infinity.
- **Floating Gear Concierge & Live Support Widget (B&H Photo Inspired)**:
  - Tombol melayang di pojok kanan bawah halaman publik (`fixed bottom-6 right-6 z-50`) dengan avatar ramah *Overtone Cinema Concierge*.
  - **Quick Topic Pills**: Pertanyaan instan seputar 10-Point Sensor Calibration & QC, pengiriman hardcase kayu ber-asuransi, ketersediaan display di Studio Camera Test Bay, dan simulasi pembayaran cicilan B2B production house.
  - **Live Agent Handover**: Pelanggan dapat meminta eskalasi langsung ke staf toko (*"Hubungi Live Agent"*). Widget otomatis masuk ke antrean (*waiting queue*) dan tersambung ke ruang *Private Live Chat* real-time saat staf showroom mengonfirmasi chat di dashboard pada kartu yang sama tanpa reload.
- **Curated Indie Filmmaker Production Kits (Paket Rig)**:
  - Showcase paket bundling rigging siap syuting (Run & Gun Indie Kit, Commercial 6K Narrative Kit, Broadcast Audio Kit).
  - Pengurangan kuota inventaris multi-komponen secara serentak (otomatis memotong stok kamera, lensa, gimbal, dan audio recorder terkait).
- **Katalog Terstruktur & Filter Lanjutan**: Eksplorasi berdasarkan kategori (*Cinema Cameras, Cine Lenses, Gimbals & Stabilizers, Studio Lighting, Wireless Audio & Mics, Monitors & Field Recorders*), lens mount (Sony E, Canon RF, Canon EF, DL Mount, PL Mount), sensor format (Full-Frame, Super 35), rentang harga, dan brand.
- **Integrasi Promo Clearance Harga Coret**: Produk berstatus clearance menampilkan badge diskon persentase dan harga coret orisinil yang tersinkronisasi otomatis dari simulator manajemen.
- **Dual Fulfillment Option**:
  - *Click & Collect*: Filmmaker memilih showroom terdekat, mendapatkan Pickup Pass berisikan kode unik, dan mengambil unit secara langsung dengan fasilitas gratis unboxing & uji 10-titik kalibrasi sensor di Cleanroom Bench.
  - *Pengiriman Ekspedisi*: Pengiriman aman menggunakan kurir logistik (JNE Trucking) lengkap dengan proteksi packing hardcase kayu anti-statis berasuransi dan pelacakan nomor resi real-time.
- **User Pill Dropdown & Manajemen Profil**:
  - Profil Saya: Pengaturan data filmmaker, kontak telepon, alamat lengkap studio, serta toggle preferensi notifikasi Email dan WhatsApp.
  - Wishlist: Akses cepat ke koleksi gear produksi yang tersimpan.
  - Riwayat Pesanan & Retur: Tombol akses langsung ke status invoice dan pengajuan garansi/retur barang.
- **Cetak / Download PDF Invoice Resmi Pelanggan**:
  - Tombol **"Cetak Invoice"** di halaman Detail/Pelacakan Pesanan (`/orders/:invoice`) dan Riwayat Pesanan (`/orders`).
  - Menghasilkan dokumen cetak E-Invoice formal berstandar korporat: Kop surat resmi **PT Overtone Retail Nusantara**, NPWP, nomor invoice, stempel badge status pembayaran (`PAID / LUNAS`), rincian nomor seri fisik (**Camera Body S/N & Lens S/N**), sertifikasi garansi resmi distributor 1-2 tahun, serta keterangan lulus uji 10-Point Sensor Calibration & Firmware QC.
- **Cetak Dokumen B2B Purchase Order (PO) Supplier**:
  - Tombol **"PDF PO"** pada panel pengadaan di modul `/manager/po`, `/finance/po`, dan `/warehouse/po`.
  - Menghasilkan lembar kerja resmi PO berstandar B2B internasional: Kop surat PT Overtone, nomor PO, data vendor/prinsipal distributor, gudang tujuan penerima (Central Distribution Center - Cikarang), kuantitas & harga modal (HPP/COGS), serta blok 3 kolom pengesahan bertanda tangan (Warehouse Lead, Retail General Manager, dan Finance Controller).
- **Direktori Showroom Resmi (Showrooms Page)**:
  - Informasi 5 flagship & pro cinema showroom (Jakarta Senayan City, Jakarta PIK Avenue, Bandung Dago, Surabaya Tunjungan Plaza 6, dan Bali Seminyak) lengkap dengan jam operasional, tautan Google Maps, tombol konsultasi WhatsApp, dan daftar fasilitas (Studio Camera Test Bay, Cleanroom Sensor Tech Bench, Cine Lens Projection Wall, Broadcast Audio Suite).

---

### 2. Navigasi Internal Dashboard (Clean Off-Canvas Hamburger Drawer)
- **Isolasi Penuh Area Internal**: Seluruh rute dashboard staf internal (`/admin/*`, `/manager/*`, `/finance/*`, `/warehouse/*`, `/store/*`) terpisah dari etalase publik dan tidak menampilkan search bar belanja umum.
- **Slide-Over Hamburger Drawer**:
  - Drawer slide-over modern dengan backdrop blur gelap yang dapat dibuka melalui tombol hamburger di topbar.
  - Header profil staf aktif menampilkan inisial avatar, nama lengkap, badge role berwarna tematik, dan tombol logout cepat.
  - Daftar navigasi menu terstruktur secara presisi sesuai dengan penugasan divisi pengguna (Super Admin, Manager, Finance, Warehouse Lead, Store Staff).
  - Terintegrasi dengan **Notification Bell** yang memuat polling real-time unread alert.
  - Dukungan tombol keyboard `Escape` dan tombol close `X` untuk menutup drawer secara instan.
- **Minimal Topbar**: Menampilkan tombol hamburger, judul halaman dinamis (Page Name), Notification Bell, dan indikator status akun aktif.

---

### 3. Dual-Scope Knowledge Management System (KMS & SOP Staf)
Sistem KMS beroperasi secara **Dual-Scope** yang memisahkan panduan pelanggan dengan SOP operasional staf OAS:
- **Customer Knowledge Base (Publik)**:
  - Endpoint `GET /api/kms/articles` & `GET /api/kms/public-articles` terisolasi ketat hanya menyajikan artikel `audience_type == 'customer'`. Dokumen rahasia perusahaan tidak akan bocor ke publik.
- **Internal Staff SOP (Khusus Pegawai OAS)**:
  - Tersedia di portal `/warehouse/sop`, `/store/sop`, `/manager/sop`, `/finance/sop`, dan `/admin/sop`.
  - Terdistribusi otomatis ke staf berdasarkan role JWT login: menampilkan gabungan **SOP Khusus Divisinya** + **SOP Umum Perusahaan (`all_internal`)**.
  - Dilengkapi tab filter interaktif: *Semua SOP Saya*, *SOP Khusus Divisi*, *SOP Umum Perusahaan*, dan *SOP Kritis*, serta pencarian kata kunci real-time.
  - Badge pembeda jelas: badge divisi (emas/hitam/biru/hijau/ungu) vs badge umum (abu-abu), kode dokumen resmi (`SOP-GEN-001`, `SOP-WH-001`, `SOP-WH-002`, `SOP-STR-001`, `SOP-STR-002`, `SOP-FIN-001`, `SOP-MGR-001`), dan badge urgensi (`Standard`, `Mandatory`, `Critical`).
  - **Document Reader Modal**: Tampilan baca langkah-demi-langkah yang rapi, tombol cetak dokumen SOP, serta tombol verifikasi *"Tandai Telah Dibaca & Dipahami"* yang tersimpan permanen di database.
- **Widget Ringkas di Dashboard Divisi (`QuickSopWidget`)**:
  - Terpasang pada dashboard utama Warehouse, Store, Finance, dan MIS Manager: menampilkan 3 SOP divisi terpenting, badge reaktif jumlah SOP yang belum dikonfirmasi, dan tombol pintas *"Lihat Semua SOP"*.
- **Pusat Manajemen KMS Super Admin (`/admin/kms`)**:
  - Desain Full Light Mode Editorial Minimalist dengan ringkasan KPI metrics.
  - **Tab 1: Dokumen & SOP**: Master manajemen artikel customer & internal SOP dengan modal form Segmented Radio Card dual-scope (Target Divisi, Kode SOP, Tingkat Kepentingan, Pratinjau).
  - **Tab 2: Kategori KMS**: Manajemen data master kategori pengetahuan sinema.
  - **Tab 3: Matriks Kepatuhan Staf (Compliance Matrix)**:
    * Panel analitik kepatuhan yang terletak khusus di dalam tab KMS (tidak membebani hamburger menu).
    * **4 Summary KPI Cards**: Tingkat Kepatuhan Perusahaan (%), Total Karyawan Aktif, Total SOP Terbit, dan Total Checklist Selesai.
    * **Tabel 1 (Kepatuhan per Personel Staf)**: Memantau kepatuhan membaca tiap staf, persentase kepatuhan, serta rincian SOP versi baru yang belum dibaca ulang (*outdated SOPs*) atau belum pernah dibaca (*missing SOPs*).
    * **Tabel 2 (Tingkat Pemahaman per Dokumen SOP)**: Evaluasi persentase personel yang telah mengonfirmasi pemahaman terhadap setiap instruksi kerja, divisi sasaran, dan tingkat prioritasnya.

---

### 4. Deadstock Aging & Clearance Promo Simulator (MIS × Finance × TPS)
Modul simulasi strategis untuk mengatasi modal beku inventaris ritel di `/manager/clearance` dan `/finance/clearance`:
- **Klasifikasi Umur Inventaris (Aging Bucket)**:
  * 🟢 **Fresh (<30 hari)**: Perputaran sehat, tidak memerlukan intervensi diskon.
  * 🟡 **Moderate (31 - 60 hari)** & **Slow-Moving (61 - 90 hari)**: Mulai melambat, kandidat promo produksi.
  * 🔴 **Deadstock / Dormant (>90 hari & >180 hari)**: Modal inventaris beku kritis yang perlu segera dilikuidasi.
- **Indikator Metrik Finansial**:
  * Total Modal Beku (Frozen Capital) berdasarkan HPP/COGS kamera dan lensa.
  * Biaya Simpan Gudang & Kelembapan (Holding Cost / Dry Cabinet Maintenance: 1.5% per bulan).
  * Proyeksi Nilai Pemulihan Kas (Cash Recovery Projection).
  * Potensi Kerugian / Potongan Margin Kotor (Margin Sacrifice).
- **Margin Guardrail Anti-Rugi**:
  * 🟢 `SAFE_PROFIT`: Harga simulasi di atas batas aman margin kotor.
  * 🟡 `BREAK_EVEN`: Harga simulasi tepat di batas impas (margin ≤ 5% di atas HPP).
  * 🔴 `BELOW_COGS_DANGER`: Peringatan sistem bahwa harga simulasi di bawah modal HPP/COGS (dilarang atau memerlukan izin khusus).
- **Simulasi 3 Tier Diskon Clearance**:
  * **Tier A (15% Diskon)**: Diskon ringan untuk inventaris melambat.
  * **Tier B (25% Diskon)**: Diskon moderat untuk inventaris stagnan.
  * **Tier C (40% Diskon Clearance)**: Likuidasi agresif untuk gear dormant di atas batas HPP.
- **Eksekusi Langsung ke TPS Katalog**:
  * Tombol *"Terapkan Promo ke Katalog Publik"* langsung mengaktifkan flag `is_clearance_sale`, menetapkan persentase diskon, dan menampilkan harga coret di etalase filmmaker.
  * Tombol *"Batalkan Promo"* untuk memulihkan harga hardware ke harga normal.

---

### 5. Modul Gudang & Logistik (Warehouse Lead & Staff)
- **Monitoring Stok Fisik & Serial Number**: Pemantauan kuota inventaris fisik per model kamera, lensa, dan varian SKU.
- **Kartu Stok & Adjustment Opname**: Pencatatan mutasi kuantitas masuk/keluar, nomor seri sensor kamera & lensa (Camera Body S/N & Lens S/N), dan audit log opname di `tps__inventory_logs`.
- **Stok Menipis (Restock Alerts)**: Indikator otomatis untuk cinema gear dengan sisa unit kritis (di bawah ambang batas minimal) yang otomatis memicu notifikasi internal.
- **Pengadaan Barang (Purchase Order)**: Pembuatan pengajuan restock cinema hardware baru ke prinsipal/distributor resmi (Sony, RED, Canon, DJI) yang diteruskan ke Manager untuk persetujuan.
- **Pemrosesan Ekspedisi**: Antarmuka quality check, pengecekan nomor seri sensor, packing hardcase kayu aman anti-statis, dan penginputan nomor resi pengiriman kurir.
- **Penerimaan Fisik Retur & Restock Otomatis (`/warehouse/returns`)**:
  - Antrean penerimaan barang retur yang telah disetujui toko.
  - Verifikasi kelengkapan unit, nomor seri sensor, dan pengujian cleanroom dead pixel test.
  - Eksekusi tombol *"Terima Fisik & Restock"* yang secara otomatis memulihkan stok varian di kartu inventaris dengan catatan mutasi `return_restock`.
- **Mutasi Antar-Cabang (`/warehouse/transfers`)**: Pemrosesan transfer unit antar Central Distribution Center Cikarang dengan showroom-showroom daerah.
- **Widget & Portal SOP Gudang**: Akses langsung ke dokumen standar packing hardcase kayu (`SOP-WH-001`) dan inspeksi retur cleanroom (`SOP-WH-002`).

---

### 6. Modul Toko & Showroom (Store Staff)
- **Showroom POS Kasir (`/store/pos`)**:
  - Pilihan pelanggan cepat: `Walk-In Filmmaker` atau pencarian data pelanggan terdaftar.
  - Filter kategori cepat: Semua Produk, *Indie Filmmaker Kits*, *Cinema Cameras*, *Cine Lenses*, dan *Lighting & Audio*.
  - Dukungan bundling multi-stok otomatis serta metode pembayaran Tunai (dengan hitung kembalian instan) atau QRIS.
  - **Modal Struk Resmi**: Cetak struk transaksi bertuliskan `OVERTONE PRO CINEMA` lengkap dengan rincian garansi resmi distributor dan sertifikasi 10-Point Sensor QC.
- **Live Chat Console & Helpdesk (`/store/support`)**:
  - Menerima permintaan konsultasi teknis dari widget filmmaker di katalog publik.
  - Tombol *"Terima / Konfirmasi Chat"* untuk menghubungkan staf dengan pelanggan secara private real-time.
  - Penutupan sesi chat dengan resolusi bantuan resmi.
- **Serah-Terima Click & Collect (`/store/pickups`)**: Verifikasi kode unik ambil barang (Pickup Pass) saat filmmaker tiba di showroom dan konfirmasi serah-terima unit beserta checklist uji coba di Studio Camera Test Bay & kalibrasi sensor.
- **Review & Approval Klaim Retur Toko (`/store/returns`)**:
  - Memverifikasi klaim garansi/retur yang diajukan customer.
  - Meninjau alasan teknis (dead pixel sensor, flange distance alignment, autofokus error, dsb.) dan galeri foto bukti unboxing.
  - Menyetujui (*Approve*) atau menolak (*Reject*) klaim disertai catatan evaluasi resmi, yang langsung memicu notifikasi ke pelanggan dan tim gudang.
- **Manajemen Katalog & SKU (`/store/catalog`)**: Pembuatan produk baru, spesifikasi teknis sensor format, lens mount, resolusi video output, foto hardware, dan varian SKU.
- **Presensi Shift Kerja (`/store/attendance`)**: Gate kehadiran staf showroom dengan pencatatan shift pagi/siang dan log aktivitas test bay.
- **Widget & Portal SOP Showroom**: Akses cepat ke prosedur Click & Collect (`SOP-STR-001`) dan protokol test bay demo (`SOP-STR-002`).

---

### 7. Modul Manajemen & Persetujuan (Retail General Manager)
- **Approval Purchase Order (PO)**: Peninjauan pengajuan pengadaan barang dari staf gudang sebelum diteruskan ke bagian Finance untuk pelunasan tagihan supplier.
- **Product Bundle & Indie Filmmaker Rig Creator (`/manager/bundles`)**:
  - Rakit paket cinema gear komplit (kamera + lensa + stabilizer + audio/lighting) dengan harga paket hemat.
  - Diproteksi otomatis oleh **Margin Guardrail System** yang memvalidasi harga paket tidak boleh lebih rendah dari total HPP komponen.
- **Master Katalog Cinema Gear & Penetapan Harga (`/manager/catalog`)**: Pengaturan HPP (COGS), margin keuntungan ritel, dan aktivasi SKU hardware.
- **Administrasi Brand & Supplier Resmi (`/manager/suppliers`)**: Pusat data distributor resmi kamera bioskop dan broadcast gear internasional.
- **MIS Executive Dashboard**: Pemantauan ringkasan omset penjualan harian, pergerakan unit terjual, perbandingan COGS, dan pangsa pasar gear terlaris.
- **Deadstock Simulator**: Analisis kamera/lensa mengendap dan penentuan strategi clearance promo.
- **Rekapitulasi Shift Staf (`/manager/shifts`)**: Monitoring log pergantian shift kerja seluruh cabang showroom.
- **Widget & Portal SOP Manajerial**: Akses panduan evaluasi DSS restock dan batas aman diskon clearance (`SOP-MGR-001`).

---

### 8. Modul Keuangan & Akuntansi (Finance Controller)
- **Halaman Mandiri Tanpa Tabs**: Setiap modul operasional keuangan memiliki rute halaman mandiri:
  - *Laporan Keuangan & Laba Rugi (`/finance/dashboard` atau `/finance/laporan`)*: Metrik omset kotor, total HPP (COGS), laba kotor, persentase gross margin, dan rincian profitabilitas per model kamera & lensa.
  - *Ekspor Laporan PDF*: Tombol cetak/ekspor dokumen resmi laporan laba rugi berformat formal standar akuntansi yang mencakup kop perusahaan, tabel finansial, serta kolom persetujuan bertanda tangan Finance Controller dan General Manager.
  - *Deadstock & Clearance Simulator (`/finance/clearance`)*: Evaluasi dampak margin terhadap likuidasi stok lama.
  - *Pembayaran PO Supplier (`/finance/po`)*: Eksekusi pelunasan tagihan supplier resmi berstatus approved dengan input nomor referensi transfer bank dan catatan pembukuan.
  - *Pencairan Dana Refund Retur (`/finance/refunds`)*: Persetujuan pengembalian dana pelanggan retur yang telah diverifikasi fisik oleh gudang. Eksekusi refund otomatis mengubah status pesanan menjadi `refunded` dan mengirimkan notifikasi ke filmmaker.
  - *Audit Transaksi Penjualan (`/finance/transactions`)*: Buku besar audit trail seluruh pesanan masuk, metode fulfillment kasir, dan status pembayaran.
  - *Widget & Portal SOP Keuangan*: Akses SOP verifikasi PO dan pencairan refund (`SOP-FIN-001`).

---

### 9. Modul Hak Akses & Administrasi Akun (Super Administrator)
- **Manajemen Akun Terisolasi (OAS vs TPS)**:
  - *Manajemen Staf Internal (OAS)*: Pembuatan akun pegawai, penggantian penugasan role (Super Admin, Manager, Finance, Warehouse Staff, Store Staff), dan penonaktifan sementara (suspend).
  - *Direktori Filmmaker & Pelanggan (TPS)*: Monitoring akun pelanggan publik, nomor kontak, riwayat studio/alamat, dan hak pemblokiran akun bermasalah.
- **Dual-Scope KMS Master Management (`/admin/kms`)**: Pembuatan dan kurasi artikel publik pelanggan maupun dokumen SOP rahasia operasional staf seluruh divisi beserta pemantauan matriks kepatuhan staf.
- **Audit Trail & Log Aktivitas Sistem (`/admin/audit-logs`)**: Pengawasan menyeluruh terhadap setiap perubahan data sensitif di seluruh sistem.

---

### 10. Sistem Pendukung Keputusan / Smart Restock DSS (Hybrid AHP-TOPSIS)
- **Struktur Algoritma Multi-Kriteria Ritel Rinci**:
  - **Kriteria C1 (Penjualan Historis)**: Bobot prioritas kecepatan perputaran unit kamera/lensa.
  - **Kriteria C2 (Margin Keuntungan Kotor)**: Selisih harga jual ritel terhadap harga pokok pembelian distributor (HPP/COGS).
  - **Kriteria C3 (Lead Time Supplier)**: Waktu tunggu pengiriman dari pabrik prinsipal internasional.
  - **Kriteria C4 (Ketersediaan Stok Fisik)**: Rasio sisa unit di gudang untuk mencegah *out-of-stock*.
  - **Kriteria C5 (Minat Filmmaker / Demand)**: Metrik interaksi penambahan Wishlist dan pageviews katalog.
- **Matriks Perbandingan Berpasangan Saaty 5x5 (AHP)**: Penentuan bobot kriteria dengan perhitungan eigenvector dan uji konsistensi rasio (*Consistency Ratio / CR ≤ 0.10*).
- **Perangkingan Preferensi Solusi Ideal (TOPSIS)**: Normalisasi matriks keputusan, pembobotan ternormalisasi, penentuan solusi ideal positif ($A^+$) dan negatif ($A^-$), jarak Euclidean ($D^+$ dan $D^-$), serta koefisien kedekatan ($V_i$).
- **Optimasi Alokasi Anggaran Belanja PO**: Pengurutan rekomendasi hardware berdasarkan ranking preferensi tertinggi yang disaring dalam kuota batas anggaran (*Within Budget* vs *Budget Exceeded*).
- **Konversi Instan ke Purchase Order**: Tombol satu-klik untuk langsung membuat draf Purchase Order resmi di subsistem OAS.

---

### 11. Audit Log & Jejak Keamanan Sistem
- **Tabel Append-Only (`oas__audit_logs`)**:
  - Menyimpan rekaman riwayat permanen seluruh aksi sensitif: update harga katalog/tier, persetujuan PO, pembayaran PO, proses refund, penerimaan fisik retur, penerapan clearance promo, penggantian role staf, suspend/aktivasi akun, dan login internal.
  - Skema data memuat `actor_type`, `actor_name`, `actor_role`, `action`, `entity_type`, `entity_id`, snapshot perubahan `before_json` dan `after_json`, `ip`, `user_agent`, serta timestamp UTC.
- **Konsol Audit Super Admin (`/admin/audit-logs`)**:
  - Filter interaktif berdasarkan aksi, tipe entitas, role staf, rentang tanggal, dan pencarian kata kunci.
  - **Diff State Modal**: Jendela inspeksi perbandingan state *Before vs After* dengan highlight perubahan data.
  - **Ekspor CSV Streaming**: Pengunduhan data log audit ke format CSV dengan filter yang sedang aktif.

---

### 12. Pusat Notifikasi Terpadu / Notification Center
- **Tabel Notifikasi Lanjutan (`oas__notifications`)**:
  - Kolom `recipient_type` (staf/customer), `recipient_role` (broadcast per peran divisi), `type` (kategori spesifik), `read_at` (waktu baca), dan `dedupe_key` (kunci unik pencegah spam/duplikasi dalam 24 jam).
- **Service Event Triggers (`app/notifications.py`)**:
  - `notify_po_pending_approval`: Notifikasi otomatis ke General Manager saat gudang mengajukan PO restock baru.
  - `notify_low_stock`: Peringatan otomatis ke tim gudang saat persediaan hardware turun di bawah ambang batas minimum.
  - `notify_live_chat_queue`: Peringatan ke tim showroom saat ada filmmaker masuk antrean konsultasi live concierge.
  - `notify_refund_submitted`: Peringatan verifikasi ke tim showroom dan finance saat ada pengajuan retur baru.
  - `notify`: Notifikasi personal ke pelanggan saat status pesanan atau klaim retur diperbarui.
- **Frontend Notification Bell (`NotificationBell.jsx`)**:
  - Terpasang di topbar drawer internal staf (`InternalLayout.jsx`) dan Navbar publik toko.
  - Badge angka unread real-time dengan polling otomatis tiap 30 detik.
  - Dropdown 10 notifikasi terbaru dengan ikon visual tematik per divisi, penandaan instan dibaca, dan tombol "Tandai Semua Dibaca".

---

### 13. Notifikasi Pesanan & Live Tracking Timeline: Email + WhatsApp
- **Arsitektur Pengiriman Pesan Asinkron (`oas__notification_outbox`)**:
  - Desain decoupled outbox: mutasi pesanan/checkout tidak pernah terblokir oleh kegagalan koneksi jaringan email/WhatsApp eksternal.
  - Worker outbox mandiri (`backend/app/services/outbox_service.py`) dengan batas toleransi retry maksimal 3 kali dan logging error mendalam.
  - Provider WhatsApp fleksibel (`backend/app/providers/whatsapp.py`) dengan fallback simulasi otomatis pada lingkungan development.
  - Template email HTML bergaya editorial Overtone Pro Cinema dan template teks WhatsApp berformat rapi di `backend/app/services/notif_templates.py`.
- **Audit Timeline Siklus Pesanan (`tps__order_status_history`)**:
  - Mencatat setiap transisi status pesanan (`created`, `payment_confirmed`, `packed`, `shipped`, `ready_for_pickup`, `picked_up`, `refund_processed`) beserta aktor pengubah, catatan inspeksi sensor QC, dan timestamp.
- **Halaman Pelacakan Pesanan & Timeline Stepper (`/orders/:invoice` & `/track`)**:
  - Stepper interaktif 5 tahap yang responsif untuk pengiriman ekspedisi kurir maupun serah-terima Click & Collect showroom.
  - Fasilitas salin nomor resi pengiriman satu-klik dan tombol cek resi ekspedisi langsung.
  - Kartu *Showroom Pickup Pass* lengkap dengan kode verifikasi pickup instan.
  - **Portal Pelacakan Tamu (`/track`)**: Memungkinkan pelanggan memeriksa status pesanan secara publik tanpa login cukup dengan memasukkan Nomor Invoice + Email atau Nomor WhatsApp pemesan.
- **Preferensi Notifikasi Pelanggan (`ProfileModal.jsx`)**:
  - Saklar pilihan saluran mandiri di profil filmmaker: Toggle Notifikasi WhatsApp dan Toggle Notifikasi Email.

---

### 14. Alur Klaim Retur & Garansi Pelanggan
- **Siklus End-to-End 4 Tahap Terpadu (TPS × OAS × Finance)**:
  1. *Customer Submission (`/returns` atau `/orders`)*: Pelanggan mengajukan klaim untuk pesanan berstatus delivered/collected dalam jendela retur 7 hari (`return_window_days`). Formulir dilengkapi pemilihan kendala teknis (dead pixel sensor, sensor misalignment, error firmware, cacat fisik, kerusakan ekspedisi), deskripsi rinci, pilihan solusi (refund/tukar unit/servis), dan lampiran foto unboxing/kerusakan.
  2. *Store Staff Review (`/store/returns`)*: Antrean review showroom untuk memverifikasi keabsahan klaim dengan aksi Approve atau Reject disertai catatan evaluasi resmi. Notifikasi otomatis diteruskan ke tim gudang dan pelanggan.
  3. *Warehouse Receive & Restock (`/warehouse/returns`)*: Penerimaan paket fisik di gudang pusat, verifikasi nomor seri sensor, pengujian cleanroom dead pixel test, dan otomatisasi pemulihan mutasi inventaris stok (`change_type="return_restock"`).
  4. *Finance Refund Execution (`/finance/refunds`)*: Tim finance mencairkan pengembalian dana transaksi dengan referensi nomor RMA, alasan retur, dan status penerimaan gudang. Status order berubah menjadi `refunded` dan notifikasi penyelesaian terkirim ke customer.

---

### 15. SOP Acknowledgment & Matriks Kepatuhan Staf
- **Persistensi Konfirmasi Pemahaman SOP & Version Invalidation**:
  - Tabel `kms__sop_acknowledgements` dengan unique constraint `(staff_id, article_id, article_version)` menjamin integritas audit kepatuhan.
  - Kolom `version` pada tabel `kms__articles` bertambah secara otomatis (+1) setiap kali manajemen memperbarui materi isi, judul, atau peran target SOP.
  - Reset status otomatis: Kenaikan versi SOP langsung membatalkan status pemahaman sebelumnya dan memunculkan badge peringatan *"Perlu Dibaca Ulang (Versi Baru)"*.
- **Widget & Portal SOP**:
  - Reader modal di `InternalSopPortal.jsx`: Tombol *"Tandai Telah Dibaca & Dipahami"* yang tersimpan ke database audit.
  - `QuickSopWidget.jsx`: Menampilkan badge reaktif jumlah SOP yang belum dikonfirmasi oleh staf divisi terkait.
  - **Panel Matriks Kepatuhan Staf (Compliance)**: Dikelola langsung melalui **Tab 3 di halaman KMS Admin (`/admin/kms?tab=compliance`)** tanpa mengotori drawer menu navigasi.

---

### 16. Keamanan Login Internal OAS & Audit Lockout
- **Isolasi Portal Staf Internal (`/internal/portal`)**: Form masuk khusus staf toko, gudang, finance, manager, dan super admin.
- **Pencegahan Brute-Force & Account Lockout**:
  - Sistem melacak kegagalan login berturut-turut pada akun staf internal.
  - Akun staf yang mengalami 5 kali kegagalan login berturut-turut secara otomatis dikunci sementara (*locked out*) selama 15 menit.
- **Audit Trail Login**:
  - Setiap upaya login staf dicatat ke `oas__audit_logs` (`LOGIN_STAFF_SUCCESS`, `LOGIN_STAFF_FAILED`, `LOGIN_BLOCKED`).

---

## Akun Demo untuk Pengujian Sistem

Seluruh akun demo telah disiapkan melalui database seeder master (`backend/init_overtone_db.py`):

| Role Akses | Email / Username Demo | Password | Rute Utama & Ruang Lingkup Hak Akses |
|---|---|---|---|
| **Super Administrator** | `admin@overtone.id` (atau `admin`) | `password123` | `/admin/dashboard`, `/admin/users`, `/admin/kms`, `/admin/sop`, `/admin/audit-logs` (Kontrol sistem menyeluruh, RBAC staf, approval katalog cinema gear, KMS dual-scope, compliance matrix, dan audit trail). |
| **Retail General Manager** | `manager@overtone.id` (atau `manager`) | `password123` | `/admin/mis`, `/manager/dss`, `/manager/clearance`, `/manager/bundles`, `/manager/catalog`, `/manager/suppliers`, `/manager/po`, `/manager/shifts`, `/manager/sop` (MIS Dashboard, DSS restock, simulasi clearance promo, bundle rig creator, approval PO, cetak PDF PO). |
| **Finance Controller** | `finance@overtone.id` (atau `finance`) | `password123` | `/finance/dashboard`, `/finance/clearance`, `/finance/po`, `/finance/refunds`, `/finance/transactions`, `/finance/sop` (Laporan P&L, cetak PDF P&L, pelunasan PO, cetak PDF PO, pencairan refund retur, audit transaksi). |
| **Warehouse Lead** | `warehouse@overtone.id` (atau `warehouse`) | `password123` | `/warehouse/inventory`, `/warehouse/dss`, `/warehouse/po`, `/warehouse/orders`, `/warehouse/returns`, `/warehouse/transfers`, `/warehouse/logs`, `/warehouse/sop` (Kartu stok fisik, nomor seri sensor kamera, pengajuan PO, cetak PDF PO, resi kurir, penerimaan retur & restock fisik). |
| **Store Showroom Staff** | `store@overtone.id` (atau `store`) | `password123` | `/store/pos`, `/store/support`, `/store/returns`, `/store/catalog`, `/store/pickups`, `/store/attendance`, `/store/sop` (Showroom POS kasir, live chat console, review klaim retur toko, serah-terima Click & Collect, input varian SKU). |
| **Pelanggan / Filmmaker (TPS)** | `customer@overtone.id` (atau `customer`) | `password123` | `/`, `/catalog`, `/products/:id`, `/checkout`, `/orders`, `/returns`, `/track` (Katalog etalase cinema, live concierge widget, checkout ekspedisi/pickup, tracking pesanan, cetak PDF Invoice resmi ber-serial number, klaim retur). |
| **Filmmaker Tamu (Guest)** | *(Tanpa Login)* | *(Tanpa Login)* | `/track` (Portal pelacakan pesanan publik menggunakan Nomor Invoice + Email atau No. WhatsApp). |

> [!NOTE]
> Sistem autentikasi mendukung login fleksibel menggunakan email resmi `@overtone.id` maupun username singkat (`admin`, `manager`, `finance`, `warehouse`, `store`, `customer`). Portal masuk staf internal dapat diakses melalui `/internal/portal`, sedangkan filmmaker/pelanggan umum masuk melalui `/login`.

---

## Prasyarat Lingkungan Pengembangan

1. **MySQL Server**: Tersedia melalui XAMPP atau instalasi MySQL lokal mandiri (Port default 3306).
2. **Python**: Versi 3.10 atau lebih tinggi (Virtualenv di `backend/venv`).
3. **Node.js**: Versi 18.x atau lebih tinggi (disertai npm).

---

## Panduan Instalasi & Menjalankan Sistem

### 1. Konfigurasi Database MySQL
Pastikan modul MySQL pada control panel XAMPP telah aktif (Port 3306).
Buat database bernama `overtone_store` (atau jalankan script seeder yang otomatis membuatnya):
```sql
CREATE DATABASE IF NOT EXISTS overtone_store CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Setup Backend (Flask REST API)
Buka terminal dan arahkan ke direktori backend:
```bash
cd backend

# Buat virtual environment Python (jika belum ada)
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

# Jalankan Master Script Inisialisasi Database (Otomatis Reset & Reseed Lengkap dengan Data Cinema)
python init_overtone_db.py

# Jalankan server API backend Flask
python run.py
```
Backend API akan aktif melayani request di: `http://127.0.0.1:5000`

> [!TIP]
> Perintah `python init_overtone_db.py` merupakan **Master Consolidation Script** yang secara otomatis:
> 1. Memeriksa dan membuat database MySQL `overtone_store` (utf8mb4).
> 2. Membangun seluruh skema tabel 5 subsistem (`oas__`, `kms__`, `tps__`, `mis__`, `dss__`).
> 3. Mengisi 8 brand distributor kamera sinema & broadcast, 8 kategori, 11 produk hardware dengan 18 varian SKU, 3 Indie Filmmaker Rig Bundles, 6 cabang (CDC Cikarang + 5 Showroom Flagship), 6 akun staf OAS, 5 akun filmmaker, 20 pesanan omnichannel, 7 dokumen SOP internal dual-scope, kriteria & matriks 5x5 AHP-TOPSIS, metrik MIS, serta simulasi aging clearance.

### 3. Setup Frontend (React + Vite + Tailwind CSS)
Buka terminal baru dan arahkan ke direktori frontend:
```bash
cd frontend

# Install seluruh paket dependensi Node.js
npm install

# Jalankan server pengembangan Vite
npm run dev

# Atau verifikasi build produksi
npm run build
```
Aplikasi web frontend akan aktif di: `http://localhost:5173`

---

## Ringkasan Endpoint REST API Backend

### Autentikasi & Profil Pengguna (`/api/auth`)
- `POST /api/auth/login`: Autentikasi akun pelanggan publik (email & password).
- `POST /api/auth/admin/login`: Autentikasi staf internal OAS (username & password) dengan audit log.
- `POST /api/auth/register`: Pendaftaran akun filmmaker / pelanggan baru.
- `GET /api/auth/me`: Verifikasi sesi token JWT aktif dan profil pengguna.
- `PUT /api/auth/profile`: Pembaruan nama, kontak, alamat pengiriman studio, dan preferensi notifikasi (Email / WA).

### Dual-Scope Knowledge Management System (`/api/kms` & `/api/admin/kms`)
- `GET /api/kms/articles`: Katalog artikel panduan publik pelanggan (terisolasi ketat, SOP internal dilarang tampil).
- `GET /api/kms/public-articles`: Alias endpoint artikel publik untuk FAQ dan panduan gear sinema.
- `GET /api/kms/articles/<id>`: Detail isi artikel (verifikasi hak akses jika berstatus dokumen internal).
- `GET /api/kms/internal-sops`: Distribusi dokumen SOP staf internal berdasar role JWT (`target_role == current_user.role` atau `all_internal`).
- `POST /api/kms/internal-sops/<id>/acknowledge`: Konfirmasi staf telah membaca dan memahami versi SOP ke database.
- `GET /api/kms/admin/kms/sop-compliance`: Endpoint Super Admin & Manager untuk melihat laporan matriks kepatuhan staf, analisis pemahaman per SOP, dan daftar SOP tertunda.
- `GET|POST /api/admin/kms/articles`: Endpoint Super Admin untuk melihat seluruh dokumen atau membuat panduan publik/SOP internal baru.
- `PUT|DELETE /api/admin/kms/articles/<id>`: Endpoint Super Admin untuk mengedit atau menghapus dokumen KMS/SOP (otomatis menaikkan versi SOP jika diubah).

### Live Chat Concierge & Helpdesk Tiket (`/api/store` & `/api/oas`)
- `POST /api/store/support/chat-handover`: Eskalasi sesi bot ke antrean staf showroom (*waiting agent*).
- `GET /api/store/support/active-chats`: Daftar antrean chat masuk untuk dikonfirmasi staf showroom.
- `POST /api/store/support/confirm-chat`: Staf mengambil alih sesi chat menjadi *live chat*.
- `POST /api/store/support/messages`: Pengiriman pesan real-time antara filmmaker dan staf showroom.

### Deadstock Aging & Clearance Promo Simulator (`/api/clearance`)
- `GET /api/clearance/aging-analysis`: Analisis aging inventaris fisik (<30 hari, 31-60 hari, 61-90 hari, >90 hari), nilai modal beku, holding cost, dan evaluasi margin guardrail.
- `GET /api/clearance/tiers`: Rekomendasi 3 tier promo diskon clearance (Tier A, Tier B, Tier C).
- `POST /api/clearance/apply-tier`: Penerapan diskon clearance ke produk TPS (menampilkan harga coret di etalase publik).
- `POST /api/clearance/remove-tier`: Pembatalan diskon clearance (harga kembali normal).

### Katalog Publik, Transaksi & Pelacakan Pesanan (`/api/orders` & `/api/products`)
- `GET /api/products` (alias `/api/events`): Daftar katalog cinema gear dengan filter kategori, brand, mount, status, dan pencarian teks.
- `GET /api/products/<id>`: Rincian spesifikasi sensor, mount type, resolusi video, galeri gambar, dan varian SKU aktif.
- `POST /api/orders`: Pembuatan transaksi pesanan baru (Click & Collect atau Ekspedisi).
- `GET /api/orders/my`: Riwayat pesanan dan status invoice pengguna yang sedang login.
- `GET /api/orders/<invoice_code>`: Informasi detail pesanan, kode pickup showroom, atau nomor resi kurir.
- `GET /api/orders/<invoice_code>/timeline`: Riwayat kronologis jejak status pesanan dan inspeksi sensor QC.
- `GET /api/orders/track` (atau `/api/track`): Pelacakan status pesanan publik tamu dengan verifikasi Invoice + Email / No. WhatsApp.

### Alur Retur & Klaim Garansi Pelanggan (`/api/returns`)
- `POST /api/returns`: Pelanggan mengajukan klaim retur untuk pesanan delivered/collected (alasan, deskripsi teknis, resolusi, foto bukti).
- `GET /api/returns/my`: Daftar riwayat pengajuan retur milik pelanggan login.
- `GET /api/returns/<id>`: Rincian detail pengajuan retur.
- `GET /api/returns/store/queue`: Antrean review klaim retur untuk Store Staff showroom.
- `POST /api/returns/<id>/review`: Store Staff menyetujui (*approve*) atau menolak (*reject*) klaim retur disertai catatan evaluasi.
- `GET /api/returns/warehouse/queue`: Antrean retur berstatus approved yang menunggu penerimaan paket fisik di gudang.
- `POST /api/returns/<id>/receive`: Warehouse Staff menerima fisik barang, memverifikasi nomor seri sensor, pengujian dead pixel, dan memulihkan stok ke kartu inventaris.

### Notification Center & Outbox Tracking (`/api/notifications`)
- `GET /api/notifications`: Daftar notifikasi in-dashboard pengguna/staf login (mendukung filter `?unread_only=true` dan `?type=...`).
- `GET /api/notifications/unread-count`: Polling jumlah notifikasi belum dibaca untuk lencana lonceng.
- `POST /api/notifications/<id>/read`: Menandai satu notifikasi sebagai telah dibaca.
- `POST /api/notifications/read-all`: Menandai seluruh notifikasi aktif sebagai telah dibaca.
- `GET /api/notifications/outbox`: Monitoring antrean pengiriman email dan WhatsApp outbox (khusus internal staf).
- `POST /api/notifications/outbox/process`: Trigger pemrosesan batch antrean outbox dengan toleransi retry.
- `POST /api/notifications/test-trigger`: Pengujian pemicuan event notifikasi (stok kritis, PO approval, support queue, refund).

### Gudang & Inventaris (`/api/warehouse`)
- `GET /api/warehouse/inventory`: Monitoring persediaan fisik per produk dan per varian SKU.
- `GET /api/warehouse/summary`: Metrik ringkas total SKU, jumlah stok kritis, dan pesanan siap kirim.
- `POST /api/warehouse/logs`: Pencatatan mutasi stok opname dan pembaruan nomor seri fisik kamera/lensa.
- `GET /api/warehouse/logs`: Audit trail riwayat pergerakan stok barang.
- `GET|POST /api/warehouse/po`: Pemantauan dan pengajuan Purchase Order baru ke distributor.
- `POST /api/warehouse/orders/<id>/dispatch`: Pembaruan nomor resi kurir ekspedisi untuk pesanan kirim.

### Keuangan & Akuntansi (`/api/finance`)
- `GET /api/finance/pnl`: Laporan komprehensif laba rugi, total omset, COGS pengadaan, dan margin per model cinema gear.
- `GET /api/finance/pos`: Daftar tagihan Purchase Order distributor yang siap dibayar atau telah lunas.
- `POST /api/finance/pos/<id>/pay`: Konfirmasi pelunasan tagihan supplier dengan nomor referensi transfer.
- `GET /api/finance/refunds`: Daftar pesanan retur yang siap dicairkan dananya setelah verifikasi fisik gudang.
- `POST /api/finance/orders/<id>/refund`: Eksekusi pencairan pengembalian dana pelanggan (mencatat RMA dan audit trail).
- `GET /api/finance/transactions`: Audit log transaksi penjualan ritel.

### Sistem Pendukung Keputusan / DSS Restock Prioritization (`/api/dss`)
- `GET /api/dss/config`: Master 5 kriteria multi-dimensi (C1-C5), rentang subkriteria, bobot AHP, dan status konsistensi CR.
- `POST /api/dss/ahp-matrix`: Update pairwise comparison Saaty 5x5, kalkulasi eigenvector bobot prioritas, dan uji konsistensi CR (CR <= 0.10).
- `POST /api/dss/run-simulation`: Eksekusi perhitungan TOPSIS lengkap, perangkingan preferensi varian hardware, optimasi batas kuota anggaran belanja PO, serta audit matrix step-by-step.
- `GET /api/dss/sessions`: Riwayat sesi simulasi pengadaan tersimpan.
- `GET /api/dss/sessions/<id>`: Detail sesi simulasi beserta matriks ranking seluruh SKU cinema gear.
- `POST /api/dss/generate-po/<id>`: Konversi otomatis varian dalam kuota anggaran (within budget) menjadi Purchase Order resmi siap diapprove.

### Manajemen Staf & Administrasi (`/api/admin`)
- `GET /api/admin/staff`: Daftar seluruh pegawai internal OAS dengan filter role.
- `POST /api/admin/staff`: Pendaftaran akun pegawai internal baru.
- `PUT /api/admin/staff/<id>/role`: Perubahan hak akses penugasan role pegawai internal.
- `POST /api/admin/staff/<id>/toggle-status`: Penangguhan (suspend) atau pengaktifan kembali akun staf.
- `GET /api/admin/customers`: Daftar direktori filmmaker/pelanggan terdaftar di subsistem TPS.
- `POST /api/admin/customers/<id>/toggle-status`: Pemblokiran atau pembukaan blokir akun pelanggan.
- `GET /api/admin/audit-logs`: Daftar riwayat kronologis append-only aksi sensitif sistem dengan filter multi-kriteria dan KPI metrics.
- `GET /api/admin/audit-logs/export`: Ekspor data log audit sistem ke format streaming CSV.

---

## Struktur Direktori Proyek

```
Ticksy V4/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── admin.py           # Endpoint administrasi akun, RBAC staf, audit logs & alias KMS
│   │   │   ├── auth.py            # Endpoint autentikasi, registrasi, profil (@overtone.id) & pengamanan login internal
│   │   │   ├── clearance.py       # Endpoint simulasi aging deadstock, margin guardrail & promo clearance
│   │   │   ├── dss.py             # Endpoint algoritma Hybrid AHP & TOPSIS, audit matriks & batch PO
│   │   │   ├── finance.py         # Laporan laba rugi P&L, bayar PO, pencairan refund retur, audit transaksi
│   │   │   ├── kms.py             # Dual-Scope KMS: panduan publik vs SOP staf & compliance matrix API
│   │   │   ├── manager.py         # Otorisasi PO, master katalog cinema gear, vendor supplier & bundles
│   │   │   ├── mis_dashboard.py   # Executive MIS dashboard harian & grafik performa
│   │   │   ├── notifications.py   # Endpoint notification center, unread count & outbox processing
│   │   │   ├── orders.py          # Transaksi checkout, kasir, click & collect, ekspedisi, timeline & track
│   │   │   ├── po.py              # Alur Purchase Order antar divisi
│   │   │   ├── products.py        # Katalog cinema gear publik & varian SKU (/api/products & /api/events)
│   │   │   ├── returns.py         # End-to-end klaim retur pelanggan (Customer, Store, Warehouse, Finance)
│   │   │   ├── store.py           # Showroom POS kasir, shift gate, live chat console & Click & Collect showroom
│   │   │   ├── warehouse.py       # Stok fisik gudang, serial number, packing hardcase & nomor resi
│   │   │   └── ...
│   │   ├── models/
│   │   │   ├── models.py          # Definisi ORM 5 subsistem ber-prefix ganda (__): OAS, KMS, TPS, DSS
│   │   │   └── mis_models.py      # Definisi ORM subsistem MIS (mis__*)
│   │   ├── providers/
│   │   │   └── whatsapp.py        # Abstraksi provider pesan WhatsApp (simulasi dev & integrasi API gateway)
│   │   ├── services/
│   │   │   ├── notif_templates.py # Template email HTML editorial & pesan WhatsApp pesanan
│   │   │   └── outbox_service.py  # Worker outbox asinkron dengan retry logic maksimal 3 kali
│   │   ├── audit.py               # Helper log_action append-only untuk pencatatan aksi sensitif ke oas__audit_logs
│   │   ├── notifications.py       # Helper notify & notify_role dengan deduplikasi pesan 24 jam
│   │   ├── extensions.py          # SQLAlchemy, JWTManager, Mail
│   │   └── security.py            # Skema RBAC, make_token, dan validator perizinan role
│   ├── init_overtone_db.py        # Master Consolidation Script Mandiri (Reset DB overtone_store, 28+ tabel & seeder cinema lengkap)
│   ├── requirements.txt           # Daftar dependensi modul Python backend
│   └── run.py                     # Entry point server Flask
│
├── frontend/
│   ├── src/
│   │   ├── auth/                  # AuthContext, penyimpanan token sesi, ProtectedRoute
│   │   ├── components/
│   │   │   ├── home/              # HeroCarousel, BrandTicker infinite marquee, Editorial
│   │   │   ├── kms/               # QuickSopWidget ("📌 SOP & Prosedur Divisi Anda")
│   │   │   ├── layout/            # Navbar publik, Footer, InternalLayout (Off-Canvas Hamburger Drawer & NotificationBell)
│   │   │   ├── profile/           # ProfileModal untuk input alamat filmmaker & toggle notifikasi Email/WA
│   │   │   ├── support/           # FloatingConciergeWidget (Live Support & KMS Auto-Responder B&H inspired)
│   │   │   └── ui/                # Badge, Card, Button, Skeleton, Modal dialog
│   │   ├── pages/
│   │   │   ├── admin/             # Dashboard super admin, UserManagement, ProductApproval, KmsManager, AuditLogs
│   │   │   ├── clearance/         # DeadstockClearanceSimulator (MIS x Finance x TPS)
│   │   │   ├── customer/          # Home, Catalog, ProductDetail, Checkout, MyOrders (Invoice PDF), Wishlist, Showrooms, OrderTracking, CustomerReturns
│   │   │   ├── dss/               # SmartRestockDSS: Hybrid AHP & TOPSIS 3 tab interaktif
│   │   │   ├── finance/           # FinanceReports (Cetak PDF P&L), FinancePoPayments (Cetak PDF PO), FinanceRefunds, FinanceTransactions
│   │   │   ├── internal/          # InternalSopPortal (Dokumen SOP operasional khusus divisi staf dengan database acknowledge)
│   │   │   ├── manager/           # ManagerBundles (Rig Creator), ManagerCatalog, ManagerSuppliers, PoApproval (Cetak PDF PO), MISDashboard, ProductAnalytics
│   │   │   ├── MIS/               # Dashboard, ProductAnalytics (Analitik penjualan gear)
│   │   │   ├── notifications/     # Inbox.jsx (Pusat notifikasi in-app staf & pelanggan berfilter kategori)
│   │   │   ├── store/             # ShowroomPOS, StoreCatalog, ClickAndCollect pickup pass, SupportHelpdesk (Live Chat), StoreReturns (Review Klaim), StaffAttendanceGate
│   │   │   ├── warehouse/         # Inventory kartu stok & S/N, PurchaseOrders (Cetak PDF PO), DeliveryOrders, WarehouseReturns (Penerimaan & Restock), WarehouseTransfers, Logs
│   │   │   ├── Login.jsx          # Form autentikasi filmmaker / pelanggan (dengan quick demo account pills @overtone.id)
│   │   │   └── InternalLogin.jsx  # Form portal staf internal OAS (dengan quick staff role buttons @overtone.id)
│   │   ├── utils/
│   │   │   ├── printInvoice.js    # Generator Cetak PDF Dokumen E-Invoice Resmi Pelanggan (Kop PT Overtone, S/N Kamera & Lensa, 10-Point Sensor QC)
│   │   │   ├── printPurchaseOrder.js # Generator Cetak PDF Dokumen B2B Purchase Order Supplier (Kop Surat, CDC Cikarang, HPP, 3 TTD Otorisasi)
│   │   │   └── format.js          # Helper format mata uang Rupiah & tanggal Indonesia
│   │   ├── styles/
│   │   │   ├── globals.css        # Konfigurasi Tailwind, typography, keyframes marquee
│   │   │   └── theme.css          # Token warna CSS (warm paper, charcoal ink, bronze gold #8C7A5B)
│   │   ├── App.jsx                # Pemetaan seluruh rute aplikasi (Customer & Internal Protected Routes)
│   │   └── main.jsx               # Inisialisasi React DOM & enforcement full light mode
│   ├── package.json               # Dependensi Node.js frontend
│   └── vite.config.js             # Konfigurasi bundler Vite
│
├── developer_notes.md             # Panduan arsitektur & checklist refaktorisasi cinema gear
└── README.md                      # Dokumentasi komprehensif sistem Overtone Pro Cinema Store
```

---

## Lisensi & Atribusi
Hak Cipta © 2026 **PT Overtone Retail Nusantara**.
Seluruh merek dagang, logo brand kamera sinema dan perangkat broadcast merupakan hak milik dari masing-masing prinsipal distributor resmi terkait (Sony Corporation, RED Digital Cinema LLC, Canon Inc., SZ DJI Technology Co., Ltd., Aputure Imaging Industries Co., Ltd., RØDE Microphones, Atomos Global Pty Ltd, Sennheiser electronic GmbH & Co. KG).
