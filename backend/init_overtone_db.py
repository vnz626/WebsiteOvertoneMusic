"""
Master Script Inisialisasi & Seeder Tunggal: Overtone Pro Cinema & Broadcast Gear Store
File: backend/init_overtone_db.py

Cukup dijalankan dengan 1 perintah:
    python init_overtone_db.py

Fungsi:
1. Otomatis membuat database `overtone_store` di MySQL jika belum ada.
2. Membangun seluruh skema tabel 5 subsistem:
   - OAS (Office Automation System): Staf, Pengumuman, Notifikasi, Audit Log, System Settings.
   - KMS (Knowledge Management System): Brand/Supplier, Kategori, Artikel Customer FAQ & 7 SOP Internal Pegawai, Acknowledgment Kepatuhan.
   - TPS (Transaction Processing System): Cabang, Pelanggan, Produk, Varian SKU, Order/Invoice, PO Supplier, Retur, Timeline Tracking.
   - MIS (Management Information System): Ringkasan Sales, Performa Produk, Revenue Harian, Deadstock Tracking.
   - DSS (Decision Support System): 5 Kriteria, 25 Subkriteria, Matriks Perbandingan Berpasangan AHP, Sesi Restock TOPSIS.
3. Mengisi data awal lengkap:
   - Akun staf resmi domain @overtone.id (admin, manager, finance, warehouse, store, store2) password 'password123'.
   - Akun pelanggan filmmaker resmi domain @overtone.id (customer, angga, fajar, yandy, timo) password 'password123'.
   - 7 Dokumen SOP Internal resmi seluruh divisi cinema & broadcast.
   - 27 Brand / Principal Supplier resmi cinema (Sony, Canon, Nikon, Panasonic, Fujifilm, Blackmagic, Sigma, DJI, Aputure, Godox, Rode, Sennheiser, Shure, Saramonic, Atomos, SmallHD, Moza, Nanlite, Hollyland, Samyang, Zoom, Tascam, Feelworld, Portkeys).
   - 91 Produk Kamera Cinema, Lensa, Gimbal, Lighting, Audio, & Monitor Recorder sesuai data_produk_toko_kamera.md.
   - Multi-branch stocks, bundling kit indie filmmaker, ulasan filmmaker, dan DSS AHP-TOPSIS restock matrix 5x5.
"""

import os
import sys
from datetime import datetime, date, timedelta
import random
import pymysql
from werkzeug.security import generate_password_hash
from sqlalchemy import text

# Pastikan encoding console Windows mendukung Unicode
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(BASE_DIR, ".env"))
except ImportError:
    pass

DB_HOST = os.environ.get("DB_HOST", "localhost")
DB_PORT = int(os.environ.get("DB_PORT", 3306))
DB_USER = os.environ.get("DB_USER", "root")
DB_PASS = os.environ.get("DB_PASSWORD", "")
DB_NAME = os.environ.get("DB_NAME", "overtone_store")

from parse_products_md import parse_md
from generate_catalog_data import BRANDS_METADATA, PRODUCT_IMAGE_MAP, PRODUCT_PRICING_SPEC

# Data 7 Dokumen SOP Internal Resmi Overtone Pro Cinema & Broadcast
INTERNAL_SOPS = [
    {
        "sop_code": "SOP-GEN-001",
        "title": "Standar Etika Operasional Toko & Keamanan Sistem OAS Broadcast",
        "target_role": "all_internal",
        "priority_level": "mandatory",
        "excerpt": "Panduan kepatuhan jam kerja, penggunaan seragam cleanroom/showroom/gudang, kerahasiaan data filmmaker pelanggan, dan protokol keamanan akun OAS.",
        "content": """### 1. TUJUAN & RUANG LINGKUP
Dokumen SOP ini mengatur tata tertib perilaku profesional, jam kehadiran kerja, dan keamanan akses sistem terintegrasi (OAS, TPS, KMS, MIS) bagi seluruh staf PT Overtone Retail Nusantara (Divisi Cinema & Broadcast).

---

### 2. PROTOKOL KEAMANAN AKUN & SISTEM
1. **Kerahasiaan Kredensial**: Setiap staf wajib menjaga kerahasiaan password akun OAS masing-masing. Dilarang meminjamkan akun login kepada rekan kerja atau pihak ketiga.
2. **Kepatuhan Data Pribadi**: Data filmmaker (nama, rumah produksi, nomor telepon, alamat kirim, invoice transaksi hardware) dilindungi undang-undang dan dilarang disebarluaskan untuk kepentingan non-pekerjaan.
3. **Penyimpanan Dokumen**: Seluruh dokumen serah-terima fisik hardware dan kartu garansi resmi distributor harus disimpan di lemari terkunci dan di-scan ke arsip cloud internal sebelum jam operasional tutup.

---

### 3. JAM OPERASIONAL & LAYANAN
- **Showroom Staff**: Hadir 30 menit sebelum buka toko (09:30 WIB) untuk inspeksi suhu display optik (20-22°C, humidity 40-45% RH) dan uji lampu cleanroom test bench.
- **Warehouse Staff**: Jam operasional penerimaan barang ekspedisi dan inspeksi kargo kayu pukul 08:30 - 17:00 WIB.
- **Finance Staff**: Proses verifikasi transfer dan approval pembayaran PO principal dilakukan pada cutoff pukul 11:00 WIB dan 15:00 WIB setiap hari kerja.
""",
    },
    {
        "sop_code": "SOP-WH-001",
        "title": "Prosedur Packing Kayu Berasuransi & Pengecekan Nomor Seri Sensor Kamera",
        "target_role": "warehouse_staff",
        "priority_level": "critical",
        "excerpt": "Standar baku proteksi packing kayu berlapis, bantalan anti-statis pelindung sensor kamera & elemen optik lensa, asuransi penuh ekspedisi, dan pencatatan serial number fisik (Body S/N & Lens S/N).",
        "content": """### 1. TUJUAN
Memastikan setiap unit kamera cinema, lensa anamorphic/prime, gimbal, dan monitor recorder yang dikirim melalui kurir ekspedisi (JNE Trucking / SiCepat Cargo) tiba di tangan filmmaker dalam kondisi presisi sempurna tanpa risiko pergeseran sensor (sensor shift), jamur optik, atau benturan kargo.

---

### 2. PERSIAPAN SEBELUM PACKING
1. **Inspeksi Visual Fisik & Sensor**: Periksa body finishing, segel port HDMI/SDI, mount flange, kebersihan sensor cover glass dari debu mikro, dan kelengkapan aksesoris (top handle XLR, battery plate, adapter RF/E mount).
2. **Pencatatan Serial Number Fisik**: Scan atau input nomor seri body (Camera Body S/N) dan lensa (Lens S/N) ke field `serial_number` pada kartu pesanan sistem TPS.
3. **Proteksi Desiccant**: Masukkan silica gel anti-kelembapan aktif ke dalam hardcase atau kotak primer kamera guna mencegah kondensasi optik akibat fluktuasi suhu kargo udara.

---

### 3. LANGKAH-LANGKAH PACKING KAYU
1. Masukkan kamera ke dalam hardcase busa kustom presisi (Pelican/Nanuk case) atau boks resmi pabrik.
2. Bungkus kardus primer menggunakan **Double Bubble Wrap Anti-Statis** minimal 3 lapis tebal.
3. Rakit rangka peti kayu (kayu pinus kering) dengan jarak renggang maksimal 6 cm antar bilah kayu.
4. Tempelkan stiker peringatan: **FRAGILE — PERALATAN SENSOR KAMERA KELAS BIOSKOP — HINDARI BENTURAN / JANGAN DITINDIH**.
""",
    },
    {
        "sop_code": "SOP-WH-002",
        "title": "Penerimaan Barang Supplier (PO Receiving) & Verifikasi Sensor Optik Gudang",
        "target_role": "warehouse_staff",
        "priority_level": "mandatory",
        "excerpt": "Prosedur checklist fisik barang datang dari distributor resmi kamera (Sony, Canon, Nikon, Blackmagic), pencocokan surat jalan vs PO di sistem, dan alokasi rak ber-dehumidifier gudang.",
        "content": """### 1. ALUR PENERIMAAN UNIT DARI PRINCIPAL DISTRIBUTOR
1. Cocokkan dokumen Surat Jalan (Delivery Note) dari supplier dengan dokumen **Purchase Order (PO)** pada modul Warehouse OAS.
2. Periksa segel hologram distributor resmi (Sony Indonesia, Datascrip Canon, Nikon Indonesia, DJI Pro).
3. Buka sampel acak 10% unit untuk uji coba visual kebersihan sensor, shutter count 0, dan port daya DC.
4. Masukkan nomor seri masing-masing unit ke database stok melalui tombol **Terima Fisik & Input Serial Number**.
5. Tempatkan unit di rak penyimpanan bersuhu sejuk terkontrol (Dry Cabinet Storage Warehouse) dengan humidity 40% RH.
6. Laporkan ke manajer dan finance jika terdapat unit cacat pabrik (*Factory Defect*) dalam tempo 1x24 jam.
""",
    },
    {
        "sop_code": "SOP-STR-001",
        "title": "Layanan Click & Collect Showroom, Verifikasi Kode Ambil & QC Unboxing",
        "target_role": "store_staff",
        "priority_level": "mandatory",
        "excerpt": "Tata cara melayani pelanggan sutradara/DOP yang mengambil pesanan Click & Collect di toko cabang, verifikasi OTP 6 digit, dan unboxing bersama di Cleanroom Tech Bench.",
        "content": """### 1. PROSEDUR PENERIMAAN FILMMAKER DI SHOWROOM
1. Sambut klien dengan ramah dan tanyakan Nomor Invoice atau 6-Digit **Kode Pickup Pass** mereka.
2. **Validasi Sistem**: Buka menu *Store > Click & Collect*, masukkan kode verifikasi, pastikan status pesanan adalah `Ready for Pickup`.
3. **Unboxing Bersama di Cleanroom Tech Bench**:
   - Buka segel kardus di hadapan filmmaker di area meja servis laminar flow bersih debu.
   - Tunjukkan nomor seri body kamera dan lensa, lalu cocokkan dengan nomor seri pada e-Invoice.
4. **Protokol 10-Point Sensor Calibration & Firmware QC**:
   - Inspeksi kebersihan sensor CMOS/Global Shutter pada aperture f/22.
   - Pengecekan dead pixel / hot pixel pada ISO tinggi.
   - Uji mekanisme electronic shutter, rolling shutter, dan kipas pendingin internal.
   - Uji komunikasi mount lensa, aperture stepping, autofocus tracking, dan back-focus.
   - Verifikasi firmware teranyar dan instalasi LUT color profile sinematik jika diminta klien.
5. **Penyelesaian**: Klik tombol **Konfirmasi Serah Terima Barang** di sistem, serahkan kartu garansi resmi distributor dan invoice cetak bertanda tangan staf.
""",
    },
    {
        "sop_code": "SOP-STR-002",
        "title": "Standar Kalibrasi Sensor Optik (Cleanroom Tech Bench) & Handling Komplain Kamera",
        "target_role": "store_staff",
        "priority_level": "standard",
        "excerpt": "Standar kebersihan ruang kedap debu (cleanroom class ISO 7), penanganan debu sensor CMOS, uji aperture iris lensa, dan etika penanganan keluhan filmmaker.",
        "content": """### 1. STANDAR KALIBRASI SENSOR & LENSA DI CLEANROOM BENCH
- **Lingkungan Bersih**: Nyalakan Hepa Filter Blower meja servis minimal 15 menit sebelum kalibrasi sensor dilakukan.
- **Pembersihan Sensor**: Gunakan swab sensor bersertifikasi lint-free berukuran tepat (Full-Frame atau Super35) dengan cairan sensor optical grade. Dilarang menekan sensor secara berlebihan.
- **Flange Depth & Back-Focus**: Gunakan collimator uji untuk memastikan titik fokus infinit lensa cine prime tepat presisi pada sensor plane.
- **Handling Komplain**: Dengarkan kendala klien dengan teliti. Apabila terdapat defect sensor bawaan pabrik, fasilitasi klaim garansi 1-to-1 replacement dalam tempo 7 hari masa garansi toko.
""",
    },
    {
        "sop_code": "SOP-FIN-001",
        "title": "SOP Verifikasi Invoice PO Distributor Kamera & Pencairan Refund Lensa",
        "target_role": "finance",
        "priority_level": "critical",
        "excerpt": "Ketentuan batas waktu pelunasan invoice principal kamera bioskop, verifikasi bukti transfer bank (BCA/Mandiri), dan pencatatan arus kas keluar pengadaan hardware.",
        "content": """### 1. PROSES PEMBAYARAN TAGIHAN SUPPLIER (PO)
1. Periksa daftar PO yang telah disetujui (*Approved*) oleh General Manager pada menu **Finance > Pelunasan PO**.
2. Pastikan nominal tagihan, nomor rekening bank distributor resmi (Sony/Canon/Nikon), dan syarat pembayaran (*Term of Payment*) telah valid.
3. Lakukan pembayaran via Corporate Internet Banking dan simpan nomor referensi transfer bank.
4. Masukkan nomor bukti transfer pada modal pelunasan dan klik **Konfirmasi Pembayaran PO**.
5. Sistem akan otomatis memperbarui status PO menjadi `Paid by Finance` dan memberi notifikasi ke tim Warehouse untuk siap menerima kedatangan kargo kamera.
""",
    },
    {
        "sop_code": "SOP-MGR-001",
        "title": "Panduan Evaluasi Smart Restock DSS untuk High-End Cinema Gear & Clearance",
        "target_role": "manager",
        "priority_level": "mandatory",
        "excerpt": "Pedoman manajerial dalam mengevaluasi skor rekomendasi DSS AHP-TOPSIS untuk kamera bioskop bernilai tinggi, otorisasi PO di atas Rp 50 Juta, dan strategi diskon clearance display model menua.",
        "content": """### 1. EVALUASI REKOMENDASI SISTEM PENDUKUNG KEPUTUSAN (DSS)
1. Buka modul **DSS Restock** setiap hari Senin pagi untuk melihat perangkingan kebutuhan pengadaan unit kamera dan lensa bioskop.
2. Analisis 5 kriteria utama:
   - **C1 (Kekritisan Stok Gudang / Remaining Stock)**: Prioritas tinggi untuk SKU fast-moving dengan persediaan < 3 unit.
   - **C2 (Kecepatan Penjualan / Sales Velocity)**: Memantau tingginya permintaan rumah produksi dan rental house.
   - **C3 (Margin Keuntungan Kotor / Gross Margin %)**: Memastikan profitabilitas per unit optimal.
   - **C4 (Minat Pasar & Wishlist Filmmaker)**: Menilai tren teknologi kamera terbaru (misal: Global Shutter, 32-bit float audio).
   - **C5 (Beban Modal Pengadaan / Unit COGS)**: Efisiensi likuiditas modal kerja ritel bernilai tinggi.
3. PO dengan nilai di atas Rp 50.000.000 wajib divalidasi ketersediaan plafon kas bulanan sebelum diapprove.
4. Untuk unit display atau stok lama yang tersimpan lebih dari 90 hari (*Aging Stock*), aktifkan diskon Clearance bertahap (10% - 25%) melalui panel Clearance Simulator.
""",
    },
]


