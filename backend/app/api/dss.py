"""
API Subsistem ke-5: DSS (Decision Support System)
Smart PO Restock Prioritization menggunakan Metode Hybrid AHP & TOPSIS.

Integrasi penuh:
- OAS (oas_staff: otorisasi manager & warehouse_staff, eksekutor sesi DSS)
- TPS (tps_product_variants, tps_products, tps_brands_suppliers, tps_orders, tps_wishlists, tps_purchase_orders)
- KMS (kms_brands_suppliers / tps_brands_suppliers)
- MIS (analisis performa produk & ranking restock)
"""
from datetime import datetime
import math
import uuid

from flask import Blueprint, jsonify, request
from sqlalchemy import func

from ..extensions import db
from ..models.models import (
    OASStaff,
    TPSBrandSupplier,
    TPSOrder,
    TPSProduct,
    TPSProductVariant,
    TPSPurchaseOrder,
    TPSStoreBranch,
    TPSWishlist,
    DSSCriterion,
    DSSSubcriterionRange,
    DSSAHPMatrix,
    DSSSession,
    DSSTopsisResult,
)
from ..security import (
    ROLE_MANAGER,
    ROLE_SUPER_ADMIN,
    ROLE_WAREHOUSE_STAFF,
    current_user,
    roles_required,
)

dss_bp = Blueprint("dss", __name__)

RI_MAP = {
    1: 0.0,
    2: 0.0,
    3: 0.58,
    4: 0.90,
    5: 1.12,
    6: 1.24,
    7: 1.32,
    8: 1.41,
    9: 1.45,
    10: 1.49,
}


def _generate_session_code():
    date_str = datetime.utcnow().strftime("%Y%m")
    unique_suffix = uuid.uuid4().hex[:4].upper()
    return f"DSS-{date_str}-{unique_suffix}"


def _generate_po_number():
    date_str = datetime.utcnow().strftime("%Y%m")
    unique_suffix = uuid.uuid4().hex[:5].upper()
    return f"PO-SWL-{date_str}-{unique_suffix}"


def compute_ahp_weights(matrix_values, criteria_codes):
    """
    Menghitung Bobot Prioritas (Eigenvector), Lambda Max, CI, dan CR dari matriks AHP n x n.
    matrix_values: dict dengan key (row_code, col_code) -> float
    criteria_codes: list kode kriteria berurutan, e.g. ['C1', 'C2', 'C3', 'C4', 'C5']
    """
    n = len(criteria_codes)
    if n == 0:
        return None

    # Bentuk matriks 2D
    matrix = []
    for r_idx, r_code in enumerate(criteria_codes):
        row = []
        for c_idx, c_code in enumerate(criteria_codes):
            val = matrix_values.get((r_code, c_code))
            if val is None or val <= 0:
                if r_idx == c_idx:
                    val = 1.0
                else:
                    reciprocal = matrix_values.get((c_code, r_code))
                    val = (1.0 / reciprocal) if reciprocal and reciprocal > 0 else 1.0
            row.append(float(val))
        matrix.append(row)

    # 1. Hitung jumlah kolom
    col_sums = [sum(matrix[r][c] for r in range(n)) for c in range(n)]

    # 2. Matriks Normalisasi
    norm_matrix = []
    for r in range(n):
        norm_row = [matrix[r][c] / col_sums[c] if col_sums[c] > 0 else 0.0 for c in range(n)]
        norm_matrix.append(norm_row)

    # 3. Eigenvector (Bobot Prioritas per kriteria)
    weights = [sum(norm_matrix[r][c] for c in range(n)) / n for r in range(n)]

    # 4. Weighted Sum Vector (Aw = A * w)
    Aw = [sum(matrix[r][c] * weights[c] for c in range(n)) for r in range(n)]

    # 5. Nilai Eigen Maksimum (Lambda Max)
    lambda_vec = [Aw[r] / weights[r] if weights[r] > 0 else n for r in range(n)]
    lambda_max = sum(lambda_vec) / n

    # 6. Consistency Index (CI) & Consistency Ratio (CR)
    ci = (lambda_max - n) / (n - 1) if n > 1 else 0.0
    ri = RI_MAP.get(n, 1.12)
    cr = ci / ri if ri > 0 else 0.0

    return {
        "n": n,
        "criteria_codes": criteria_codes,
        "raw_matrix": matrix,
        "col_sums": col_sums,
        "norm_matrix": norm_matrix,
        "weights": weights,
        "lambda_max": lambda_max,
        "ci": ci,
        "ri": ri,
        "cr": cr,
        "is_consistent": cr <= 0.10,
    }


