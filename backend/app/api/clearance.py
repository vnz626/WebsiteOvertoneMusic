"""
Deadstock Aging & Clearance Promo Simulator (MIS x Finance x TPS) API.
Mengelola analisis umur inventaris, simulasi margin guardrail anti-rugi,
dan penerapan harga clearance yang terintegrasi langsung ke katalog publik.
"""
from datetime import datetime, timedelta
from flask import Blueprint, jsonify, request
from ..extensions import db
from ..models.models import TPSProduct, TPSProductVariant, TPSOrder
from ..security import roles_required, ROLE_SUPER_ADMIN, ROLE_MANAGER, ROLE_FINANCE

clearance_bp = Blueprint("clearance", __name__)

HOLDING_COST_MONTHLY_RATE = 0.015  # 1.5% per bulan untuk biaya simpan & kelembapan gudang


def _calculate_aging_bucket(days):
    if days <= 30:
        return "fresh"
    elif days <= 60:
        return "moderate"
    elif days <= 90:
        return "slow"
    return "deadstock"


def _evaluate_guardrail(simulated_price, cost_price):
    if simulated_price < cost_price:
        return "BELOW_COGS_DANGER"
    # Break-even threshold: margin <= 5% di atas HPP
    margin_amount = simulated_price - cost_price
    margin_pct = (margin_amount / simulated_price * 100) if simulated_price > 0 else 0
    if margin_pct <= 5.0 or simulated_price <= (cost_price * 1.05):
        return "BREAK_EVEN"
    return "SAFE_PROFIT"


@clearance_bp.get("/aging-analysis")
@roles_required(ROLE_SUPER_ADMIN, ROLE_MANAGER, ROLE_FINANCE, "admin")
def get_aging_analysis():
    """Analisis umur simpan inventaris seluruh SKU aktif beserta metrik finansialnya."""
    variants = (
        TPSProductVariant.query.filter_by(is_active=True)
        .join(TPSProduct, TPSProductVariant.product_id == TPSProduct.id)
        .order_by(TPSProductVariant.stock_in_date.asc(), TPSProductVariant.id.asc())
        .all()
    )

    now = datetime.utcnow()
    sku_list = []

    total_frozen_capital_all = 0
    total_frozen_capital_deadstock = 0
    total_holding_cost_all = 0
    total_holding_cost_deadstock = 0
    deadstock_skus_count = 0
    active_clearance_count = 0

    bucket_counts = {"fresh": 0, "moderate": 0, "slow": 0, "deadstock": 0}
    bucket_capitals = {"fresh": 0, "moderate": 0, "slow": 0, "deadstock": 0}

    for v in variants:
        product = v.product_rel
        stock_in = v.stock_in_date or v.created_at or now
        aging_days = max(0, (now - stock_in).days)
        bucket = _calculate_aging_bucket(aging_days)

        cost_price = int(v.cost_price or 0)
        selling_price = int(v.price or 0)
        stock_qty = int(v.stock or 0)

        frozen_capital = stock_qty * cost_price
        monthly_holding = round(frozen_capital * HOLDING_COST_MONTHLY_RATE)

        # Margin awal normal
        initial_margin = (
            round(((selling_price - cost_price) / selling_price) * 100, 2)
            if selling_price > 0
            else 0
        )

        # Max safe discount: diskon tertinggi sebelum harga jual menyentuh cost_price
        max_safe_discount = (
            round(((selling_price - cost_price) / selling_price) * 100, 2)
            if selling_price > cost_price and selling_price > 0
            else 0.0
        )

        # Update aggregasi
        total_frozen_capital_all += frozen_capital
        total_holding_cost_all += monthly_holding
        bucket_counts[bucket] += 1
        bucket_capitals[bucket] += frozen_capital

        if bucket == "deadstock":
            total_frozen_capital_deadstock += frozen_capital
            total_holding_cost_deadstock += monthly_holding
            deadstock_skus_count += 1

        if v.is_clearance_active:
            active_clearance_count += 1

        sku_list.append({
            "variant_id": v.id,
            "product_id": v.product_id,
            "product_name": product.name if product else "Unknown Product",
            "brand_name": product.brand.name if product and product.brand else "Official",
            "category": product.category if product else "Guitars",
            "instrument_type": product.instrument_type if product else "Instrument",
            "image_url": product.image_url if product else None,
            "sku_code": v.sku_code,
            "variant_name": v.variant_name,
            "color_finish": v.color_finish,
            "stock": stock_qty,
            "cost_price": cost_price,
            "price": selling_price,
            "stock_in_date": stock_in.isoformat() if stock_in else None,
            "aging_days": aging_days,
            "aging_bucket": bucket,
            "frozen_capital": frozen_capital,
            "monthly_holding_cost": monthly_holding,
            "initial_margin_percent": initial_margin,
            "max_safe_discount_percent": max_safe_discount,
            "is_clearance_active": bool(v.is_clearance_active),
            "discount_percent": float(v.discount_percent or 0.0),
            "clearance_price": float(v.clearance_price) if v.clearance_price is not None else None,
            "clearance_note": v.clearance_note,
        })

    return jsonify({
        "data": sku_list,
        "kpis": {
            "total_frozen_capital_deadstock": total_frozen_capital_deadstock,
            "total_frozen_capital_all": total_frozen_capital_all,
            "total_deadstock_skus": deadstock_skus_count,
            "total_skus": len(variants),
            "estimated_monthly_holding_cost_deadstock": total_holding_cost_deadstock,
            "estimated_monthly_holding_cost_all": total_holding_cost_all,
            "active_clearance_count": active_clearance_count,
        },
        "aging_distribution": {
            bucket: {
                "count": bucket_counts[bucket],
                "frozen_capital": bucket_capitals[bucket],
            }
            for bucket in ("fresh", "moderate", "slow", "deadstock")
        },
    })