def _seed_dss_self_contained(db, manager_id, customers, created_variants):
    """Logika mandiri seeding Kriteria, Subkriteria, Matriks AHP 5x5, dan Sesi TOPSIS DSS."""
    from app.models.models import (
        DSSCriterion,
        DSSSubcriterionRange,
        DSSAHPMatrix,
        DSSSession,
        DSSTopsisResult,
        TPSProduct,
        TPSProductVariant,
        TPSWishlist,
        TPSOrder,
    )
    from app.api.dss import execute_topsis_calculation

    criteria_data = [
        {
            "code": "C1",
            "name": "Kekritisan Stok Gudang (Remaining Stock)",
            "attribute_type": "cost",
            "weight": 0.30,
            "description": "Diambil dari stok fisik tps__product_variants. Semakin sedikit stok kamera cinema & lensa tersisa di gudang/showroom, semakin urgen prioritas pengadaan restock.",
            "ranges": [
                ("Stok Habis / Kritis (0 - 2 unit)", 0, 2, 5, "Urgensi Restock Ekstrem / Segera PO"),
                ("Stok Menipis (3 - 5 unit)", 3, 5, 4, "Waspada / Perlu Tambahan Cadangan"),
                ("Stok Sedang (6 - 10 unit)", 6, 10, 3, "Stok Cukup / Standar Operasional"),
                ("Stok Aman (11 - 20 unit)", 11, 20, 2, "Stok Masih Aman"),
                ("Stok Surplus / Melimpah (> 20 unit)", 21, 9999, 1, "Kelebihan Kapasitas / Tahan PO"),
            ],
        },
        {
            "code": "C2",
            "name": "Kecepatan Penjualan (Sales Velocity)",
            "attribute_type": "benefit",
            "weight": 0.25,
            "description": "Total akumulasi unit cinema gear terjual dari tps__orders berstatus paid/completed. Semakin laris produk terjual, semakin tinggi kebutuhan restock.",
            "ranges": [
                ("Best Seller Masif (>= 20 unit terjual)", 20, 9999, 5, "Perputaran Sangat Tinggi / Fast Moving"),
                ("Penjualan Cepat (10 - 19 unit terjual)", 10, 19, 4, "Laris di Kalangan Filmmaker"),
                ("Penjualan Moderat (5 - 9 unit terjual)", 5, 9, 3, "Permintaan Produksi Reguler"),
                ("Penjualan Lambat (2 - 4 unit terjual)", 2, 4, 2, "Slow Moving Retail"),
                ("Dormant / Belum Terjual (0 - 1 unit terjual)", 0, 1, 1, "Rendah / Kurang Diminati"),
            ],
        },
        {
            "code": "C3",
            "name": "Margin Keuntungan Kotor (Gross Margin %)",
            "attribute_type": "benefit",
            "weight": 0.20,
            "description": "Persentase keuntungan kotor per unit: (price - cost_price) / price * 100. Semakin besar margin, semakin menguntungkan kontribusi profit bagi perusahaan ritel cinema.",
            "ranges": [
                ("Margin Sangat Tinggi (>= 35.0%)", 35.0, 100.0, 5, "Profitabilitas Sangat Sehat"),
                ("Margin Tinggi (25.0% - 34.9%)", 25.0, 34.99, 4, "Di Atas Rata-rata Industri"),
                ("Margin Standar (18.0% - 24.9%)", 18.0, 24.99, 3, "Standar Retail Cinema & Broadcast"),
                ("Margin Rendah (10.0% - 17.9%)", 10.0, 17.99, 2, "Margin Tipis"),
                ("Margin Sangat Tipis (< 10.0%)", 0.0, 9.99, 1, "Hampir BEP / Sensitif Biaya"),
            ],
        },
        {
            "code": "C4",
            "name": "Minat Pasar & Wishlist Filmmaker (Market Demand)",
            "attribute_type": "benefit",
            "weight": 0.15,
            "description": "Akumulasi jumlah wishlist filmmaker pada tps__wishlists ditambah frekuensi transaksi. Mengukur tren antusiasme pasar terhadap kamera bioskop.",
            "ranges": [
                ("Permintaan Sangat Masif (>= 25 peminat)", 25, 9999, 5, "Trafik & Peminat Viral"),
                ("Permintaan Tinggi (15 - 24 peminat)", 15, 24, 4, "Banyak Masuk Wishlist Filmmaker"),
                ("Permintaan Sedang (8 - 14 peminat)", 8, 14, 3, "Peminat Konsisten"),
                ("Permintaan Terbatas (3 - 7 peminat)", 3, 7, 2, "Minat Produksi Spesifik"),
                ("Minat Sangat Rendah (0 - 2 peminat)", 0, 2, 1, "Belum Banyak Dilirik"),
            ],
        },
        {
            "code": "C5",
            "name": "Beban Modal Pengadaan (Unit COGS)",
            "attribute_type": "cost",
            "weight": 0.10,
            "description": "Harga pokok pengadaan per unit hardware (cost_price dalam IDR). Semakin rendah modal yang tertahan per unit, semakin efisien likuiditas modal kerja ritel.",
            "ranges": [
                ("Modal Sangat Ringan (< Rp 15.000.000)", 0, 15000000, 5, "Risiko Arus Kas Ringan"),
                ("Modal Terjangkau (Rp 15.000.001 - Rp 40.000.000)", 15000001, 40000000, 4, "Budget Pengadaan Sedang"),
                ("Modal Menengah (Rp 40.000.001 - Rp 70.000.000)", 40000001, 70000000, 3, "Perlu Perhitungan Kas"),
                ("Modal Berat (Rp 70.000.001 - Rp 100.000.000)", 70000001, 100000000, 2, "Hardware Cinema Premium"),
                ("Modal Sangat Berat (> Rp 100.000.000)", 100000001, 999999999, 1, "High-End Cinema / Capital Intensive"),
            ],
        },
    ]

    criteria_map = {}
    for cdata in criteria_data:
        crit = DSSCriterion.query.filter_by(code=cdata["code"]).first()
        if not crit:
            crit = DSSCriterion(
                code=cdata["code"],
                name=cdata["name"],
                attribute_type=cdata["attribute_type"],
                weight=cdata["weight"],
                description=cdata["description"],
            )
            db.session.add(crit)
            db.session.flush()
        else:
            crit.name = cdata["name"]
            crit.attribute_type = cdata["attribute_type"]
            crit.weight = cdata["weight"]
            crit.description = cdata["description"]
            db.session.flush()
        criteria_map[cdata["code"]] = crit

        existing_ranges = DSSSubcriterionRange.query.filter_by(criterion_id=crit.id).count()
        if existing_ranges == 0:
            for r_label, min_v, max_v, score_v, note in cdata["ranges"]:
                db.session.add(
                    DSSSubcriterionRange(
                        criterion_id=crit.id,
                        range_label=r_label,
                        min_val=min_v,
                        max_val=max_v,
                        score_value=score_v,
                        notes=note,
                    )
                )

    db.session.commit()

    # Matriks Saaty 5x5 AHP Konsisten (CR <= 0.10)
    pairwise_ratios = {
        ("C1", "C1"): 1.0,
        ("C1", "C2"): 1.2,
        ("C1", "C3"): 1.5,
        ("C1", "C4"): 2.0,
        ("C1", "C5"): 3.0,

        ("C2", "C1"): 1.0 / 1.2,
        ("C2", "C2"): 1.0,
        ("C2", "C3"): 1.25,
        ("C2", "C4"): 1.6667,
        ("C2", "C5"): 2.5,

        ("C3", "C1"): 1.0 / 1.5,
        ("C3", "C2"): 1.0 / 1.25,
        ("C3", "C3"): 1.0,
        ("C3", "C4"): 1.3333,
        ("C3", "C5"): 2.0,

        ("C4", "C1"): 1.0 / 2.0,
        ("C4", "C2"): 1.0 / 1.6667,
        ("C4", "C3"): 1.0 / 1.3333,
        ("C4", "C4"): 1.0,
        ("C4", "C5"): 1.5,

        ("C5", "C1"): 1.0 / 3.0,
        ("C5", "C2"): 1.0 / 2.5,
        ("C5", "C3"): 1.0 / 2.0,
        ("C5", "C4"): 1.0 / 1.5,
        ("C5", "C5"): 1.0,
    }

    for (r_code, c_code), comp_val in pairwise_ratios.items():
        row_c = criteria_map[r_code]
        col_c = criteria_map[c_code]
        cell = DSSAHPMatrix.query.filter_by(row_criterion_id=row_c.id, col_criterion_id=col_c.id).first()
        if not cell:
            cell = DSSAHPMatrix(
                row_criterion_id=row_c.id,
                col_criterion_id=col_c.id,
                comparison_value=comp_val,
                updated_by=manager_id,
            )
            db.session.add(cell)
        else:
            cell.comparison_value = comp_val
            cell.updated_by = manager_id

    db.session.commit()

    # Seed Wishlists jika masih 0
    all_products = TPSProduct.query.all()
    if TPSWishlist.query.count() == 0 and customers and all_products:
        for p in all_products:
            selected_custs = random.sample(customers, min(len(customers), random.randint(1, 4)))
            for c in selected_custs:
                db.session.add(TPSWishlist(customer_id=c.id, product_id=p.id))
        db.session.commit()

    # Jalankan simulasi awal TOPSIS jika belum ada sesi
    if DSSSession.query.count() == 0:
        budget_limit = 250_000_000.0
        session_obj = execute_topsis_calculation(
            budget_limit=budget_limit,
            title="Simulasi Pengadaan High-End Cinema Gear Q4 - Anggaran Rp 250.000.000",
            executed_by_id=manager_id,
        )
        print(f"  -> Sesi {session_obj.session_code} berhasil dibuat dengan {session_obj.topsis_results.count()} varian SKU teranalisis!")


