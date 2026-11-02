"""
Area Super Admin & Manager:
- Manajemen Staf Internal (OAS Staff)
- Direktori Pelanggan / Filmmaker (TPS Customers)
- Kurasi & Approval Katalog Cinema Gear
- System Settings
"""
import io
import csv
import json
from datetime import datetime
from flask import Blueprint, jsonify, request, Response

from ..extensions import db
from ..models.models import OASStaff, TPSCustomer, TPSProduct, TPSBrandSupplier, TPSStoreBranch, TPSOrder, OASSystemSetting, OASAuditLog
from ..security import ROLE_MANAGER, ROLE_SUPER_ADMIN, current_user, roles_required
from ..serializers import product_to_dict, branch_to_dict, brand_to_dict, user_to_dict
from ..audit import log_action

admin_bp = Blueprint("admin", __name__)


# ===========================================================================
# 1. Ringkasan Eksekutif & Statistik Toko (Super Admin & Manager)
# ===========================================================================

@admin_bp.get("/stats")
@roles_required(ROLE_SUPER_ADMIN, ROLE_MANAGER)
def stats():
    paid_orders = TPSOrder.query.filter_by(payment_status="paid").all()
    gross_revenue = sum(o.total_price for o in paid_orders)
    total_units = sum(o.quantity for o in paid_orders)

    return jsonify(
        {
            "data": {
                "total_staff": OASStaff.query.count(),
                "total_customers": TPSCustomer.query.count(),
                "total_users": OASStaff.query.count() + TPSCustomer.query.count(),
                "total_products": TPSProduct.query.count(),
                "total_events": TPSProduct.query.count(),
                "pending_products": TPSProduct.query.filter_by(status="draft").count(),
                "published_products": TPSProduct.query.filter_by(status="published").count(),
                "approved_events": TPSProduct.query.filter_by(status="published").count(),
                "units_sold": total_units,
                "tickets_sold": total_units,
                "gross_revenue": gross_revenue,
                "revenue": gross_revenue,
            }
        }
    )


# ===========================================================================
# 2. Manajemen Staf Internal (OAS Staff) - Khusus Super Admin
# ===========================================================================

@admin_bp.get("/staff")
@admin_bp.get("/users")
@roles_required(ROLE_SUPER_ADMIN)
def list_staff():
    """Mengambil daftar pegawai internal toko cinema gear dari tabel oas_staff."""
    # Dukungan kompatibilitas tab type=customers
    account_type = request.args.get("type", "staff").lower()
    if account_type == "customer" or account_type == "customers":
        return list_customers()

    q = (request.args.get("q") or "").strip().lower()
    role = (request.args.get("role") or "").strip()
    status = request.args.get("is_active")

    query = OASStaff.query
    if q:
        query = query.filter(
            (OASStaff.name.ilike(f"%{q}%")) | (OASStaff.email.ilike(f"%{q}%")) | (OASStaff.username.ilike(f"%{q}%"))
        )
    if role:
        query = query.filter_by(role=role)
    if status is not None and status != "":
        is_active = status.lower() in ("1", "true")
        query = query.filter_by(is_active=is_active)

    staff_list = query.order_by(OASStaff.id.asc()).all()
    return jsonify({"data": [s.to_dict() for s in staff_list], "total": len(staff_list)})


@admin_bp.post("/staff")
@admin_bp.post("/users")
@roles_required(ROLE_SUPER_ADMIN)
def create_staff():
    """Menambah pegawai internal baru ke oas_staff."""
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    username = (data.get("username") or "").strip().lower() or None
    password = data.get("password") or "password123"
    role = data.get("role") or "store_staff"
    phone = (data.get("phone") or "").strip() or None
    branch_id = data.get("branch_id")

    internal_roles = ("super_admin", "manager", "finance", "warehouse_staff", "store_staff")
    if role not in internal_roles:
        return jsonify({"message": f"Role staf tidak valid. Pilih dari: {', '.join(internal_roles)}"}), 400

    if not name or not email:
        return jsonify({"message": "Nama dan email wajib diisi"}), 400
    if OASStaff.query.filter_by(email=email).first() or TPSCustomer.query.filter_by(email=email).first():
        return jsonify({"message": "Email sudah terdaftar"}), 409
    if username and (OASStaff.query.filter_by(username=username).first() or TPSCustomer.query.filter_by(username=username).first()):
        return jsonify({"message": "Username sudah terdaftar"}), 409

    if not username:
        username = email.split("@")[0]

    staff = OASStaff(
        name=name,
        email=email,
        username=username,
        role=role,
        phone=phone,
        branch_id=branch_id,
        is_active=True,
    )
    staff.set_password(password)
    db.session.add(staff)
    db.session.commit()

    log_action(
        action="CREATE_STAFF",
        entity_type="staff",
        entity_id=str(staff.id),
        before=None,
        after={"name": staff.name, "email": staff.email, "role": staff.role, "username": staff.username},
    )

    return jsonify({"message": f"Pegawai {name} ({role}) berhasil ditambahkan", "data": staff.to_dict()}), 201