def execute_topsis_calculation(budget_limit, title="Simulasi Pengadaan Instrumen", executed_by_id=None):
    """
    Mesin kalkulasi TOPSIS lengkap terintegrasi dengan database Overtone:
    - Menarik seluruh varian aktif dari tps_product_variants
    - Menghitung nilai riil C1 s/d C5
    - Normalisasi Euclidean & Terbobot
    - Menentukan Solusi Ideal A+ & A-
    - Menghitung Jarak D+ & D-
    - Menghitung Skor Preferensi V_i
    - Melakukan ranking & alokasi batas anggaran PO
    - Menyimpan ke dss_sessions & dss_topsis_results
    """
    # 1. Ambil 5 kriteria terdaftar
    criteria = DSSCriterion.query.order_by(DSSCriterion.code.asc()).all()
    if not criteria or len(criteria) < 5:
        # Fallback jika kriteria belum lengkap
        from ..seed_dss import seed_dss_subsystem
        seed_dss_subsystem()
        criteria = DSSCriterion.query.order_by(DSSCriterion.code.asc()).all()

    crit_dict = {c.code: c for c in criteria}
    weights = [c.weight for c in criteria]
    attribute_types = [c.attribute_type for c in criteria]

    # Ambil matriks AHP untuk mencatat lambda_max, CI, CR saat sesi ini dijalankan
    ahp_cells = DSSAHPMatrix.query.all()
    matrix_values = {}
    for cell in ahp_cells:
        r_code = cell.row_criterion.code if cell.row_criterion else None
        c_code = cell.col_criterion.code if cell.col_criterion else None
        if r_code and c_code:
            matrix_values[(r_code, c_code)] = float(cell.comparison_value)

    ahp_calc = compute_ahp_weights(matrix_values, [c.code for c in criteria])

    # 2. Ambil seluruh varian instrumen aktif
    variants = (
        TPSProductVariant.query.filter_by(is_active=True)
        .join(TPSProduct, TPSProductVariant.product_id == TPSProduct.id)
        .order_by(TPSProductVariant.id.asc())
        .all()
    )

    if not variants:
        variants = TPSProductVariant.query.order_by(TPSProductVariant.id.asc()).all()

    # Hitung nilai riil kriteria C1 s/d C5 per varian
    raw_data = []
    for v in variants:
        # C1: Remaining Stock (cost)
        stock_val = float(v.stock if v.stock is not None else 0)

        # C2: Sales Velocity (benefit) - Unit terjual pada pesanan berbayar
        sold_qty = (
            db.session.query(func.coalesce(func.sum(TPSOrder.quantity), 0))
            .filter(
                TPSOrder.variant_id == v.id,
                TPSOrder.payment_status == "paid",
            )
            .scalar()
        )
        sales_val = float(sold_qty or 0)

        # C3: Gross Margin % (benefit) - (price - cost_price) / price * 100
        cost = float(v.cost_price or 0)
        price = float(v.price or 0)
        margin_pct = ((price - cost) / price * 100.0) if price > 0 else 0.0
        margin_val = max(0.0, float(margin_pct))

        # C4: Market Demand (benefit) - Wishlists count + Orders count
        wishlist_count = (
            TPSWishlist.query.filter_by(product_id=v.product_id).count()
        )
        order_count = (
            TPSOrder.query.filter_by(variant_id=v.id).count()
        )
        demand_val = float(wishlist_count + order_count)

        # C5: Unit COGS (cost) - cost_price per unit
        cogs_val = float(v.cost_price if v.cost_price and v.cost_price > 0 else price * 0.65)

        raw_data.append({
            "variant": v,
            "x": [stock_val, sales_val, margin_val, demand_val, cogs_val],
        })

    m = len(raw_data)
    n = len(criteria)

    # 3. Matriks Keputusan Mentah X
    X = [item["x"] for item in raw_data]

    # 4. Normalisasi Euclidean R (r_ij = x_ij / sqrt(sum(x_kj^2)))
    col_denoms = []
    for j in range(n):
        sum_sq = sum(X[i][j] ** 2 for i in range(m))
        denom = math.sqrt(sum_sq) if sum_sq > 0 else 1.0
        col_denoms.append(denom)

    R = []
    for i in range(m):
        r_row = [X[i][j] / col_denoms[j] if col_denoms[j] > 0 else 0.0 for j in range(n)]
        R.append(r_row)

    # 5. Normalisasi Terbobot Y (y_ij = w_j * r_ij)
    Y = []
    for i in range(m):
        y_row = [R[i][j] * weights[j] for j in range(n)]
        Y.append(y_row)

    # 6. Solusi Ideal Positif (A+) dan Solusi Ideal Negatif (A-)
    A_plus = []
    A_minus = []
    for j in range(n):
        col_vals = [Y[i][j] for i in range(m)]
        attr = attribute_types[j]
        if attr == "benefit":
            A_plus.append(max(col_vals) if col_vals else 0.0)
            A_minus.append(min(col_vals) if col_vals else 0.0)
        else:  # cost
            A_plus.append(min(col_vals) if col_vals else 0.0)
            A_minus.append(max(col_vals) if col_vals else 0.0)

    # 7. Jarak Solusi Ideal D+ dan D-, serta Nilai Preferensi V_i
    calculated_items = []
    for i in range(m):
        d_plus_sq = sum((Y[i][j] - A_plus[j]) ** 2 for j in range(n))
        d_minus_sq = sum((Y[i][j] - A_minus[j]) ** 2 for j in range(n))

        d_plus = math.sqrt(d_plus_sq)
        d_minus = math.sqrt(d_minus_sq)

        sum_d = d_plus + d_minus
        v_i = (d_minus / sum_d) if sum_d > 0 else 0.0

        variant_obj = raw_data[i]["variant"]
        stock_now = raw_data[i]["x"][0]
        velocity_now = raw_data[i]["x"][1]

        # Logika rekomendasi kuantitas restock cerdas:
        # Menghitung kebutuhan restock berdasarkan sisa stok & sales velocity
        if stock_now <= 0:
            base_rec = 8
        elif stock_now <= 2:
            base_rec = 6
        elif stock_now <= 5:
            base_rec = 4
        else:
            base_rec = 2
        rec_qty = max(2, min(20, base_rec + int(round(velocity_now * 0.6))))

        cogs = float(variant_obj.cost_price or variant_obj.price * 0.65)
        est_cost = rec_qty * cogs

        calculated_items.append({
            "variant": variant_obj,
            "raw": raw_data[i]["x"],
            "y": Y[i],
            "d_plus": d_plus,
            "d_minus": d_minus,
            "preference_score": v_i,
            "recommended_qty": rec_qty,
            "estimated_po_cost": est_cost,
        })

    # 8. Pengurutan Ranking Berdasarkan Skor V_i (Tertinggi = Rank #1)
    calculated_items.sort(key=lambda x: x["preference_score"], reverse=True)

    # 9. Alokasi Anggaran (Budget Allocation) dari Rank #1 ke Bawah
    running_budget = 0.0
    for idx, item in enumerate(calculated_items, start=1):
        item["rank_number"] = idx

        # Penentuan Tier Prioritas
        score = item["preference_score"]
        if score >= 0.60 or idx <= math.ceil(m * 0.3):
            item["priority_tier"] = "high_priority"
        elif score >= 0.40 or idx <= math.ceil(m * 0.7):
            item["priority_tier"] = "medium_priority"
        else:
            item["priority_tier"] = "low_priority"

        # Cek kuota anggaran
        if running_budget + item["estimated_po_cost"] <= budget_limit:
            item["is_within_budget"] = True
            running_budget += item["estimated_po_cost"]
        else:
            item["is_within_budget"] = False

    # 10. Simpan Header ke dss_sessions
    session_code = _generate_session_code()
    session = DSSSession(
        session_code=session_code,
        executed_by=executed_by_id,
        title=title,
        budget_limit=budget_limit,
        total_allocated_cost=running_budget,
        lambda_max=ahp_calc["lambda_max"] if ahp_calc else None,
        consistency_index=ahp_calc["ci"] if ahp_calc else None,
        consistency_ratio=ahp_calc["cr"] if ahp_calc else None,
        status="simulated",
    )
    db.session.add(session)
    db.session.flush()

    # 11. Simpan Baris Detail ke dss_topsis_results
    for item in calculated_items:
        res = DSSTopsisResult(
            session_id=session.id,
            variant_id=item["variant"].id,
            raw_c1_stock=item["raw"][0],
            raw_c2_sales=item["raw"][1],
            raw_c3_margin=item["raw"][2],
            raw_c4_demand=item["raw"][3],
            raw_c5_cogs=item["raw"][4],
            norm_c1=item["y"][0],
            norm_c2=item["y"][1],
            norm_c3=item["y"][2],
            norm_c4=item["y"][3],
            norm_c5=item["y"][4],
            d_plus=item["d_plus"],
            d_minus=item["d_minus"],
            preference_score=item["preference_score"],
            rank_number=item["rank_number"],
            priority_tier=item["priority_tier"],
            recommended_restock_qty=item["recommended_qty"],
            estimated_po_cost=item["estimated_po_cost"],
            is_within_budget=item["is_within_budget"],
        )
        db.session.add(res)

    db.session.commit()
    return session


