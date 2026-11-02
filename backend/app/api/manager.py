"""
API Manager Overtone Music Store:
1. Manajemen Administrasi Vendor/Brand (kms__brands_suppliers)
2. Manajemen Master Katalog Instrumen (tps__products) & Varian SKU (tps__product_variants)
3. Pembuatan & Manajemen Paket Bundling / Starter Rig (tps__bundles & tps__bundle_items) dengan Margin Guardrail
4. Pantauan Absensi & Shift Mode Staf Toko (oas__staff_shifts)
"""
from datetime import datetime
from flask import Blueprint, jsonify, request

from ..extensions import db
from ..models.models import (
    TPSProduct,
    TPSProductVariant,
    TPSBrandSupplier,
    TPSStoreBranch,
    TPSBundle,
    TPSBundleItem,
    OASStaffShift,
    OASStaff,
    TPSBranchStock,
)
from ..security import (
    ROLE_MANAGER,
    ROLE_SUPER_ADMIN,
    current_user,
    roles_required,
)
from ..serializers import product_to_dict, brand_to_dict, variant_to_dict
from ..audit import log_action

manager_bp = Blueprint("manager", __name__)


# ===========================================================================
# 1. Master Katalog Produk & Varian SKU
# ===========================================================================

@manager_bp.get("/catalog/products")
@roles_required(ROLE_MANAGER, ROLE_SUPER_ADMIN)
def get_catalog_products():
    """Mengambil seluruh daftar produk master katalog beserta varian SKU."""
    q = (request.args.get("q") or "").strip()
    status = request.args.get("status")
    category = request.args.get("category")
    brand_id = request.args.get("brand_id")

    query = TPSProduct.query
    if q:
        like = f"%{q}%"
        query = query.filter(
            (TPSProduct.name.ilike(like))
            | (TPSProduct.sku_prefix.ilike(like))
            | (TPSProduct.category.ilike(like))
        )
    if status:
        query = query.filter_by(status=status)
    if category:
        query = query.filter_by(category=category)
    if brand_id:
        query = query.filter_by(brand_id=int(brand_id))

    products = query.order_by(TPSProduct.id.desc()).all()
    res = []
    for p in products:
        d = product_to_dict(p, detail=True)
        res.append(d)

    return jsonify({"data": res, "total": len(res)})


