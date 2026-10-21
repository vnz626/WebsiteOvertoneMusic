"""Upload dokumen sungguhan (fitur #4): bukti pembayaran & poster event.

Sebelumnya field `payment_proof_url` / `image_url` cuma kolom teks yang diisi
manual oleh user (rawan link asal-asalan). Sekarang file benar-benar di-upload
ke server, divalidasi tipe & ukurannya, dan disajikan lewat `/uploads/<file>`.
"""
import os
import uuid

from flask import Blueprint, current_app, jsonify, request

from flask_jwt_extended import jwt_required

uploads_bp = Blueprint("uploads", __name__)

ALLOWED_EXT = {"jpg", "jpeg", "png", "webp", "pdf"}
MAX_BYTES = 5 * 1024 * 1024  # 5 MB


def _ext_ok(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXT


@uploads_bp.post("")
@uploads_bp.post("/")
@jwt_required()
def upload_file():
    if "file" not in request.files:
        return jsonify({"message": "File tidak ditemukan (field 'file' wajib diisi)"}), 400

    f = request.files["file"]
    if not f.filename:
        return jsonify({"message": "Nama file kosong"}), 400
    if not _ext_ok(f.filename):
        return jsonify({"message": f"Tipe file harus salah satu dari: {', '.join(sorted(ALLOWED_EXT))}"}), 400

    f.seek(0, os.SEEK_END)
    size = f.tell()
    f.seek(0)
    if size > MAX_BYTES:
        return jsonify({"message": "Ukuran file maksimal 5MB"}), 400

    ext = f.filename.rsplit(".", 1)[1].lower()
    stored_name = f"{uuid.uuid4().hex}.{ext}"

    upload_dir = current_app.config["UPLOAD_DIR"]
    os.makedirs(upload_dir, exist_ok=True)
    f.save(os.path.join(upload_dir, stored_name))

    url = f"/uploads/{stored_name}"
    return jsonify({"message": "Upload berhasil", "url": url, "filename": stored_name}), 201
