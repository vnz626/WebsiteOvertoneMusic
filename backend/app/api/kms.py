"""
KMS (Knowledge Management System) API:
Dual-Scope Knowledge Management System:
1. Customer Knowledge Base: Panduan publik filmmaker, FAQ, dan tips cinema gear (audience_type='customer').
2. Internal Staff SOP: Dokumen SOP operasional khusus divisi internal OAS (audience_type='internal').
"""
import uuid
from datetime import datetime
from flask import Blueprint, jsonify, request
from flask_jwt_extended import verify_jwt_in_request

from ..extensions import db
from ..models.models import (
    KMSCategory,
    KMSArticle,
    KMSSopAcknowledgement,
    KMSFAQ,
    OASAnnouncement,
    OASSupportTicket,
    OASSupportMessage,
    TPSCustomer,
    OASStaff,
)
from ..security import (
    ROLE_SUPER_ADMIN,
    ROLE_MANAGER,
    ROLE_FINANCE,
    ROLE_WAREHOUSE_STAFF,
    ROLE_STORE_STAFF,
    current_user,
    roles_required,
)
from ..audit import log_action

kms_bp = Blueprint("kms", __name__)


def _article_dict(a: KMSArticle, detail: bool = False, staff_id: int = None) -> dict:
    current_version = getattr(a, "version", 1) or 1
    d = {
        "id": a.id,
        "title": a.title,
        "slug": a.slug,
        "category_id": a.category_id,
        "category_name": a.category_rel.name if a.category_rel else None,
        "audience_type": getattr(a, "audience_type", "customer") or "customer",
        "version": current_version,
        "target_role": getattr(a, "target_role", "public") or "public",
        "sop_code": getattr(a, "sop_code", None),
        "priority_level": getattr(a, "priority_level", "standard") or "standard",
        "status": "published" if a.is_published else "draft",
        "is_published": bool(a.is_published),
        "view_count": a.view_count or 0,
        "helpful_count": a.helpful_count or 0,
        "excerpt": a.excerpt or "",
        "created_at": a.created_at.isoformat() if a.created_at else None,
        "updated_at": a.updated_at.isoformat() if a.updated_at else None,
        "author_staff_id": a.author_staff_id,
        "author_name": a.author.name if a.author else "Overtone Gear Specialist",
    }
    if staff_id and d["audience_type"] == "internal":
        ack = KMSSopAcknowledgement.query.filter_by(
            staff_id=staff_id,
            article_id=a.id,
            article_version=current_version,
        ).first()
        d["acknowledged"] = ack is not None
        d["acknowledged_at"] = ack.acknowledged_at.isoformat() if ack else None

        if not ack:
            prev_ack = KMSSopAcknowledgement.query.filter_by(
                staff_id=staff_id,
                article_id=a.id,
            ).filter(KMSSopAcknowledgement.article_version < current_version).order_by(KMSSopAcknowledgement.article_version.desc()).first()
            d["needs_reack"] = prev_ack is not None
            d["previous_ack_version"] = prev_ack.article_version if prev_ack else None
        else:
            d["needs_reack"] = False
            d["previous_ack_version"] = None

    if detail:
        d["content"] = a.content or ""
    return d


def _faq_dict(f: KMSFAQ) -> dict:
    return {
        "id": f.id,
        "category_id": f.category_id,
        "question": f.question,
        "answer": f.answer,
        "status": "active" if f.is_active else "inactive",
        "is_active": bool(f.is_active),
        "created_at": f.created_at.isoformat() if f.created_at else None,
    }


def _cat_dict(c: KMSCategory) -> dict:
    return {
        "id": c.id,
        "name": c.name,
        "slug": c.slug,
        "description": c.description,
        "icon": c.icon,
        "is_active": bool(c.is_active),
    }


# ===========================================================================
# 1. PUBLIK (Customer Knowledge Base - Dilarang Membocorkan SOP Internal)
# ===========================================================================

@kms_bp.get("/categories")
def categories():
    return jsonify({"data": [_cat_dict(c) for c in KMSCategory.query.filter_by(is_active=True).all()]})