@admin_bp.put("/staff/<int:staff_id>/role")
@admin_bp.put("/users/<int:staff_id>/role")
@roles_required(ROLE_SUPER_ADMIN)
def update_staff_role(staff_id):
    staff = OASStaff.query.get(staff_id)
    if not staff:
        return jsonify({"message": "Pegawai tidak ditemukan"}), 404

    data = request.get_json(silent=True) or {}
    new_role = data.get("role")
    internal_roles = ("super_admin", "manager", "finance", "warehouse_staff", "store_staff")
    if new_role not in internal_roles:
        return jsonify({"message": f"Role tidak valid. Pilih dari: {', '.join(internal_roles)}"}), 400

    admin = current_user()
    if isinstance(admin, OASStaff) and admin.id == staff.id and new_role != "super_admin":
        return jsonify({"message": "Tidak dapat mencabut hak akses Super Admin pada akun Anda sendiri"}), 400

    old_role = staff.role
    staff.role = new_role
    db.session.commit()

    log_action(
        action="UPDATE_STAFF_ROLE",
        entity_type="staff",
        entity_id=str(staff.id),
        before={"role": old_role, "name": staff.name, "email": staff.email},
        after={"role": new_role, "name": staff.name, "email": staff.email},
    )

    return jsonify({"message": f"Role berhasil diperbarui menjadi {new_role}", "data": staff.to_dict()})


@admin_bp.put("/staff/<int:staff_id>/status")
@admin_bp.put("/users/<int:staff_id>/status")
@roles_required(ROLE_SUPER_ADMIN)
def toggle_staff_status(staff_id):
    staff = OASStaff.query.get(staff_id)
    if not staff:
        return jsonify({"message": "Pegawai tidak ditemukan"}), 404

    admin = current_user()
    if isinstance(admin, OASStaff) and admin.id == staff.id:
        return jsonify({"message": "Tidak dapat menonaktifkan akun sendiri"}), 400

    old_status = staff.is_active
    staff.is_active = not staff.is_active
    db.session.commit()
    status_str = "diaktifkan" if staff.is_active else "dinonaktifkan (suspend)"

    log_action(
        action="SUSPEND_STAFF" if not staff.is_active else "ACTIVATE_STAFF",
        entity_type="staff",
        entity_id=str(staff.id),
        before={"is_active": old_status, "name": staff.name, "email": staff.email},
        after={"is_active": staff.is_active, "name": staff.name, "email": staff.email},
    )

    return jsonify({"message": f"Akun pegawai berhasil {status_str}", "data": staff.to_dict()})


# ===========================================================================
# 3. Direktori Pelanggan / Filmmaker (TPS Customers) - Khusus Super Admin
# ===========================================================================

@admin_bp.get("/customers")
@roles_required(ROLE_SUPER_ADMIN)
def list_customers():
    """Mengambil daftar akun pelanggan dari tabel tps_customers."""
    q = (request.args.get("q") or "").strip().lower()
    status = request.args.get("is_active")

    query = TPSCustomer.query
    if q:
        query = query.filter(
            (TPSCustomer.name.ilike(f"%{q}%")) | (TPSCustomer.email.ilike(f"%{q}%")) | (TPSCustomer.username.ilike(f"%{q}%"))
        )
    if status is not None and status != "":
        is_active = status.lower() in ("1", "true")
        query = query.filter_by(is_active=is_active)

    customers = query.order_by(TPSCustomer.id.desc()).all()
    return jsonify({"data": [c.to_dict() for c in customers], "total": len(customers)})


