"""
Katalog instrumen musik publik Swee Lee Store & metadata master (Brands & Showroom Branches).
Mendukung endpoint modern /api/products dan kompatibilitas /api/events.
"""
from flask import Blueprint, jsonify, request

from ..models.models import TPSProduct, TPSBrandSupplier, TPSStoreBranch, TPSProductVariant
from ..security import INSTRUMENT_CATEGORIES, INDONESIAN_CITIES
from ..serializers import product_to_dict, brand_to_dict, branch_to_dict, variant_to_dict

products_bp = Blueprint("products", __name__)
events_bp = Blueprint("events", __name__)


def _meta_handler():
    brands = TPSBrandSupplier.query.filter_by(is_active=True).order_by(TPSBrandSupplier.name.asc()).all()
    branches = TPSStoreBranch.query.filter_by(is_active=True).order_by(TPSStoreBranch.name.asc()).all()
    return jsonify({
        "categories": INSTRUMENT_CATEGORIES,
        "cities": INDONESIAN_CITIES,
        "brands": [brand_to_dict(b) for b in brands],
        "venues": [branch_to_dict(v) for v in branches],
        "branches": [branch_to_dict(v) for v in branches],
    })


def _brands_handler():
    brands = TPSBrandSupplier.query.filter_by(is_active=True).order_by(TPSBrandSupplier.name.asc()).all()
    return jsonify({"data": [brand_to_dict(b) for b in brands], "total": len(brands)})


def _branches_handler():
    branches = TPSStoreBranch.query.filter_by(is_active=True).order_by(TPSStoreBranch.name.asc()).all()
    return jsonify({"data": [branch_to_dict(b) for b in branches], "total": len(branches)})


def _list_products_handler():
    q = (request.args.get("q") or "").strip()
    category = (request.args.get("category") or "").strip()
    city = (request.args.get("city") or "").strip()
    brand_id = request.args.get("brand_id")
    instrument_type = request.args.get("instrument_type")

    query = TPSProduct.query.filter_by(status="published")

    if q:
        like = f"%{q}%"
        query = query.filter(
            (TPSProduct.name.ilike(like))
            | (TPSProduct.sku_prefix.ilike(like))
            | (TPSProduct.instrument_type.ilike(like))
            | (TPSProduct.category.ilike(like))
        )
    if category:
        query = query.filter_by(category=category)
    if brand_id:
        query = query.filter_by(brand_id=int(brand_id))
    if instrument_type:
        query = query.filter_by(instrument_type=instrument_type)

    items = query.order_by(TPSProduct.created_at.desc()).all()
    return jsonify({"data": [product_to_dict(p) for p in items], "total": len(items)})


def _detail_product_handler(product_id):
    product = TPSProduct.query.get(product_id)
    if not product or product.status != "published":
        return jsonify({"message": "Produk instrumen tidak ditemukan atau belum dipublikasikan"}), 404
    return jsonify({"data": product_to_dict(product, detail=True)})


def _product_variants_handler(product_id):
    product = TPSProduct.query.get(product_id)
    if not product:
        return jsonify({"message": "Produk tidak ditemukan"}), 404
    variants = TPSProductVariant.query.filter_by(product_id=product.id, is_active=True).all()
    return jsonify({"data": [variant_to_dict(v) for v in variants], "total": len(variants)})


# Route bindings for products_bp
products_bp.get("/meta")(_meta_handler)
products_bp.get("/brands")(_brands_handler)
products_bp.get("/venues")(_branches_handler)
products_bp.get("/branches")(_branches_handler)
products_bp.get("")(_list_products_handler)
products_bp.get("/")(_list_products_handler)
products_bp.get("/<int:product_id>")(_detail_product_handler)
products_bp.get("/<int:product_id>/variants")(_product_variants_handler)
products_bp.get("/<int:product_id>/tiers")(_product_variants_handler)

# Route bindings for events_bp (Backward compatibility)
events_bp.get("/meta")(_meta_handler)
events_bp.get("/brands")(_brands_handler)
events_bp.get("/venues")(_branches_handler)
events_bp.get("/branches")(_branches_handler)
events_bp.get("")(_list_products_handler)
events_bp.get("/")(_list_products_handler)
events_bp.get("/<int:product_id>")(_detail_product_handler)
events_bp.get("/<int:product_id>/variants")(_product_variants_handler)
events_bp.get("/<int:product_id>/tiers")(_product_variants_handler)
