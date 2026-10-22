"""
Seeder Dokumen SOP Internal Divisi Overtone Music Store (OAS KMS Dual-Scope)
Mencakup 7 SOP resmi untuk seluruh role:
- all_internal (Umum)
- warehouse_staff (Gudang)
- store_staff (Showroom & Luthier)
- finance (Keuangan)
- manager (Manajerial & DSS)
"""
from datetime import datetime
from app import create_app, db
from app.models.models import KMSCategory, KMSArticle, OASStaff

INTERNAL_SOPS = [
    {
        "sop_code": "SOP-GEN-001",
        "title": "Standar Etika Kerja, Jam Operasional & Keamanan Akun OAS Overtone",
        "target_role": "all_internal",
        "priority_level": "mandatory",
        "excerpt": "Panduan kepatuhan jam kerja, penggunaan seragam showroom/gudang, kerahasiaan data pelanggan, dan protokol pergantian password OAS berkala.",
        "content": """### 1. TUJUAN & RUANG LINGKUP
Dokumen SOP ini mengatur tata tertib perilaku profesional, jam kehadiran kerja, dan keamanan akses sistem terintegrasi (OAS, TPS, KMS, MIS) bagi seluruh pegawai Overtone Music Store di seluruh kantor pusat, showroom cabang, dan gudang distribusi.

---

### 2. PROTOKOL KEAMANAN AKUN & SISTEM
1. **Kerahasiaan Kredensial**: Setiap staf wajib menjaga kerahasiaan password akun OAS masing-masing. Dilarang meminjamkan akun login kepada rekan kerja atau pihak ketiga.
2. **Kepatuhan Data Pribadi**: Data pelanggan (nama, nomor telepon, alamat rumah, invoice transaksi) dilindungi undang-undang dan dilarang disebarluaskan untuk kepentingan non-pekerjaan.
3. **Penyimpanan Dokumen**: Seluruh dokumen serah-terima fisik harus disimpan di lemari terkunci dan di-scan ke arsip cloud internal sebelum jam toko tutup.

---

### 3. JAM OPERASIONAL & LAYANAN
- **Showroom Staff**: Hadir 30 menit sebelum buka toko (09:30 WIB) untuk inspeksi suhu display instrumen (21-24°C, humidity 45-55%).
- **Warehouse Staff**: Jam operasional penerimaan barang ekspedisi pukul 08:30 - 17:00 WIB.
- **Finance Staff**: Proses verifikasi transfer dan approval pembayaran PO dilakukan pada cutoff pukul 11:00 WIB dan 15:00 WIB setiap hari kerja.
""",
    },
    {
        "sop_code": "SOP-WH-001",
        "title": "Prosedur Packing Kayu Berasuransi & Input Serial Number Instrumen",
        "target_role": "warehouse_staff",
        "priority_level": "critical",
        "excerpt": "Standar baku proteksi packing kayu berlapis, bantalan headstock gitar, asuransi penuh ekspedisi, dan pencatatan serial number fisik sebelum rilis gudang.",
        "content": """### 1. TUJUAN
Memastikan setiap unit instrumen yang dikirim melalui kurir ekspedisi (JNE Trucking / SiCepat Cargo) tiba di tangan pelanggan dalam kondisi sempurna tanpa risiko retak kayu, neck patah, atau kelembapan ekstrem.

---

### 2. PERSIAPAN SEBELUM PACKING
1. **Inspeksi Visual Fisik**: Cek body finish (gloss/satin), neck relief, fretwire, dan kelengkapan aksesoris (tremolo arm, kunci L, manual book, sertifikat keaslian).
2. **Pencatatan Serial Number**: Scan atau ketik nomor seri fisik yang tertera di headstock belakang ke field `serial_number` pada kartu pesanan sistem TPS.
3. **Peredaman Senar**: Kendorkan tegangan senar setengah putaran (half-step down) guna meminimalisir tarikan neck saat perubahan suhu udara kargo pesawat/kapal.

---

### 3. LANGKAH-LANGKAH PACKING KAYU
1. Masukkan instrumen ke dalam Hardcase atau Gigbag aslinya dengan bantalan microfiber di area headstock.
2. Bungkus kardus primer menggunakan **Double Bubble Wrap** minimal 3 lapis tebal.
3. Rakit rangka peti kayu (kayu pinus kering) dengan jarak renggang maksimal 8 cm antar bilah kayu.
4. Tempelkan stiker peringatan **'FRAGILE - ALAT MUSIK BERHARGA'** dan label barcode resi pengiriman di sisi atas peti.
5. Pastikan asuransi barang bernilai tinggi (Nilai Penuh = Harga Invoice) telah tercentang pada manifest ekspedisi.
""",
    },
    {
        "sop_code": "SOP-WH-002",
        "title": "SOP Penerimaan Barang PO Supplier & Stock Opname Gudang",
        "target_role": "warehouse_staff",
        "priority_level": "standard",
        "excerpt": "Tata cara unboxing peti kontainer supplier resmi (Fender/Gibson/Roland), cek kesesuaian faktur PO, pencatatan mutasi masuk, dan audit fisik berkala.",
        "content": """### 1. ALUR PENERIMAAN BARANG DARI SUPPLIER
1. **Pemeriksaan Surat Jalan**: Cocokkan nomor Purchase Order (`PO-2026-XXXX`) dari supplier dengan data yang telah disetujui General Manager di sistem TPS/PO.
2. **Hitung Koli & Fisik**: Pastikan jumlah karton utuh dan pita segel pabrik tidak sobek sebelum menandatangani bukti terima supir logistik.
3. **Proses Unboxing & QC**: Buka sampel 10% dari setiap batch SKU untuk uji sampling kelistrikan pickup, tuning stability, dan kelengkapan kartu garansi.

---

### 2. INPUT MUTASI MASUK & PENYIMPANAN
1. Buka menu **Logistik Gudang > Penerimaan PO** di dashboard OAS.
2. Masukkan kuantitas riil yang diterima. Sistem otomatis memperbarui stok gudang (`tps__product_variants.stock`) dan mencatat log mutasi `po_receiving`.
3. Letakkan instrumen pada rak susun vertikal berpendingin udara (HVAC Controlled Zone) dengan suhu stabil 22°C.
""",
    },
    {
        "sop_code": "SOP-ST-001",
        "title": "SOP Serah Terima Click & Collect & 10-Point Luthier Setup di Showroom",
        "target_role": "store_staff",
        "priority_level": "critical",
        "excerpt": "Protokol penyambutan pelanggan pengambilan barang showroom, verifikasi kode unik PICKUP-XXXX, sound-check bersama, dan kalibrasi luthier gratis.",
        "content": """### 1. PENYAMBUTAN PELANGGAN DI SHOWROOM
1. Sambut musisi dengan hangat di Service Desk Overtone.
2. Minta musisi menunjukkan **Kode Unik Ambil Barang (Format: PICKUP-XXXXXXXX)** dari email invoice atau aplikasi.
3. Buka menu **Click & Collect Pickup Pass** di dashboard toko dan lakukan verifikasi kode. Sistem akan memvalidasi status pesanan.

---

### 2. UNBOXING BERSAMA & 10-POINT LUTHIER SETUP (GRATIS)
Setiap instrumen gitar/bass yang diambil berhak mendapatkan kalibrasi profesional luthier:
1. **Tuning Stability**: Stem ke standar 440Hz menggunakan tuner chromatic profesional.
2. **Neck Relief (Truss-Rod)**: Ukur gap fret ke-8 dengan feeler gauge (standar 0.010 inch).
3. **Action String Height**: Atur ketinggian saddle (1.5mm treble, 2.0mm bass di fret ke-12).
4. **Intonation**: Pastikan nada fret ke-12 sama persis dengan harmonic octave.
5. **Fret Polish & Lemon Oil**: Bersihkan fretboard kayu rosewood/ebony dengan minyak pelindung.
6. **Pickup Output Balance**: Uji respon balance volume pickup neck, middle, dan bridge.
7. **Potentiometer & Jack Check**: Putar volume/tone knob, pastikan bebas dari noise berderak (*scratchy pots*).

---

### 3. PENYELESAIAN SERAH TERIMA
Klik tombol **'Konfirmasi Penyerahan Unit'** di sistem. Cetak struk serah terima dan serahkan nota kartu garansi resmi distributor 1 tahun kepada pelanggan.
""",
    },
    {
        "sop_code": "SOP-ST-002",
        "title": "Prosedur Penanganan Live Chat Concierge & Klaim Garansi Pelanggan",
        "target_role": "store_staff",
        "priority_level": "mandatory",
        "excerpt": "SOP respon cepat antrean Live Agent (<60 detik), etika konsultasi gear, penanganan komplain humanis, dan eskalasi klaim garansi distributor.",
        "content": """### 1. MONITORING ANTREAN LIVE AGENT
1. Buka tab **Live Chat Console & Helpdesk** di workstation showroom sepanjang jam kerja.
2. Jika banner merah menyala (*'X Musisi Menunggu Konfirmasi'*), staf bertugas wajib mengklik tombol **'Terima Chat'** dalam waktu maksimal 60 detik.
3. Sapalah musisi dengan menyebutkan nama: *"Halo Kak [Nama Musisi], salam kenal! Saya [Nama Staf] gear specialist Overtone. Ada yang bisa kami bantu seputar instrumen atau showroom hari ini?"*

---

### 2. ETIKA KONSULTASI GEAR
- **Pahami Kebutuhan Musik**: Tanyakan genre, preferensi amplifier, dan kenyamanan playability sebelum menyarankan gitar.
- **Rekomendasi Jujur**: Berikan alternatif instrumen yang tepat guna tanpa memaksa musisi memilih opsi termahal.
- **Lampiran Foto Real Unit**: Gunakan fitur upload gambar jika musisi meminta foto serat kayu (*wood grain*) unit yang ready di showroom.

---

### 3. PENANGANAN KLAIM GARANSI
1. Verifikasi nomor invoice dan tanggal pembelian (garansi berlaku 12 bulan sejak tanggal invoice).
2. Kerusakan yang di-cover: Kerusakan saklar selector, pickup mati, jack input longgar, truss rod macet.
3. Kerusakan tidak di-cover: Jatuh terbentur, finish retak akibat cuaca ekstrem di luar ruangan, atau modifikasi mandiri tanpa teknisi bersertifikat.
""",
    },
    {
        "sop_code": "SOP-FN-001",
        "title": "SOP Verifikasi Pelunasan Invoice PO Supplier & Pencairan Refund Retur",
        "target_role": "finance",
        "priority_level": "critical",
        "excerpt": "Prosedur 3-way matching invoice PO gudang, otorisasi pembayaran bank transfer, dan verifikasi mutasi rekening refund pengembalian dana pembeli.",
        "content": """### 1. VERIFIKASI PEMBAYARAN PURCHASE ORDER (3-WAY MATCHING)
Sebelum finance mentransfer dana pelunasan kepada supplier, wajib melakukan pencocokan 3 dokumen (*Three-Way Matching*):
1. **PO Terbitan**: Nilai unit dan termin pembayaran (Net 30/60) pada Purchase Order yang disetujui General Manager.
2. **Good Receipt (GR)**: Laporan mutasi barang masuk yang diverifikasi oleh tim kepala gudang.
3. **Commercial Invoice Supplier**: Faktur pajak dan nomor rekening resmi milik perusahaan distributor.

---

### 2. OTORISASI & CUTOFF TRANSFER
- Approval transfer dilakukan berjenjang: Nilai < Rp 50.000.000 (Finance Controller); Nilai > Rp 50.000.000 (Approval bersama General Manager).
- Simpan bukti transfer PDF dari internet banking dan unggah ke field `payment_proof_url` di menu **Pembayaran PO Supplier**.

---

### 3. PENCAIRAN REFUND RETUR PELANGGAN
1. Refund hanya dapat diproses setelah tim QC gudang mengonfirmasi instrumen retur telah diterima kembali dalam kondisi utuh.
2. Pencairan dana wajib menggunakan rekening yang sama dengan rekening pembayaran awal pelanggan untuk mencegah indikasi *money laundering*.
3. Waktu SLA transfer refund maksimal 1x24 jam kerja sejak disetujui.
""",
    },
    {
        "sop_code": "SOP-MG-001",
        "title": "Panduan Evaluasi Smart Restock DSS (AHP-TOPSIS) & Batas Aman Clearance Promo",
        "target_role": "manager",
        "priority_level": "mandatory",
        "excerpt": "Instruksi kerja kurasi skor DSS AHP-TOPSIS untuk order inventaris baru, serta audit margin guardrail diskon clearance anti-rugi deadstock.",
        "content": """### 1. EVALUASI REKOMENDASI SMART RESTOCK DSS
1. **Analisis Bobot Kriteria AHP**: Periksa konsistensi rasio bobot (Sales Velocity 35%, Profit Margin 25%, Holding Cost 20%, Supplier Lead Time 20%).
2. **Kategori Rank A (High Priority Reorder)**: Utamakan approval PO instrumen yang memiliki skor preferensi relatif TOPSIS > 0.70.
3. **Lead Time Buffer**: Tambahkan buffer 7 hari untuk instrumen impor (C.F. Martin USA, Marshall UK) guna mengantisipasi keterlambatan bea cukai logistik pelabuhan.

---

### 2. KENDALI BATAS DISKON CLEARANCE PROMO (MARGIN GUARDRAIL)
1. Buka simulator di menu **Deadstock & Clearance Simulator** untuk mengevaluasi SKU yang berumur simpan > 90 hari di gudang.
2. **Aturan Margin Aman (Safe Profit)**: Diskon maksimal yang diizinkan adalah persentase diskon yang masih menghasilkan harga jual di atas HPP Modal + 5%.
3. **Peringatan Bahaya (Below COGS Danger)**: General Manager dilarang menyetujui clearance promo dengan status `BELOW_COGS_DANGER` kecuali ada instruksi tertulis likuidasi total akhir tahun.
4. Lakukan evaluasi penjualan clearance setiap akhir pekan untuk mencabut promo instrumen yang stoknya telah kembali ke batas sehat (< 5 unit).
""",
    },
]