# ============================================================================
# ENDPOINTS REST API SUBSISTEM DSS
# ============================================================================

@dss_bp.get("/config")
@roles_required(ROLE_SUPER_ADMIN, ROLE_MANAGER, ROLE_WAREHOUSE_STAFF)
def get_dss_config():
    """Mengembalikan master kriteria, rentang subkriteria, dan matriks 5x5 AHP saat ini."""
    criteria = DSSCriterion.query.order_by(DSSCriterion.code.asc()).all()
    if not criteria or len(criteria) < 5:
        from ..seed_dss import seed_dss_subsystem
        seed_dss_subsystem()
        criteria = DSSCriterion.query.order_by(DSSCriterion.code.asc()).all()

    crit_codes = [c.code for c in criteria]
    matrix_records = DSSAHPMatrix.query.all()

    matrix_map = {}
    for m in matrix_records:
        r_code = m.row_criterion.code if m.row_criterion else None
        c_code = m.col_criterion.code if m.col_criterion else None
        if r_code and c_code:
            matrix_map[(r_code, c_code)] = float(m.comparison_value)

    ahp_calc = compute_ahp_weights(matrix_map, crit_codes)

    # Format 5x5 grid untuk UI
    grid = []
    for r_code in crit_codes:
        row_vals = []
        for c_code in crit_codes:
            val = matrix_map.get((r_code, c_code), 1.0)
            row_vals.append({
                "row_code": r_code,
                "col_code": c_code,
                "value": round(val, 4),
            })
        grid.append(row_vals)

    return jsonify({
        "status": "success",
        "criteria": [c.to_dict() for c in criteria],
        "matrix_grid": grid,
        "ahp_metrics": {
            "lambda_max": round(ahp_calc["lambda_max"], 4) if ahp_calc else 5.0,
            "consistency_index": round(ahp_calc["ci"], 5) if ahp_calc else 0.0,
            "random_index": ahp_calc["ri"] if ahp_calc else 1.12,
            "consistency_ratio": round(ahp_calc["cr"], 5) if ahp_calc else 0.0,
            "is_consistent": ahp_calc["is_consistent"] if ahp_calc else True,
            "weights": {crit_codes[i]: round(ahp_calc["weights"][i], 4) for i in range(len(crit_codes))} if ahp_calc else {},
        },
    })