@clearance_bp.post("/simulate")
@roles_required(ROLE_SUPER_ADMIN, ROLE_MANAGER, ROLE_FINANCE, "admin")
def simulate_clearance():
    """
    Simulasi diskon clearance anti-rugi secara real-time.
    Menerima variant_ids (atau single variant_id) dan proposed_discount_percent.
    """
    body = request.get_json(silent=True) or {}
    discount_pct = float(body.get("proposed_discount_percent") or 0.0)
    variant_ids = body.get("variant_ids")
    if not variant_ids and body.get("variant_id"):
        variant_ids = [body.get("variant_id")]

    # If aging_bucket is given (e.g. 'deadstock')
    aging_bucket = body.get("aging_bucket")

    query = TPSProductVariant.query.filter_by(is_active=True).join(TPSProduct, TPSProductVariant.product_id == TPSProduct.id)
    if variant_ids:
        query = query.filter(TPSProductVariant.id.in_(variant_ids))

    variants = query.all()

    # Filter by bucket if specified
    if aging_bucket:
        now = datetime.utcnow()
        variants = [
            v for v in variants
            if _calculate_aging_bucket(max(0, (now - (v.stock_in_date or v.created_at or now)).days)) == aging_bucket
        ]

    simulated_items = []
    total_projected_cash_recovery = 0
    total_projected_profit = 0
    guardrail_counts = {"SAFE_PROFIT": 0, "BREAK_EVEN": 0, "BELOW_COGS_DANGER": 0}

    now = datetime.utcnow()
    for v in variants:
        product = v.product_rel
        cost_price = int(v.cost_price or 0)
        orig_price = int(v.price or 0)
        stock_qty = int(v.stock or 0)

        simulated_selling_price = round(orig_price * (1.0 - (discount_pct / 100.0)))
        net_profit_per_unit = simulated_selling_price - cost_price
        projected_cash_recovery = simulated_selling_price * stock_qty
        projected_total_profit = net_profit_per_unit * stock_qty

        net_margin_pct = (
            round((net_profit_per_unit / simulated_selling_price) * 100, 2)
            if simulated_selling_price > 0
            else 0.0
        )

        guardrail = _evaluate_guardrail(simulated_selling_price, cost_price)
        guardrail_counts[guardrail] += 1

        total_projected_cash_recovery += projected_cash_recovery
        total_projected_profit += projected_total_profit

        stock_in = v.stock_in_date or v.created_at or now
        aging_days = max(0, (now - stock_in).days)

        simulated_items.append({
            "variant_id": v.id,
            "product_id": v.product_id,
            "product_name": product.name if product else "Unknown Product",
            "sku_code": v.sku_code,
            "variant_name": v.variant_name,
            "stock": stock_qty,
            "cost_price": cost_price,
            "original_price": orig_price,
            "proposed_discount_percent": discount_pct,
            "simulated_selling_price": simulated_selling_price,
            "net_profit_per_unit": net_profit_per_unit,
            "net_margin_percent": net_margin_pct,
            "projected_cash_recovery": projected_cash_recovery,
            "projected_total_profit": projected_total_profit,
            "guardrail_status": guardrail,
            "aging_days": aging_days,
            "aging_bucket": _calculate_aging_bucket(aging_days),
        })

    return jsonify({
        "proposed_discount_percent": discount_pct,
        "items": simulated_items,
        "summary": {
            "total_items": len(simulated_items),
            "total_projected_cash_recovery": total_projected_cash_recovery,
            "total_projected_profit": total_projected_profit,
            "guardrail_counts": guardrail_counts,
            "has_danger": guardrail_counts["BELOW_COGS_DANGER"] > 0,
        },
    })