def seed_sops():
    app = create_app()
    with app.app_context():
        # 1. Pastikan kategori SOP internal tersedia
        cat = KMSCategory.query.filter_by(slug="internal-sop").first()
        if not cat:
            cat = KMSCategory(
                name="Standar Operasional Prosedur (SOP Internal)",
                slug="internal-sop",
                description="Koleksi pedoman kerja baku, standar keamanan inventaris, dan etika layanan resmi staf Overtone.",
                icon="shield",
                sort_order=10,
                is_active=True,
            )
            db.session.add(cat)
            db.session.flush()
            print("Created category: Standar Operasional Prosedur (SOP Internal)")

        admin_staff = OASStaff.query.filter(OASStaff.role.in_(["super_admin", "manager"])).first() or OASStaff.query.first()
        admin_id = admin_staff.id if admin_staff else None

        seeded_count = 0
        for item in INTERNAL_SOPS:
            existing = KMSArticle.query.filter_by(sop_code=item["sop_code"]).first()
            if not existing:
                existing = KMSArticle.query.filter_by(slug=item["sop_code"].lower()).first()

            if existing:
                existing.title = item["title"]
                existing.audience_type = "internal"
                existing.target_role = item["target_role"]
                existing.sop_code = item["sop_code"]
                existing.priority_level = item["priority_level"]
                existing.excerpt = item["excerpt"]
                existing.content = item["content"]
                existing.category_id = cat.id
                existing.is_published = True
                print(f"Updated SOP: {item['sop_code']} - {item['title']}")
            else:
                art = KMSArticle(
                    category_id=cat.id,
                    title=item["title"],
                    slug=item["sop_code"].lower(),
                    audience_type="internal",
                    target_role=item["target_role"],
                    sop_code=item["sop_code"],
                    priority_level=item["priority_level"],
                    excerpt=item["excerpt"],
                    content=item["content"],
                    author_staff_id=admin_id,
                    is_published=True,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                )
                db.session.add(art)
                print(f"Seeded new SOP: {item['sop_code']} - {item['title']}")
            seeded_count += 1

        db.session.commit()
        print(f"Successfully seeded/updated {seeded_count} internal SOP documents!")


if __name__ == "__main__":
    seed_sops()