@dss_bp.post("/ahp-matrix")
@roles_required(ROLE_SUPER_ADMIN, ROLE_MANAGER)
def update_ahp_matrix():
    """
    Manager & Super Admin memperbarui perbandingan berpasangan AHP 5x5.
    Otomatis menghitung nilai resiprokal, bobot prioritas eigenvector, lambda_max, CI, dan CR.
    Jika CR <= 0.10, disimpan dan bobot kriteria dss_criteria diperbarui.
    Jika CR > 0.10, dikembalikan peringatan inkonsistensi beserta rinciannya.
    """
    user = current_user()
    data = request.get_json(silent=True) or {}
    comparisons = data.get("comparisons", {})  # dict e.g. {"C1_C2": 1.2, "C1_C3": 2.0}

    criteria = DSSCriterion.query.order_by(DSSCriterion.code.asc()).all()
    crit_codes = [c.code for c in criteria]
    crit_map = {c.code: c for c in criteria}

    # Bangun dictionary matriks lengkap
    matrix_values = {}
    for r_code in crit_codes:
        for c_code in crit_codes:
            if r_code == c_code:
                matrix_values[(r_code, c_code)] = 1.0
            else:
                key = f"{r_code}_{c_code}"
                inv_key = f"{c_code}_{r_code}"
                if key in comparisons:
                    val = float(comparisons[key])
                    matrix_values[(r_code, c_code)] = val
                    matrix_values[(c_code, r_code)] = 1.0 / val if val > 0 else 1.0
                elif inv_key in comparisons:
                    inv_val = float(comparisons[inv_key])
                    matrix_values[(c_code, r_code)] = inv_val
                    matrix_values[(r_code, c_code)] = 1.0 / inv_val if inv_val > 0 else 1.0
                else:
                    # Ambil dari database existing jika tidak dikirim
                    existing = DSSAHPMatrix.query.filter_by(
                        row_criterion_id=crit_map[r_code].id,
                        col_criterion_id=crit_map[c_code].id,
                    ).first()
                    matrix_values[(r_code, c_code)] = float(existing.comparison_value) if existing else 1.0

    ahp_calc = compute_ahp_weights(matrix_values, crit_codes)
    if not ahp_calc:
        return jsonify({"message": "Gagal menghitung matriks AHP"}), 400

    cr = ahp_calc["cr"]
    is_consistent = ahp_calc["is_consistent"]

    # Simpan atau kembalikan peringatan
    if not is_consistent and not data.get("force_save", False):
        return jsonify({
            "status": "warning",
            "message": f"Matriks AHP tidak konsisten! Nilai CR = {cr:.4f} (> 0.10). Harap sesuaikan kembali perbandingan skala Saaty.",
            "ahp_metrics": {
                "lambda_max": round(ahp_calc["lambda_max"], 4),
                "consistency_index": round(ahp_calc["ci"], 5),
                "random_index": ahp_calc["ri"],
                "consistency_ratio": round(cr, 5),
                "is_consistent": False,
                "weights": {crit_codes[i]: round(ahp_calc["weights"][i], 4) for i in range(len(crit_codes))},
            },
        }), 422

    # Jika konsisten, simpan ke database
    for (r_code, c_code), val in matrix_values.items():
        row_c = crit_map[r_code]
        col_c = crit_map[c_code]

        cell = DSSAHPMatrix.query.filter_by(
            row_criterion_id=row_c.id,
            col_criterion_id=col_c.id,
        ).first()

        if not cell:
            cell = DSSAHPMatrix(
                row_criterion_id=row_c.id,
                col_criterion_id=col_c.id,
                comparison_value=val,
                updated_by=user.id if user else None,
            )
            db.session.add(cell)
        else:
            cell.comparison_value = val
            cell.updated_by = user.id if user else None

    # Update kolom weight pada tabel dss_criteria
    for idx, c_code in enumerate(crit_codes):
        new_weight = ahp_calc["weights"][idx]
        crit_map[c_code].weight = new_weight

    db.session.commit()

    return jsonify({
        "status": "success",
        "message": f"Matriks AHP berhasil diperbarui dan konsisten (CR = {cr:.4f} <= 0.10). Bobot kriteria telah disinkronkan.",
        "ahp_metrics": {
            "lambda_max": round(ahp_calc["lambda_max"], 4),
            "consistency_index": round(ahp_calc["ci"], 5),
            "random_index": ahp_calc["ri"],
            "consistency_ratio": round(cr, 5),
            "is_consistent": True,
            "weights": {crit_codes[i]: round(ahp_calc["weights"][i], 4) for i in range(len(crit_codes))},
        },
    })


