"""
Seeder Subsistem DSS (Decision Support System) Overtone Music Store:
1. Master Kriteria Penilaian (dss_criteria C1 s/d C5)
2. Skala Parameter & Ambang Batas Subkriteria (dss_subcriteria_ranges)
3. Matriks Perbandingan Berpasangan AHP 5x5 (dss_ahp_matrices) Konsisten (CR <= 0.10)
4. Sampel Wishlist & Pesanan Penjualan agar metrik C2 & C4 bervariasi
5. Initial Sesi Simulasi DSS (dss_sessions & dss_topsis_results)
"""
import random
from datetime import datetime, timedelta
from app.extensions import db
from app.models.models import (
    OASStaff,
    TPSBrandSupplier,
    TPSCustomer,
    TPSOrder,
    TPSProduct,
    TPSProductVariant,
    TPSWishlist,
    DSSCriterion,
    DSSSubcriterionRange,
    DSSAHPMatrix,
    DSSSession,
    DSSTopsisResult,
)


def seed_dss_subsystem(app=None):
    print("=== SEEDING SUBSISTEM DSS: AHP & TOPSIS RESTOCK PRIORITIZATION ===")

    # 1. Pastikan Kriteria C1 - C5 ada
    criteria_data = [
        {
            "code": "C1",
            "name": "Kekritisan Stok Gudang (Remaining Stock)",
            "attribute_type": "cost",
            "weight": 0.30,
            "description": "Diambil dari stok fisik tps_product_variants. Semakin sedikit stok tersisa di gudang/showroom, semakin urgen prioritas pengadaan restock.",
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
            "description": "Total akumulasi unit instrumen terjual dari tps_orders berstatus paid/completed. Semakin laris produk terjual, semakin tinggi kebutuhan restock.",
            "ranges": [
                ("Best Seller Masif (>= 20 unit terjual)", 20, 9999, 5, "Perputaran Sangat Tinggi / Fast Moving"),
                ("Penjualan Cepat (10 - 19 unit terjual)", 10, 19, 4, "Laris di Pasaran"),
                ("Penjualan Moderat (5 - 9 unit terjual)", 5, 9, 3, "Permintaan Reguler"),
                ("Penjualan Lambat (2 - 4 unit terjual)", 2, 4, 2, "Slow Moving Retail"),
                ("Dormant / Belum Terjual (0 - 1 unit terjual)", 0, 1, 1, "Rendah / Kurang Diminati"),
            ],
        },
        {
            "code": "C3",
            "name": "Margin Keuntungan Kotor (Gross Margin %)",
            "attribute_type": "benefit",
            "weight": 0.20,
            "description": "Persentase keuntungan kotor per unit: (price - cost_price) / price * 100. Semakin besar margin, semakin menguntungkan kontribusi profit bagi perusahaan.",
            "ranges": [
                ("Margin Sangat Tinggi (>= 40.0%)", 40.0, 100.0, 5, "Profitabilitas Sangat Sehat"),
                ("Margin Tinggi (30.0% - 39.9%)", 30.0, 39.99, 4, "Di Atas Rata-rata Industri"),
                ("Margin Standar (20.0% - 29.9%)", 20.0, 29.99, 3, "Standar Retail Alat Musik"),
                ("Margin Rendah (10.0% - 19.9%)", 10.0, 19.99, 2, "Margin Tipis"),
                ("Margin Sangat Tipis (< 10.0%)", 0.0, 9.99, 1, "Hampir BEP / Sensitif Biaya"),
            ],
        },
        {
            "code": "C4",
            "name": "Minat Pasar & Permintaan (Market Demand)",
            "attribute_type": "benefit",
            "weight": 0.15,
            "description": "Akumulasi jumlah wishlist pelanggan pada tps_wishlists ditambah frekuensi transaksi. Mengukur tren antusiasme pasar terhadap instrumen.",
            "ranges": [
                ("Permintaan Sangat Masif (>= 25 peminat)", 25, 9999, 5, "Trafik & Peminat Viral"),
                ("Permintaan Tinggi (15 - 24 peminat)", 15, 24, 4, "Banyak Masuk Wishlist"),
                ("Permintaan Sedang (8 - 14 peminat)", 8, 14, 3, "Peminat Konsisten"),
                ("Permintaan Terbatas (3 - 7 peminat)", 3, 7, 2, "Minat Spesifik"),
                ("Minat Sangat Rendah (0 - 2 peminat)", 0, 2, 1, "Belum Banyak Dilirik"),
            ],
        },
        {
            "code": "C5",
            "name": "Beban Modal Unit (Unit COGS)",
            "attribute_type": "cost",
            "weight": 0.10,
            "description": "Harga pokok pengadaan per unit (cost_price dalam IDR). Semakin rendah modal yang tertahan per unit, semakin efisien likuiditas modal kerja ritel.",
            "ranges": [
                ("Modal Sangat Ringan (< Rp 5.000.000)", 0, 5000000, 5, "Risiko Arus Kas Ringan"),
                ("Modal Terjangkau (Rp 5.000.001 - Rp 12.000.000)", 5000001, 12000000, 4, "Budget Pengadaan Sedang"),
                ("Modal Menengah (Rp 12.000.001 - Rp 20.000.000)", 12000001, 20000000, 3, "Perlu Perhitungan Kas"),
                ("Modal Berat (Rp 20.000.001 - Rp 35.000.000)", 20000001, 35000000, 2, "Instrumen Premium Eksklusif"),
                ("Modal Sangat Berat (> Rp 35.000.000)", 35000001, 999999999, 1, "High End Collector / Capital Intensive"),
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

        # Check / Seed subcriteria ranges
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
    print("-> 5 Master Kriteria dan Subkriteria DSS tersimpan.")

    # 2. Matriks Perbandingan Berpasangan AHP 5x5 Konsisten (CR = 0.0 <= 0.10)
    # Rasio perbandingan berpasangan:
    # C1 (0.30), C2 (0.25), C3 (0.20), C4 (0.15), C5 (0.10)
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

    manager_user = OASStaff.query.filter_by(role="manager").first()
    manager_id = manager_user.id if manager_user else 1

    for (r_code, c_code), comp_val in pairwise_ratios.items():
        row_c = criteria_map[r_code]
        col_c = criteria_map[c_code]

        cell = DSSAHPMatrix.query.filter_by(
            row_criterion_id=row_c.id,
            col_criterion_id=col_c.id
        ).first()

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
    print("-> 25 Sel Matriks AHP 5x5 tersimpan (Konsisten CR <= 0.10).")

    # 3. Seed Realistic Wishlists & Orders jika belum banyak
    # Supaya TOPSIS memiliki data riil yang hidup untuk C2 (Sales) dan C4 (Wishlists)
    customers = TPSCustomer.query.all()
    if not customers:
        # Buat beberapa customer dummy jika belum ada
        customer_names = ["Aris Setiawan", "Rian D'Masiv", "Eross Chandra", "Balawan", "Dewa Budjana"]
        for idx, cname in enumerate(customer_names, 1):
            cust = TPSCustomer(
                name=cname,
                username=f"musisi_{idx}",
                email=f"musisi_{idx}@overtone.test",
                phone=f"0813998811{idx}",
            )
            cust.set_password("customer123")
            db.session.add(cust)
            customers.append(cust)
        db.session.commit()

    products = TPSProduct.query.all()
    variants = TPSProductVariant.query.all()

    # Seed Wishlists jika masih 0
    if TPSWishlist.query.count() == 0 and customers and products:
        print("-> Menambahkan sampel data wishlist pelanggan...")
        for p in products:
            # 1-4 customer menyukai setiap produk
            selected_custs = random.sample(customers, min(len(customers), random.randint(1, 4)))
            for c in selected_custs:
                db.session.add(TPSWishlist(customer_id=c.id, product_id=p.id))
        db.session.commit()

    # Seed beberapa orders tambahan jika baru sedikit
    if TPSOrder.query.count() < 8 and customers and variants:
        print("-> Menambahkan variasi pesanan penjualan untuk velocity...")
        sample_sales_distribution = [
            (1, 4),  # FEN-PL2-3TS: 4 unit terjual
            (2, 3),  # FEN-PL2-BLK: 3 unit
            (4, 2),  # GIB-LP50-HCS: 2 unit
            (6, 5),  # GIB-LP50-GLD: 5 unit (laris tapi stok tinggal 1!)
            (7, 3),  # YAM-SCB-RB: 3 unit
            (11, 8), # SHU-SM7B-BLK: 8 unit (mic laris)
        ]
        for var_id, qty in sample_sales_distribution:
            var = TPSProductVariant.query.get(var_id)
            if not var:
                continue
            cust = random.choice(customers)
            invoice_code = f"SWL-HIST-{datetime.utcnow().strftime('%m%d')}-{random.randint(100, 999)}"
            order = TPSOrder(
                invoice_code=invoice_code,
                customer_id=cust.id,
                product_id=var.product_id,
                variant_id=var.id,
                quantity=qty,
                unit_price=var.price,
                total_price=var.price * qty,
                fulfillment_method="delivery",
                payment_status="paid",
                order_status="delivered",
                buyer_name=cust.name,
                buyer_email=cust.email,
                buyer_phone=cust.phone or "0812345678",
            )
            db.session.add(order)
        db.session.commit()

    # 4. Jalankan 1 sesi simulasi awal jika belum ada sesi sama sekali
    if DSSSession.query.count() == 0:
        print("-> Membuat sesi simulasi awal DSS (Header & Topsis Results)...")
        from app.api.dss import execute_topsis_calculation

        budget_limit = 150_000_000.0  # Rp 150 Juta
        session_obj = execute_topsis_calculation(
            budget_limit=budget_limit,
            title="Simulasi Pengadaan Instrumen Q4 - Anggaran Rp 150.000.000",
            executed_by_id=manager_id,
        )
        print(f"-> Sesi {session_obj.session_code} berhasil dibuat dengan {session_obj.topsis_results.count()} varian SKU teranalisis!")

    print("=== SEEDING SUBSISTEM DSS SELESAI DENGAN SUKSES ===")


if __name__ == "__main__":
    from app import create_app
    app = create_app()
    with app.app_context():
        seed_dss_subsystem(app)
