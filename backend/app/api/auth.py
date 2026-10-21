"""Endpoint autentikasi: register musisi/pelanggan, login universal (staf internal OAS & pelanggan TPS), profil."""
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from ..extensions import db
from ..models.models import OASStaff, TPSCustomer
from ..security import current_user, make_token
from ..serializers import user_to_dict

auth_bp = Blueprint("auth", __name__)


@auth_bp.post("/register")
def register():
    """Daftar akun pelanggan/musisi baru ke tabel tps_customers."""
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    username = (data.get("username") or "").strip().lower() or None
    password = data.get("password") or ""
    phone = (data.get("phone") or "").strip() or None
    address = (data.get("address") or "").strip() or None

    if not name or not email or not password:
        return jsonify({"message": "Nama, email, dan password wajib diisi"}), 400
    if len(password) < 6:
        return jsonify({"message": "Password minimal 6 karakter"}), 400

    if TPSCustomer.query.filter_by(email=email).first() or OASStaff.query.filter_by(email=email).first():
        return jsonify({"message": "Email sudah terdaftar"}), 409
    if username and (TPSCustomer.query.filter_by(username=username).first() or OASStaff.query.filter_by(username=username).first()):
        return jsonify({"message": "Username sudah terdaftar"}), 409

    if not username:
        username = email.split("@")[0]

    customer = TPSCustomer(name=name, email=email, username=username, phone=phone, address=address, is_active=True)
    customer.set_password(password)
    db.session.add(customer)
    db.session.commit()

    access_token = make_token(customer, is_staff=False)

    return (
        jsonify(
            {
                "access_token": access_token,
                "role": "user",
                "is_staff": False,
                "user": customer.to_dict(),
            }
        ),
        201,
    )


@auth_bp.post("/login")
def login():
    """Login universal: autentikasi Staf Internal (OAS) & Pelanggan Ritel (TPS)."""
    data = request.get_json(silent=True) or {}
    identifier = (
        data.get("email")
        or data.get("username")
        or data.get("login")
        or data.get("identifier")
        or ""
    ).strip().lower()
    password = data.get("password") or ""

    if not identifier or not password:
        return jsonify({"message": "Email/Username dan password wajib diisi"}), 400

    # 1. Periksa akun staf internal (OAS)
    staff = OASStaff.query.filter(
        (db.func.lower(OASStaff.email) == identifier) | (db.func.lower(OASStaff.username) == identifier)
    ).first()

    if staff and staff.check_password(password):
        if not staff.is_active:
            return jsonify({"message": "Akun staf ini telah dinonaktifkan. Hubungi Super Administrator."}), 403
        access_token = make_token(staff, is_staff=True)
        return jsonify(
            {
                "access_token": access_token,
                "token": access_token,
                "role": staff.role,
                "is_staff": True,
                "user": staff.to_dict(),
            }
        )

    # 2. Periksa akun pelanggan ritel (TPS)
    customer = TPSCustomer.query.filter(
        (db.func.lower(TPSCustomer.email) == identifier) | (db.func.lower(TPSCustomer.username) == identifier)
    ).first()

    if customer and customer.check_password(password):
        if not customer.is_active:
            return jsonify({"message": "Akun pelanggan ini telah dinonaktifkan."}), 403
        access_token = make_token(customer, is_staff=False)
        return jsonify(
            {
                "access_token": access_token,
                "token": access_token,
                "role": "user",
                "is_staff": False,
                "user": customer.to_dict(),
            }
        )

    return jsonify({"message": "Email/Username atau password salah"}), 401


@auth_bp.post("/admin/login")
def admin_login():
    """Portal login staf internal."""
    return login()


@auth_bp.get("/me")
@jwt_required()
def me():
    """Pulihkan sesi profil user/staf yang sedang login."""
    user = current_user()
    if not user:
        return jsonify({"message": "Pengguna tidak ditemukan"}), 404

    is_staff = isinstance(user, OASStaff)
    return jsonify(
        {
            "role": getattr(user, "role", "user"),
            "is_staff": is_staff,
            "user": user.to_dict(),
        }
    )


@auth_bp.put("/profile")
@auth_bp.put("/me")
@jwt_required()
def update_profile():
    """Perbarui profil pengguna (nama, telepon, alamat pengiriman)."""
    user = current_user()
    if not user:
        return jsonify({"message": "Pengguna tidak ditemukan"}), 404

    data = request.get_json(silent=True) or {}
    if "name" in data and data["name"].strip():
        user.name = data["name"].strip()
    if "phone" in data:
        user.phone = (data["phone"] or "").strip() or None
    if hasattr(user, "address") and "address" in data:
        user.address = (data["address"] or "").strip() or None

    db.session.commit()
    is_staff = isinstance(user, OASStaff)
    return jsonify({
        "message": "Profil berhasil diperbarui",
        "user": user.to_dict(),
        "role": getattr(user, "role", "user"),
        "is_staff": is_staff,
    })