@dss_bp.post("/run-simulation")
@roles_required(ROLE_SUPER_ADMIN, ROLE_MANAGER, ROLE_WAREHOUSE_STAFF)
def run_simulation():
    """
    Menjalankan algoritma TOPSIS lengkap dengan alokasi batas anggaran pengadaan restock.
    Input: budget_limit (e.g. 150000000), title (opsional).
    Output: Hasil ranking TOPSIS, matriks X, R, Y, solusi ideal, jarak, dan status alokasi anggaran.
    """
    user = current_user()
    data = request.get_json(silent=True) or {}

    budget_limit = float(data.get("budget_limit") or 150_000_000.0)
    title = data.get("title") or f"Simulasi Pengadaan Instrumen - Rp {budget_limit:,.0f}"

    if budget_limit <= 0:
        return jsonify({"message": "Batas anggaran pengadaan harus bernilai positif"}), 400

    session = execute_topsis_calculation(
        budget_limit=budget_limit,
        title=title,
        executed_by_id=user.id if user else None,
    )

    session_data = session.to_dict(include_results=True)

    # Tambahkan matriks audit untuk tab 3 (Audit Perhitungan Step-by-Step)
    results = session_data.get("results", [])
    raw_matrix = []
    norm_matrix = []
    for r in results:
        raw_matrix.append({
            "variant_id": r["variant_id"],
            "sku_code": r["sku_code"],
            "product_name": r["product_name"],
            "values": [r["raw_c1_stock"], r["raw_c2_sales"], r["raw_c3_margin"], r["raw_c4_demand"], r["raw_c5_cogs"]],
        })
        norm_matrix.append({
            "variant_id": r["variant_id"],
            "sku_code": r["sku_code"],
            "product_name": r["product_name"],
            "values": [r["norm_c1"], r["norm_c2"], r["norm_c3"], r["norm_c4"], r["norm_c5"]],
        })

    criteria = DSSCriterion.query.order_by(DSSCriterion.code.asc()).all()
    ideal_positive = []
    ideal_negative = []
    for c_idx, c in enumerate(criteria):
        col_norm_vals = [r[f"norm_c{c_idx+1}"] for r in results]
        if c.attribute_type == "benefit":
            ideal_positive.append(max(col_norm_vals) if col_norm_vals else 0.0)
            ideal_negative.append(min(col_norm_vals) if col_norm_vals else 0.0)
        else:
            ideal_positive.append(min(col_norm_vals) if col_norm_vals else 0.0)
            ideal_negative.append(max(col_norm_vals) if col_norm_vals else 0.0)

    return jsonify({
        "status": "success",
        "message": f"Simulasi TOPSIS selesai dijalankan untuk {len(results)} varian instrumen",
        "session": session_data,
        "audit": {
            "raw_decision_matrix": raw_matrix,
            "weighted_normalized_matrix": norm_matrix,
            "ideal_positive": [round(v, 5) for v in ideal_positive],
            "ideal_negative": [round(v, 5) for v in ideal_negative],
        },
    }), 201