@manager_bp.post("/catalog/products")
@roles_required(ROLE_MANAGER, ROLE_SUPER_ADMIN)
def create_catalog_product():
    """Manager membuat produk master cinema gear baru."""
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    sku_prefix = (data.get("sku_prefix") or "").strip().upper()
    category = (data.get("category") or "Cinema Cameras").strip()
    instrument_type = (data.get("instrument_type") or "Cinema Camera Body").strip()
    brand_id = data.get("brand_id") or data.get("organizer_id")
    branch_id = data.get("branch_id") or data.get("venue_id")
    description = (data.get("description") or "").strip()
    specifications = (data.get("specifications") or "").strip()
    warranty_months = int(data.get("warranty_months") or 12)
    image_url = (data.get("image_url") or "").strip()
    status = data.get("status") or "published"

    if not name or not sku_prefix or not brand_id:
        return jsonify({"message": "Nama cinema gear, SKU prefix, dan Brand Supplier resmi wajib diisi"}), 400

    brand = TPSBrandSupplier.query.get(brand_id)
    if not brand:
        return jsonify({"message": "Brand / Supplier tidak ditemukan"}), 404

    user = current_user()
    prod = TPSProduct(
        name=name,
        sku_prefix=sku_prefix,
        category=category,
        instrument_type=instrument_type,
        brand_id=int(brand_id),
        branch_id=int(branch_id) if branch_id else None,
        description=description,
        specifications=specifications,
        warranty_months=warranty_months,
        image_url=image_url or "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80",
        status=status,
        created_by=user.id if user else None,
    )
    db.session.add(prod)
    db.session.flush()

    # Jika disertakan initial variant
    initial_variant = data.get("variant")
    if initial_variant:
        v_name = initial_variant.get("variant_name") or f"{name} (Standard)"
        v_sku = initial_variant.get("sku_code") or f"{sku_prefix}-STD"
        v_color = initial_variant.get("color_finish") or "Natural"
        v_cost = int(initial_variant.get("cost_price") or 0)
        v_price = int(initial_variant.get("price") or 0)
        v_stock = int(initial_variant.get("stock") or 0)
        v_weight = float(initial_variant.get("weight_kg") or 3.5)

        variant = TPSProductVariant(
            product_id=prod.id,
            sku_code=v_sku,
            variant_name=v_name,
            color_finish=v_color,
            cost_price=v_cost,
            price=v_price,
            stock=v_stock,
            weight_kg=v_weight,
            is_active=True,
        )
        db.session.add(variant)
        db.session.flush()

        # Seed branch stock across available branches
        branches = TPSStoreBranch.query.filter_by(is_active=True).all()
        for b in branches:
            b_qty = v_stock if b.branch_type == "warehouse" else 0
            bs = TPSBranchStock(variant_id=variant.id, branch_id=b.id, quantity=b_qty)
            db.session.add(bs)

    db.session.commit()

    log_action(
        action="CREATE_MASTER_PRODUCT",
        entity_type="product",
        entity_id=str(prod.id),
        after={"name": prod.name, "sku_prefix": prod.sku_prefix, "brand": brand.name},
    )

    return jsonify({
        "message": f"Produk instrumen '{prod.name}' berhasil ditambahkan ke master katalog!",
        "data": product_to_dict(prod, detail=True),
    }), 201


@manager_bp.put("/catalog/products/<int:id>")
@roles_required(ROLE_MANAGER, ROLE_SUPER_ADMIN)
def update_catalog_product(id):
    """Manager memperbarui data produk master."""
    prod = TPSProduct.query.get(id)
    if not prod:
        return jsonify({"message": "Produk tidak ditemukan"}), 404

    data = request.get_json(silent=True) or {}
    if "name" in data:
        prod.name = data["name"].strip()
    if "category" in data:
        prod.category = data["category"].strip()
    if "instrument_type" in data:
        prod.instrument_type = data["instrument_type"].strip()
    if "brand_id" in data:
        prod.brand_id = int(data["brand_id"])
    if "sku_prefix" in data:
        prod.sku_prefix = data["sku_prefix"].strip().upper()
    if "description" in data:
        prod.description = data["description"]
    if "specifications" in data:
        prod.specifications = data["specifications"]
    if "warranty_months" in data:
        prod.warranty_months = int(data["warranty_months"])
    if "image_url" in data:
        prod.image_url = data["image_url"]
    if "status" in data:
        prod.status = data["status"]

    prod.updated_at = datetime.utcnow()
    db.session.commit()

    return jsonify({
        "message": f"Produk '{prod.name}' berhasil diperbarui",
        "data": product_to_dict(prod, detail=True),
    })


@manager_bp.delete("/catalog/products/<int:id>")
@roles_required(ROLE_MANAGER, ROLE_SUPER_ADMIN)
def delete_catalog_product(id):
    """Manager mengarsipkan atau menghapus produk master."""
    prod = TPSProduct.query.get(id)
    if not prod:
        return jsonify({"message": "Produk tidak ditemukan"}), 404

    prod.status = "archived"
    prod.updated_at = datetime.utcnow()
    db.session.commit()

    return jsonify({"message": f"Produk '{prod.name}' telah diarsipkan"})


@manager_bp.post("/catalog/products/<int:product_id>/variants")
@roles_required(ROLE_MANAGER, ROLE_SUPER_ADMIN)
def create_catalog_variant(product_id):
    """Manager menambahkan varian SKU warna/finishing baru ke master produk."""
    prod = TPSProduct.query.get(product_id)
    if not prod:
        return jsonify({"message": "Produk tidak ditemukan"}), 404

    data = request.get_json(silent=True) or {}
    sku_code = (data.get("sku_code") or "").strip().upper()
    variant_name = (data.get("variant_name") or data.get("tier_name") or "").strip()
    color_finish = (data.get("color_finish") or "").strip()
    cost_price = int(data.get("cost_price") or 0)
    price = int(data.get("price") or 0)
    stock = int(data.get("stock") or data.get("quota") or 0)
    weight_kg = float(data.get("weight_kg") or 3.5)

    if not sku_code or not color_finish:
        return jsonify({"message": "Kode SKU dan warna/finishing wajib diisi"}), 400

    existing = TPSProductVariant.query.filter_by(sku_code=sku_code).first()
    if existing:
        return jsonify({"message": f"Kode SKU '{sku_code}' sudah terdaftar di sistem"}), 400

    full_variant_name = f"{prod.name} ({color_finish})" if not variant_name else variant_name
    var = TPSProductVariant(
        product_id=prod.id,
        sku_code=sku_code,
        variant_name=full_variant_name,
        color_finish=color_finish,
        cost_price=cost_price,
        price=price,
        stock=stock,
        weight_kg=weight_kg,
        is_active=True,
    )
    db.session.add(var)
    db.session.flush()

    # Alokasi awal ke Central Warehouse dan seluruh showroom
    branches = TPSStoreBranch.query.filter_by(is_active=True).all()
    for b in branches:
        b_qty = stock if b.branch_type == "warehouse" else 0
        bs = TPSBranchStock(variant_id=var.id, branch_id=b.id, quantity=b_qty)
        db.session.add(bs)

    db.session.commit()

    return jsonify({
        "message": f"Varian SKU '{var.sku_code}' berhasil ditambahkan ke katalog!",
        "data": variant_to_dict(var),
    }), 201


@manager_bp.put("/catalog/variants/<int:id>")
@roles_required(ROLE_MANAGER, ROLE_SUPER_ADMIN)
def update_catalog_variant(id):
    """Manager memperbarui data varian SKU (harga jual, harga pokok modal, stok)."""
    var = TPSProductVariant.query.get(id)
    if not var:
        return jsonify({"message": "Varian tidak ditemukan"}), 404

    data = request.get_json(silent=True) or {}
    if "sku_code" in data:
        var.sku_code = data["sku_code"].strip().upper()
    if "variant_name" in data:
        var.variant_name = data["variant_name"].strip()
    if "color_finish" in data:
        var.color_finish = data["color_finish"].strip()
    if "cost_price" in data:
        var.cost_price = int(data["cost_price"])
    if "price" in data:
        var.price = int(data["price"])
    if "weight_kg" in data:
        var.weight_kg = float(data["weight_kg"])
    if "stock" in data:
        var.stock = int(data["stock"])
    if "is_active" in data:
        var.is_active = bool(data["is_active"])

    var.updated_at = datetime.utcnow()
    db.session.commit()

    return jsonify({
        "message": f"Varian SKU '{var.sku_code}' berhasil diperbarui",
        "data": variant_to_dict(var),
    })


# ===========================================================================
# 2. Administrasi Brand & Supplier Resmi (kms__brands_suppliers)
# ===========================================================================

@manager_bp.get("/suppliers")
@roles_required(ROLE_MANAGER, ROLE_SUPER_ADMIN)
def list_suppliers():
    """Mengambil daftar seluruh brand & vendor supplier resmi."""
    brands = TPSBrandSupplier.query.order_by(TPSBrandSupplier.name.asc()).all()
    res = []
    for b in brands:
        res.append({
            "id": b.id,
            "name": b.name,
            "slug": b.slug,
            "country": b.country,
            "description": b.description,
            "logo_url": b.logo_url,
            "website": b.website,
            "contact_email": b.contact_email,
            "contact_phone": b.contact_phone,
            "is_active": b.is_active,
            "products_count": b.products.count() if hasattr(b, "products") else 0,
            "created_at": b.created_at.isoformat() if b.created_at else None,
        })
    return jsonify({"data": res, "total": len(res)})