@clearance_bp.post("/apply")
@roles_required(ROLE_SUPER_ADMIN, ROLE_MANAGER, ROLE_FINANCE, "admin")
def apply_clearance():
    """Menerapkan harga promo clearance ke varian SKU tertentu atau kelompok SKU."""
    body = request.get_json(silent=True) or {}
    discount_pct = float(body.get("discount_percent") or 0.0)
    note = (body.get("clearance_note") or "Warehouse Clearance Sale").strip()

    variant_ids = body.get("variant_ids")
    if not variant_ids and body.get("variant_id"):
        variant_ids = [body.get("variant_id")]

    if not variant_ids:
        return jsonify({"message": "Pilih minimal 1 varian SKU untuk diterapkan diskon clearance"}), 400

    if discount_pct <= 0 or discount_pct > 90:
        return jsonify({"message": "Persentase diskon harus antara 1% sampai 90%"}), 400

    variants = TPSProductVariant.query.filter(TPSProductVariant.id.in_(variant_ids)).all()
    if not variants:
        return jsonify({"message": "Varian SKU tidak ditemukan"}), 404

    updated = []
    for v in variants:
        new_clearance_price = round(v.price * (1.0 - (discount_pct / 100.0)), 2)
        v.discount_percent = discount_pct
        v.clearance_price = new_clearance_price
        v.is_clearance_active = True
        v.clearance_note = note
        updated.append(v.id)

    db.session.commit()

    return jsonify({
        "message": f"Berhasil menerapkan diskon clearance {discount_pct}% pada {len(updated)} SKU instrumen.",
        "updated_variant_ids": updated,
        "discount_percent": discount_pct,
        "clearance_note": note,
    })


@clearance_bp.post("/revoke/<int:variant_id>")
@roles_required(ROLE_SUPER_ADMIN, ROLE_MANAGER, ROLE_FINANCE, "admin")
def revoke_clearance_single(variant_id):
    """Membatalkan promo clearance pada SKU tertentu dan mengembalikan ke harga normal."""
    variant = TPSProductVariant.query.get(variant_id)
    if not variant:
        return jsonify({"message": "Varian SKU tidak ditemukan"}), 404

    variant.is_clearance_active = False
    variant.clearance_price = None
    variant.discount_percent = 0.0
    variant.clearance_note = None

    db.session.commit()

    return jsonify({
        "message": f"Promo clearance pada SKU {variant.sku_code} berhasil dibatalkan. Harga kembali normal.",
        "variant_id": variant.id,
    })


@clearance_bp.post("/revoke")
@roles_required(ROLE_SUPER_ADMIN, ROLE_MANAGER, ROLE_FINANCE, "admin")
def revoke_clearance_bulk():
    """Membatalkan promo clearance pada beberapa SKU sekaligus."""
    body = request.get_json(silent=True) or {}
    variant_ids = body.get("variant_ids") or []

    query = TPSProductVariant.query.filter_by(is_clearance_active=True)
    if variant_ids:
        query = query.filter(TPSProductVariant.id.in_(variant_ids))

    variants = query.all()
    for v in variants:
        v.is_clearance_active = False
        v.clearance_price = None
        v.discount_percent = 0.0
        v.clearance_note = None

    db.session.commit()

    return jsonify({
        "message": f"Promo clearance berhasil dibatalkan pada {len(variants)} SKU.",
        "revoked_count": len(variants),
    })
