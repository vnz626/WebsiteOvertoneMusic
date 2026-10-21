"""Area promoter: CRUD event miliknya sendiri, kelola tier, scan tiket, dan request payout."""
from datetime import datetime

from flask import Blueprint, jsonify, request

from ..extensions import db
from ..models.models import Event, Organizer, Payout, SystemSetting, TicketTier, Transaction
from ..notifications import notify_role
from ..security import ROLE_PROMOTER, ROLE_SUPER_ADMIN, current_role, current_user, roles_required
from ..serializers import event_to_dict, payout_to_dict, transaction_to_dict

promoter_bp = Blueprint("promoter", __name__)


def _visible_events_query():
    user = current_user()
    query = Event.query
    if current_role() != ROLE_SUPER_ADMIN:
        from ..models.models import Organizer
        user_org_ids = [o.id for o in Organizer.query.filter_by(user_id=user.id).all()]
        if user_org_ids:
            query = query.filter((Event.created_by == user.id) | (Event.organizer_id.in_(user_org_ids)))
        else:
            query = query.filter_by(created_by=user.id)
    return query


def _parse_date(value):
    if not value:
        return None
    try:
        return datetime.strptime(str(value)[:10], "%Y-%m-%d").date()
    except ValueError:
        return None


@promoter_bp.get("/events")
@roles_required(ROLE_PROMOTER, ROLE_SUPER_ADMIN)
def list_events():
    status = request.args.get("status")
    query = _visible_events_query()
    if status:
        if status == "pending":
            query = query.filter((Event.approval_status == "pending_review") | (Event.status == "pending"))
        elif status == "approved" or status == "published":
            query = query.filter((Event.approval_status == "published") | (Event.status == "approved") | (Event.status == "published"))
        else:
            query = query.filter((Event.approval_status == status) | (Event.status == status))
    items = query.order_by(Event.created_at.desc()).all()
    return jsonify({"data": [event_to_dict(e, detail=True) for e in items], "total": len(items)})


@promoter_bp.get("/stats")
@roles_required(ROLE_PROMOTER, ROLE_SUPER_ADMIN)
def stats():
    items = _visible_events_query().all()
    gross = sum(e.gross_revenue for e in items)

    fee_setting = SystemSetting.get("platform_fee_percent", "5.0")
    try:
        fee_pct = float(fee_setting) / 100.0
    except (ValueError, TypeError):
        fee_pct = 0.05

    platform_rev = int(round(gross * fee_pct))
    promoter_rev = gross - platform_rev

    return jsonify(
        {
            "data": {
                "total_events": len(items),
                "approved_events": sum(
                    1 for e in items
                    if e.approval_status == "published" or e.status in ("approved", "published")
                ),
                "pending_events": sum(
                    1 for e in items
                    if e.approval_status == "pending_review" or e.status == "pending"
                ),
                "rejected_events": sum(
                    1 for e in items
                    if e.approval_status == "rejected" or e.status == "rejected"
                ),
                "tickets_sold": sum(e.tickets_sold for e in items),
                "revenue": promoter_rev,
                "promoter_revenue": promoter_rev,
                "gross_revenue": gross,
                "platform_revenue": platform_rev,
            }
        }
    )


@promoter_bp.post("/events")
@roles_required(ROLE_PROMOTER, ROLE_SUPER_ADMIN)
def create_event():
    data = request.get_json(silent=True) or {}
    user = current_user()

    name = (data.get("name") or "").strip()
    event_date = _parse_date(data.get("event_date"))
    if not name or not event_date:
        return jsonify({"message": "Nama event dan tanggal (YYYY-MM-DD) wajib diisi"}), 400

    try:
        price = int(data.get("price") or 0)
        quota = int(data.get("quota") or 0)
    except (TypeError, ValueError):
        return jsonify({"message": "Harga dan kuota harus berupa angka"}), 400
    if price < 0 or quota < 0:
        return jsonify({"message": "Harga dan kuota tidak boleh negatif"}), 400

    # Cari organizer milik user jika ada
    org = Organizer.query.filter_by(user_id=user.id, kyc_status="approved").first()
    organizer_id = data.get("organizer_id") or (org.id if org else None)
    venue_id = data.get("venue_id")

    event = Event(
        name=name,
        description=data.get("description"),
        category=data.get("category") or "Guitars",
        sku_prefix=data.get("sku_prefix"),
        instrument_type=data.get("instrument_type") or "Electric Guitar",
        specifications=data.get("specifications"),
        warranty_months=int(data.get("warranty_months") or 12),
        location=data.get("location") or "Swee Lee Jakarta Flagship",
        city=data.get("city") or "Jakarta Selatan",
        venue_id=venue_id,
        venue_map_url=data.get("venue_map_url"),
        image_url=data.get("image_url"),
        event_date=event_date,
        event_time=data.get("event_time"),
        organizer=organizer_name,
        organizer_id=organizer_id,
        instagram_url=data.get("instagram_url"),
        price=price,
        quota=quota,
        approval_status="pending_review",
        status="pending",
        created_by=user.id,
    )
    db.session.add(event)
    db.session.commit()
    return jsonify({
        "message": "Katalog instrumen musik berhasil diajukan, menunggu review Manager",
        "data": event_to_dict(event, detail=True)
    }), 201