@manager_bp.post("/suppliers")
@roles_required(ROLE_MANAGER, ROLE_SUPER_ADMIN)
def create_supplier():
    """Manager mendaftarkan Brand / Supplier resmi baru."""
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    slug = (data.get("slug") or name.lower().replace(" ", "-")).strip()
    country = (data.get("country") or "United States").strip()
    description = (data.get("description") or "").strip()
    website = (data.get("website") or "").strip()
    contact_email = (data.get("contact_email") or "").strip()
    contact_phone = (data.get("contact_phone") or "").strip()
    logo_url = (data.get("logo_url") or "").strip()

    if not name:
        return jsonify({"message": "Nama Brand/Supplier resmi wajib diisi"}), 400

    brand = TPSBrandSupplier(
        name=name,
        slug=slug,
        country=country,
        description=description,
        website=website,
        contact_email=contact_email,
        contact_phone=contact_phone,
        logo_url=logo_url,
        is_active=True,
    )
    db.session.add(brand)
    db.session.commit()

    return jsonify({
        "message": f"Brand/Supplier '{brand.name}' berhasil didaftarkan ke sistem!",
        "data": brand_to_dict(brand),
    }), 201


@manager_bp.put("/suppliers/<int:id>")
@roles_required(ROLE_MANAGER, ROLE_SUPER_ADMIN)
def update_supplier(id):
    """Manager memperbarui data Brand / Supplier."""
    brand = TPSBrandSupplier.query.get(id)
    if not brand:
        return jsonify({"message": "Brand/Supplier tidak ditemukan"}), 404

    data = request.get_json(silent=True) or {}
    if "name" in data:
        brand.name = data["name"].strip()
    if "slug" in data:
        brand.slug = data["slug"].strip()
    if "country" in data:
        brand.country = data["country"].strip()
    if "description" in data:
        brand.description = data["description"]
    if "website" in data:
        brand.website = data["website"]
    if "contact_email" in data:
        brand.contact_email = data["contact_email"]
    if "contact_phone" in data:
        brand.contact_phone = data["contact_phone"]
    if "logo_url" in data:
        brand.logo_url = data["logo_url"]
    if "is_active" in data:
        brand.is_active = bool(data["is_active"])

    db.session.commit()
    return jsonify({
        "message": f"Brand/Supplier '{brand.name}' berhasil diperbarui",
        "data": brand_to_dict(brand),
    })


# ===========================================================================
# 3. Product Bundles & "Starter Rig" Creator (Fitur Baru #3)
# ===========================================================================

@manager_bp.get("/bundles")
def list_bundles():
    """Mengambil daftar paket bundle untuk Manager, Kasir POS, dan Katalog."""
    only_active = request.args.get("active", "false").lower() in ("1", "true")
    query = TPSBundle.query
    if only_active:
        query = query.filter_by(is_active=True)

    bundles = query.order_by(TPSBundle.id.desc()).all()
    return jsonify({"data": [b.to_dict(include_items=True) for b in bundles], "total": len(bundles)})


@manager_bp.post("/bundles")
@roles_required(ROLE_MANAGER, ROLE_SUPER_ADMIN)
def create_bundle():
    """Manager membuat paket bundling baru dengan verifikasi Margin Guardrail."""
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    description = (data.get("description") or "").strip()
    bundle_code = (data.get("bundle_code") or f"BNDL-{datetime.utcnow().strftime('%Y%m')}-{data.get('items', [{}])[0].get('variant_id', 1)}").strip().upper()
    bundle_price = int(data.get("bundle_price") or 0)
    image_url = data.get("image_url") or "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80"
    items_data = data.get("items") or []

    if not name or not items_data or len(items_data) < 2:
        return jsonify({"message": "Nama paket dan minimal 2 varian SKU penyusun bundle wajib dipilih"}), 400

    # Kalkulasi Total Harga Normal & Total Modal COGS
    normal_total = 0
    total_cogs = 0
    resolved_items = []

    for item in items_data:
        v_id = item.get("variant_id")
        qty = int(item.get("qty") or 1)
        var = TPSProductVariant.query.get(v_id)
        if not var:
            return jsonify({"message": f"Varian SKU dengan ID {v_id} tidak ditemukan"}), 404

        normal_total += (var.price * qty)
        total_cogs += (var.cost_price * qty)
        resolved_items.append((var, qty))

    # Margin Guardrail: Harga bundle TIDAK boleh di bawah total COGS/HPP!
    if bundle_price < total_cogs:
        return jsonify({
            "message": f"PELANGGARAN MARGIN GUARDRAIL: Harga paket (Rp {bundle_price:,.0f}) berada di bawah total modal pokok HPP (Rp {total_cogs:,.0f})! Tentukan harga yang menghasilkan margin profit positif.",
            "total_cogs": total_cogs,
            "normal_total": normal_total,
        }), 400

    savings_amount = max(0, normal_total - bundle_price)
    user = current_user()

    bundle = TPSBundle(
        bundle_code=bundle_code,
        name=name,
        description=description,
        bundle_price=bundle_price,
        normal_total_price=normal_total,
        total_cogs=total_cogs,
        savings_amount=savings_amount,
        is_active=True,
        image_url=image_url,
        created_by=user.id if user else None,
    )
    db.session.add(bundle)
    db.session.flush()

    for var, qty in resolved_items:
        b_item = TPSBundleItem(
            bundle_id=bundle.id,
            variant_id=var.id,
            qty=qty,
        )
        db.session.add(b_item)

    db.session.commit()

    log_action(
        action="CREATE_PRODUCT_BUNDLE",
        entity_type="bundle",
        entity_id=str(bundle.id),
        after={"name": bundle.name, "bundle_price": bundle.bundle_price, "items_count": len(resolved_items)},
    )

    return jsonify({
        "message": f"Paket Starter Rig '{bundle.name}' berhasil dibuat dengan hemat Rp {savings_amount:,.0f}!",
        "data": bundle.to_dict(include_items=True),
    }), 201


@manager_bp.put("/bundles/<int:id>")
@roles_required(ROLE_MANAGER, ROLE_SUPER_ADMIN)
def update_bundle(id):
    """Manager mengedit atau mengubah status aktif bundle."""
    bundle = TPSBundle.query.get(id)
    if not bundle:
        return jsonify({"message": "Paket bundle tidak ditemukan"}), 404

    data = request.get_json(silent=True) or {}
    if "is_active" in data:
        bundle.is_active = bool(data["is_active"])
    if "name" in data:
        bundle.name = data["name"].strip()
    if "description" in data:
        bundle.description = data["description"]
    if "image_url" in data:
        bundle.image_url = data["image_url"]
    if "bundle_price" in data:
        new_price = int(data["bundle_price"])
        if new_price < bundle.total_cogs:
            return jsonify({
                "message": f"Harga paket tidak boleh di bawah total modal pokok (Rp {bundle.total_cogs:,.0f})",
            }), 400
        bundle.bundle_price = new_price
        bundle.savings_amount = max(0, bundle.normal_total_price - new_price)

    bundle.updated_at = datetime.utcnow()
    db.session.commit()

    return jsonify({
        "message": f"Paket bundle '{bundle.name}' berhasil diperbarui",
        "data": bundle.to_dict(include_items=True),
    })


@manager_bp.delete("/bundles/<int:id>")
@roles_required(ROLE_MANAGER, ROLE_SUPER_ADMIN)
def delete_bundle(id):
    """Manager menghapus paket bundle."""
    bundle = TPSBundle.query.get(id)
    if not bundle:
        return jsonify({"message": "Paket bundle tidak ditemukan"}), 404

    name = bundle.name
    db.session.delete(bundle)
    db.session.commit()

    return jsonify({"message": f"Paket bundle '{name}' berhasil dihapus"})


