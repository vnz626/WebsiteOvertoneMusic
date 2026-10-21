"""
Helper autentikasi & otorisasi RBAC untuk Swee Lee Enterprise Retail & Inventory:
1. OAS Staff: super_admin, manager, finance, warehouse_staff, store_staff
2. TPS Customer: user (musisi / pembeli ritel)
"""
from functools import wraps
from flask import g, jsonify
from flask_jwt_extended import create_access_token, get_jwt_identity, verify_jwt_in_request

from .models.models import OASStaff, TPSCustomer

# --- 6 role RBAC ---
ROLE_SUPER_ADMIN = "super_admin"
ROLE_MANAGER = "manager"
ROLE_FINANCE = "finance"
ROLE_WAREHOUSE_STAFF = "warehouse_staff"
ROLE_STORE_STAFF = "store_staff"
ROLE_USER = "user"

# Alias kompatibilitas
ROLE_ADMIN = ROLE_SUPER_ADMIN
ROLE_PROMOTER = ROLE_STORE_STAFF
ROLE_STAFF = ROLE_STORE_STAFF
ROLE_CUSTOMER = ROLE_USER

ALL_ROLES = (
    ROLE_SUPER_ADMIN,
    ROLE_MANAGER,
    ROLE_FINANCE,
    ROLE_WAREHOUSE_STAFF,
    ROLE_STORE_STAFF,
    ROLE_USER,
)
INTERNAL_ROLES = (
    ROLE_SUPER_ADMIN,
    ROLE_MANAGER,
    ROLE_FINANCE,
    ROLE_WAREHOUSE_STAFF,
    ROLE_STORE_STAFF,
)
BUYER_ROLES = (ROLE_USER, ROLE_STORE_STAFF, ROLE_SUPER_ADMIN)

INSTRUMENT_CATEGORIES = [
    "Electric Guitars",
    "Acoustic Guitars",
    "Bass Guitars",
    "Drums & Percussion",
    "Keyboards & Synths",
    "Amplifiers & Effects",
    "Pro Audio & Studio",
    "Accessories",
]
EVENT_CATEGORIES = INSTRUMENT_CATEGORIES

INDONESIAN_CITIES = [
    "Jakarta Selatan",
    "Jakarta Pusat",
    "Jakarta Barat",
    "Tangerang",
    "Bekasi (Cikarang)",
    "Bandung",
    "Surabaya",
    "Yogyakarta",
    "Bali (Denpasar)",
    "Medan",
]


def make_token(actor, is_staff: bool = False) -> str:
    """Bikin access token JWT dengan prefix identitas 'staff:ID' atau 'customer:ID'."""
    kind = "staff" if (is_staff or isinstance(actor, OASStaff)) else "customer"
    role = getattr(actor, "role", "user")
    return create_access_token(
        identity=f"{kind}:{actor.id}",
        additional_claims={
            "role": role,
            "kind": kind,
            "name": actor.name or actor.username,
            "email": actor.email,
        },
    )


def parse_identity(identity):
    """Menerima 'staff:12', 'customer:5', atau '12' -> (kind, id)."""
    if identity is None:
        return None, None
    s = str(identity).strip()
    if not s:
        return None, None
    if ":" in s:
        kind, _, raw_id = s.partition(":")
    else:
        kind, raw_id = "user", s
    try:
        return kind, int(raw_id)
    except ValueError:
        return None, None


def current_user():
    """Ambil akun aktif (OASStaff atau TPSCustomer) dari JWT token."""
    if hasattr(g, "current_user") and g.current_user is not None:
        return g.current_user
    try:
        raw_identity = get_jwt_identity()
    except Exception:
        return None
    kind, actor_id = parse_identity(raw_identity)
    if actor_id is None:
        return None

    if kind == "staff":
        g.current_user = OASStaff.query.get(actor_id)
    elif kind == "customer":
        g.current_user = TPSCustomer.query.get(actor_id)
    else:
        # Fallback check staff then customer
        staff = OASStaff.query.get(actor_id)
        g.current_user = staff if staff else TPSCustomer.query.get(actor_id)

    return g.current_user


def current_actor():
    user = current_user()
    if user is None:
        return None, None
    return user.role, user


def current_role():
    user = current_user()
    return user.role if user else ""


def roles_required(*roles):
    """Batasi endpoint untuk role tertentu.
    Tanpa argumen = cukup login (semua role). Selalu menolak akun non-aktif (`is_active = False`).
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            user = current_user()
            if user is None:
                return jsonify({"message": "Sesi tidak valid, silakan login ulang"}), 401
            if not user.is_active:
                return jsonify({"message": "Akun dinonaktifkan. Hubungi administrator."}), 403
            if roles and user.role not in roles:
                return jsonify({"message": f"Akses ditolak. Endpoint ini membutuhkan role: {', '.join(roles)}"}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator
