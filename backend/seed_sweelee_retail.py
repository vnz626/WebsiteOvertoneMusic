"""
Script Seeder Komprehensif Overtone Music Store (Swee Lee Style Retail).
1. Otomatis membuat database `overtone_store` jika belum ada.
2. Menghapus (DROP) tabel lama bersatu underscore (oas_*, tps_*, kms_*, mis_*, dss_*).
3. Membuat 28 tabel baru dengan prefix double underscore (oas__*, kms__*, tps__*, mis__*, dss__*)
   sehingga otomatis membentuk subfolder pohon di phpMyAdmin:
   [+] dss
   [+] kms
   [+] mis
   [+] oas
   [+] tps
4. Mengisi data awal enterprise retail: Staff internal, Cabang, Brand/Supplier, Produk & Varian SKU,
   Pelanggan, Transaksi, PO, Log Inventori, KMS Artikel/FAQ, Metrik MIS, Pengaturan OAS,
   serta 5 Tabel Subsistem DSS (Hybrid AHP & TOPSIS).
"""
import os
import sys

# Support UTF-8 output on Windows consoles
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

from datetime import datetime, date, timedelta
import random
import pymysql
from werkzeug.security import generate_password_hash

# Pastikan path backend dikenali
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


def reset_and_initialize_database():
    print(f"\n=======================================================")
    print(f"[INIT] INITIALIZING DATABASE: {DB_NAME} at {DB_HOST}:{DB_PORT}")
    print(f"=======================================================\n")

    # 1. Koneksi ke MySQL server level root untuk buat database jika belum ada
    conn = pymysql.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASS,
        autocommit=True,
        charset='utf8mb4'
    )
    cursor = conn.cursor()

    print(f"[1/4] Memastikan database `{DB_NAME}` tersedia...")
    cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{DB_NAME}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
    cursor.execute(f"USE `{DB_NAME}`;")

    print("[2/4] Membersihkan tabel lama (DROP legacy single-underscore & double-underscore tables)...")
    cursor.execute("SET FOREIGN_KEY_CHECKS = 0;")
    cursor.execute("SHOW TABLES;")
    existing_tables = [row[0] for row in cursor.fetchall()]

    for tbl in existing_tables:
        print(f"  -> Dropping table `{tbl}`...")
        cursor.execute(f"DROP TABLE IF EXISTS `{tbl}`;")

    cursor.execute("SET FOREIGN_KEY_CHECKS = 1;")
    conn.close()
    print("✓ Seluruh tabel lama berhasil dibersihkan.")

    # 2. Bangun seluruh skema tabel menggunakan SQLAlchemy db.create_all()
    print("\n[3/4] Membuat skema tabel baru dengan prefix double underscore (`__`)...")
    from app import create_app
    from app.extensions import db
    from app.models.models import (
        OASStaff,
        OASAnnouncement,
        OASNotification,
        OASSystemSetting,
        OASSupportTicket,
        OASSupportMessage,
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
        DSSCriterion,
        DSSSubcriterionRange,
        DSSAHPMatrix,
        DSSSession,
        DSSTopsisResult,
    )
    from app.models.mis_models import (
        MisDashboardSummary,
        MisProductPerformance,
        MisRevenueSummary,
        MisSalesSummary,
    )

    app = create_app()
    with app.app_context():
        db.create_all()
        print("✓ Seluruh tabel SQLAlchemy terdaftar berhasil dibuat di database `overtone_store`.")

        print("\n[4/4] Mengisi data awal (Seeding Data Enterprise Swee Lee / Overtone)...")

        # A. OAS Staff (5 Internal Roles)
        print("  -> Menambahkan 5 Akun Staf Internal (OAS)...")
        pwd_hash = generate_password_hash("password123")
        staff_list = [
            OASStaff(name="Super Administrator", username="admin", email="admin@sweelee.id", password_hash=pwd_hash, role="super_admin", phone="08111000100"),
            OASStaff(name="Store General Manager", username="manager", email="manager@sweelee.id", password_hash=pwd_hash, role="manager", phone="08111000200"),
            OASStaff(name="Finance Controller", username="finance", email="finance@sweelee.id", password_hash=pwd_hash, role="finance", phone="08111000300"),
            OASStaff(name="Warehouse Lead", username="warehouse", email="warehouse@sweelee.id", password_hash=pwd_hash, role="warehouse_staff", phone="08111000400"),
            OASStaff(name="Senior Store Specialist", username="store", email="store@sweelee.id", password_hash=pwd_hash, role="store_staff", phone="08111000500"),
        ]
        db.session.add_all(staff_list)
        db.session.flush()

        # B. TPS Store Branches
        print("  -> Menambahkan Cabang Showroom & Gudang Distribusi (TPS)...")
        branches = [
            TPSStoreBranch(name="Swee Lee Flagship Showroom - Senayan City", branch_type="flagship", city="Jakarta Pusat", address="Senayan City Mall Lt. 3, Jl. Asia Afrika No. 19, Jakarta Pusat", phone="021-72781001", map_url="https://maps.google.com/?q=Senayan+City"),
            TPSStoreBranch(name="Swee Lee Experience Store - Pondok Indah", branch_type="showroom", city="Jakarta Selatan", address="Pondok Indah Mall 2 Lt. 2, Jl. Metro Pondok Indah, Jakarta Selatan", phone="021-7506990", map_url="https://maps.google.com/?q=Pondok+Indah+Mall"),
            TPSStoreBranch(name="Swee Lee Central Distribution Center - Cikarang", branch_type="warehouse", city="Bekasi (Cikarang)", address="Kawasan Industri MM2100 Blok C-10, Cikarang Barat, Bekasi", phone="021-8980123", map_url="https://maps.google.com/?q=MM2100+Cikarang"),
        ]
        db.session.add_all(branches)
        db.session.flush()
        senayan_branch = branches[0]
        warehouse_branch = branches[2]

        # Hubungkan staff ke cabang
        staff_list[3].branch_id = warehouse_branch.id  # warehouse staff
        staff_list[4].branch_id = senayan_branch.id    # store staff
        db.session.flush()

        # C. KMS Brands & Suppliers (kms__brands_suppliers)
        print("  -> Menambahkan Master Brand & Supplier Resmi (KMS)...")
        brands = [
            KMSBrandSupplier(name="Fender Musical Instruments", slug="fender", country="United States", description="Authorized Distributor Fender & Squier Indonesia", logo_url="/uploads/fender-logo.png", website="https://fender.com", contact_email="supply@fender.com", contact_phone="+1-800-488-181"),
            KMSBrandSupplier(name="Gibson Brands Inc.", slug="gibson", country="United States", description="Official Partner for Gibson USA & Epiphone", logo_url="/uploads/gibson-logo.png", website="https://gibson.com", contact_email="distribution@gibson.com", contact_phone="+1-800-444-2766"),
            KMSBrandSupplier(name="Yamaha Music", slug="yamaha", country="Japan", description="PT Yamaha Musik Indonesia Distributor", logo_url="/uploads/yamaha-logo.png", website="https://id.yamaha.com", contact_email="sales@yamaha-musik.id", contact_phone="021-5202577"),
            KMSBrandSupplier(name="Roland Corporation", slug="roland", country="Japan", description="Roland Synthesizers, BOSS Pedals & Electronic Drums", logo_url="/uploads/roland-logo.png", website="https://roland.com", contact_email="info@roland.id", contact_phone="+81-53-523-0230"),
            KMSBrandSupplier(name="Shure Microphones", slug="shure", country="United States", description="Industry Standard Microphones & Wireless Monitoring", logo_url="/uploads/shure-logo.png", website="https://shure.com", contact_email="support@shure.id", contact_phone="+1-847-600-2000"),
            KMSBrandSupplier(name="Marshall Amplification", slug="marshall", country="United Kingdom", description="Legendary British Tube Amplifiers & Cabinets", logo_url="/uploads/marshall-logo.png", website="https://marshall.com", contact_email="contact@marshall.com", contact_phone="+44-1908-375411"),
        ]
        db.session.add_all(brands)
        db.session.flush()
        brand_map = {b.slug: b.id for b in brands}

        # D. TPS Products & Variants
        print("  -> Menambahkan Katalog Instrumen & Varian SKU (TPS)...")
        catalog = [
            {
                "brand_slug": "fender",
                "name": "Fender Player II Stratocaster",
                "sku_prefix": "FEN-PL2-STRAT",
                "instrument_type": "Electric Guitar",
                "category": "Electric Guitars",
                "description": "Fender Player II Stratocaster menghadirkan nada klasik Fender dengan playability modern. Dilengkapi pickup Player Series Alnico V Single-Coil, neck maple Modern C, dan bridge 2-Point Synchronized Tremolo.",
                "specifications": "Body: Alder\nNeck: Maple, Modern C Profile\nFingerboard: Rosewood / Maple, 9.5 Radius\nPickups: 3x Player Series Alnico 5 Strat Single-Coil\nFrets: 22 Medium Jumbo\nHardware: Nickel/Chrome\nTuning Machines: Standard Cast/Sealed",
                "warranty_months": 24,
                "image_url": "/uploads/fender-strat.jpg",
                "variants": [
                    ("FEN-PL2-3TS", "3-Color Sunburst (Rosewood)", "3-Color Sunburst", 9500000, 13750000, 8, 3.6),
                    ("FEN-PL2-BLK", "Gloss Black (Maple)", "Gloss Black", 9200000, 13500000, 5, 3.5),
                    ("FEN-PL2-POL", "Polar White (Maple)", "Polar White", 9200000, 13500000, 4, 3.5),
                ]
            },
            {
                "brand_slug": "gibson",
                "name": "Gibson Les Paul Standard 50s",
                "sku_prefix": "GIB-LP-STD50",
                "instrument_type": "Electric Guitar",
                "category": "Electric Guitars",
                "description": "Menghidupkan kembali desain klasik 1950-an. Body solid mahogany dengan carved maple top, neck profil 50s rounded, dan sepasang pickup BurstBucker 1 & BurstBucker 2 bertenaga alnico II magnet.",
                "specifications": "Body: Solid Mahogany with Maple Top\nNeck: Mahogany, Vintage 50s Profile\nScale: 24.75 inch\nPickups: BurstBucker 1 (Neck), BurstBucker 2 (Bridge)\nElectronics: Hand-wired with Orange Drop Capacitors\nCase: Gibson Hard Shell Case Included",
                "warranty_months": 36,
                "image_url": "/uploads/gibson-lespaul.jpg",
                "variants": [
                    ("GIB-LP50-HCS", "Heritage Cherry Sunburst", "Heritage Cherry Sunburst", 28000000, 39500000, 3, 4.3),
                    ("GIB-LP50-TOB", "Tobacco Burst", "Tobacco Burst", 28000000, 39500000, 2, 4.2),
                    ("GIB-LP50-GLD", "Goldtop", "Goldtop Finish", 27500000, 38900000, 1, 4.4),
                ]
            },
            {
                "brand_slug": "yamaha",
                "name": "Yamaha Stage Custom Birch Acoustic Drum Set",
                "sku_prefix": "YAM-SC-BIRCH",
                "instrument_type": "Acoustic Drums",
                "category": "Drums & Percussion",
                "description": "100% birch shell 6-ply drum kit legendaris dari Yamaha. Menghasilkan proyeksi suara renyah, low-end punch bertenaga, dan sustain resonan berkat Yamaha Enhanced Sustain System (Y.E.S.S.).",
                "specifications": "Configuration: 5-Piece Shell Pack\nBass Drum: 22x17\nTom Toms: 10x7, 12x8\nFloor Tom: 16x15\nSnare Drum: 14x5.5\nShell Material: 100% 6-Ply Birch\nMounting: Y.E.S.S. System",
                "warranty_months": 12,
                "image_url": "/uploads/yamaha-drums.jpg",
                "variants": [
                    ("YAM-SCB-RB", "Raven Black 5-Piece", "Raven Black", 10500000, 15200000, 4, 32.0),
                    ("YAM-SCB-NW", "Natural Wood 5-Piece", "Natural Wood", 10500000, 15200000, 3, 32.0),
                    ("YAM-SCB-CR", "Cranberry Red 5-Piece", "Cranberry Red", 10500000, 15200000, 2, 32.0),
                ]
            },
            {
                "brand_slug": "roland",
                "name": "Roland Fantom-08 Workstation Synthesizer",
                "sku_prefix": "ROL-FANTOM-08",
                "instrument_type": "Synthesizer Workstation",
                "category": "Keyboards & Synths",
                "description": "Keyboard workstation panggung profesional 88-tuts berbobot PHA-4 Standard. Ditenagai sound engine ZEN-Core & SuperNATURAL Acoustic/Electric Pianos dengan arsitektur 16-part multitimbral.",
                "specifications": "Keyboard: 88 Keys PHA-4 Standard with Escapement & Ivory Feel\nSound Engine: ZEN-Core, SuperNATURAL Piano, SuperNATURAL E-Piano, Virtual ToneWheel Organ\nTones: 3,500+ Tones, 90+ Drum Kits\nDisplay: 5.5-inch Color Touchscreen\nInterface: 16 RGB Velocity Pads, Pitch/Mod Wheel, Real-time Control Sliders",
                "warranty_months": 24,
                "image_url": "/uploads/roland-synth.jpg",
                "variants": [
                    ("ROL-F08-STD", "Standard Matte Charcoal 88-Key", "Matte Charcoal", 18500000, 25800000, 5, 14.8),
                ]
            },
            {
                "brand_slug": "shure",
                "name": "Shure SM7B Cardioid Dynamic Vocal Microphone",
                "sku_prefix": "SHU-SM7B",
                "instrument_type": "Studio Microphone",
                "category": "Pro Audio & Studio",
                "description": "Mikrofon vokal dinamik legendaris untuk siaran broadcast, rekaman vokal studio, dan podcasting profesional. Pola polar cardioid dengan proteksi electromagnetic hum shielded.",
                "specifications": "Type: Dynamic (Moving Coil)\nPolar Pattern: Cardioid\nFrequency Response: 50 to 20,000 Hz\nOutput Impedance: 150 ohms\nSensitivity: -59.0 dB (1.12 mV)\nSwitch: Bass Roll-off & Mid-range Emphasis (Presence Boost)",
                "warranty_months": 24,
                "image_url": "/uploads/shure-sm7b.jpg",
                "variants": [
                    ("SHU-SM7B-BLK", "Matte Dark Gray Standard", "Matte Dark Gray", 4200000, 6250000, 15, 0.8),
                ]
            },
            {
                "brand_slug": "marshall",
                "name": "Marshall Studio Classic SC20H JCM800 Tube Head",
                "sku_prefix": "MAR-SC20H",
                "instrument_type": "Guitar Amplifier Head",
                "category": "Amplifiers & Effects",
                "description": "Replika 20-Watt all-valve dari amplifier legendaris Marshall JCM800 2203. Memiliki power reduction switch dari 20W menjadi 5W untuk volume ramah kamar namun tetap berkarakter high gain Inggris.",
                "specifications": "Power Output: 20W (Switchable to 5W)\nValves: 2x ECC83 Preamp, 1x ECC83 Phase Splitter, 2x EL34 Power Tube\nInputs: High & Low Sensitivity\nControls: Preamp Volume, Master Volume, Treble, Middle, Bass, Presence\nOutputs: 5x 1/4 inch Speaker Jacks, DI Out",
                "warranty_months": 12,
                "image_url": "/uploads/marshall-amp.jpg",
                "variants": [
                    ("MAR-SC20H-BLK", "Classic Black Elephant Grain", "Black Elephant Grain", 12500000, 17800000, 3, 9.4),
                ]
            }
        ]

        created_variants = []
        for pdata in catalog:
            prod = TPSProduct(
                brand_id=brand_map[pdata["brand_slug"]],
                branch_id=senayan_branch.id,
                name=pdata["name"],
                sku_prefix=pdata["sku_prefix"],
                instrument_type=pdata["instrument_type"],
                category=pdata["category"],
                description=pdata["description"],
                specifications=pdata["specifications"],
                warranty_months=pdata["warranty_months"],
                image_url=pdata["image_url"],
                status="published",
                created_by=staff_list[0].id
            )
            db.session.add(prod)
            db.session.flush()

            # Variasikan tanggal masuk stok gudang (15, 45, 75, >100 hari lalu)
            aging_deltas = [15, 45, 75, 115, 20, 50, 85, 130, 10, 60, 95, 140]
            for idx, v in enumerate(pdata["variants"]):
                delta_days = aging_deltas[(len(created_variants)) % len(aging_deltas)]
                stock_in_date = datetime.utcnow() - timedelta(days=delta_days)
                
                # Biarkan 1 varian deadstock memiliki promo clearance aktif sebagai sampel
                is_sample_clearance = (delta_days > 90 and len(created_variants) == 3)
                disc_pct = 25.0 if is_sample_clearance else 0.0
                clr_price = round(v[4] * (1.0 - (disc_pct / 100.0)), 2) if is_sample_clearance else None
                clr_note = "Year-End Warehouse Clearance" if is_sample_clearance else None

                var = TPSProductVariant(
                    product_id=prod.id,
                    sku_code=v[0],
                    variant_name=v[1],
                    color_finish=v[2],
                    cost_price=v[3],
                    price=v[4],
                    stock=v[5],
                    weight_kg=v[6],
                    is_active=True,
                    stock_in_date=stock_in_date,
                    discount_percent=disc_pct,
                    clearance_price=clr_price,
                    is_clearance_active=is_sample_clearance,
                    clearance_note=clr_note
                )
                db.session.add(var)
                created_variants.append(var)

        db.session.flush()

        # E. TPS Customers
        print("  -> Menambahkan Akun Pelanggan / Musisi (TPS)...")
        customers = [
            TPSCustomer(name="Ahmad Dhani Musician", username="customer", email="customer@sweelee.id", phone="081234567890", address="Pondok Indah Residence No. 12, Jakarta Selatan"),
            TPSCustomer(name="Eross Candra", username="eross", email="eross@sweelee.id", phone="081298765432", address="Jl. Kaliurang KM 9, Sleman, Yogyakarta"),
            TPSCustomer(name="John Petrucci", username="petrucci", email="petrucci@sweelee.id", phone="081987654321", address="Apartemen Senopati Suites, Jakarta Selatan"),
            TPSCustomer(name="Dewa Budjana", username="budjana", email="budjana@sweelee.id", phone="081377889900", address="Bintaro Jaya Sektor 9, Tangerang Selatan"),
            TPSCustomer(name="Balawan", username="balawan", email="balawan@sweelee.id", phone="081822334455", address="Sanur Beach Estate, Denpasar, Bali"),
        ]
        for c in customers:
            c.set_password("password123")
            db.session.add(c)
        db.session.flush()

        # F. Sample Orders & Wishlists
        print("  -> Menambahkan Sampel Transaksi & Wishlists (TPS)...")
        v1 = created_variants[0]
        v2 = created_variants[3]
        v3 = created_variants[6]

        o1 = TPSOrder(
            invoice_code=f"SWL-{datetime.utcnow().strftime('%Y%m%d')}-DEL001",
            customer_id=customers[0].id,
            product_id=v1.product_id,
            variant_id=v1.id,
            quantity=1,
            unit_price=v1.price,
            total_price=v1.price + 50000,
            fulfillment_method="delivery",
            shipping_address=customers[0].address,
            shipping_courier="JNE Trucking",
            shipping_cost=50000,
            tracking_number="JNE-TRK-8829104",
            payment_method="Swee Lee Pay",
            payment_status="paid",
            order_status="delivered",
            buyer_name=customers[0].name,
            buyer_email=customers[0].email,
            buyer_phone=customers[0].phone,
            paid_at=datetime.utcnow() - timedelta(days=2),
        )
        o2 = TPSOrder(
            invoice_code=f"SWL-{datetime.utcnow().strftime('%Y%m%d')}-PCK002",
            customer_id=customers[1].id,
            product_id=v2.product_id,
            variant_id=v2.id,
            quantity=1,
            unit_price=v2.price,
            total_price=v2.price,
            fulfillment_method="click_and_collect",
            pickup_branch_id=senayan_branch.id,
            pickup_code="SWL-PICKUP-8849",
            pickup_status="ready",
            payment_method="Swee Lee Pay",
            payment_status="paid",
            order_status="ready_for_pickup",
            buyer_name=customers[1].name,
            buyer_email=customers[1].email,
            buyer_phone=customers[1].phone,
            paid_at=datetime.utcnow() - timedelta(days=1),
        )
        db.session.add_all([o1, o2])

        # Wishlists
        for cust in customers:
            # Setiap customer menyukai 2-3 instrumen
            sample_vars = random.sample(created_variants, 2)
            for sv in sample_vars:
                db.session.add(TPSWishlist(customer_id=cust.id, product_id=sv.product_id))

        # G. Sample Purchase Orders & Inventory Logs
        print("  -> Menambahkan Sampel PO Pengadaan & Mutasi Stok (TPS)...")
        po1 = TPSPurchaseOrder(
            po_number="PO-2026-FND-001",
            supplier_id=brand_map["fender"],
            product_id=v1.product_id,
            variant_id=v1.id,
            quantity=10,
            unit_cost=v1.cost_price,
            total_cost=v1.cost_price * 10,
            status="approved",
            destination_branch_id=warehouse_branch.id,
            requested_by=staff_list[3].id,
            approved_by=staff_list[1].id,
            notes="Restock kuartal IV instrumen Player II Stratocaster untuk Flagship Showroom."
        )
        db.session.add(po1)

        inv_log = TPSInventoryLog(
            variant_id=v1.id,
            branch_id=warehouse_branch.id,
            change_type="manual_adjustment",
            quantity_change=5,
            stock_before=3,
            stock_after=8,
            serial_number="SN-FEN-US2499104",
            notes="Stok awal setup gudang pusat Swee Lee",
            reference_id="INIT-STOCK",
            logged_by=staff_list[3].id,
        )
        db.session.add(inv_log)

        # H. KMS Categories, Articles & FAQs
        print("  -> Menambahkan Basis Pengetahuan / Knowledge Base (KMS)...")
        c1 = KMSCategory(name="Panduan Memilih Gitar & Bass", slug="guitar-bass-guide", description="Tips setup, intonasi, pemilihan kayu neck & pickup gitar", icon="guitar", sort_order=1)
        c2 = KMSCategory(name="Perawatan & Setup Instrumen", slug="maintenance-care", description="SOP pembersihan fretboard, humidity control & kalibrasi truss rod", icon="tool", sort_order=2)
        c3 = KMSCategory(name="Garansi Resmi & Klaim", slug="warranty-claim", description="Syarat garansi distributor resmi Swee Lee Indonesia", icon="shield", sort_order=3)
        c4 = KMSCategory(name="Pengiriman Kargo & Click & Collect", slug="shipping-fulfillment", description="Prosedur packing kayu, asuransi, dan pickup showroom", icon="truck", sort_order=4)
        db.session.add_all([c1, c2, c3, c4])
        db.session.flush()

        art1 = KMSArticle(
            category_id=c1.id,
            title="Panduan Memilih Antara Maple vs Rosewood Fretboard",
            slug="maple-vs-rosewood-fretboard",
            content="Fretboard kayu maple cenderung memberikan attack yang cerah (snappy) dengan sustain tajam, sedangkan rosewood memberikan warmth dan midrange tebal. Di iklim tropis Indonesia, pastikan kelembaban ruangan dijaga antara 45%-55% RH untuk kestabilan neck.",
            excerpt="Perbandingan karakter suara dan perawatan material fretboard untuk instrumen gitar dan bass.",
            author_staff_id=staff_list[0].id,
            is_published=True,
            view_count=142,
            helpful_count=38
        )
        art2 = KMSArticle(
            category_id=c3.id,
            title="Ketentuan Garansi 24 Bulan Distributor Resmi Swee Lee",
            slug="ketentuan-garansi-resmi-swee-lee",
            content="Semua instrumen Fender, Gibson, Roland, dan Yamaha yang dibeli melalui Swee Lee Store mendapatkan garansi pabrik dan distributor resmi selama 12 hingga 36 bulan meliputi perbaikan elektronik, pickup, preamp, dan cacat pabrik. Tidak mencakup kerusakan aus pakai wajar seperti senar dan fretwire.",
            excerpt="Tata cara klaim garansi resmi dan servis berkala di Swee Lee Service Center.",
            author_staff_id=staff_list[0].id,
            is_published=True,
            view_count=260,
            helpful_count=89
        )
        db.session.add_all([art1, art2])

        faqs = [
            KMSFaq(category_id=c4.id, question="Apakah pengiriman instrumen luar kota menggunakan packing kayu?", answer="Ya, seluruh pengiriman gitar, drum, keyboard, dan amplifier ke seluruh Indonesia wajib menggunakan packing kayu tebal dan asuransi penuh ekspedisi.", is_active=True, sort_order=1),
            KMSFaq(category_id=c4.id, question="Bagaimana cara mengambil barang di Showroom (Click & Collect)?", answer="Pilih opsi Click & Collect saat checkout, selesaikan pembayaran, dan Anda akan menerima Kode Ambil Barang (Pickup Pass). Tunjukkan kode ini ke Store Staff kami di showroom pilihan Anda.", is_active=True, sort_order=2),
            KMSFaq(category_id=c3.id, question="Apakah Swee Lee melayani setup neck & string action gratis?", answer="Setiap pembelian instrumen di Swee Lee berhak mendapatkan 1x Full Professional Setup & Kalibrasi gratis di Showroom kami.", is_active=True, sort_order=3),
        ]
        db.session.add_all(faqs)

        # I. MIS Summaries
        print("  -> Menambahkan Data Ringkasan Eksekutif (MIS)...")
        today = date.today()
        mis_daily = MisDashboardSummary(
            metric_date=today,
            total_revenue=53250000,
            total_cogs=37500000,
            gross_profit=15750000,
            gross_margin_pct=29.57,
            total_orders=2,
            total_units_sold=2,
            pending_pos=1,
            low_stock_skus_count=1,
            last_synced_at=datetime.utcnow()
        )
        db.session.add(mis_daily)

        mis_prod1 = MisProductPerformance(
            product_id=v1.product_id,
            brand_name="Fender",
            product_name="Fender Player II Stratocaster",
            instrument_type="Electric Guitar",
            units_sold=1,
            gross_revenue=13750000,
            cogs=9500000,
            net_profit=4250000,
            current_stock=17,
            last_synced_at=datetime.utcnow()
        )
        mis_prod2 = MisProductPerformance(
            product_id=v2.product_id,
            brand_name="Gibson",
            product_name="Gibson Les Paul Standard 50s",
            instrument_type="Electric Guitar",
            units_sold=1,
            gross_revenue=39500000,
            cogs=28000000,
            net_profit=11500000,
            current_stock=6,
            last_synced_at=datetime.utcnow()
        )
        db.session.add_all([mis_prod1, mis_prod2])

        mis_rev = MisRevenueSummary(
            period_type="monthly",
            period_date=date(today.year, today.month, 1),
            gross_sales=53250000,
            cogs_total=37500000,
            gross_profit=15750000,
            delivery_sales=13750000,
            pickup_sales=39500000,
            last_synced_at=datetime.utcnow()
        )
        db.session.add(mis_rev)

        mis_sales = MisSalesSummary(
            instrument_category="Electric Guitars",
            units_sold=2,
            revenue=53250000,
            cogs=37500000,
            profit_margin_pct=29.57,
            period_month=f"{today.year}-{today.month:02d}",
            last_synced_at=datetime.utcnow()
        )
        db.session.add(mis_sales)

        # J. OAS System Settings & Announcements
        print("  -> Menambahkan Pengaturan Toko & Pengumuman (OAS)...")
        settings = [
            OASSystemSetting(setting_key="store_name", setting_value="Overtone Swee Lee Music Store", description="Nama resmi toko alat musik"),
            OASSystemSetting(setting_key="currency", setting_value="IDR", description="Mata uang toko"),
            OASSystemSetting(setting_key="tax_percentage", setting_value="11", description="PPN Indonesia"),
            OASSystemSetting(setting_key="click_collect_expiry_days", setting_value="7", description="Masa berlaku kode ambil barang"),
        ]
        db.session.add_all(settings)

        ann = OASAnnouncement(
            title="Promo Musim Liburan & Kuota Pengadaan Q4",
            content="Seluruh store staff diharapkan memastikan display instrumen showroom siap dan periksa update rekomendasi PO Restock pada modul DSS.",
            audience_role="all",
            created_by=staff_list[0].id,
            is_active=True
        )
        db.session.add(ann)

        db.session.commit()
        print("[OK] Data Master OAS, KMS, TPS, dan MIS berhasil di-commit.")

        # K. DSS Subsystem (Hybrid AHP & TOPSIS)
        print("\n  -> Menjalankan Seeder DSS (5 Kriteria, 25 Subkriteria, 25 Sel Matriks AHP & Simulasi)...")
        from app.seed_dss import seed_dss_subsystem
        seed_dss_subsystem(app)

    # 3. Verifikasi Struktur Tabel di phpMyAdmin
    print("\n=======================================================")
    print("[CHECK] VERIFIKASI SUBFOLDER PHPMYADMIN (DOUBLE UNDERSCORE)")
    print("=======================================================")
    conn = pymysql.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASS,
        database=DB_NAME,
        autocommit=True,
        charset='utf8mb4'
    )
    cursor = conn.cursor()
    cursor.execute("SHOW TABLES;")
    final_tables = [row[0] for row in cursor.fetchall()]

    subfolders = {"dss": [], "kms": [], "mis": [], "oas": [], "tps": [], "other": []}
    for t in sorted(final_tables):
        if "__" in t:
            prefix = t.split("__")[0]
            if prefix in subfolders:
                cursor.execute(f"SELECT COUNT(*) FROM `{t}`;")
                count = cursor.fetchone()[0]
                subfolders[prefix].append((t, count))
            else:
                subfolders["other"].append((t, 0))
        else:
            subfolders["other"].append((t, 0))

    for group in ["oas", "kms", "tps", "mis", "dss"]:
        print(f"\n[+] {group} ({len(subfolders[group])} Tabel):")
        for tbl_name, count in subfolders[group]:
            print(f"   |-- {tbl_name} ({count} baris)")

    if subfolders["other"]:
        print("\n[+] Other / Root:")
        for tbl_name, _ in subfolders["other"]:
            print(f"   |-- {tbl_name}")

    conn.close()
    print("\n=======================================================")
    print("[SUCCESS] SEEDING & MIGRASI DATABASE BERHASIL 100% TANPA ERROR!")
    print(f"Nama Database Aktif: `{DB_NAME}`")
    print("Struktur tabel otomatis terorganisir rapi di phpMyAdmin.")
    print("=======================================================\n")


if __name__ == "__main__":
    reset_and_initialize_database()