@promoter_bp.put("/events/<int:event_id>")
@roles_required(ROLE_PROMOTER, ROLE_SUPER_ADMIN)
def update_event(event_id):
    event = _visible_events_query().filter_by(id=event_id).first()
    if not event:
        return jsonify({"message": "Event tidak ditemukan"}), 404

    data = request.get_json(silent=True) or {}
    for field in ("name", "description", "category", "location", "city", "venue_map_url",
                  "image_url", "event_time", "organizer", "instagram_url"):
        if field in data:
            setattr(event, field, data[field])
    if "event_date" in data:
        parsed = _parse_date(data["event_date"])
        if not parsed:
            return jsonify({"message": "Format tanggal harus YYYY-MM-DD"}), 400
        event.event_date = parsed
    for field in ("price", "quota"):
        if field in data:
            try:
                setattr(event, field, int(data[field]))
            except (TypeError, ValueError):
                return jsonify({"message": f"{field} harus berupa angka"}), 400

    # Event yang sudah ditolak lalu diperbaiki, kembali ke antrean review
    if event.approval_status == "rejected" or event.status == "rejected":
        event.approval_status = "pending_review"
        event.status = "pending"
        event.rejection_note = None

    db.session.commit()
    return jsonify({"message": "Event diperbarui", "data": event_to_dict(event, detail=True)})


@promoter_bp.delete("/events/<int:event_id>")
@roles_required(ROLE_PROMOTER, ROLE_SUPER_ADMIN)
def delete_event(event_id):
    event = _visible_events_query().filter_by(id=event_id).first()
    if not event:
        return jsonify({"message": "Event tidak ditemukan"}), 404
    if event.tickets_sold > 0:
        return jsonify({"message": "Event sudah ada tiket terjual, tidak bisa dihapus"}), 400
    db.session.delete(event)
    db.session.commit()
    return jsonify({"message": "Event dihapus"})


# ===========================================================================
# Ticket Tiers Management
# ===========================================================================

@promoter_bp.get("/events/<int:event_id>/tiers")
@roles_required(ROLE_PROMOTER, ROLE_SUPER_ADMIN)
def list_tiers(event_id):
    event = _visible_events_query().filter_by(id=event_id).first()
    if not event:
        return jsonify({"message": "Event tidak ditemukan"}), 404
    rows = TicketTier.query.filter_by(event_id=event_id).all()
    return jsonify({
        "data": [{
            "id": x.id,
            "tier_name": x.tier_name,
            "price": x.price,
            "quota": x.quota,
            "tickets_sold": x.tickets_sold,
            "remaining_quota": x.remaining_quota,
        } for x in rows]
    })


@promoter_bp.post("/events/<int:event_id>/tiers")
@roles_required(ROLE_PROMOTER, ROLE_SUPER_ADMIN)
def add_tier(event_id):
    event = _visible_events_query().filter_by(id=event_id).first()
    if not event:
        return jsonify({"message": "Event tidak ditemukan"}), 404
    data = request.get_json(silent=True) or {}
    name = (data.get("tier_name") or "").strip()
    if not name:
        return jsonify({"message": "Nama tier wajib diisi"}), 400
    try:
        price = int(data.get("price") or 0)
        quota = int(data.get("quota") or 0)
    except (TypeError, ValueError):
        return jsonify({"message": "Harga dan kuota harus berupa angka"}), 400
    if price < 0 or quota < 0:
        return jsonify({"message": "Harga dan kuota tidak boleh negatif"}), 400

    sku_code = data.get("sku_code") or f"SKU-{event_id}-{name[:3].upper()}"
    color_finish = data.get("color_finish")
    cost_price = int(data.get("cost_price") or 0)
    try:
        weight_kg = float(data.get("weight_kg") or 3.5)
    except (TypeError, ValueError):
        weight_kg = 3.5

    tier = TicketTier(
        event_id=event_id,
        tier_name=name,
        price=price,
        quota=quota,
        sku_code=sku_code,
        color_finish=color_finish,
        cost_price=cost_price,
        weight_kg=weight_kg,
    )
    db.session.add(tier)
    db.session.commit()
    return jsonify({
        "message": "Varian instrumen berhasil ditambahkan",
        "data": {
            "id": tier.id,
            "tier_name": tier.tier_name,
            "sku_code": tier.sku_code,
            "color_finish": tier.color_finish,
            "cost_price": tier.cost_price,
            "weight_kg": float(tier.weight_kg),
            "price": tier.price,
            "quota": tier.quota,
            "tickets_sold": tier.tickets_sold,
            "remaining_quota": tier.remaining_quota,
        }
    }), 201


