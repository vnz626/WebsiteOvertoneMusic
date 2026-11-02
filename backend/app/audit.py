"""
Audit Logging Helper (Fitur 1.1 OAS Audit Log)
Mencatat seluruh aksi sensitif sistem secara append-only.
"""
import json
import logging
from datetime import datetime, date
from decimal import Decimal
from flask import request, has_request_context
from flask_jwt_extended import verify_jwt_in_request

from .extensions import db
from .models.models import OASAuditLog, OASStaff, TPSCustomer
from .security import current_user

logger = logging.getLogger(__name__)


def _json_serial(obj):
    """JSON serializer fallback for objects not serializable by default json code."""
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    if isinstance(obj, Decimal):
        return float(obj)
    if hasattr(obj, "to_dict"):
        return obj.to_dict()
    return str(obj)


def _sanitize_data(data):
    """Deep sanitize and JSON-convert dictionaries/objects."""
    if data is None:
        return None
    try:
        # Round-trip through json to ensure valid JSON-safe primitives
        serialized = json.dumps(data, default=_json_serial)
        return json.loads(serialized)
    except Exception as e:
        logger.warning(f"Failed to sanitize audit log payload: {e}")
        return {"raw": str(data)}


def log_action(
    action: str,
    entity_type: str,
    entity_id=None,
    before=None,
    after=None,
    actor_override=None,
    ip_override=None,
    user_agent_override=None,
):
    """
    Catat aktivitas sensitif ke tabel oas__audit_logs.

    :param action: Nama aksi (e.g. 'UPDATE_PRICE', 'APPROVE_PO', 'PAY_PO', 'LOGIN_SUCCESS')
    :param entity_type: Jenis entitas (e.g. 'product', 'purchase_order', 'staff', 'clearance_tier')
    :param entity_id: ID entitas terkait
    :param before: State data sebelum aksi (dict/object)
    :param after: State data sesudah aksi (dict/object)
    :param actor_override: Opsional dict/object actor jika dipanggil di luar JWT context (e.g. sistem/login)
    """
    try:
        actor_type = "system"
        actor_id = None
        actor_role = None
        actor_name = None

        # 1. Cek actor_override jika diberikan secara eksplisit
        if actor_override:
            if isinstance(actor_override, dict):
                actor_type = actor_override.get("type", "staff")
                actor_id = actor_override.get("id")
                actor_role = actor_override.get("role")
                actor_name = actor_override.get("name")
            elif hasattr(actor_override, "role"):
                actor_id = getattr(actor_override, "id", None)
                actor_role = getattr(actor_override, "role", "staff")
                actor_name = getattr(actor_override, "name", str(actor_override))
                actor_type = "staff" if isinstance(actor_override, OASStaff) else "customer"

        # 2. Ambil dari sesi JWT aktif jika ada request context
        elif has_request_context():
            try:
                # Coba verifikasi JWT tanpa error jika tidak ada token
                verify_jwt_in_request(optional=True)
                user = current_user()
                if user:
                    actor_id = getattr(user, "id", None)
                    actor_role = getattr(user, "role", None)
                    actor_name = getattr(user, "name", None) or getattr(user, "username", None)
                    if isinstance(user, OASStaff):
                        actor_type = "staff"
                    elif isinstance(user, TPSCustomer):
                        actor_type = "customer"
                    else:
                        actor_type = "user"
            except Exception:
                pass

        # 3. Dapatkan IP dan User Agent
        ip = ip_override
        user_agent = user_agent_override
        if has_request_context():
            if not ip:
                ip = (
                    request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
                    or request.remote_addr
                    or "127.0.0.1"
                )
            if not user_agent:
                user_agent = request.user_agent.string if request.user_agent else None

        # 4. Buat record audit log
        log_entry = OASAuditLog(
            actor_type=actor_type,
            actor_id=actor_id,
            actor_role=actor_role,
            actor_name=actor_name,
            action=action.upper(),
            entity_type=entity_type.lower(),
            entity_id=str(entity_id) if entity_id is not None else None,
            before_json=_sanitize_data(before),
            after_json=_sanitize_data(after),
            ip=ip[:45] if ip else None,
            user_agent=user_agent[:1000] if user_agent else None,
            created_at=datetime.utcnow(),
        )

        db.session.add(log_entry)
        db.session.commit()
        return log_entry
    except Exception as e:
        logger.error(f"Gagal mencatat audit log: {e}", exc_info=True)
        try:
            db.session.rollback()
        except Exception:
            pass
        return None