# ===========================================================================
# 4. Pantauan Absensi & Shift Mode Staf Toko (oas__staff_shifts)
# ===========================================================================

@manager_bp.get("/shifts")
@manager_bp.get("/staff-shifts")
@roles_required(ROLE_MANAGER, ROLE_SUPER_ADMIN, "admin", "super_admin", "manager")
def get_staff_shifts():
    """Manager memantau daftar sesi kerja & absensi staf (Showroom vs Online CS) lengkap dengan kalkulasi durasi dan transaksi POS."""
    from ..models.models import TPSOrder

    status = request.args.get("status")
    mode = request.args.get("shift_mode") or request.args.get("mode")
    branch_id = request.args.get("branch_id")

    query = OASStaffShift.query
    if status and status != "all":
        query = query.filter_by(status=status)
    if mode and mode != "all":
        query = query.filter_by(shift_mode=mode)
    if branch_id and branch_id != "all":
        query = query.filter_by(branch_id=int(branch_id))

    shifts = query.order_by(OASStaffShift.clock_in_at.desc()).all()
    now_dt = datetime.utcnow()

    res = []
    for s in shifts:
        staff_user = s.staff
        branch_obj = s.branch

        # Hitung durasi kerja
        end_time = s.clock_out_at or now_dt
        duration_seconds = max(0, int((end_time - s.clock_in_at).total_seconds()))
        hours = duration_seconds // 3600
        minutes = (duration_seconds % 3600) // 60
        duration_str = f"{hours} jam {minutes} menit" if hours > 0 else f"{minutes} menit"

        # Hitung transaksi POS yang dilayani staf selama sesi ini
        pos_count = TPSOrder.query.filter_by(handled_by_staff_id=s.staff_id).filter(
            TPSOrder.created_at >= s.clock_in_at
        )
        if s.clock_out_at:
            pos_count = pos_count.filter(TPSOrder.created_at <= s.clock_out_at)
        pos_transactions_count = pos_count.count()

        res.append({
            "id": s.id,
            "staff_id": s.staff_id,
            "staff_name": staff_user.name if staff_user else "Staf Toko",
            "staff_email": staff_user.email if staff_user else "-",
            "staff_role": staff_user.role if staff_user else "store_staff",
            "shift_mode": s.shift_mode,
            "shift_mode_label": "Showroom Offline" if s.shift_mode == "offline_store" else "Online CS Specialist",
            "branch_id": s.branch_id,
            "branch_name": branch_obj.name if branch_obj else ("Online CS Specialist" if s.shift_mode == "online_cs" else "Showroom"),
            "clock_in": s.clock_in_at.isoformat() if s.clock_in_at else None,
            "clock_out": s.clock_out_at.isoformat() if s.clock_out_at else None,
            "duration": duration_str,
            "duration_hours": round(duration_seconds / 3600.0, 1),
            "status": s.status,
            "notes": s.notes or "-",
            "pos_transactions_count": pos_transactions_count,
        })

    active_count = sum(1 for s in res if s["status"] == "active")
    offline_count = sum(1 for s in res if s["status"] == "active" and s["shift_mode"] == "offline_store")
    online_count = sum(1 for s in res if s["status"] == "active" and s["shift_mode"] == "online_cs")
    total_hours_month = sum(s["duration_hours"] for s in res)

    kpi_payload = {
        "active_count": active_count,
        "offline_count": offline_count,
        "online_count": online_count,
        "total_hours_month": round(total_hours_month, 1),
        "total_sessions": len(res),
    }

    return jsonify({
        "status": "success",
        "data": res,
        "total": len(res),
        "kpi": kpi_payload,
        "summary": kpi_payload,
    })