@admin_bp.put("/customers/<int:customer_id>/status")
@roles_required(ROLE_SUPER_ADMIN)
def toggle_customer_status(customer_id):
    customer = TPSCustomer.query.get(customer_id)
    if not customer:
        return jsonify({"message": "Pelanggan tidak ditemukan"}), 404

    old_status = customer.is_active
    customer.is_active = not customer.is_active
    db.session.commit()
    status_str = "diaktifkan" if customer.is_active else "diblokir"

    log_action(
        action="BLOCK_CUSTOMER" if not customer.is_active else "UNBLOCK_CUSTOMER",
        entity_type="customer",
        entity_id=str(customer.id),
        before={"is_active": old_status, "name": customer.name, "email": customer.email},
        after={"is_active": customer.is_active, "name": customer.name, "email": customer.email},
    )

    return jsonify({"message": f"Akun pelanggan berhasil {status_str}", "data": customer.to_dict()})


# ===========================================================================
# 4. Kurasi & Approval Katalog Produk (Manager & Super Admin)
# ===========================================================================

@admin_bp.get("/events")
@admin_bp.get("/products")
@roles_required(ROLE_MANAGER, ROLE_SUPER_ADMIN)
def list_pending_products():
    status = request.args.get("status")
    query = TPSProduct.query
    if status:
        query = query.filter_by(status=status)
    items = query.order_by(TPSProduct.id.desc()).all()
    return jsonify({"data": [product_to_dict(p, detail=True) for p in items], "total": len(items)})


@admin_bp.post("/events/<int:id>/approve")
@admin_bp.post("/products/<int:id>/approve")
@roles_required(ROLE_MANAGER, ROLE_SUPER_ADMIN)
def approve_product(id):
    product = TPSProduct.query.get(id)
    if not product:
        return jsonify({"message": "Produk cinema gear tidak ditemukan"}), 404

    old_status = product.status
    product.status = "published"
    db.session.commit()

    log_action(
        action="APPROVE_CATALOG_PRODUCT",
        entity_type="product",
        entity_id=str(product.id),
        before={"status": old_status, "name": product.name},
        after={"status": "published", "name": product.name},
    )

    return jsonify({"message": "Cinema gear disetujui & tayang di katalog publik", "data": product_to_dict(product)})


@admin_bp.post("/events/<int:id>/reject")
@admin_bp.post("/products/<int:id>/reject")
@roles_required(ROLE_MANAGER, ROLE_SUPER_ADMIN)
def reject_product(id):
    product = TPSProduct.query.get(id)
    if not product:
        return jsonify({"message": "Produk cinema gear tidak ditemukan"}), 404

    old_status = product.status
    product.status = "archived"
    db.session.commit()

    log_action(
        action="REJECT_CATALOG_PRODUCT",
        entity_type="product",
        entity_id=str(product.id),
        before={"status": old_status, "name": product.name},
        after={"status": "archived", "name": product.name},
    )

    return jsonify({"message": "Produk diarsipkan", "data": product_to_dict(product)})


# ===========================================================================
# 5. OAS Audit Logs (Fitur 1.1 - Khusus Super Admin)
# ===========================================================================

@admin_bp.get("/audit-logs")
@roles_required(ROLE_SUPER_ADMIN)
def get_audit_logs():
    """Mengambil daftar jejak audit trail seluruh aktivitas sensitif sistem."""
    actor_type = request.args.get("actor_type")
    actor_role = request.args.get("actor_role")
    actor_id = request.args.get("actor_id")
    action = request.args.get("action")
    entity_type = request.args.get("entity_type")
    entity_id = request.args.get("entity_id")
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    q = (request.args.get("q") or "").strip()

    query = OASAuditLog.query

    if actor_type:
        query = query.filter_by(actor_type=actor_type)
    if actor_role:
        query = query.filter_by(actor_role=actor_role)
    if actor_id:
        query = query.filter_by(actor_id=int(actor_id))
    if action:
        query = query.filter(OASAuditLog.action.ilike(f"%{action}%"))
    if entity_type:
        query = query.filter_by(entity_type=entity_type.lower())
    if entity_id:
        query = query.filter_by(entity_id=str(entity_id))
    if start_date:
        query = query.filter(OASAuditLog.created_at >= f"{start_date} 00:00:00")
    if end_date:
        query = query.filter(OASAuditLog.created_at <= f"{end_date} 23:59:59")
    if q:
        query = query.filter(
            (OASAuditLog.action.ilike(f"%{q}%"))
            | (OASAuditLog.entity_type.ilike(f"%{q}%"))
            | (OASAuditLog.actor_name.ilike(f"%{q}%"))
            | (OASAuditLog.ip.ilike(f"%{q}%"))
            | (OASAuditLog.entity_id.ilike(f"%{q}%"))
        )

    # Summary metrics for header cards
    today_start = datetime.utcnow().strftime("%Y-%m-%d 00:00:00")
    total_logs = OASAuditLog.query.count()
    today_logs = OASAuditLog.query.filter(OASAuditLog.created_at >= today_start).count()
    staff_logs = OASAuditLog.query.filter_by(actor_type="staff").count()
    sensitive_actions = OASAuditLog.query.filter(
        OASAuditLog.action.in_([
            "UPDATE_PRICE", "APPROVE_PO", "PAY_PO", "PROCESS_REFUND",
            "APPLY_CLEARANCE", "UPDATE_STAFF_ROLE", "SUSPEND_STAFF", "BLOCK_CUSTOMER"
        ])
    ).count()

    page = max(1, int(request.args.get("page") or 1))
    per_page = min(100, max(5, int(request.args.get("per_page") or 20)))

    pagination = query.order_by(OASAuditLog.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        "data": [log.to_dict() for log in pagination.items],
        "pagination": {
            "total": pagination.total,
            "page": pagination.page,
            "per_page": pagination.per_page,
            "pages": pagination.pages,
        },
        "kpis": {
            "total_logs": total_logs,
            "today_logs": today_logs,
            "staff_logs": staff_logs,
            "sensitive_actions": sensitive_actions,
        }
    })