@kms_bp.get("/articles")
@kms_bp.get("/public-articles")
def public_articles():
    """
    Katalog artikel publik untuk filmmaker dan pelanggan.
    HANYA mengembalikan artikel dengan audience_type == 'customer' dan is_published == True.
    SOP internal staf dilarang keras tampil di sini!
    """
    q = request.args.get("q")
    category_id = request.args.get("category_id")

    query = KMSArticle.query.filter(
        KMSArticle.audience_type == "customer",
        KMSArticle.is_published == True,
    )
    if category_id:
        query = query.filter_by(category_id=int(category_id))
    if q:
        query = query.filter(KMSArticle.title.ilike(f"%{q}%"))

    rows = query.order_by(KMSArticle.created_at.desc()).all()
    return jsonify({"data": [_article_dict(a, detail=True) for a in rows], "total": len(rows)})


@kms_bp.get("/articles/<int:article_id>")
def article_detail(article_id):
    """Detail artikel panduan. Jika artikel berskala 'internal', verifikasi bahwa pengakses adalah staf."""
    a = KMSArticle.query.get_or_404(article_id)

    if a.audience_type == "internal":
        # Harus login sebagai staf
        try:
            verify_jwt_in_request()
            user = current_user()
            if not isinstance(user, OASStaff):
                return jsonify({"message": "Akses dokumen internal terbatas untuk staf OAS Overtone"}), 403
        except Exception:
            return jsonify({"message": "Dokumen SOP internal memerlukan autentikasi staf"}), 401

    if not a.is_published:
        return jsonify({"message": "Artikel tidak tersedia"}), 404

    a.view_count = (a.view_count or 0) + 1
    db.session.commit()
    return jsonify({"data": _article_dict(a, detail=True)})


@kms_bp.get("/faqs")
def faqs():
    rows = KMSFAQ.query.filter_by(is_active=True).all()
    return jsonify({"data": [_faq_dict(f) for f in rows]})


# ===========================================================================
# 2. INTERNAL STAFF SOP PORTAL (OAS Internal Scope)
# ===========================================================================

@kms_bp.get("/internal-sops")
@roles_required(
    ROLE_SUPER_ADMIN,
    "admin",
    ROLE_MANAGER,
    ROLE_FINANCE,
    ROLE_WAREHOUSE_STAFF,
    ROLE_STORE_STAFF,
    "warehouse",
    "staff",
    "promoter",
)
def get_internal_sops():
    """
    Mengambil dokumen SOP Operasional khusus staf OAS Overtone.
    Otomatis menyaring berdasarkan role user yang sedang login:
    - super_admin / admin / manager: dapat melihat seluruh SOP.
    - warehouse_staff: melihat SOP target_role in ('all_internal', 'warehouse_staff', 'warehouse').
    - store_staff: melihat SOP target_role in ('all_internal', 'store_staff', 'staff').
    - finance: melihat SOP target_role in ('all_internal', 'finance').
    """
    user = current_user()
    role = getattr(user, "role", "staff")

    tab = request.args.get("tab") or "all"
    q = (request.args.get("q") or "").strip()
    category_id = request.args.get("category_id")
    target_role_filter = request.args.get("target_role")

    query = KMSArticle.query.filter(
        KMSArticle.audience_type == "internal",
        KMSArticle.is_published == True,
    )

    # Filter peran staf
    if role not in (ROLE_SUPER_ADMIN, "admin"):
        # Role spesifik: hanya lihat SOP Umum ATAU SOP khusus divisinya
        matched_roles = ["all_internal", "all"]
        if "warehouse" in role:
            matched_roles.extend(["warehouse_staff", "warehouse"])
        elif "store" in role:
            matched_roles.extend(["store_staff", "staff", "promoter"])
        elif "finance" in role:
            matched_roles.append("finance")
        elif "manager" in role:
            matched_roles.append("manager")
        else:
            matched_roles.append(role)

        query = query.filter(KMSArticle.target_role.in_(matched_roles))
    elif target_role_filter and target_role_filter != "all":
        query = query.filter_by(target_role=target_role_filter)

    # Filter Tab
    if tab == "division":
        # Khusus divisinya saja (bukan all_internal)
        query = query.filter(KMSArticle.target_role != "all_internal")
    elif tab == "general":
        # Hanya SOP umum
        query = query.filter_by(target_role="all_internal")
    elif tab == "critical":
        # SOP Mandatory & Critical
        query = query.filter(KMSArticle.priority_level.in_(["mandatory", "critical"]))

    if category_id:
        query = query.filter_by(category_id=int(category_id))

    if q:
        query = query.filter(
            (KMSArticle.title.ilike(f"%{q}%"))
            | (KMSArticle.sop_code.ilike(f"%{q}%"))
            | (KMSArticle.excerpt.ilike(f"%{q}%"))
            | (KMSArticle.content.ilike(f"%{q}%"))
        )

    rows = query.order_by(
        KMSArticle.priority_level.desc(),
        KMSArticle.sop_code.asc(),
        KMSArticle.created_at.desc(),
    ).all()

    staff_id = user.id if isinstance(user, OASStaff) else None
    return jsonify({
        "data": [_article_dict(a, detail=True, staff_id=staff_id) for a in rows],
        "total": len(rows),
        "user_role": role,
    })