@dss_bp.get("/sessions")
@roles_required(ROLE_SUPER_ADMIN, ROLE_MANAGER, ROLE_WAREHOUSE_STAFF)
def list_sessions():
    """Melihat histori sesi simulasi DSS yang tersimpan di dss_sessions."""
    sessions = DSSSession.query.order_by(DSSSession.created_at.desc()).all()
    return jsonify({
        "status": "success",
        "total": len(sessions),
        "data": [s.to_dict(include_results=False) for s in sessions],
    })


@dss_bp.get("/sessions/<int:session_id>")
@roles_required(ROLE_SUPER_ADMIN, ROLE_MANAGER, ROLE_WAREHOUSE_STAFF)
def get_session_detail(session_id):
    """Melihat detail lengkap satu sesi simulasi DSS beserta seluruh ranking TOPSIS-nya."""
    session = DSSSession.query.get(session_id)
    if not session:
        return jsonify({"message": "Sesi DSS tidak ditemukan"}), 404

    session_data = session.to_dict(include_results=True)
    results = session_data.get("results", [])

    criteria = DSSCriterion.query.order_by(DSSCriterion.code.asc()).all()
    ideal_positive = []
    ideal_negative = []
    for c_idx, c in enumerate(criteria):
        col_norm_vals = [r[f"norm_c{c_idx+1}"] for r in results]
        if c.attribute_type == "benefit":
            ideal_positive.append(max(col_norm_vals) if col_norm_vals else 0.0)
            ideal_negative.append(min(col_norm_vals) if col_norm_vals else 0.0)
        else:
            ideal_positive.append(min(col_norm_vals) if col_norm_vals else 0.0)
            ideal_negative.append(max(col_norm_vals) if col_norm_vals else 0.0)

    raw_matrix = []
    norm_matrix = []
    for r in results:
        raw_matrix.append({
            "variant_id": r["variant_id"],
            "sku_code": r["sku_code"],
            "product_name": r["product_name"],
            "values": [r["raw_c1_stock"], r["raw_c2_sales"], r["raw_c3_margin"], r["raw_c4_demand"], r["raw_c5_cogs"]],
        })
        norm_matrix.append({
            "variant_id": r["variant_id"],
            "sku_code": r["sku_code"],
            "product_name": r["product_name"],
            "values": [r["norm_c1"], r["norm_c2"], r["norm_c3"], r["norm_c4"], r["norm_c5"]],
        })

    return jsonify({
        "status": "success",
        "session": session_data,
        "audit": {
            "raw_decision_matrix": raw_matrix,
            "weighted_normalized_matrix": norm_matrix,
            "ideal_positive": [round(v, 5) for v in ideal_positive],
            "ideal_negative": [round(v, 5) for v in ideal_negative],
        },
    })