@admin_bp.get("/audit-logs/export")
@roles_required(ROLE_SUPER_ADMIN)
def export_audit_logs():
    """Ekspor log audit ke format CSV streaming."""
    actor_type = request.args.get("actor_type")
    actor_role = request.args.get("actor_role")
    action = request.args.get("action")
    entity_type = request.args.get("entity_type")
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    q = (request.args.get("q") or "").strip()

    query = OASAuditLog.query

    if actor_type:
        query = query.filter_by(actor_type=actor_type)
    if actor_role:
        query = query.filter_by(actor_role=actor_role)
    if action:
        query = query.filter(OASAuditLog.action.ilike(f"%{action}%"))
    if entity_type:
        query = query.filter_by(entity_type=entity_type.lower())
    if start_date:
        query = query.filter(OASAuditLog.created_at >= f"{start_date} 00:00:00")
    if end_date:
        query = query.filter(OASAuditLog.created_at <= f"{end_date} 23:59:59")
    if q:
        query = query.filter(
            (OASAuditLog.action.ilike(f"%{q}%"))
            | (OASAuditLog.entity_type.ilike(f"%{q}%"))
            | (OASAuditLog.actor_name.ilike(f"%{q}%"))
            | (OASAuditLog.ip.ilike(f"%{q}%"))
        )

    logs = query.order_by(OASAuditLog.created_at.desc()).limit(50000).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Log ID", "Waktu (UTC)", "Actor Type", "Nama Aktor", "Role Aktor",
        "Aksi", "Tipe Entitas", "ID Entitas", "IP Address", "User Agent",
        "Before JSON", "After JSON"
    ])

    for l in logs:
        writer.writerow([
            l.id,
            l.created_at.strftime("%Y-%m-%d %H:%M:%S") if l.created_at else "",
            l.actor_type,
            l.actor_name or "",
            l.actor_role or "",
            l.action,
            l.entity_type,
            l.entity_id or "",
            l.ip or "",
            l.user_agent or "",
            json.dumps(l.before_json, ensure_ascii=False) if l.before_json else "",
            json.dumps(l.after_json, ensure_ascii=False) if l.after_json else "",
        ])

    csv_data = output.getvalue()
    filename = f"audit_logs_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"

    # Catat aksi ekspor ke audit log juga
    log_action(
        action="EXPORT_AUDIT_LOGS",
        entity_type="audit_log",
        entity_id="export",
        after={"rows_exported": len(logs), "filename": filename},
    )

    return Response(
        csv_data,
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# ===========================================================================
# 4. Alias Route KMS Articles under /api/admin/kms/articles
# ===========================================================================
from .kms import admin_articles, admin_create_article, admin_update_article, admin_delete_article

admin_bp.add_url_rule("/kms/articles", view_func=admin_articles, methods=["GET"])
admin_bp.add_url_rule("/kms/articles", view_func=admin_create_article, methods=["POST"])
admin_bp.add_url_rule("/kms/articles/<int:id>", view_func=admin_update_article, methods=["PUT"])
admin_bp.add_url_rule("/kms/articles/<int:id>", view_func=admin_delete_article, methods=["DELETE"])