@kms_bp.post("/internal-sops/<int:article_id>/acknowledge")
def acknowledge_internal_sop(article_id):
    """Staf OAS menandatangani/mengonfirmasi bahwa telah membaca & memahami SOP versi saat ini."""
    try:
        verify_jwt_in_request()
        user = current_user()
        if not isinstance(user, OASStaff):
            return jsonify({"message": "Hanya staf internal OAS yang dapat mengonfirmasi SOP"}), 403
    except Exception:
        return jsonify({"message": "Diperlukan autentikasi sesi staf"}), 401

    a = KMSArticle.query.get_or_404(article_id)
    if a.audience_type != "internal":
        return jsonify({"message": "Dokumen ini bukan SOP internal"}), 400

    cur_version = getattr(a, "version", 1) or 1
    existing = KMSSopAcknowledgement.query.filter_by(
        staff_id=user.id,
        article_id=a.id,
        article_version=cur_version,
    ).first()

    if not existing:
        ack = KMSSopAcknowledgement(
            staff_id=user.id,
            article_id=a.id,
            article_version=cur_version,
            acknowledged_at=datetime.utcnow(),
        )
        db.session.add(ack)
        db.session.commit()
    else:
        ack = existing

    log_action(
        action="ACKNOWLEDGE_SOP",
        entity_type="kms_sop",
        entity_id=str(a.id),
        after={
            "sop_code": a.sop_code,
            "version": cur_version,
            "staff_name": user.name,
            "staff_id": user.id,
            "acknowledged_at": ack.acknowledged_at.isoformat(),
        },
    )

    return jsonify({
        "message": f"SOP {a.sop_code or a.title} (v{cur_version}) berhasil dikonfirmasi dan tersimpan di database.",
        "data": _article_dict(a, detail=True, staff_id=user.id),
    })


# ===========================================================================
# 3. SUPER ADMIN KMS & SOP MANAGEMENT
# ===========================================================================

@kms_bp.post("/admin/categories")
@roles_required(ROLE_SUPER_ADMIN)
def admin_create_category():
    data = request.json or {}
    name = (data.get("name") or "").strip()
    slug = name.lower().replace(" ", "-")
    c = KMSCategory(name=name, slug=slug, description=data.get("description"), icon=data.get("icon") or "book")
    db.session.add(c)
    db.session.commit()
    return jsonify({"data": _cat_dict(c)}), 201


@kms_bp.delete("/admin/categories/<int:id>")
@roles_required(ROLE_SUPER_ADMIN)
def admin_delete_category(id):
    c = KMSCategory.query.get_or_404(id)
    db.session.delete(c)
    db.session.commit()
    return jsonify({"message": "Kategori dihapus"})


@kms_bp.get("/admin/articles")
@roles_required(ROLE_SUPER_ADMIN, "admin")
def admin_articles():
    """Mengambil daftar seluruh artikel KMS & SOP internal untuk dikelola super_admin."""
    audience = request.args.get("audience_type")
    target_role = request.args.get("target_role")
    category_id = request.args.get("category_id")
    q = (request.args.get("q") or "").strip()

    query = KMSArticle.query
    if audience and audience != "all":
        query = query.filter_by(audience_type=audience)
    if target_role and target_role != "all":
        query = query.filter_by(target_role=target_role)
    if category_id and category_id != "all":
        query = query.filter_by(category_id=int(category_id))
    if q:
        query = query.filter(
            (KMSArticle.title.ilike(f"%{q}%"))
            | (KMSArticle.sop_code.ilike(f"%{q}%"))
            | (KMSArticle.content.ilike(f"%{q}%"))
        )

    rows = query.order_by(KMSArticle.updated_at.desc(), KMSArticle.created_at.desc()).all()
    return jsonify({
        "data": [_article_dict(a, detail=True) for a in rows],
        "total": len(rows),
    })