@dss_bp.post("/sessions/<int:session_id>/generate-po")
@roles_required(ROLE_SUPER_ADMIN, ROLE_MANAGER, ROLE_WAREHOUSE_STAFF)
def generate_po_from_session(session_id):
    """
    Mengambil item hasil TOPSIS pada sesi ini (khusus yang is_within_budget=True atau ID yang dipilih),
    mengelompokkannya per Brand/Supplier, dan otomatis membuat dokumen Purchase Order (PO) baru.
    Status sesi diperbarui menjadi 'po_generated'.
    """
    user = current_user()
    session = DSSSession.query.get(session_id)
    if not session:
        return jsonify({"message": "Sesi DSS tidak ditemukan"}), 404

    data = request.get_json(silent=True) or {}
    selected_variant_ids = data.get("variant_ids")  # opsional jika custom checklist

    query = session.topsis_results
    if selected_variant_ids:
        query = query.filter(DSSTopsisResult.variant_id.in_(selected_variant_ids))
    else:
        # Default: hanya yang masuk kuota anggaran
        query = query.filter_by(is_within_budget=True)

    items_to_po = query.all()
    if not items_to_po:
        return jsonify({"message": "Tidak ada SKU prioritas yang dapat dibuatkan Purchase Order"}), 400

    # Default warehouse branch tujuan
    first_branch = TPSStoreBranch.query.first()
    dest_branch_id = first_branch.id if first_branch else None

    created_pos = []
    for item in items_to_po:
        variant = item.variant
        if not variant:
            continue
        product = variant.product_rel
        if not product:
            continue

        supplier_id = product.brand_id
        if not supplier_id:
            supplier = TPSBrandSupplier.query.first()
            supplier_id = supplier.id if supplier else 1

        po_num = _generate_po_number()
        qty = item.recommended_restock_qty or 2
        unit_cost = int(round(float(variant.cost_price or variant.price * 0.65)))
        total_cost = qty * unit_cost

        po = TPSPurchaseOrder(
            po_number=po_num,
            supplier_id=supplier_id,
            product_id=product.id,
            variant_id=variant.id,
            quantity=qty,
            unit_cost=unit_cost,
            total_cost=total_cost,
            status="submitted",
            destination_branch_id=dest_branch_id,
            requested_by=user.id if user else 1,
            notes=f"Auto-generated via DSS {session.session_code} (Rank #{item.rank_number}, Score: {item.preference_score:.4f})",
        )
        db.session.add(po)
        created_pos.append(po)

    session.status = "po_generated"
    db.session.commit()

    return jsonify({
        "status": "success",
        "message": f"{len(created_pos)} Purchase Order berhasil diajukan dari Sesi DSS {session.session_code}",
        "total_po_created": len(created_pos),
        "po_numbers": [p.po_number for p in created_pos],
        "session_status": session.status,
    })