def init_database():
    print("\n=======================================================")
    print(f"[OVERTONE] MEMULAI MASTER DATABASE INITIALIZER: {DB_NAME}")
    print(f"Target Server: {DB_HOST}:{DB_PORT} (User: {DB_USER})")
    print("Sistem Rebranding: Cinema Cameras, Lenses & Broadcast Gear Store")
    print("=======================================================\n")

    # 1. Koneksi root level: Buat database overtone_store jika belum ada
    conn = pymysql.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASS,
        autocommit=True,
        charset="utf8mb4",
    )
    cursor = conn.cursor()

    print(f"[1/5] Memastikan database `{DB_NAME}` tersedia...")
    cursor.execute(
        f"CREATE DATABASE IF NOT EXISTS `{DB_NAME}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
    )
    cursor.execute(f"USE `{DB_NAME}`;")

    print("[2/5] Menyiapkan struktur tabel bersih (Clean Reset)...")
    cursor.execute("SET FOREIGN_KEY_CHECKS = 0;")
    cursor.execute("SHOW TABLES;")
    existing_tables = [row[0] for row in cursor.fetchall()]
    for tbl in existing_tables:
        cursor.execute(f"DROP TABLE IF EXISTS `{tbl}`;")
    cursor.execute("SET FOREIGN_KEY_CHECKS = 1;")
    conn.close()
    print("✓ Tabel lama berhasil dibersihkan untuk inisialisasi murni.")

    # 2. Inisialisasi Flask & SQLAlchemy db.create_all()
    print("\n[3/5] Membuat seluruh skema tabel 5 subsistem (`oas__`, `kms__`, `tps__`, `mis__`, `dss__`)...")
    from app import create_app
    from app.extensions import db
    from app.models.models import (
        OASStaff,
        OASAnnouncement,
        OASNotification,
        OASSystemSetting,
        OASSupportTicket,
        OASSupportMessage,
        OASAuditLog,
        KMSBrandSupplier,
        KMSCategory,
        KMSArticle,
        KMSArticleFeedback,
        KMSFaq,
        TPSCustomer,
        TPSStoreBranch,
        TPSProduct,
        TPSProductVariant,
        TPSOrder,
        TPSWishlist,
        TPSPurchaseOrder,
        TPSInventoryLog,
        TPSProductReview,
        OASStaffShift,
        TPSBranchStock,
        TPSStockTransfer,
        TPSBundle,
        TPSBundleItem,
        DSSCriterion,
        DSSSubcriterionRange,
        DSSAHPMatrix,
        DSSSession,
        DSSTopsisResult,
        ESSymptomFact,
        ESRule,
        ESConsultation,
    )
    from app.models.mis_models import (
        MisDashboardSummary,
        MisProductPerformance,
        MisRevenueSummary,
        MisSalesSummary,
    )

    app = create_app()
    with app.app_context():
        # Bangun skema ORM
        db.create_all()

        # Eksekusi pembuatan tabel migrasi tambahan (Returns, Tracking, Acknowledgment, Shifts, Transfers, Bundles)
        print("  -> Menjalankan skema migrasi tabel tambahan...")
        c = db.session.connection()

        # Tabel oas__staff_shifts (Fitur Shift Check-In / Mode Kerja Staf)
        c.execute(text("""
            CREATE TABLE IF NOT EXISTS oas__staff_shifts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                staff_id INT NOT NULL,
                shift_mode ENUM('offline_store', 'online_cs') DEFAULT 'offline_store' NOT NULL,
                branch_id INT NULL,
                clock_in_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                clock_out_at DATETIME NULL,
                status ENUM('active', 'completed') DEFAULT 'active' NOT NULL,
                notes TEXT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
                INDEX idx_staff_shift (staff_id),
                INDEX idx_branch_shift (branch_id),
                INDEX idx_status_shift (status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """))

        # Tabel tps__branch_stocks (Multi-Branch Stock Visibility)
        c.execute(text("""
            CREATE TABLE IF NOT EXISTS tps__branch_stocks (
                id INT AUTO_INCREMENT PRIMARY KEY,
                variant_id INT NOT NULL,
                branch_id INT NOT NULL,
                quantity INT DEFAULT 0 NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
                UNIQUE KEY uq_variant_branch (variant_id, branch_id),
                INDEX idx_var (variant_id),
                INDEX idx_branch (branch_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """))

        # Tabel tps__stock_transfers (Transfer Gudang <-> Showroom)
        c.execute(text("""
            CREATE TABLE IF NOT EXISTS tps__stock_transfers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                transfer_code VARCHAR(50) UNIQUE NOT NULL,
                variant_id INT NOT NULL,
                from_branch_id INT NULL,
                to_branch_id INT NOT NULL,
                qty INT DEFAULT 1 NOT NULL,
                serial_numbers TEXT NULL,
                requested_by INT NOT NULL,
                processed_by INT NULL,
                status ENUM('pending_warehouse', 'shipped_to_branch', 'completed') DEFAULT 'pending_warehouse' NOT NULL,
                notes TEXT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
                INDEX idx_transfer_code (transfer_code),
                INDEX idx_transfer_status (status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """))

        # Tabel tps__bundles & tps__bundle_items (Product Bundle & Indie Filmmaker Rig Creator)
        c.execute(text("""
            CREATE TABLE IF NOT EXISTS tps__bundles (
                id INT AUTO_INCREMENT PRIMARY KEY,
                bundle_code VARCHAR(50) UNIQUE NOT NULL,
                name VARCHAR(200) NOT NULL,
                description TEXT NULL,
                bundle_price BIGINT DEFAULT 0 NOT NULL,
                normal_total_price BIGINT DEFAULT 0 NOT NULL,
                total_cogs BIGINT DEFAULT 0 NOT NULL,
                savings_amount BIGINT DEFAULT 0 NOT NULL,
                is_active TINYINT(1) DEFAULT 1 NOT NULL,
                image_url VARCHAR(255) NULL,
                created_by INT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
                INDEX idx_bundle_code (bundle_code),
                INDEX idx_bundle_active (is_active)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """))

        c.execute(text("""
            CREATE TABLE IF NOT EXISTS tps__bundle_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                bundle_id INT NOT NULL,
                variant_id INT NOT NULL,
                qty INT DEFAULT 1 NOT NULL,
                INDEX idx_bundle_id (bundle_id),
                INDEX idx_variant_id (variant_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """))

        # Tabel tps__return_requests
        c.execute(text("""
            CREATE TABLE IF NOT EXISTS tps__return_requests (
                id INT AUTO_INCREMENT PRIMARY KEY,
                return_number VARCHAR(50) UNIQUE NOT NULL,
                order_id INT NOT NULL,
                customer_id INT NULL,
                reason_code VARCHAR(50) NOT NULL,
                description TEXT NOT NULL,
                resolution VARCHAR(30) DEFAULT 'refund' NOT NULL,
                status VARCHAR(30) DEFAULT 'requested' NOT NULL,
                reviewed_by INT NULL,
                review_note TEXT NULL,
                reviewed_at DATETIME NULL,
                received_by INT NULL,
                received_note TEXT NULL,
                received_at DATETIME NULL,
                refund_amount DECIMAL(15,2) NULL,
                refund_ref VARCHAR(100) NULL,
                refunded_by INT NULL,
                refunded_at DATETIME NULL,
                replacement_variant_id INT NULL,
                replacement_order_id INT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
                INDEX idx_order_id (order_id),
                INDEX idx_customer_id (customer_id),
                INDEX idx_status (status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """))

        # Tabel tps__return_request_photos
        c.execute(text("""
            CREATE TABLE IF NOT EXISTS tps__return_request_photos (
                id INT AUTO_INCREMENT PRIMARY KEY,
                return_request_id INT NOT NULL,
                photo_url VARCHAR(255) NOT NULL,
                caption VARCHAR(255) NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                INDEX idx_return_req (return_request_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """))

        # Tabel kms__sop_acknowledgements
        c.execute(text("""
            CREATE TABLE IF NOT EXISTS kms__sop_acknowledgements (
                id INT AUTO_INCREMENT PRIMARY KEY,
                article_id INT NOT NULL,
                staff_id INT NOT NULL,
                acknowledged_version VARCHAR(20) DEFAULT '1.0' NOT NULL,
                acknowledged_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                UNIQUE KEY uq_article_staff_ver (article_id, staff_id, acknowledged_version),
                INDEX idx_staff (staff_id),
                INDEX idx_article (article_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """))

        # Tabel oas__notification_outbox
        c.execute(text("""
            CREATE TABLE IF NOT EXISTS oas__notification_outbox (
                id INT AUTO_INCREMENT PRIMARY KEY,
                channel VARCHAR(20) NOT NULL,
                recipient_target VARCHAR(150) NOT NULL,
                subject VARCHAR(200) NULL,
                payload_json TEXT NOT NULL,
                status VARCHAR(20) DEFAULT 'pending' NOT NULL,
                attempts INT DEFAULT 0 NOT NULL,
                last_error TEXT NULL,
                sent_at DATETIME NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
                INDEX idx_status_channel (status, channel)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """))

        # Tabel tps__order_status_history
        c.execute(text("""
            CREATE TABLE IF NOT EXISTS tps__order_status_history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                order_id INT NOT NULL,
                from_status VARCHAR(50) NULL,
                to_status VARCHAR(50) NOT NULL,
                actor_type VARCHAR(20) DEFAULT 'staff' NOT NULL,
                actor_id INT NULL,
                actor_name VARCHAR(100) NULL,
                notes TEXT NULL,
                metadata_json TEXT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                INDEX idx_order_history (order_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """))

        # Tabel tps__product_reviews (Star Rating & Verified Filmmaker Reviews)
        c.execute(text("""
            CREATE TABLE IF NOT EXISTS tps__product_reviews (
                id INT AUTO_INCREMENT PRIMARY KEY,
                product_id INT NOT NULL,
                customer_id INT NOT NULL,
                order_id INT NULL,
                variant_name VARCHAR(200) NULL,
                rating INT NOT NULL,
                title VARCHAR(255) NULL,
                comment TEXT NOT NULL,
                is_verified_purchase TINYINT(1) DEFAULT 1 NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                INDEX idx_prod_review (product_id),
                INDEX idx_cust_review (customer_id),
                INDEX idx_order_review (order_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """))

        # ====================================================================
        # SUBSISTEM 6: ES (EXPERT SYSTEM / SISTEM PAKAR ENTERPRISE) TABLES
        # ====================================================================
        c.execute(text("""
            CREATE TABLE IF NOT EXISTS es__symptoms_facts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                fact_code VARCHAR(50) NOT NULL UNIQUE,
                domain VARCHAR(50) NOT NULL,
                category VARCHAR(100) NOT NULL,
                label VARCHAR(255) NOT NULL,
                weight FLOAT NOT NULL DEFAULT 0.85,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                INDEX idx_es_fact_code (fact_code),
                INDEX idx_es_fact_domain (domain)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """))

        c.execute(text("""
            CREATE TABLE IF NOT EXISTS es__rules (
                id INT AUTO_INCREMENT PRIMARY KEY,
                rule_code VARCHAR(50) NOT NULL UNIQUE,
                domain VARCHAR(50) NOT NULL,
                title VARCHAR(255) NOT NULL,
                conditions_json JSON NOT NULL,
                conclusion_verdict VARCHAR(255) NOT NULL,
                action_type VARCHAR(50) NOT NULL,
                explanation TEXT NOT NULL,
                certainty_factor FLOAT NOT NULL DEFAULT 0.90,
                kms_article_id INT NULL,
                is_active TINYINT(1) DEFAULT 1 NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                INDEX idx_es_rule_code (rule_code),
                INDEX idx_es_rule_domain (domain),
                INDEX idx_es_rule_active (is_active)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """))

        c.execute(text("""
            CREATE TABLE IF NOT EXISTS es__consultations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                session_code VARCHAR(60) NOT NULL UNIQUE,
                domain VARCHAR(50) NOT NULL,
                actor_role VARCHAR(50) NOT NULL,
                actor_id INT NULL,
                reference_type VARCHAR(50) NULL,
                reference_id INT NULL,
                input_facts_json JSON NOT NULL,
                matched_rules_json JSON NOT NULL,
                final_verdict VARCHAR(255) NOT NULL,
                confidence_score FLOAT NOT NULL,
                expert_advice TEXT NOT NULL,
                recommended_payload_json JSON NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                INDEX idx_es_cons_session (session_code),
                INDEX idx_es_cons_domain (domain),
                INDEX idx_es_cons_role (actor_role),
                INDEX idx_es_cons_ref (reference_type, reference_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """))

        # Pastikan kolom Dual-Scope & version pada kms__articles
        c.execute(text("""
            ALTER TABLE kms__articles
            ADD COLUMN IF NOT EXISTS audience_type ENUM('customer', 'internal') NOT NULL DEFAULT 'customer',
            ADD COLUMN IF NOT EXISTS target_role VARCHAR(50) NOT NULL DEFAULT 'public',
            ADD COLUMN IF NOT EXISTS sop_code VARCHAR(30) NULL,
            ADD COLUMN IF NOT EXISTS priority_level ENUM('standard', 'mandatory', 'critical') NOT NULL DEFAULT 'standard',
            ADD COLUMN IF NOT EXISTS version VARCHAR(20) NOT NULL DEFAULT '1.0';
        """))

        # Pastikan kolom notifikasi pada tps__customers
        c.execute(text("""
            ALTER TABLE tps__customers
            ADD COLUMN IF NOT EXISTS notify_email TINYINT(1) DEFAULT 1 NOT NULL,
            ADD COLUMN IF NOT EXISTS notify_whatsapp TINYINT(1) DEFAULT 1 NOT NULL;
        """))

        # Pastikan fleksibilitas fulfillment_method dan bundle_id pada tps__orders & change_type pada logs
        c.execute(text("""
            ALTER TABLE tps__orders
            MODIFY COLUMN fulfillment_method VARCHAR(50) DEFAULT 'delivery' NOT NULL,
            MODIFY COLUMN product_id INT NULL,
            ADD COLUMN IF NOT EXISTS bundle_id INT NULL;
        """))

        c.execute(text("""
            ALTER TABLE tps__inventory_logs
            MODIFY COLUMN change_type VARCHAR(50) NOT NULL;
        """))

        db.session.commit()
        print("✓ Seluruh skema tabel 5 subsistem terverifikasi sempurna.")

        # 3. Seeding Data Lengkap
        print("\n[4/5] Mengisi data master & demo Overtone Pro Cinema Store...")

        # A. Akun Staf Internal OAS (@overtone.id)
        print("  -> Menambahkan 6 Akun Staf Internal OAS (@overtone.id)...")
        pwd_hash = generate_password_hash("password123")
        staff_list = [
            OASStaff(
                name="Super Administrator",
                username="admin",
                email="admin@overtone.id",
                password_hash=pwd_hash,
                role="super_admin",
                phone="08111000100",
            ),
            OASStaff(
                name="Cinema Store General Manager",
                username="manager",
                email="manager@overtone.id",
                password_hash=pwd_hash,
                role="manager",
                phone="08111000200",
            ),
            OASStaff(
                name="Finance Controller",
                username="finance",
                email="finance@overtone.id",
                password_hash=pwd_hash,
                role="finance",
                phone="08111000300",
            ),
            OASStaff(
                name="Warehouse & Logistics Lead",
                username="warehouse",
                email="warehouse@overtone.id",
                password_hash=pwd_hash,
                role="warehouse_staff",
                phone="08111000400",
            ),
            OASStaff(
                name="Senior Cinema Specialist",
                username="store",
                email="store@overtone.id",
                password_hash=pwd_hash,
                role="store_staff",
                phone="08111000500",
            ),
            OASStaff(
                name="Dimas Setiawan",
                username="store2",
                email="store2@overtone.id",
                password_hash=pwd_hash,
                role="store_staff",
                phone="08111000501",
            ),
        ]
        db.session.add_all(staff_list)
        db.session.flush()

        # B. Cabang Showroom Flagship & Gudang Distribusi (TPS)
        print("  -> Menambahkan Cabang Pro Cinema Showroom & Gudang Pusat...")
        branches = [
            TPSStoreBranch(
                name="Overtone Central Distribution Center - Cikarang",
                branch_type="warehouse",
                city="Bekasi (Cikarang)",
                address="Kawasan Industri MM2100 Blok C-10, Cikarang Barat, Bekasi",
                phone="021-8980123",
                map_url="https://maps.google.com/?q=MM2100+Cikarang",
            ),
            TPSStoreBranch(
                name="Overtone Pro Cinema Store — Senayan City (Jakarta Pusat)",
                branch_type="flagship",
                city="Jakarta Pusat",
                address="Senayan City Mall Lt. 3, Jl. Asia Afrika No. 19, Jakarta Pusat",
                phone="021-72781001",
                map_url="https://maps.google.com/?q=Senayan+City",
            ),
            TPSStoreBranch(
                name="Overtone Pro Cinema Store — PIK Avenue (Jakarta Utara)",
                branch_type="showroom",
                city="Jakarta Utara",
                address="PIK Avenue Mall Lt. 1, Pantai Indah Kapuk, Jakarta Utara",
                phone="021-22570888",
                map_url="https://maps.google.com/?q=PIK+Avenue",
            ),
            TPSStoreBranch(
                name="Overtone Pro Cinema Store — Dago (Bandung)",
                branch_type="showroom",
                city="Bandung",
                address="Jl. Ir. H. Juanda (Dago) No. 88, Coblong, Bandung",
                phone="022-82063500",
                map_url="https://maps.google.com/?q=Dago+Bandung",
            ),
            TPSStoreBranch(
                name="Overtone Pro Cinema Store — Tunjungan Plaza 6 (Surabaya)",
                branch_type="showroom",
                city="Surabaya",
                address="Tunjungan Plaza 6 Level 2, Jl. Embong Malang No. 32-36, Surabaya",
                phone="031-7390123",
                map_url="https://maps.google.com/?q=Tunjungan+Plaza",
            ),
            TPSStoreBranch(
                name="Overtone Pro Cinema Store — Seminyak (Bali)",
                branch_type="showroom",
                city="Denpasar (Bali)",
                address="Sunset Point Shopping Centre Lt. 1, Jl. Sunset Road No. 88, Seminyak, Bali",
                phone="0361-8475999",
                map_url="https://maps.google.com/?q=Sunset+Point+Seminyak",
            ),
        ]
        db.session.add_all(branches)
        db.session.flush()

        # C. Brand / Principal Supplier (KMS) - Sesuai Markdown (27 Brand)
        print("  -> Menambahkan 27 Brand & Principal Supplier Cinema & Broadcast Resmi...")
        md_path = r"c:\Users\LENOVO\Downloads\data_produk_toko_kamera.md"
        if not os.path.exists(md_path):
            md_path = os.path.join(BASE_DIR, "data_produk_toko_kamera.md")

        parsed_brands, parsed_products = parse_md(md_path)

        brand_objs = []
        for b_info in parsed_brands:
            b_id = b_info["id"]
            meta = BRANDS_METADATA.get(b_id, {
                "name": b_info["name"],
                "slug": b_info["name"].lower().replace(" ", "-"),
                "country": "International",
                "desc": f"Distributor Resmi {b_info['name']}",
                "site": "https://overtone.id",
                "email": f"info@{b_info['name'].lower().replace(' ', '')}.com",
                "phone": "+62-21-500100"
            })
            b_obj = KMSBrandSupplier(
                id=b_id,
                name=meta["name"],
                slug=meta["slug"],
                country=meta["country"],
                description=meta["desc"],
                website=meta["site"],
                contact_email=meta["email"],
                contact_phone=meta["phone"],
                is_active=True,
            )
            brand_objs.append(b_obj)
        db.session.add_all(brand_objs)
        db.session.flush()

        # D. Kategori KMS & 6 Kategori Cinema
        print("  -> Menambahkan 6 Kategori Cinema & 2 Kategori KMS Knowledge...")
        cat_cinema_cameras = KMSCategory(
            name="Cinema & Mirrorless Cameras",
            slug="cinema_cameras",
            description="Kamera bioskop format Full-Frame & Super35, RAW internal, dual native ISO.",
            icon="Camera",
        )
        cat_cine_lenses = KMSCategory(
            name="Cinema & Prime Lenses",
            slug="cine_lenses",
            description="Lensa sinematik aperture t-stop presisi, cine-modded gear ring, zero focus breathing.",
            icon="Aperture",
        )
        cat_gimbals = KMSCategory(
            name="Gimbals & Camera Stabilizers",
            slug="gimbals_stabilizers",
            description="Stabilizer 3-axis & 4-axis, motorized slider, wireless focus motor.",
            icon="Compass",
        )
        cat_lighting = KMSCategory(
            name="Studio & Cinema Lighting",
            slug="studio_lighting",
            description="Lampu COB high-output, panel RGBWW, softbox parabolik, DMX control.",
            icon="Sun",
        )
        cat_audio = KMSCategory(
            name="Wireless & Broadcast Audio",
            slug="wireless_audio",
            description="Mikrofon wireless lavalier 32-bit float, shotgun mic, field audio recorder.",
            icon="Mic",
        )
        cat_monitors = KMSCategory(
            name="Monitors & Field Recorders",
            slug="monitor_recorders",
            description="Monitor lapangan HDR 4K/6K ProRes RAW recorder, LUT preview presisi.",
            icon="Tv",
        )
        cat_sop = KMSCategory(
            name="SOP Operasional Internal OAS Broadcast",
            slug="sop-operasional-internal",
            description="Dokumen Prosedur Operasi Standar resmi seluruh divisi Overtone Cinema Retail",
            icon="ShieldAlert",
        )
        cat_faq = KMSCategory(
            name="Panduan Layanan & Garansi Cinema",
            slug="panduan-layanan-garansi",
            description="FAQ resmi ketentuan garansi distributor, kalibrasi sensor, pengiriman cinema gear, dan Click & Collect",
            icon="HelpCircle",
        )
        db.session.add_all([
            cat_cinema_cameras, cat_cine_lenses, cat_gimbals, cat_lighting,
            cat_audio, cat_monitors, cat_sop, cat_faq
        ])
        db.session.flush()

        # E. Produk & Varian SKU Cinema (TPS) - 91 Produk dari data_produk_toko_kamera.md
        print(f"  -> Menambahkan Katalog {len(parsed_products)} Produk Cinema & Broadcast dari Markdown...")
        now_dt = datetime.utcnow()
        created_variants = []
        prod_variant_map = {}

        for p_data in parsed_products:
            p_id = p_data["id"]
            # Gunakan direct .jpg image_url dari PRODUCT_IMAGE_MAP
            img_url = PRODUCT_IMAGE_MAP.get(
                p_id,
                "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80&ext=.jpg"
            )

            p_obj = TPSProduct(
                id=p_id,
                brand_id=p_data["brand_id"],
                branch_id=p_data["branch_id"],
                name=p_data["name"],
                sku_prefix=p_data["sku_prefix"],
                instrument_type=p_data["instrument_type"],
                category=p_data["category"],
                description=p_data["description"],
                specifications=p_data["specifications"],
                warranty_months=p_data.get("warranty_months", 12),
                image_url=img_url,
                status=p_data.get("status", "published"),
                created_by=staff_list[0].id,
                created_at=datetime.strptime(p_data["created_at"], "%Y-%m-%d %H:%M:%S") if isinstance(p_data["created_at"], str) else now_dt,
                updated_at=datetime.strptime(p_data["updated_at"], "%Y-%m-%d %H:%M:%S") if isinstance(p_data["updated_at"], str) else now_dt,
            )
            db.session.add(p_obj)
            db.session.flush()

            # Buat varian SKU untuk produk
            price, weight, color = PRODUCT_PRICING_SPEC.get(p_id, (25000000, 1.0, "Standard Black"))
            cost_price = int(price * 0.78)

            prod_variants = []
            if p_id == 1:
                # Sony FX3: 2 varian (Body Only & Creator Kit)
                v1 = TPSProductVariant(
                    product_id=p_id,
                    sku_code="SONY-FX3-BODY",
                    variant_name=f"{p_data['name']} (Body Only + XLR Handle Unit)",
                    color_finish="Matte Black",
                    cost_price=52000000,
                    price=63999000,
                    stock=8,
                    weight_kg=1.05,
                    is_active=True,
                    stock_in_date=(now_dt - timedelta(days=20)).date(),
                    discount_percent=0,
                    is_clearance_active=False,
                )
                v2 = TPSProductVariant(
                    product_id=p_id,
                    sku_code="SONY-FX3-KIT2470",
                    variant_name=f"{p_data['name']} (Creator Kit + FE 24-70mm GM II)",
                    color_finish="Creator Bundle",
                    cost_price=78000000,
                    price=94500000,
                    stock=5,
                    weight_kg=1.75,
                    is_active=True,
                    stock_in_date=(now_dt - timedelta(days=15)).date(),
                    discount_percent=0,
                    is_clearance_active=False,
                )
                db.session.add_all([v1, v2])
                created_variants.extend([v1, v2])
                prod_variants.extend([v1, v2])
            else:
                # Varian Standard Retail Unit untuk produk 2 s/d 91
                days_old = 110 if p_id in [10, 20, 56] else (75 if p_id in [12, 38] else 25)
                stock_in_date = (now_dt - timedelta(days=days_old)).date()
                is_sample_clearance = True if days_old > 90 else False
                disc_pct = 15 if is_sample_clearance else 0
                clr_price = int(price * (1 - disc_pct / 100)) if is_sample_clearance else None
                clr_note = "Promo Diskon Cuci Gudang Unit Display & Stok > 90 Hari" if is_sample_clearance else None

                sku_suffix = "STD"
                v_obj = TPSProductVariant(
                    product_id=p_id,
                    sku_code=f"{p_data['sku_prefix']}-{sku_suffix}",
                    variant_name=f"{p_data['name']} (Standard Unit)",
                    color_finish=color,
                    cost_price=cost_price,
                    price=price,
                    stock=8,
                    weight_kg=weight,
                    is_active=True,
                    stock_in_date=stock_in_date,
                    discount_percent=disc_pct,
                    clearance_price=clr_price,
                    is_clearance_active=is_sample_clearance,
                    clearance_note=clr_note,
                )
                db.session.add(v_obj)
                created_variants.append(v_obj)
                prod_variants.append(v_obj)

            prod_variant_map[p_id] = prod_variants

        db.session.flush()

        # Multi-Branch Stock Allocation (tps__branch_stocks)
        print("  -> Menambahkan Kuota Multi-Branch Stock Visibility (CDC Cikarang & 5 Showroom)...")
        branch_distribution_weights = [
            (0, 12),  # Central Distribution Center - Cikarang (Gudang Pusat)
            (1, 4),   # Senayan City (Flagship)
            (2, 3),   # PIK Avenue
            (3, 2),   # Bandung
            (4, 2),   # Surabaya
            (5, 2),   # Bali
        ]
        for var in created_variants:
            tot = 0
            for b_idx, b_qty in branch_distribution_weights:
                bs = TPSBranchStock(
                    variant_id=var.id,
                    branch_id=branches[b_idx].id,
                    quantity=b_qty,
                )
                db.session.add(bs)
                tot += b_qty
            var.stock = tot
        db.session.flush()

        # Paket Bundling / Indie Filmmaker Production Kits (tps__bundles & tps__bundle_items)
        print("  -> Menambahkan 3 Kurasi Paket Bundling / Indie Filmmaker Production Kits...")
        v_fx3 = prod_variant_map[1][0]  # Sony FX3 Body
        v_rs4 = prod_variant_map[41][0] # DJI RS 4 Pro
        norm_1 = v_fx3.price + v_rs4.price
        cogs_1 = v_fx3.cost_price + v_rs4.cost_price
        price_1 = int(norm_1 * 0.91)
        save_1 = norm_1 - price_1

        b1 = TPSBundle(
            bundle_code="BNDL-RIG-001",
            name="Indie Filmmaker 4K Solo Creator Kit",
            description="Paket produksi bioskop solo filmmaker terlengkap: Sony FX3 Cinema Line 4K 120p Full-Frame + DJI RS 4 Pro Handheld Gimbal Stabilizer Carbon Fiber.",
            bundle_price=price_1,
            normal_total_price=norm_1,
            total_cogs=cogs_1,
            savings_amount=save_1,
            is_active=True,
            image_url="https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80&ext=.jpg",
            created_by=staff_list[1].id,
        )
        db.session.add(b1)
        db.session.flush()
        db.session.add(TPSBundleItem(bundle_id=b1.id, variant_id=v_fx3.id, qty=1))
        db.session.add(TPSBundleItem(bundle_id=b1.id, variant_id=v_rs4.id, qty=1))

        v_c70 = prod_variant_map[11][0]  # Canon EOS C70
        v_apt = prod_variant_map[50][0]  # Aputure LS 600d Pro
        v_atm = prod_variant_map[80][0]  # Atomos Ninja V+
        norm_2 = v_c70.price + v_apt.price + v_atm.price
        cogs_2 = v_c70.cost_price + v_apt.cost_price + v_atm.cost_price
        price_2 = int(norm_2 * 0.90)
        save_2 = norm_2 - price_2

        b2 = TPSBundle(
            bundle_code="BNDL-RIG-002",
            name="Commercial Cinema & Lighting Master Rig",
            description="Setup produksi iklan & dokumenter kelas pro: Canon EOS C70 Super 35mm 4K + Lampu Aputure LS 600d Pro LED Light + Field Monitor Atomos Ninja V+ 5.2\".",
            bundle_price=price_2,
            normal_total_price=norm_2,
            total_cogs=cogs_2,
            savings_amount=save_2,
            is_active=True,
            image_url="https://images.unsplash.com/photo-1502920917128-1aa500764cbd?auto=format&fit=crop&w=800&q=80&ext=.jpg",
            created_by=staff_list[1].id,
        )
        db.session.add(b2)
        db.session.flush()
        db.session.add(TPSBundleItem(bundle_id=b2.id, variant_id=v_c70.id, qty=1))
        db.session.add(TPSBundleItem(bundle_id=b2.id, variant_id=v_apt.id, qty=1))
        db.session.add(TPSBundleItem(bundle_id=b2.id, variant_id=v_atm.id, qty=1))

        v_sigma = prod_variant_map[37][0] # Sigma Cine FF High Speed 50mm T1.5
        v_senn = prod_variant_map[70][0]  # Sennheiser MKH 416
        v_rode = prod_variant_map[65][0]  # Rode Wireless PRO
        norm_3 = v_sigma.price + v_senn.price + v_rode.price
        cogs_3 = v_sigma.cost_price + v_senn.cost_price + v_rode.cost_price
        price_3 = int(norm_3 * 0.89)
        save_3 = norm_3 - price_3

        b3 = TPSBundle(
            bundle_code="BNDL-RIG-003",
            name="Broadcast Documentary Sound & Cine Prime Kit",
            description="Paket sinematografi visual & audio siaran: Sigma Cine FF High Speed 50mm T1.5 Lens + Sennheiser MKH 416 Shotgun Mic + Rode Wireless PRO 32-bit float.",
            bundle_price=price_3,
            normal_total_price=norm_3,
            total_cogs=cogs_3,
            savings_amount=save_3,
            is_active=True,
            image_url="https://images.unsplash.com/photo-1617005082133-548c4dd27f35?auto=format&fit=crop&w=800&q=80&ext=.jpg",
            created_by=staff_list[1].id,
        )
        db.session.add(b3)
        db.session.flush()
        db.session.add(TPSBundleItem(bundle_id=b3.id, variant_id=v_sigma.id, qty=1))
        db.session.add(TPSBundleItem(bundle_id=b3.id, variant_id=v_senn.id, qty=1))
        db.session.add(TPSBundleItem(bundle_id=b3.id, variant_id=v_rode.id, qty=1))

        # Mutasi Transfer Stok Gudang Pusat <-> Showroom (tps__stock_transfers)
        print("  -> Menambahkan Permintaan Transfer Stok Gudang Pusat ke Showroom...")
        trf1 = TPSStockTransfer(
            transfer_code=f"TRF-{now_dt.strftime('%Y%m')}-001",
            variant_id=v_fx3.id,
            from_branch_id=branches[0].id,
            to_branch_id=branches[1].id,
            qty=3,
            serial_numbers="SN-SONY-FX3-9901, SN-SONY-FX3-9902, SN-SONY-FX3-9903",
            requested_by=staff_list[4].id,
            processed_by=None,
            status="pending_warehouse",
            notes="Permintaan tambahan unit display untuk Showroom Senayan City karena pesanan Click & Collect meningkat.",
        )
        trf2 = TPSStockTransfer(
            transfer_code=f"TRF-{now_dt.strftime('%Y%m')}-002",
            variant_id=v_c70.id,
            from_branch_id=branches[0].id,
            to_branch_id=branches[3].id,
            qty=2,
            serial_numbers="SN-CAN-C70-4401, SN-CAN-C70-4402",
            requested_by=staff_list[4].id,
            processed_by=staff_list[3].id,
            status="shipped_to_branch",
            notes="Unit kamera Canon EOS C70 sudah dikirim dengan armada logistik internal Overtone berpeti kayu pelindung.",
        )
        trf3 = TPSStockTransfer(
            transfer_code=f"TRF-{now_dt.strftime('%Y%m')}-003",
            variant_id=v_rs4.id,
            from_branch_id=branches[0].id,
            to_branch_id=branches[2].id,
            qty=2,
            serial_numbers="SN-DJI-RS4P-1011, SN-DJI-RS4P-1012",
            requested_by=staff_list[4].id,
            processed_by=staff_list[3].id,
            status="completed",
            notes="Transfer stok telah selesai dan unit DJI RS 4 Pro sudah diterima di Showroom PIK Avenue.",
        )
        db.session.add_all([trf1, trf2, trf3])
        db.session.flush()

        # Sesi Absensi & Shift Mode Staf Toko (oas__staff_shifts)
        print("  -> Menambahkan Data Absensi Shift Mode Staf Toko (8 Sesi Realistis)...")
        shifts_data = [
            # 2 Sesi Aktif saat ini:
            OASStaffShift(
                staff_id=staff_list[4].id,
                shift_mode="offline_store",
                branch_id=branches[1].id,
                clock_in_at=now_dt - timedelta(hours=3, minutes=30),
                clock_out_at=None,
                status="active",
                notes="Shift Siang Showroom Flagship Senayan City - Melayani konsultasi setup kamera cinema & demo gimbal DJI",
            ),
            OASStaffShift(
                staff_id=staff_list[5].id,
                shift_mode="online_cs",
                branch_id=None,
                clock_in_at=now_dt - timedelta(hours=2, minutes=15),
                clock_out_at=None,
                status="active",
                notes="Shift Live Chat Concierge & WhatsApp Customer Support",
            ),
            # 6 Sesi Selesai (Riwayat Historis):
            OASStaffShift(
                staff_id=staff_list[4].id,
                shift_mode="offline_store",
                branch_id=branches[1].id,
                clock_in_at=now_dt - timedelta(days=1, hours=8),
                clock_out_at=now_dt - timedelta(days=1, hours=0, minutes=10),
                status="completed",
                notes="Shift Full Day Senayan City - closing kasir & serah terima invoice POS lancar",
            ),
            OASStaffShift(
                staff_id=staff_list[5].id,
                shift_mode="offline_store",
                branch_id=branches[2].id,
                clock_in_at=now_dt - timedelta(days=2, hours=8, minutes=15),
                clock_out_at=now_dt - timedelta(days=2, hours=0, minutes=30),
                status="completed",
                notes="Shift PIK Avenue - unboxing display lensa cinema & kalibrasi kebersihan sensor studio",
            ),
            OASStaffShift(
                staff_id=staff_list[4].id,
                shift_mode="online_cs",
                branch_id=None,
                clock_in_at=now_dt - timedelta(days=3, hours=8),
                clock_out_at=now_dt - timedelta(days=3),
                status="completed",
                notes="Layanan online concierge - menyelesaikan 14 konsultasi gear sinema & rekomendasi rig",
            ),
            OASStaffShift(
                staff_id=staff_list[5].id,
                shift_mode="offline_store",
                branch_id=branches[3].id,
                clock_in_at=now_dt - timedelta(days=4, hours=7, minutes=45),
                clock_out_at=now_dt - timedelta(days=4),
                status="completed",
                notes="Showroom Bandung - serah terima 2 unit pesanan Click & Collect Sony FX3",
            ),
            OASStaffShift(
                staff_id=staff_list[4].id,
                shift_mode="offline_store",
                branch_id=branches[1].id,
                clock_in_at=now_dt - timedelta(days=5, hours=8),
                clock_out_at=now_dt - timedelta(days=5),
                status="completed",
                notes="Weekend Rush Senayan City - demo low-light ISO Sony FX3 & Aputure lighting",
            ),
            OASStaffShift(
                staff_id=staff_list[5].id,
                shift_mode="online_cs",
                branch_id=None,
                clock_in_at=now_dt - timedelta(days=6, hours=8),
                clock_out_at=now_dt - timedelta(days=6),
                status="completed",
                notes="Online Helpdesk ticket handling & verifikasi pengiriman ekspedisi JNE Trucking",
            ),
        ]
        db.session.add_all(shifts_data)
        db.session.flush()

        # F. Akun Pelanggan Filmmaker Ritel (@overtone.id)
        print("  -> Menambahkan Akun Sutradara & Filmmaker (@overtone.id)...")
        customers = [
            TPSCustomer(
                name="Joko Anwar Director",
                username="customer",
                email="customer@overtone.id",
                phone="081234567890",
                address="Pondok Indah Residence No. 12, Jakarta Selatan",
                notify_email=True,
                notify_whatsapp=True,
            ),
            TPSCustomer(
                name="Angga Dwimas Sasongko",
                username="angga",
                email="angga@overtone.id",
                phone="081298765432",
                address="Jl. Senopati No. 45, Kebayoran Baru, Jakarta Selatan",
                notify_email=True,
                notify_whatsapp=True,
            ),
            TPSCustomer(
                name="Fajar Nugros",
                username="fajar",
                email="fajar@overtone.id",
                phone="081987654321",
                address="Bintaro Jaya Sektor 9, Tangerang Selatan",
                notify_email=True,
                notify_whatsapp=True,
            ),
            TPSCustomer(
                name="Yandy Laurens",
                username="yandy",
                email="yandy@overtone.id",
                phone="081377889900",
                address="Jl. Kaliurang KM 9, Sleman, Yogyakarta",
                notify_email=True,
                notify_whatsapp=True,
            ),
            TPSCustomer(
                name="Timo Tjahjanto",
                username="timo",
                email="timo@overtone.id",
                phone="081822334455",
                address="Sanur Beach Estate, Denpasar, Bali",
                notify_email=True,
                notify_whatsapp=True,
            ),
        ]
        for c in customers:
            c.set_password("password123")
            db.session.add(c)
        db.session.flush()

        # G. Sampel Transaksi Omnichannel & Purchase Orders
        print("  -> Menambahkan 20 Sampel Pesanan Cinema Gear Omnichannel (30 Hari Terakhir) & PO...")
        # 20 Transaksi Historis tersebar merata di 3 Channel (POS, Click & Collect, Delivery) & 5 Offline Store Branches
        orders_spec = [
            # (prod_id, cust_idx, qty, days_ago, fulfill, branch_idx, p_status, o_status, p_method)
            (1, 0, 1, 28, "delivery", None, "paid", "delivered", "Bank Transfer (BCA)"),                # Sony FX3 (Online Delivery)
            (41, 1, 1, 26, "in_store_pos", 1, "paid", "completed", "In-Store POS (EDC BCA)"),           # DJI RS 4 Pro (Senayan City POS)
            (65, 3, 2, 25, "delivery", None, "paid", "delivered", "Credit Card (Visa)"),                # Rode Wireless PRO (Online Delivery)
            (11, 2, 1, 23, "pickup", 1, "paid", "picked_up", "QRIS Overtone"),                          # Canon C70 (Senayan City Pickup)
            (80, 4, 1, 21, "in_store_pos", 2, "paid", "completed", "In-Store POS (QRIS)"),              # Atomos Ninja V+ (PIK Avenue POS)
            (50, 0, 1, 20, "delivery", None, "paid", "delivered", "Bank Transfer (Mandiri)"),          # Aputure LS 600d (Online Delivery)
            (70, 1, 1, 18, "pickup", 2, "paid", "picked_up", "Bank Transfer (BCA)"),                    # Sennheiser MKH 416 (PIK Avenue Pickup)
            (21, 3, 1, 16, "in_store_pos", 3, "paid", "completed", "In-Store POS (Debit Mandiri)"),     # Sony FE 24-70 GM II (Bandung POS)
            (13, 2, 1, 14, "delivery", None, "paid", "delivered", "Bank Transfer (BCA)"),              # Nikon Z8 (Online Delivery)
            (37, 4, 1, 12, "pickup", 3, "paid", "picked_up", "QRIS Overtone"),                          # Sigma Cine FF 50mm (Bandung Pickup)
            (70, 0, 1, 10, "in_store_pos", 4, "paid", "completed", "In-Store POS (EDC Mandiri)"),       # Sennheiser MKH 416 (Tunjungan Plaza Surabaya POS)
            (1, 2, 1, 9, "pickup", 4, "paid", "picked_up", "QRIS Overtone"),                            # Sony FX3 (Tunjungan Plaza Surabaya Pickup)
            (27, 4, 1, 7, "delivery", None, "paid", "delivered", "Bank Transfer (BCA)"),               # Canon RF 24-70 (Online Delivery)
            (20, 0, 1, 6, "in_store_pos", 5, "paid", "completed", "In-Store POS (EDC BCA)"),           # BMPCC 6K Pro (Seminyak Bali POS)
            (11, 1, 1, 5, "pickup", 5, "paid", "picked_up", "QRIS Overtone"),                           # Canon C70 (Seminyak Bali Pickup)
            (65, 3, 2, 4, "in_store_pos", 1, "paid", "completed", "In-Store POS (QRIS)"),               # Rode Wireless PRO (Senayan City POS)
            (41, 0, 1, 3, "pickup", 1, "paid", "completed", "QRIS Overtone"),                           # DJI RS 4 Pro (Senayan City Pickup)
            (1, 2, 1, 2, "delivery", None, "paid", "delivered", "Credit Card (Mastercard)"),            # Sony FX3 (Online Delivery)
            (2, 3, 1, 1, "in_store_pos", 2, "paid", "completed", "In-Store POS (EDC BCA)"),             # Sony FX30 (PIK Avenue POS)
            (81, 4, 1, 0, "pickup", 4, "paid", "ready_for_pickup", "Bank Transfer (BCA)"),              # Atomos Ninja Ultra (Tunjungan Plaza Surabaya Pickup)
        ]

        historical_orders = []
        for o_idx, (p_id, c_idx, qty, d_ago, f_meth, b_idx, p_stat, o_stat, p_meth) in enumerate(orders_spec):
            var = prod_variant_map[p_id][0]
            cust = customers[c_idx]
            o_dt = now_dt - timedelta(days=d_ago, hours=random.randint(1, 8))
            ship_fee = 150000 if f_meth == "delivery" else 0
            tot_price = (var.price * qty) + ship_fee

            served_staff = staff_list[4].id if f_meth in ["pickup", "click_and_collect", "in_store_pos"] else None
            branch_id_val = branches[b_idx].id if (b_idx is not None and b_idx < len(branches)) else None
            p_code = f"PCK-{1000 + o_idx}" if f_meth in ["pickup", "click_and_collect"] else None
            pck_stat = "collected" if o_stat in ["picked_up", "completed"] else ("ready" if o_stat == "ready_for_pickup" else "pending")

            ord_obj = TPSOrder(
                invoice_code=f"INV-OVERTONE-{o_dt.strftime('%y%m%d')}-{100 + o_idx}",
                customer_id=cust.id,
                product_id=var.product_id,
                variant_id=var.id,
                quantity=qty,
                unit_price=var.price,
                total_price=tot_price,
                fulfillment_method=f_meth,
                pickup_branch_id=branch_id_val,
                pickup_code=p_code,
                pickup_status=pck_stat,
                shipping_courier="JNE Trucking (Packing Kayu Berasuransi)" if f_meth == "delivery" else None,
                shipping_address=cust.address if f_meth == "delivery" else None,
                shipping_cost=ship_fee,
                tracking_number=f"JTR-99{d_ago:02d}{o_idx:02d}88" if f_meth == "delivery" else None,
                payment_status=p_stat,
                order_status=o_stat,
                payment_method=p_meth,
                buyer_name=cust.name,
                buyer_email=cust.email,
                buyer_phone=cust.phone,
                paid_at=o_dt,
                created_at=o_dt,
                handled_by_staff_id=served_staff,
            )
            db.session.add(ord_obj)
            historical_orders.append(ord_obj)

        po1 = TPSPurchaseOrder(
            po_number=f"PO-{now_dt.strftime('%Y%m%d')}-001",
            supplier_id=1, # Sony
            destination_branch_id=branches[2].id,
            product_id=1,
            variant_id=prod_variant_map[1][0].id,
            quantity=5,
            unit_cost=prod_variant_map[1][0].cost_price,
            total_cost=prod_variant_map[1][0].cost_price * 5,
            status="approved",
            requested_by=staff_list[3].id,
            approved_by=staff_list[1].id,
            notes="Restock reguler kuota kamera Sony FX3 Cinema Line Q4",
        )
        po2 = TPSPurchaseOrder(
            po_number=f"PO-{now_dt.strftime('%Y%m%d')}-002",
            supplier_id=2, # Canon
            destination_branch_id=branches[0].id,
            product_id=11,
            variant_id=prod_variant_map[11][0].id,
            quantity=3,
            unit_cost=prod_variant_map[11][0].cost_price,
            total_cost=prod_variant_map[11][0].cost_price * 3,
            status="pending",
            requested_by=staff_list[3].id,
            approved_by=None,
            notes="Restock pengadaan kamera Canon EOS C70 Cinema untuk Showroom Senayan & PIK",
        )
        db.session.add_all([po1, po2])
        db.session.flush()

        # H. Seed 7 Dokumen SOP Internal Resmi
        print("  -> Menambahkan 7 Dokumen SOP Dual-Scope Internal...")
        for sop in INTERNAL_SOPS:
            art = KMSArticle(
                category_id=cat_sop.id,
                title=sop["title"],
                slug=sop["sop_code"].lower(),
                content=sop["content"],
                excerpt=sop["excerpt"],
                author_staff_id=staff_list[0].id,
                is_published=True,
                audience_type="internal",
                target_role=sop["target_role"],
                sop_code=sop["sop_code"],
                priority_level=sop["priority_level"],
                version="1.0",
            )
            db.session.add(art)

        # Seed 2 FAQ Pelanggan Cinema
        faq_arts = [
            KMSArticle(
                category_id=cat_faq.id,
                title="Kebijakan Garansi Resmi Distributor Cinema & Broadcast 1-2 Tahun",
                slug="kebijakan-garansi-resmi",
                content="Setiap kamera cinema, lensa sinematik, gimbal stabilizer, dan perangkat broadcast yang dibeli di Overtone Store dilindungi garansi resmi distributor 1 hingga 2 tahun untuk sensor, motherboard, dan kelistrikan. Dilengkapi gratis 10-Point Sensor Calibration & Firmware QC di seluruh showroom resmi Overtone.",
                excerpt="Penjelasan garansi resmi distributor untuk kamera cinema, lensa prime, gimbal, dan audio.",
                author_staff_id=staff_list[0].id,
                is_published=True,
                audience_type="customer",
                target_role="public",
                version="1.0",
            ),
            KMSArticle(
                category_id=cat_faq.id,
                title="Cara Pengambilan Pesanan Click & Collect di Showroom & Cleanroom Testing",
                slug="cara-pengambilan-click-and-collect",
                content="Bawa Kode Pengambilan unik 6-digit dan identitas ke showroom cabang yang Anda pilih saat checkout. Tim teknisi sensor kami akan mendampingi unboxing, pemeriksaan dead pixel, kalibrasi back-focus lensa, dan update firmware di Cleanroom Sensor Tech Bench.",
                excerpt="Panduan langkah demi langkah serah terima unit di Cleanroom Bench showroom Overtone.",
                author_staff_id=staff_list[0].id,
                is_published=True,
                audience_type="customer",
                target_role="public",
                version="1.0",
            ),
        ]
        db.session.add_all(faq_arts)
        db.session.flush()

        # I. DSS Subsystem (5 Kriteria, 25 Subkriteria & Matriks AHP-TOPSIS)
        print("  -> Menambahkan Matriks 5x5 AHP & DSS Kriteria Restock Cinema Gear...")
        _seed_dss_self_contained(db, staff_list[1].id, customers, created_variants)

        # J. Pengaturan Sistem & Pengumuman OAS
        print("  -> Menambahkan Pengaturan Sistem & Pengumuman OAS...")
        settings = [
            OASSystemSetting(setting_key="store_name", setting_value="Overtone Pro Cinema Store - PT Overtone Retail Nusantara", description="Nama resmi entitas bisnis"),
            OASSystemSetting(setting_key="currency", setting_value="IDR", description="Mata uang toko"),
            OASSystemSetting(setting_key="tax_percentage", setting_value="11", description="Tarif PPN Indonesia"),
            OASSystemSetting(setting_key="click_collect_expiry_days", setting_value="7", description="Masa berlaku kode ambil"),
            OASSystemSetting(setting_key="return_window_days", setting_value="7", description="Batas hari pengajuan retur"),
        ]
        db.session.add_all(settings)

        ann = OASAnnouncement(
            title="Sistem Terintegrasi Overtone Pro Cinema & Broadcast Gear Aktif",
            content="Selamat datang di platform OAS, KMS, TPS, MIS, dan DSS terpadu PT Overtone Retail Nusantara (Divisi Cinema Cameras & Broadcast Gear).",
            audience_role="all",
            created_by=staff_list[0].id,
            is_active=True,
        )
        db.session.add(ann)

        # K. Ulasan Filmmaker & Rating Bintang Produk (tps__product_reviews)
        print("  -> Menambahkan 26 Ulasan Filmmaker & Star Rating (tps__product_reviews)...")
        reviews_data_spec = [
            # Prod 1: Sony FX3
            (1, 1, "Sony FX3 (Body Only)", 5, "Kamera Bioskop Solo Shooter Terbaik", "S-Cinetone menghasilkan skin tone sangat natural. Dual native ISO 12800 benar-benar menyelamatkan syuting malam tanpa noise mengganggu."),
            (1, 0, "Sony FX3 (Creator Kit)", 5, "Autofokus & Eye AF Super Akurat", "Kombinasi FX3 dengan GM II sangat tajam di bukaan f/2.8. Active cooling fan bekerja hening saat rekaman 4K 120p non-stop."),
            (1, 3, "Sony FX3 (Director Rig)", 5, "Rigging Modular Sangat Fleksibel", "Sangat mudah dipasangkan ke gimbal maupun tripod studio. QC kalibrasi sensor dari Overtone bersih tanpa setitik debu pun."),
            # Prod 2: Sony FX30
            (2, 2, "Sony FX30 (Standard Unit)", 5, "Entry Terbaik Cinema Line APS-C", "Sensor 26MP dan dual base ISO 800/2500 sangat powerful untuk indie filmmaker. Bodi ringkas dan fitur pro sama persis FX3."),
            # Prod 4: Sony A7 IV
            (4, 1, "Sony A7 IV (Standard Unit)", 5, "Workhorse Hybrid Foto & Video", "Sensor 33MP tajam, autofokus canggih dan 4K 60p 10-bit sangat memuaskan untuk produksi komersial dan wedding cinema."),
            # Prod 7: Canon EOS R5 C
            (7, 3, "Canon EOS R5 C (Standard Unit)", 5, "Hybrid Sinema 8K RAW Tanpa Batas Waktu", "Sistem pendingin aktif mencegah overheating saat rekam 8K RAW internal. Menu cinema EOS sangat familier dan intuitif."),
            # Prod 11: Canon EOS C70
            (11, 3, "Canon EOS C70 (Standard Unit)", 5, "Sensor DGO dengan Warna Khas Canon", "Highlight rolloff sangat lembut dan organic. Built-in ND filter 10 stops sangat praktis untuk syuting outdoor tanpa mattebox berat."),
            (11, 1, "Canon EOS C70 (Standard Unit)", 5, "Workhorse Iklan & Series", "Perekaman internal 10-bit 4:2:2 DCI 4K sangat stabil. Menjadi andalan tim sinematografi kami."),
            # Prod 13: Nikon Z8
            (13, 0, "Nikon Z8 (Standard Unit)", 5, "Mini Z9 dengan Kemampuan 8K N-RAW", "Autofokus deteksi subjek luar biasa cepat. Bodi kokoh dan tahan cuaca ekstrem saat shooting landscape."),
            # Prod 15: Panasonic Lumix S5 II
            (15, 4, "Panasonic Lumix S5 II (Standard Unit)", 5, "Phase Hybrid AF Akhirnya Hadir", "Stabilisasi sensor IBIS terbaik di kelasnya dan profil warna V-Log 14+ stops sangat mudah di-grade."),
            # Prod 18: Fujifilm X-H2S
            (18, 2, "Fujifilm X-H2S (Standard Unit)", 5, "Stacked Sensor Super Kencang", "Burst 40 fps dan ProRes internal 4:2:2 HQ. Film simulation Eterna menghasilkan look film klasik instan."),
            # Prod 20: Blackmagic Pocket Cinema Camera 6K Pro
            (20, 0, "BMPCC 6K Pro (Standard Unit)", 5, "Blackmagic RAW Sangat Fleksibel", "Internal ND filter bermotor dan layar tilt 1500 nits sangat membantu di lokasi syuting terik."),
            # Prod 21: Sony FE 24-70mm f/2.8 GM II
            (21, 4, "Sony FE 24-70mm GM II", 5, "Lensa Zoom Standar Tertajam", "Bobotnya jauh lebih ringan dari generasi pertama dan autofokusnya instan mengikuti gerakan cepat."),
            # Prod 27: Canon RF 24-70mm f/2.8L IS USM
            (27, 2, "Canon RF 24-70mm f/2.8L", 5, "Stabilizer IS Optik Sangat Efektif", "Ketajaman merata hingga ke sudut frame, bokeh sangat lembut untuk portrait dan documentary."),
            # Prod 33: Sigma 24-70mm f/2.8 DG DN Art
            (33, 0, "Sigma 24-70mm Art", 5, "Value for Money Terbaik", "Kualitas optik mendekati lensa first-party dengan harga separuhnya. Sangat kokoh dan tahan debu."),
            # Prod 37: Sigma Cine FF High Speed 50mm T1.5
            (37, 2, "Sigma Cine FF 50mm T1.5", 5, "Zero Focus Breathing", "Focus throw 300 derajat sangat presisi untuk follow focus nirkabel. Kontras optik dan saturasi warna konsisten lintas focal length."),
            # Prod 39: Zeiss CP.3 50mm T2.1
            (39, 4, "Zeiss CP.3 50mm T2.1", 5, "Karakter Optik Zeiss Legendaris", "Aperture melingkar menghasilkan flare dan bokeh yang sangat sinematik. Marking focus luminous sangat terbantu saat malam."),
            # Prod 41: DJI RS 4 Pro
            (41, 4, "DJI RS 4 Pro (Standard Unit)", 5, "Daya Angkut 4.5kg Sangat Kokoh", "Mampu menahan beban kamera FX3 lengkap dengan cine prime dan matte box. Automated axis locks generasi ke-2 jauh lebih cepat."),
            (41, 3, "DJI RS 4 Pro (Standard Unit)", 5, "LiDAR Focus 20 Meter Sangat Presisi", "Monitoring nirkabel ke monitor sutradara lancar tanpa drop frame."),
            # Prod 44: Zhiyun Crane 3S
            (44, 1, "Zhiyun Crane 3S (Standard Unit)", 5, "Kuat Angkat Kamera Cinema Besar", "Menahan beban kamera cinema besar seperti RED atau FX6 dengan sangat stabil."),
            # Prod 49: Aputure LS 300x II
            (49, 3, "Aputure LS 300x II (Standard Unit)", 5, "Bi-Color Fleksibel untuk Interview", "Pengaturan color temperature dari tungsten ke daylight sangat halus dan CRI 96+ terjaga."),
            # Prod 50: Aputure LS 600d Pro
            (50, 1, "Aputure LS 600d Pro (Standard Unit)", 5, "Output Cahaya Luar Biasa Terang", "Mampu mengimbangi sinar matahari langsung di lokasi outdoor. Sidus Link app control sangat responsif."),
            # Prod 56: Godox SL60W
            (56, 2, "Godox SL60W (Standard Unit)", 5, "Pilihan Utama Studio Creator", "Lampu budget paling andal untuk setup pencahayaan studio YouTube dan podcasting."),
            # Prod 60: Nanlite Forza 60B II
            (60, 4, "Nanlite Forza 60B II (Standard Unit)", 5, "Sangat Ringkas & Tenaga Besar", "Mudah dibawa dalam ransel kamera dan bisa ditenagai baterai V-Mount atau NPF."),
            # Prod 64: Rode Wireless GO II
            (64, 0, "Rode Wireless GO II (Standard Unit)", 5, "Solusi Audio Dual Channel Praktis", "Perekaman backup internal di dalam transmitter menyelamatkan audio dari gangguan interferensi."),
            # Prod 65: Rode Wireless PRO
            (65, 0, "Rode Wireless PRO (Standard Unit)", 5, "32-bit Float Audio Bebas Clipping", "Teriakan kencang aktor maupun bisikan pelan terekam sempurna tanpa distorsi sinyal audio."),
        ]

        for p_id, c_idx, var_name, r_score, r_title, r_comment in reviews_data_spec:
            target_c = customers[c_idx]
            rev = TPSProductReview(
                product_id=p_id,
                customer_id=target_c.id,
                variant_name=var_name,
                rating=r_score,
                title=r_title,
                comment=r_comment,
                is_verified_purchase=True,
                created_at=now_dt - timedelta(days=random.randint(1, 25)),
            )
            db.session.add(rev)

        # L. MIS Subsystem Seeding (Ringkasan Eksekutif, Sales, Revenue & Performa Produk)
        print("  -> Menambahkan Data Agregat MIS Analytics & Executive Dashboards...")
        # 1. mis__dashboard_summary (MisDashboardSummary)
        mis_dash = MisDashboardSummary(
            metric_date=now_dt.date(),
            total_revenue=2845000000,
            total_cogs=2190000000,
            gross_profit=655000000,
            gross_margin_pct=23.02,
            total_orders=148,
            total_units_sold=182,
            pending_pos=2,
            low_stock_skus_count=5,
            last_synced_at=now_dt,
        )
        db.session.add(mis_dash)

        # 2. mis__executive_reports (MisRevenueSummary) - 14 Harian & 4 Bulanan
        for d_i in range(14, -1, -1):
            m_date = (now_dt - timedelta(days=d_i)).date()
            d_rev = 82500000 if d_i in [1, 2, 5, 9, 13] else (38000000 if d_i in [4, 8, 12] else 17500000)
            d_cogs = int(d_rev * 0.77)
            d_profit = d_rev - d_cogs
            db.session.add(MisRevenueSummary(
                period_type="daily",
                period_date=m_date,
                gross_sales=d_rev,
                cogs_total=d_cogs,
                gross_profit=d_profit,
                delivery_sales=int(d_rev * 0.65),
                pickup_sales=int(d_rev * 0.35),
                last_synced_at=now_dt,
            ))

        months_spec = [
            (date(2026, 7, 1), 380000000, 290000000),
            (date(2026, 8, 1), 490000000, 375000000),
            (date(2026, 9, 1), 610000000, 468000000),
            (date(2026, 10, 1), 740000000, 565000000),
        ]
        for m_d, g_s, c_t in months_spec:
            db.session.add(MisRevenueSummary(
                period_type="monthly",
                period_date=m_d,
                gross_sales=g_s,
                cogs_total=c_t,
                gross_profit=g_s - c_t,
                delivery_sales=int(g_s * 0.70),
                pickup_sales=int(g_s * 0.30),
                last_synced_at=now_dt,
            ))

        # 3. mis__product_performance (MisProductPerformance) untuk katalog cinema unggulan
        prod_perf_spec = [
            (1, "Sony", "Sony FX3 Cinema Line Full-Frame Camera", "Cinema Camera Body", 6, 383994000, 312000000, 16),
            (11, "Canon", "Canon EOS C70 Cinema Camera", "Cinema Camera Body", 4, 330000000, 272000000, 6),
            (13, "Nikon", "Nikon Z8 Mirrorless Camera", "Mirrorless Camera Body", 3, 179997000, 140000000, 5),
            (20, "Blackmagic Design", "Blackmagic Pocket Cinema Camera 6K Pro", "Cinema Camera Body", 5, 197500000, 154000000, 8),
            (21, "Sony", "Sony FE 24-70mm f/2.8 GM II", "Cinema Zoom Lens", 5, 159995000, 124800000, 10),
            (37, "Sigma", "Sigma Cine FF High Speed 50mm T1.5", "Cinema Prime Lens", 3, 156000000, 121680000, 4),
            (41, "DJI", "DJI RS 4 Pro Gimbal Stabilizer", "Handheld Gimbal Stabilizer", 8, 111920000, 87280000, 12),
            (49, "Aputure", "Aputure LS 300x II Bi-Color LED Light", "COB Cinema Light", 5, 82500000, 64350000, 7),
            (65, "Rode", "Rode Wireless PRO Wireless Mic System", "Wireless Microphone System", 10, 69500000, 54210000, 15),
            (70, "Sennheiser", "Sennheiser MKH 416 Shotgun Microphone", "Shotgun Microphone", 6, 111000000, 86580000, 8),
            (81, "Atomos", "Atomos Ninja Ultra 5.2in Monitor Recorder", "Monitor Recorder", 5, 69750000, 54400000, 7),
        ]
        for p_id, b_name, p_name, i_type, u_sold, g_rev, c_cost, c_stk in prod_perf_spec:
            db.session.add(MisProductPerformance(
                product_id=p_id,
                brand_name=b_name,
                product_name=p_name,
                instrument_type=i_type,
                units_sold=u_sold,
                gross_revenue=g_rev,
                cogs=c_cost,
                net_profit=g_rev - c_cost,
                current_stock=c_stk,
                last_synced_at=now_dt,
            ))

        # 4. mis__sales_summary (MisSalesSummary) - Distribusi 6 Kategori Cinema & Broadcast
        cat_sales_spec = [
            ("Cinema & Mirrorless Cameras", 18, 1623994000, 1319000000, 21.0, "2026-10"),
            ("Cinema & Prime Lenses", 9, 613500000, 504000000, 20.1, "2026-10"),
            ("Gimbals & Camera Stabilizers", 12, 519900000, 412000000, 22.4, "2026-10"),
            ("Studio & Cinema Lighting", 6, 199600000, 158000000, 24.7, "2026-10"),
            ("Wireless & Broadcast Audio", 16, 163500000, 127200000, 26.7, "2026-10"),
            ("Monitors & Field Recorders", 7, 89750000, 71000000, 24.5, "2026-10"),
        ]
        for c_name, u_sold, s_rev, s_cogs, m_pct, p_month in cat_sales_spec:
            db.session.add(MisSalesSummary(
                instrument_category=c_name,
                units_sold=u_sold,
                revenue=s_rev,
                cogs=s_cogs,
                profit_margin_pct=m_pct,
                period_month=p_month,
                last_synced_at=now_dt,
            ))

        # M. Subsistem ke-6: ES (Expert System / Sistem Pakar Enterprise) Seeding
        print("  -> Menambahkan Data Master Subsistem ke-6: ES (Fakta, Aturan Pakar & Log Konsultasi)...")

        # 1. es__symptoms_facts (24 Fakta & Gejala Teknis Sinema)
        es_facts_spec = [
            # Domain: shoot_recommender
            ("FACT_SHOOT_WEDDING", "shoot_recommender", "shooting_type", "Skenario Syuting: Wedding & Event Run-and-Gun Cepat", 0.90),
            ("FACT_SHOOT_COMMERCIAL", "shoot_recommender", "shooting_type", "Skenario Syuting: Iklan Komersial / Film Naratif 6K/8K Presisi Tinggi", 0.95),
            ("FACT_SHOOT_DOCUMENTARY", "shoot_recommender", "shooting_type", "Skenario Syuting: Dokumenter Alam / Low-Light Guerrilla", 0.90),
            ("FACT_SHOOT_BROADCAST", "shoot_recommender", "shooting_type", "Skenario Syuting: Multi-Cam Live Podcast / Siaran TV Broadcast", 0.90),
            ("FACT_SHOOT_STUDIO", "shoot_recommender", "shooting_type", "Skenario Syuting: Studio Controlled 3-Point Lighting & Product Showcase", 0.85),
            ("FACT_LIGHT_LOW", "shoot_recommender", "lighting", "Kondisi Pencahayaan: Ekstrem Low-Light / Malam Hari Tanpa Lighting Tambahan", 0.90),
            ("FACT_LIGHT_CONTROL", "shoot_recommender", "lighting", "Kondisi Pencahayaan: Full Controlled Studio Key/Fill/Hair Light", 0.85),
            ("FACT_RES_6K_RAW", "shoot_recommender", "resolution", "Target Format Rekaman: 6K / 8K RAW Cinema Uncompressed", 0.95),
            ("FACT_RES_4K_120", "shoot_recommender", "resolution", "Target Format Rekaman: 4K 120 FPS High-Frame Rate Slow Motion", 0.90),
            ("FACT_MOB_GIMBAL", "shoot_recommender", "mobility", "Kebutuhan Mobilitas: Stabilisasi Gimbal 3-Axis / Handheld Bergerak Aktif", 0.90),
            # Domain: rig_compatibility
            ("FACT_MOUNT_MISMATCH", "rig_compatibility", "optical_mount", "Perbedaan Flange Mount Lensa vs Kamera (e.g. Sony E vs Canon RF vs PL)", 0.95),
            ("FACT_S35_FF_VIGNETTE", "rig_compatibility", "sensor_coverage", "Penggunaan Lensa Super 35 pada Sensor Full-Frame Tanpa Mode Crop", 0.90),
            ("FACT_GIMBAL_OVERLOAD", "rig_compatibility", "payload_balance", "Beban Rig Kamera Melebihi 85% Kapasitas Torsi Maksimum Gimbal", 0.95),
            ("FACT_HIGH_BITRATE_MEDIA", "rig_compatibility", "media_bandwidth", "Codec All-Intra 600Mbps+ Memerlukan Media Kartu CFexpress Type A/B", 0.90),
            ("FACT_HIGH_DRAW_POWER", "rig_compatibility", "power_delivery", "Konsumsi Daya Rig > 45W Memerlukan Eksternal Baterai V-Mount D-Tap", 0.85),
            # Domain: rma_diagnostic
            ("FACT_DEAD_PIXEL_LINE", "rma_diagnostic", "sensor_defect", "Garis Dead Pixel Vertikal / Horizontal Permanen pada Sensor CMOS", 0.95),
            ("FACT_LASER_BURN", "rma_diagnostic", "sensor_damage", "Kerusakan Sensor Berupa Titik/Luka Bakar Akibat Paparan Sinar Laser Stage", 0.95),
            ("FACT_LDI_RED_CORROSION", "rma_diagnostic", "liquid_intrusion", "LDI (Liquid Damage Indicator) Berwarna Merah / Oksidasi Korosi PCB", 0.95),
            ("FACT_OPTICAL_FUNGUS", "rma_diagnostic", "environmental_damage", "Pertumbuhan Jamur Optik (Fungus Filamen) pada Elemen Dalam Lensa", 0.90),
            ("FACT_GIMBAL_MOTOR_DRIFT", "rma_diagnostic", "hardware_defect", "Axis Motor Gimbal Mengalami Drift Spontan Tanpa Ada Kerusakan Fisik Luar", 0.90),
            ("FACT_MAINBOARD_PORT_FAIL", "rma_diagnostic", "electronic_defect", "Port SDI / HDMI Tidak Mengeluarkan Sinyal Video (Chip Controller Rusak)", 0.90),
            # Domain: deadstock_strategy & vendor_risk
            ("FACT_DEADSTOCK_HIGH_AGING", "deadstock_strategy", "inventory_velocity", "Umur Simpan Produk di Gudang Melebihi 90 Hari (Aging Bucket Merah)", 0.90),
            ("FACT_BRANCH_STOCK_IMBALANCE", "deadstock_strategy", "regional_demand", "Ketimpangan Stok Cabang: Kosong di Showroom Utama Namun Menumpuk di Gudang Luar", 0.85),
            ("FACT_VENDOR_HIGH_DEFECT_RATE", "vendor_risk", "supplier_risk", "Tingkat Retur Garansi Cacat Produksi dari Prinsipal > 5% Batch", 0.90),
        ]

        for f_code, f_domain, f_cat, f_label, f_w in es_facts_spec:
            db.session.add(ESSymptomFact(
                fact_code=f_code,
                domain=f_domain,
                category=f_cat,
                label=f_label,
                weight=f_w,
                created_at=now_dt,
            ))

        # Query SOP Articles for Rule FK
        sop_wh_art = KMSArticle.query.filter(KMSArticle.sop_code == "SOP-WH-001").first()
        sop_store_art = KMSArticle.query.filter(KMSArticle.sop_code == "SOP-STORE-002").first()
        sop_mgt_art = KMSArticle.query.filter(KMSArticle.sop_code == "SOP-MGT-001").first()
        sop_gen_art = KMSArticle.query.filter(KMSArticle.sop_code == "SOP-GEN-001").first()

        wh_art_id = sop_wh_art.id if sop_wh_art else None
        store_art_id = sop_store_art.id if sop_store_art else None
        mgt_art_id = sop_mgt_art.id if sop_mgt_art else None
        gen_art_id = sop_gen_art.id if sop_gen_art else None

        # 2. es__rules (18 Aturan Pakar IF-THEN & Certainty Factor)
        es_rules_spec = [
            # Skenario Syuting (shoot_recommender)
            ("RULE-SHOOT-001", "shoot_recommender", "Paket Rekomendasi Wedding & Event Cinema 4K Run-and-Gun",
             {"all": ["FACT_SHOOT_WEDDING", "FACT_MOB_GIMBAL"]},
             "RECOMMEND_WEDDING_CINEMA_KIT", "RECOMMEND_GEAR",
             "Skenario wedding dinamis memerlukan dual native ISO 12800 untuk ruangan temaram, AF real-time eye tracking, active cooling anti-overheat, dan gimbal payload 4.5kg dengan locking axis otomatis.",
             0.95, gen_art_id),
            ("RULE-SHOOT-002", "shoot_recommender", "Paket Rekomendasi Film Komersial & Naratif 6K/8K RAW",
             {"all": ["FACT_SHOOT_COMMERCIAL", "FACT_RES_6K_RAW"]},
             "RECOMMEND_COMMERCIAL_NARRATIVE_KIT", "RECOMMEND_GEAR",
             "Produksi film bioskop dan TVC menuntut global shutter sensor, 16+ stop dynamic range, color science 16-bit REDCODE RAW, dan kontrol pencahayaan high-output 600W daylight.",
             0.94, gen_art_id),
            ("RULE-SHOOT-003", "shoot_recommender", "Paket Rekomendasi Low-Light Guerrilla Documentary",
             {"all": ["FACT_SHOOT_DOCUMENTARY", "FACT_LIGHT_LOW"]},
             "RECOMMEND_LOWLIGHT_DOC_KIT", "RECOMMEND_GEAR",
             "Dokumenter lapangan tanpa kru pencahayaan besar membutuhkan sensor BSI Full-Frame low-noise ekstrem dan perekaman audio 32-bit float yang tidak akan clipping saat suara keras mendadak.",
             0.92, gen_art_id),
            ("RULE-SHOOT-004", "shoot_recommender", "Paket Rekomendasi Multi-Cam Podcast & Broadcast Live Streaming",
             {"all": ["FACT_SHOOT_BROADCAST"]},
             "RECOMMEND_BROADCAST_STUDIO_KIT", "RECOMMEND_GEAR",
             "Siaran langsung multi-kamera membutuhkan output HDMI/SDI clean feed tanpa batas rekam 30 menit, timecode sync, mikrofon broadcast dinamis cardioid, dan softbox studio diffusor.",
             0.91, gen_art_id),
            ("RULE-SHOOT-005", "shoot_recommender", "Paket Rekomendasi 3-Point Studio Lighting & Commercial Rig",
             {"all": ["FACT_SHOOT_STUDIO", "FACT_LIGHT_CONTROL"]},
             "RECOMMEND_STUDIO_LIGHTING_KIT", "RECOMMEND_GEAR",
             "Sistem pencahayaan 3-titik standar bioskop menghasilkan pemisahan subjek dari latar belakang dengan indeks warna CRI/TLCI 96+ agar akurasi tone kulit akurat di color grading.",
             0.93, gen_art_id),
            # Kompatibilitas Rig (rig_compatibility)
            ("RULE-COMPAT-001", "rig_compatibility", "Validasi Mount Lensa vs Flange Kamera: Ketidakcocokan Fisik",
             {"all": ["FACT_MOUNT_MISMATCH"]},
             "MOUNT_INCOMPATIBILITY_DETECTED", "FLAG_INCOMPATIBLE",
             "Lensa dengan bayonet mount berbeda tidak dapat dipasang langsung pada bodi kamera tanpa adapter optik/elektronik (misal: lensa Canon EF ke body Sony E membutuhkan adapter Sigma MC-11 atau Metabones).",
             0.98, store_art_id),
            ("RULE-COMPAT-002", "rig_compatibility", "Validasi Sensor Format: Lensa Super 35 pada Sensor Full-Frame",
             {"all": ["FACT_S35_FF_VIGNETTE"]},
             "SENSOR_CROP_VIGNETTE_WARNING", "FLAG_INCOMPATIBLE",
             "Lingkaran gambar lensa Super 35 (diameter ~28mm) tidak mencakup sensor Full-Frame (diameter 43.3mm), menimbulkan vinyet hitam tebal di sudut layar kecuali kamera diset ke mode APS-C/Super35 Crop.",
             0.92, store_art_id),
            ("RULE-COMPAT-003", "rig_compatibility", "Validasi Beban Rig vs Kapasitas Torsi Gimbal Stabilizer",
             {"all": ["FACT_GIMBAL_OVERLOAD"]},
             "GIMBAL_PAYLOAD_TORQUE_EXCEEDED", "FLAG_INCOMPATIBLE",
             "Total bobot kamera + lensa cine + motor focus + monitor lapangan melebihi 85% kapasitas aman gimbal, menyebabkan motor brushless overheating dan jitter mikro pada rekaman.",
             0.96, store_art_id),
            ("RULE-COMPAT-004", "rig_compatibility", "Validasi Media Kecepatan Tinggi untuk Codec 4K 120p / 6K RAW",
             {"all": ["FACT_HIGH_BITRATE_MEDIA"]},
             "REQUIRE_CFEXPRESS_MEDIA", "RECOMMEND_GEAR",
             "Perekaman video bitrate tinggi (All-Intra / RAW) membutuhkan sustained write speed minimal 400MB/s yang hanya dapat dipenuhi oleh media kartu CFexpress.",
             0.94, wh_art_id),
            ("RULE-COMPAT-005", "rig_compatibility", "Validasi Kebutuhan Daya Tambahan Rig Sinema (V-Mount Power)",
             {"all": ["FACT_HIGH_DRAW_POWER"]},
             "REQUIRE_VMOUNT_BATTERY_SYSTEM", "RECOMMEND_GEAR",
             "Rig terpadu (Kamera + Monitor High-Bright 2000 nits + Wireless Video Transmitter) menguras baterai internal dalam < 20 menit, membutuhkan baterai V-Mount 99Wh-150Wh untuk durabilitas syuting 3-4 jam.",
             0.88, wh_art_id),
            # Diagnosa RMA & Sensor QC (rma_diagnostic)
            ("RULE-RMA-001", "rma_diagnostic", "Diagnosa Garansi QC: Garis Dead Pixel Sensor CMOS",
             {"all": ["FACT_DEAD_PIXEL_LINE"]},
             "APPROVED_WARRANTY_DEFECT", "APPROVE_RMA_REPLACEMENT",
             "Dead pixel line vertikal/horizontal terjadi akibat kegagalan interkoneksi baris/kolom pembacaan sensor silicon fabrikasi prinsipal dan bukan disebabkan kelalaian penggunaan.",
             0.97, store_art_id),
            ("RULE-RMA-002", "rma_diagnostic", "Diagnosa Garansi QC: Luka Bakar Sensor Akibat Paparan Sinar Laser",
             {"all": ["FACT_LASER_BURN"]},
             "REJECTED_USER_FAULT", "REJECT_RMA_USER_FAULT",
             "Luka bakar mikro titik hitam/pelangi pada fotodioda sensor diakibatkan radiasi sinar laser panggung/konser, melanggar syarat garansi distributor resmi Sony/Canon/RED.",
             0.98, store_art_id),
            ("RULE-RMA-003", "rma_diagnostic", "Diagnosa Garansi QC: Indikator Korosi Cairan (LDI Red)",
             {"all": ["FACT_LDI_RED_CORROSION"]},
             "REJECTED_USER_FAULT", "REJECT_RMA_USER_FAULT",
             "Liquid Damage Indicator (LDI) di dalam slot baterai atau chamber sensor berubah merah menandakan cairan telah masuk ke sirkuit internal. Garansi resmi distributor gugur otomatis.",
             0.99, store_art_id),
            ("RULE-RMA-004", "rma_diagnostic", "Diagnosa Garansi QC: Jamur Optik Lensa Akibat Penyimpanan Lembap",
             {"all": ["FACT_OPTICAL_FUNGUS"]},
             "REJECTED_USER_FAULT", "REJECT_RMA_USER_FAULT",
             "Jamur optik (fungus) tumbuh karena penyimpanan di lingkungan RH > 60% tanpa silica gel/dry cabinet. Garansi pabrik tidak menanggung kelalaian perawatan lingkungan.",
             0.91, wh_art_id),
            ("RULE-RMA-005", "rma_diagnostic", "Diagnosa Garansi QC: Motor Gimbal Drift Spontan Tanpa Kerusakan Fisik",
             {"all": ["FACT_GIMBAL_MOTOR_DRIFT"]},
             "APPROVED_WARRANTY_DEFECT", "APPROVE_RMA_REPLACEMENT",
             "Drift motor roll/pan tanpa bekas benturan fisik luar mengindikasikan kegagalan sensor gyro IMU internal bawaan pabrik.",
             0.92, store_art_id),
            ("RULE-RMA-006", "rma_diagnostic", "Diagnosa Garansi QC: Port HDMI/SDI Mainboard Tidak Mengeluarkan Sinyal",
             {"all": ["FACT_MAINBOARD_PORT_FAIL"]},
             "APPROVED_WARRANTY_DEFECT", "APPROVE_RMA_REPLACEMENT",
             "IC transmitter HDMI/SDI mati mendadak pada penggunaan tegangan standar mengindikasikan komponen solder micro BGA defect saat assembly.",
             0.89, store_art_id),
            # Deadstock & Evaluasi Risiko Vendor
            ("RULE-DEADSTOCK-001", "deadstock_strategy", "Strategi Deadstock: Bundling Produk Lambat dengan Kamera Best Seller",
             {"all": ["FACT_DEADSTOCK_HIGH_AGING"]},
             "SUGGEST_RIG_BUNDLE_CREATION", "SUGGEST_BUNDLE_TRANSFER",
             "Menggabungkan unit slow-moving (>90 hari) dengan body kamera populer (seperti Sony FX3 atau Canon C70) dengan diskon paket 8-12% mempercepat perputaran kas tanpa merusak margin produk utama.",
             0.88, mgt_art_id),
            ("RULE-VENDOR-001", "vendor_risk", "Evaluasi Risiko Supplier: Penalti Skor Keandalan pada Rekomendasi Restock DSS",
             {"all": ["FACT_VENDOR_HIGH_DEFECT_RATE"]},
             "PENALIZE_SUPPLIER_RESTOCK", "PENALIZE_DSS_SCORE",
             "Supplier atau lini produk dengan rasio RMA klaim cacat pabrik > 5% diberikan penalti risiko kualitas agar Manager PO tidak melakukan over-restock sebelum revisi QC batch baru.",
             0.93, mgt_art_id),
        ]

        for r_code, r_domain, r_title, r_conds, r_verdict, r_action, r_expl, r_cf, r_kms in es_rules_spec:
            db.session.add(ESRule(
                rule_code=r_code,
                domain=r_domain,
                title=r_title,
                conditions_json=r_conds,
                conclusion_verdict=r_verdict,
                action_type=r_action,
                explanation=r_expl,
                certainty_factor=r_cf,
                kms_article_id=r_kms,
                is_active=True,
                created_at=now_dt,
            ))

        # 3. es__consultations (10 Riwayat Konsultasi Lintas Subsistem)
        es_consultations_spec = [
            ("ES-SES-001", "shoot_recommender", "filmmaker", 1, "product_kit", 1,
             ["FACT_SHOOT_WEDDING", "FACT_MOB_GIMBAL"], [{"rule_code": "RULE-SHOOT-001", "cf": 0.95}],
             "RECOMMEND_WEDDING_CINEMA_KIT", 0.95,
             "Paket Sony FX3 + FE 24-70mm GM II + DJI RS 4 Pro direkomendasikan dengan CF 95%.",
             {"camera": "Sony FX3", "lens": "Sony FE 24-70mm GM II", "gimbal": "DJI RS 4 Pro"}),
            ("ES-SES-002", "shoot_recommender", "filmmaker", 2, "product_kit", 11,
             ["FACT_SHOOT_COMMERCIAL", "FACT_RES_6K_RAW"], [{"rule_code": "RULE-SHOOT-002", "cf": 0.94}],
             "RECOMMEND_COMMERCIAL_NARRATIVE_KIT", 0.94,
             "Paket Canon C70 + Sigma Cine FF 50mm + Aputure LS 600d Pro direkomendasikan dengan CF 94%.",
             {"camera": "Canon EOS C70", "lens": "Sigma Cine 50mm", "lighting": "Aputure LS 600d Pro"}),
            ("ES-SES-003", "rig_compatibility", "filmmaker", 3, "rig_combination", 1,
             ["FACT_MOUNT_MISMATCH"], [{"rule_code": "RULE-COMPAT-001", "cf": 0.98}],
             "NEEDS_ADAPTER_OR_CAGE", 0.98,
             "Bodi Sony E-Mount dengan Lensa Canon EF memerlukan adapter Sigma MC-11.",
             {"cam_mount": "Sony E-Mount", "lens_mount": "Canon EF-Mount"}),
            ("ES-SES-004", "rig_compatibility", "filmmaker", 4, "rig_combination", 20,
             [], [],
             "OPTIMAL_COMPATIBLE", 0.96,
             "Blackmagic 6K Pro dengan Lensa EF dan Zhiyun Crane 3S 100% kompatibel dan seimbang.",
             {"payload_utilization_pct": 68.5}),
            ("ES-SES-005", "rma_diagnostic", "store_staff", 6, "return_request", 1,
             ["FACT_DEAD_PIXEL_LINE"], [{"rule_code": "RULE-RMA-001", "cf": 0.97}],
             "APPROVED_WARRANTY_DEFECT", 0.97,
             "Sensor dead pixel line vertikal terbukti cacat fabrikasi. Disetujui penggantian unit baru.",
             {"action": "APPROVE_REPLACEMENT"}),
            ("ES-SES-006", "rma_diagnostic", "store_staff", 6, "return_request", 2,
             ["FACT_LASER_BURN"], [{"rule_code": "RULE-RMA-002", "cf": 0.98}],
             "REJECTED_USER_FAULT", 0.98,
             "Kerusakan sensor akibat paparan laser stage konser. Klaim garansi resmi ditolak.",
             {"action": "REJECT_USER_FAULT"}),
            ("ES-SES-007", "deadstock_strategy", "manager", 2, "product", 39,
             ["FACT_DEADSTOCK_HIGH_AGING"], [{"rule_code": "RULE-DEADSTOCK-001", "cf": 0.88}],
             "SUGGEST_RIG_BUNDLE_CREATION", 0.88,
             "Lensa Zeiss CP.3 50mm disarankan dibundel bersama bodi Sony FX3 dengan diskon 10%.",
             {"target_bundle_partner": "Sony FX3", "suggested_discount": 10.0}),
            ("ES-SES-008", "vendor_risk", "manager", 2, "dss_session", 1,
             ["FACT_VENDOR_HIGH_DEFECT_RATE"], [{"rule_code": "RULE-VENDOR-001", "cf": 0.93}],
             "PENALIZE_SUPPLIER_RESTOCK", 0.93,
             "Supplier dengan tingkat cacat batch > 5% diberi penalti -15% bobot pada TOPSIS DSS.",
             {"penalty_rate": -0.15}),
            ("ES-SES-009", "concierge_triage", "customer", 5, "support_ticket", 1,
             ["FACT_LIGHT_LOW"], [{"rule_code": "RULE-SHOOT-003", "cf": 0.92}],
             "RECOMMEND_LOWLIGHT_GEAR", 0.92,
             "Triage otomatis merekomendasikan sensor Full-Frame dual ISO dan mikrofon 32-bit float.",
             {"suggested_category": "Cinema Cameras"}),
            ("ES-SES-010", "rma_diagnostic", "warehouse_staff", 5, "return_request", 3,
             ["FACT_GIMBAL_MOTOR_DRIFT"], [{"rule_code": "RULE-RMA-005", "cf": 0.92}],
             "APPROVED_WARRANTY_DEFECT", 0.92,
             "Motor axis drift spontan tanpa ada benturan fisik. Disetujui servis garansi resmi DJI.",
             {"action": "APPROVE_REPAIR"}),
        ]

        for s_code, s_dom, s_role, s_act, s_ref_type, s_ref_id, s_facts, s_rules, s_verd, s_conf, s_adv, s_payload in es_consultations_spec:
            db.session.add(ESConsultation(
                session_code=s_code,
                domain=s_dom,
                actor_role=s_role,
                actor_id=s_act,
                reference_type=s_ref_type,
                reference_id=s_ref_id,
                input_facts_json=s_facts,
                matched_rules_json=s_rules,
                final_verdict=s_verd,
                confidence_score=s_conf,
                expert_advice=s_adv,
                recommended_payload_json=s_payload,
                created_at=now_dt - timedelta(days=random.randint(1, 15)),
            ))

        db.session.commit()
        print("✓ Seluruh data master berhasil di-commit ke database.")

        print("\n[5/5] Rekapitulasi Data Master Database Overtone (6 Subsistem Enterprise):")
        print(f"  • Staf Internal OAS        : {OASStaff.query.count()} user")
        print(f"  • Cabang Showroom/Gudang   : {TPSStoreBranch.query.count()} cabang")
        print(f"  • Brand & Principal KMS    : {KMSBrandSupplier.query.count()} brand")
        print(f"  • Kategori KMS             : {KMSCategory.query.count()} kategori")
        print(f"  • Produk Cinema TPS        : {TPSProduct.query.count()} produk (Katalog Lengkap .md)")
        print(f"  • Varian SKU TPS           : {TPSProductVariant.query.count()} SKU")
        print(f"  • Multi-Branch Stock Rows  : {TPSBranchStock.query.count()} baris")
        print(f"  • Rig Bundles              : {TPSBundle.query.count()} paket")
        print(f"  • Pelanggan Filmmaker      : {TPSCustomer.query.count()} user")
        print(f"  • Transaksi Omnichannel    : {TPSOrder.query.count()} pesanan")
        print(f"  • Ulasan & Rating          : {TPSProductReview.query.count()} ulasan")
        print(f"  • Dokumen SOP & FAQ KMS    : {KMSArticle.query.count()} artikel")
        print(f"  • Sesi Rekomendasi TOPSIS  : {DSSSession.query.count()} sesi")
        print(f"  • Matriks AHP Pairwise     : {DSSAHPMatrix.query.count()} sel")
        print(f"  • Fakta & Gejala QC ES     : {ESSymptomFact.query.count()} fakta")
        print(f"  • Aturan Pakar (Rules) ES  : {ESRule.query.count()} aturan IF-THEN")
        print(f"  • Log Konsultasi Pakar ES  : {ESConsultation.query.count()} sesi")
        print("=======================================================")
        print("✓ INISIALISASI 6 SUBSISTEM ENTERPRISE (TPS · OAS · KMS · MIS · DSS · ES) SELESAI DENGAN SEMPURNA!")
        print("=======================================================\n")


if __name__ == "__main__":
    init_database()