@kms_bp.post("/admin/articles")
@roles_required(ROLE_SUPER_ADMIN, "admin")
def admin_create_article():
    """Membuat artikel baru (publik maupun SOP internal) dengan metadata lengkap."""
    user = current_user()
    data = request.json or {}
    title = (data.get("title") or "").strip()
    if not title:
        return jsonify({"message": "Judul artikel / SOP wajib diisi"}), 400

    slug = (data.get("slug") or title.lower().replace(" ", "-")).strip()
    # Pastikan slug unik
    base_slug = slug
    counter = 1
    while KMSArticle.query.filter_by(slug=slug).first():
        slug = f"{base_slug}-{counter}"
        counter += 1

    audience_type = data.get("audience_type") or "customer"
    target_role = data.get("target_role") or ("all_internal" if audience_type == "internal" else "public")
    sop_code = (data.get("sop_code") or "").strip() if audience_type == "internal" else None
    priority_level = data.get("priority_level") or "standard"

    cat_id = data.get("category_id")
    if not cat_id:
        # Cari kategori default
        default_cat = KMSCategory.query.first()
        cat_id = default_cat.id if default_cat else 1

    a = KMSArticle(
        category_id=int(cat_id),
        title=title,
        slug=slug,
        audience_type=audience_type,
        target_role=target_role,
        sop_code=sop_code,
        priority_level=priority_level,
        content=data.get("content") or "",
        excerpt=data.get("excerpt") or "",
        author_staff_id=user.id if user else None,
        is_published=data.get("status") == "published" or data.get("is_published", True),
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.session.add(a)
    db.session.commit()
    return jsonify({"message": "Dokumen KMS berhasil disimpan", "data": _article_dict(a, detail=True)}), 201


@kms_bp.put("/admin/articles/<int:id>")
@roles_required(ROLE_SUPER_ADMIN, "admin")
def admin_update_article(id):
    """Memperbarui dokumen artikel publik atau SOP internal. Jika SOP internal diubah, versi dinaikkan."""
    a = KMSArticle.query.get_or_404(id)
    data = request.json or {}

    version_bumped = False
    old_version = getattr(a, "version", 1) or 1

    # Deteksi perubahan materi jika artikel adalah SOP internal
    if a.audience_type == "internal":
        content_changed = "content" in data and (data["content"] or "").strip() != (a.content or "").strip()
        title_changed = "title" in data and (data["title"] or "").strip() != (a.title or "").strip()
        excerpt_changed = "excerpt" in data and (data["excerpt"] or "").strip() != (a.excerpt or "").strip()
        role_changed = "target_role" in data and data["target_role"] != a.target_role
        prio_changed = "priority_level" in data and data["priority_level"] != a.priority_level

        if content_changed or title_changed or excerpt_changed or role_changed or prio_changed:
            a.version = old_version + 1
            version_bumped = True

    if "title" in data:
        a.title = data["title"]
    if "content" in data:
        a.content = data["content"]
    if "excerpt" in data:
        a.excerpt = data["excerpt"]
    if "category_id" in data and data["category_id"]:
        a.category_id = int(data["category_id"])
    if "audience_type" in data:
        a.audience_type = data["audience_type"]
    if "target_role" in data:
        a.target_role = data["target_role"]
    if "sop_code" in data:
        a.sop_code = (data["sop_code"] or "").strip() or None
    if "priority_level" in data:
        a.priority_level = data["priority_level"]
    if "status" in data:
        a.is_published = data["status"] == "published"
    if "is_published" in data:
        a.is_published = bool(data["is_published"])

    a.updated_at = datetime.utcnow()
    db.session.commit()

    if version_bumped:
        user = current_user()
        log_action(
            action="UPDATE_SOP_VERSION",
            entity_type="kms_sop",
            entity_id=str(a.id),
            before={"version": old_version},
            after={"version": a.version, "title": a.title, "updater": user.name if user else "Admin"},
        )

    msg = f"Dokumen KMS diperbarui{' (Versi dinaikkan ke v' + str(a.version) + ')' if version_bumped else ''}."
    return jsonify({"message": msg, "data": _article_dict(a, detail=True), "version_bumped": version_bumped})


@kms_bp.get("/admin/kms/sop-compliance")
@kms_bp.get("/admin/sop-compliance")
@roles_required(ROLE_SUPER_ADMIN, "admin", ROLE_MANAGER)
def get_sop_compliance_report():
    """Laporan matriks kepatuhan pembacaan SOP staf internal (Fitur 1.6)."""
    all_staff = OASStaff.query.filter_by(is_active=True).all()
    all_sops = KMSArticle.query.filter(
        KMSArticle.audience_type == "internal",
        KMSArticle.is_published == True,
    ).all()

    def _role_matches(staff_role, target_role):
        if target_role in ("all_internal", "all", "public"):
            return True
        if "warehouse" in staff_role and target_role in ("warehouse_staff", "warehouse"):
            return True
        if "store" in staff_role and target_role in ("store_staff", "staff", "promoter"):
            return True
        if "finance" in staff_role and target_role == "finance":
            return True
        if "manager" in staff_role and target_role == "manager":
            return True
        return staff_role == target_role

    staff_matrix = []
    total_required_all = 0
    total_ack_all = 0

    for s in all_staff:
        # SOP yang relevan untuk role staf ini
        required_sops = [sop for sop in all_sops if _role_matches(s.role, sop.target_role)]
        req_count = len(required_sops)

        acks = KMSSopAcknowledgement.query.filter_by(staff_id=s.id).all()
        # map article_id -> set of acknowledged versions
        ack_versions = {}
        for ack in acks:
            if ack.article_id not in ack_versions:
                ack_versions[ack.article_id] = []
            ack_versions[ack.article_id].append(ack.article_version)

        ack_count = 0
        missing_sops = []
        outdated_sops = []

        for sop in required_sops:
            cur_ver = getattr(sop, "version", 1) or 1
            user_vers = ack_versions.get(sop.id, [])
            if cur_ver in user_vers:
                ack_count += 1
            elif user_vers:
                outdated_sops.append({
                    "id": sop.id,
                    "sop_code": sop.sop_code,
                    "title": sop.title,
                    "current_version": cur_ver,
                    "ack_version": max(user_vers),
                })
            else:
                missing_sops.append({
                    "id": sop.id,
                    "sop_code": sop.sop_code,
                    "title": sop.title,
                    "current_version": cur_ver,
                    "priority_level": sop.priority_level,
                })

        compliance_rate = round((ack_count / req_count * 100), 1) if req_count > 0 else 100.0
        total_required_all += req_count
        total_ack_all += ack_count

        staff_matrix.append({
            "staff_id": s.id,
            "name": s.name,
            "email": s.email,
            "role": s.role,
            "branch_id": s.branch_id,
            "branch_name": s.branch.name if s.branch else "Headquarters",
            "required_count": req_count,
            "acknowledged_count": ack_count,
            "compliance_rate": compliance_rate,
            "missing_sops": missing_sops,
            "outdated_sops": outdated_sops,
        })

    # Analisis per dokumen SOP
    sop_matrix = []
    for sop in all_sops:
        cur_ver = getattr(sop, "version", 1) or 1
        eligible_staff = [s for s in all_staff if _role_matches(s.role, sop.target_role)]
        eligible_count = len(eligible_staff)

        acks_cur = KMSSopAcknowledgement.query.filter_by(
            article_id=sop.id,
            article_version=cur_ver,
        ).all()
        acked_staff_ids = {a.staff_id for a in acks_cur}

        sop_ack_count = sum(1 for s in eligible_staff if s.id in acked_staff_ids)
        sop_rate = round((sop_ack_count / eligible_count * 100), 1) if eligible_count > 0 else 100.0

        sop_matrix.append({
            "id": sop.id,
            "sop_code": sop.sop_code,
            "title": sop.title,
            "version": cur_ver,
            "priority_level": sop.priority_level,
            "target_role": sop.target_role,
            "eligible_staff_count": eligible_count,
            "acknowledged_count": sop_ack_count,
            "compliance_rate": sop_rate,
        })

    overall_rate = round((total_ack_all / total_required_all * 100), 1) if total_required_all > 0 else 100.0

    return jsonify({
        "data": {
            "summary": {
                "total_staff": len(all_staff),
                "total_sops": len(all_sops),
                "overall_compliance_rate": overall_rate,
                "total_required": total_required_all,
                "total_acknowledged": total_ack_all,
            },
            "staff_matrix": staff_matrix,
            "sop_matrix": sop_matrix,
        }
    })


@kms_bp.delete("/admin/articles/<int:id>")
@roles_required(ROLE_SUPER_ADMIN, "admin")
def admin_delete_article(id):
    """Menghapus artikel atau dokumen SOP KMS."""
    a = KMSArticle.query.get_or_404(id)
    db.session.delete(a)
    db.session.commit()
    return jsonify({"message": f"Dokumen '{a.title}' berhasil dihapus"})


# ===========================================================================
# 4. ADMIN FAQS MANAGEMENT
# ===========================================================================

@kms_bp.get("/admin/faqs")
@roles_required(ROLE_SUPER_ADMIN, "admin")
def admin_faqs():
    rows = KMSFAQ.query.order_by(KMSFAQ.created_at.desc()).all()
    return jsonify({"data": [_faq_dict(f) for f in rows]})


@kms_bp.post("/admin/faqs")
@roles_required(ROLE_SUPER_ADMIN, "admin")
def admin_create_faq():
    data = request.json or {}
    f = KMSFAQ(
        category_id=data.get("category_id"),
        question=data.get("question"),
        answer=data.get("answer"),
        is_active=data.get("status") != "inactive",
    )
    db.session.add(f)
    db.session.commit()
    return jsonify({"data": _faq_dict(f)}), 201


@kms_bp.put("/admin/faqs/<int:id>")
@roles_required(ROLE_SUPER_ADMIN, "admin")
def admin_update_faq(id):
    f = KMSFAQ.query.get_or_404(id)
    data = request.json or {}
    if "question" in data:
        f.question = data["question"]
    if "answer" in data:
        f.answer = data["answer"]
    if "status" in data:
        f.is_active = data["status"] != "inactive"
    db.session.commit()
    return jsonify({"data": _faq_dict(f)})


@kms_bp.delete("/admin/faqs/<int:id>")
@roles_required(ROLE_SUPER_ADMIN, "admin")
def admin_delete_faq(id):
    f = KMSFAQ.query.get_or_404(id)
    db.session.delete(f)
    db.session.commit()
    return jsonify({"message": "FAQ dihapus"})


# ===========================================================================
# 5. ANNOUNCEMENTS & SUPPORT TICKET HELPERS
# ===========================================================================

@kms_bp.get("/announcements")
@kms_bp.get("/announcements/<int:id>")
def announcements(id=None):
    rows = OASAnnouncement.query.filter_by(is_active=True).all()
    return jsonify({"data": [{"title": a.title, "content": a.content} for a in rows]})


@kms_bp.post("/support")
def create_support():
    user = current_user()
    data = request.json or {}
    subject = data.get("subject") or "Pertanyaan Produk"
    desc = data.get("description") or data.get("message") or ""

    ticket_num = f"TICK-{datetime.utcnow().strftime('%Y%m%d%H%M')}-{uuid.uuid4().hex[:4].upper()}"
    t = OASSupportTicket(
        ticket_number=ticket_num,
        customer_id=user.id if isinstance(user, TPSCustomer) else None,
        subject=subject,
        category=data.get("category") or "product_inquiry",
    )
    db.session.add(t)
    db.session.flush()

    db.session.add(
        OASSupportMessage(
            ticket_id=t.id,
            sender_type="customer",
            sender_id=user.id if user else 0,
            sender_name=user.name if user else "Pelanggan",
            message=desc,
        )
    )
    db.session.commit()
    return jsonify({"message": "Tiket bantuan dibuat", "id": t.id}), 201