@promoter_bp.put("/tiers/<int:tier_id>")
@roles_required(ROLE_PROMOTER, ROLE_SUPER_ADMIN)
def update_tier(tier_id):
    tier = TicketTier.query.get(tier_id)
    if not tier:
        return jsonify({"message": "Tier tidak ditemukan"}), 404

    event = _visible_events_query().filter_by(id=tier.event_id).first()
    if not event:
        return jsonify({"message": "Akses ditolak"}), 403

    data = request.get_json(silent=True) or {}
    if "tier_name" in data:
        name = (data.get("tier_name") or "").strip()
        if not name:
            return jsonify({"message": "Nama tier tidak boleh kosong"}), 400
        tier.tier_name = name
    if "sku_code" in data:
        tier.sku_code = data["sku_code"]
    if "color_finish" in data:
        tier.color_finish = data["color_finish"]
    if "cost_price" in data:
        tier.cost_price = int(data["cost_price"] or 0)
    if "weight_kg" in data:
        tier.weight_kg = float(data["weight_kg"] or 3.5)
    if "price" in data:
        try:
            tier.price = max(0, int(data["price"]))
        except (TypeError, ValueError):
            return jsonify({"message": "Harga harus berupa angka"}), 400
    if "quota" in data:
        try:
            tier.quota = max(0, int(data["quota"]))
        except (TypeError, ValueError):
            return jsonify({"message": "Kuota harus berupa angka"}), 400

    db.session.commit()
    return jsonify({
        "message": "Tier diperbarui",
        "data": {
            "id": tier.id,
            "tier_name": tier.tier_name,
            "price": tier.price,
            "quota": tier.quota,
            "tickets_sold": tier.tickets_sold,
            "remaining_quota": tier.remaining_quota,
        }
    })


@promoter_bp.delete("/tiers/<int:tier_id>")
@roles_required(ROLE_PROMOTER, ROLE_SUPER_ADMIN)
def delete_tier(tier_id):
    tier = TicketTier.query.get(tier_id)
    if not tier:
        return jsonify({"message": "Tier tidak ditemukan"}), 404
    event = _visible_events_query().filter_by(id=tier.event_id).first()
    if not event:
        return jsonify({"message": "Akses ditolak"}), 403
    if tier.tickets_sold > 0:
        return jsonify({"message": "Tier sudah ada tiket terjual, tidak bisa dihapus"}), 400
    db.session.delete(tier)
    db.session.commit()
    return jsonify({"message": "Tier dihapus"})


# ===========================================================================
# Ticket Scanner (Check-in Hari H)
# ===========================================================================

@promoter_bp.post("/scan-ticket")
@roles_required(ROLE_PROMOTER, ROLE_SUPER_ADMIN)
def scan_ticket():
    data = request.get_json(silent=True) or {}
    code = (data.get("ticket_code") or data.get("invoice_code") or data.get("code") or "").strip()
    if not code:
        return jsonify({"message": "Kode tiket / barcode wajib dimasukkan"}), 400

    trx = Transaction.query.filter(
        (Transaction.ticket_code == code) | (Transaction.invoice_code == code)
    ).first()

    if not trx:
        return jsonify({"message": "Tiket tidak ditemukan dalam sistem", "valid": False}), 404

    user = current_user()
    if user.role != ROLE_SUPER_ADMIN:
        is_owner = (trx.event.created_by == user.id) or (
            trx.event.organizer_rel and trx.event.organizer_rel.user_id == user.id
        )
        if not is_owner:
            return jsonify({"message": "Tiket ini untuk event milik promotor lain", "valid": False}), 403

    if trx.status == "used":
        return jsonify({
            "message": "TIKET SUDAH DIGUNAKAN! Tiket ini sudah pernah di-scan sebelumnya.",
            "data": transaction_to_dict(trx),
            "valid": False,
        }), 400

    if trx.status != "paid":
        return jsonify({
            "message": f"Tiket belum valid (status: {trx.status}). Belum lunas.",
            "data": transaction_to_dict(trx),
            "valid": False,
        }), 400

    # Check-in berhasil
    trx.status = "used"
    db.session.commit()

    return jsonify({
        "message": "CHECK-IN BERHASIL! Tiket valid dan terverifikasi.",
        "valid": True,
        "data": transaction_to_dict(trx),
    })


