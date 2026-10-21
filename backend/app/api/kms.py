"""KMS (Knowledge Management System) API untuk Pusat Pengetahuan & Panduan Alat Musik Swee Lee."""
from datetime import datetime
from flask import Blueprint, jsonify, request

from ..extensions import db
from ..models.models import KMSCategory, KMSArticle, KMSFAQ, OASAnnouncement, OASSupportTicket, OASSupportMessage, TPSCustomer
from ..security import ROLE_SUPER_ADMIN, current_user, roles_required

kms_bp = Blueprint("kms", __name__)


def _article_dict(a: KMSArticle, detail: bool = False) -> dict:
    d = {
        "id": a.id,
        "title": a.title,
        "slug": a.slug,
        "category_id": a.category_id,
        "status": "published" if a.is_published else "draft",
        "is_published": a.is_published,
        "view_count": a.view_count,
        "helpful_count": a.helpful_count,
        "excerpt": a.excerpt,
        "created_at": a.created_at.isoformat() if a.created_at else None,
        "author_staff_id": a.author_staff_id,
        "author_name": a.author.name if a.author else "Swee Lee Gear Expert",
    }
    if detail:
        d["content"] = a.content
    return d


def _faq_dict(f: KMSFAQ) -> dict:
    return {
        "id": f.id,
        "category_id": f.category_id,
        "question": f.question,
        "answer": f.answer,
        "status": "active" if f.is_active else "inactive",
        "is_active": f.is_active,
        "created_at": f.created_at.isoformat() if f.created_at else None,
    }


def _cat_dict(c: KMSCategory) -> dict:
    return {
        "id": c.id,
        "name": c.name,
        "slug": c.slug,
        "description": c.description,
        "icon": c.icon,
        "is_active": c.is_active,
    }


# ===========================================================================
# PUBLIK
# ===========================================================================

@kms_bp.get("/categories")
def categories():
    return jsonify({"data": [_cat_dict(c) for c in KMSCategory.query.filter_by(is_active=True).all()]})


@kms_bp.get("/articles")
def articles():
    q = request.args.get("q")
    query = KMSArticle.query.filter_by(is_published=True)
    if q:
        query = query.filter(KMSArticle.title.ilike(f"%{q}%"))
    rows = query.order_by(KMSArticle.created_at.desc()).all()
    return jsonify({"data": [_article_dict(a, detail=True) for a in rows]})


@kms_bp.get("/articles/<int:article_id>")
def article_detail(article_id):
    a = KMSArticle.query.get_or_404(article_id)
    if not a.is_published:
        return jsonify({"message": "Artikel tidak tersedia"}), 404
    a.view_count = (a.view_count or 0) + 1
    db.session.commit()
    return jsonify({"data": _article_dict(a, detail=True)})


@kms_bp.get("/faqs")
def faqs():
    rows = KMSFAQ.query.filter_by(is_active=True).all()
    return jsonify({"data": [_faq_dict(f) for f in rows]})


@kms_bp.post("/support")
def create_support():
    user = current_user()
    data = request.json or {}
    subject = data.get("subject") or "Pertanyaan Produk"
    desc = data.get("description") or data.get("message") or ""

    ticket_num = f"TICK-{datetime.utcnow().strftime('%Y%m%d')}-{a_hex[:4].upper() if (a_hex := datetime.utcnow().strftime('%f')) else '0001'}"
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


@kms_bp.get("/announcements")
@kms_bp.get("/announcements/<int:id>")
def announcements(id=None):
    rows = OASAnnouncement.query.filter_by(is_active=True).all()
    return jsonify({"data": [{"title": a.title, "content": a.content} for a in rows]})


# ===========================================================================
# ADMIN (Super Admin KMS Management)
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
@roles_required(ROLE_SUPER_ADMIN)
def admin_articles():
    rows = KMSArticle.query.order_by(KMSArticle.created_at.desc()).all()
    return jsonify({"data": [_article_dict(a, detail=False) for a in rows]})


@kms_bp.post("/admin/articles")
@roles_required(ROLE_SUPER_ADMIN)
def admin_create_article():
    user = current_user()
    data = request.json or {}
    title = (data.get("title") or "").strip()
    slug = (data.get("slug") or title.lower().replace(" ", "-")).strip()
    a = KMSArticle(
        category_id=int(data.get("category_id")),
        title=title,
        slug=slug,
        content=data.get("content") or "",
        excerpt=data.get("excerpt"),
        author_staff_id=user.id,
        is_published=data.get("status") == "published" or data.get("is_published", True),
    )
    db.session.add(a)
    db.session.commit()
    return jsonify({"data": _article_dict(a, detail=True)}), 201


@kms_bp.put("/admin/articles/<int:id>")
@roles_required(ROLE_SUPER_ADMIN)
def admin_update_article(id):
    a = KMSArticle.query.get_or_404(id)
    data = request.json or {}
    if "title" in data:
        a.title = data["title"]
    if "content" in data:
        a.content = data["content"]
    if "excerpt" in data:
        a.excerpt = data["excerpt"]
    if "status" in data:
        a.is_published = data["status"] == "published"
    db.session.commit()
    return jsonify({"data": _article_dict(a, detail=True)})


@kms_bp.delete("/admin/articles/<int:id>")
@roles_required(ROLE_SUPER_ADMIN)
def admin_delete_article(id):
    a = KMSArticle.query.get_or_404(id)
    db.session.delete(a)
    db.session.commit()
    return jsonify({"message": "Artikel dihapus"})


@kms_bp.get("/admin/faqs")
@roles_required(ROLE_SUPER_ADMIN)
def admin_faqs():
    rows = KMSFAQ.query.order_by(KMSFAQ.created_at.desc()).all()
    return jsonify({"data": [_faq_dict(f) for f in rows]})


@kms_bp.post("/admin/faqs")
@roles_required(ROLE_SUPER_ADMIN)
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
@roles_required(ROLE_SUPER_ADMIN)
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
@roles_required(ROLE_SUPER_ADMIN)
def admin_delete_faq(id):
    f = KMSFAQ.query.get_or_404(id)
    db.session.delete(f)
    db.session.commit()
    return jsonify({"message": "FAQ dihapus"})