# ===========================================================================
# Payout Request ke Finance
# ===========================================================================

@promoter_bp.get("/events/<int:event_id>/payout-summary")
@roles_required(ROLE_PROMOTER, ROLE_SUPER_ADMIN)
def event_payout_summary(event_id):
    event = _visible_events_query().filter_by(id=event_id).first()
    if not event:
        return jsonify({"message": "Event tidak ditemukan"}), 404

    gross = float(event.gross_revenue)
    fee_setting = SystemSetting.get("platform_fee_percent", "5.0")
    try:
        fee_pct = float(fee_setting)
    except (ValueError, TypeError):
        fee_pct = 5.0
    fee_amount = round(gross * (fee_pct / 100.0), 2)
    net_payout = round(gross - fee_amount, 2)

    existing = Payout.query.filter_by(event_id=event.id).order_by(Payout.id.desc()).first()
    can_request = gross > 0 and (not existing or existing.status == "rejected")

    return jsonify({
        "event_id": event.id,
        "event_name": event.name,
        "gross_revenue": gross,
        "platform_fee_percent": fee_pct,
        "platform_fee_amount": fee_amount,
        "net_payout_amount": net_payout,
        "tickets_sold": event.tickets_sold,
        "can_request": can_request,
        "existing_payout": payout_to_dict(existing) if existing else None,
    })


@promoter_bp.post("/events/<int:event_id>/request-payout")
@roles_required(ROLE_PROMOTER, ROLE_SUPER_ADMIN)
def request_payout(event_id):
    event = _visible_events_query().filter_by(id=event_id).first()
    if not event:
        return jsonify({"message": "Event tidak ditemukan"}), 404

    gross = float(event.gross_revenue)
    if gross <= 0:
        return jsonify({"message": "Belum ada tiket terjual untuk event ini"}), 400

    existing = Payout.query.filter_by(event_id=event.id).filter(
        Payout.status.in_(["requested", "approved", "transferred"])
    ).first()
    if existing:
        return jsonify({"message": f"Sudah ada pengajuan pencairan dana berstatus '{existing.status}'"}), 400

    fee_setting = SystemSetting.get("platform_fee_percent", "5.0")
    try:
        fee_pct = float(fee_setting)
    except (ValueError, TypeError):
        fee_pct = 5.0
    fee_amount = round(gross * (fee_pct / 100.0), 2)
    net_payout = round(gross - fee_amount, 2)

    user = current_user()
    payout = Payout(
        event_id=event.id,
        organizer_id=event.organizer_id,
        promoter_user_id=user.id,
        gross_amount=gross,
        platform_fee_percentage=fee_pct,
        platform_fee_amount=fee_amount,
        net_payout_amount=net_payout,
        status="requested",
    )
    db.session.add(payout)
    db.session.commit()

    notify_role(
        "finance", "payout_requested",
        f"Permintaan Payout: {event.name}",
        f"Promoter {user.name} mengajukan payout sebesar Rp{int(net_payout):,} untuk event '{event.name}'.".replace(",", "."),
        link="/finance/dashboard",
    )

    return jsonify({
        "message": "Permintaan pencairan dana berhasil diajukan ke tim Finance",
        "data": payout_to_dict(payout),
    }), 201


@promoter_bp.get("/payouts")
@roles_required(ROLE_PROMOTER, ROLE_SUPER_ADMIN)
def list_promoter_payouts():
    user = current_user()
    query = Payout.query
    if user.role != ROLE_SUPER_ADMIN:
        query = query.filter_by(promoter_user_id=user.id)
    items = query.order_by(Payout.created_at.desc()).all()
    return jsonify({"data": [payout_to_dict(p) for p in items], "total": len(items)})
