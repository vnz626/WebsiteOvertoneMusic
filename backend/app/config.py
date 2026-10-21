import os
from datetime import timedelta

BASE_DIR = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))

# ---------------------------------------------------------------------------
# Konfigurasi koneksi ke MySQL (XAMPP)
# Default XAMPP: host=localhost, port=3306, user=root, password=kosong ("")
# Mau coba cepat tanpa MySQL? set: DATABASE_URL=sqlite:///ticksy.db
# ---------------------------------------------------------------------------
DB_USER = os.environ.get("DB_USER", "root")
DB_PASSWORD = os.environ.get("DB_PASSWORD", "")
DB_HOST = os.environ.get("DB_HOST", "localhost")
DB_PORT = os.environ.get("DB_PORT", "3306")
DB_NAME = os.environ.get("DB_NAME", "ticketing_event")


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-key-ubah-ini")
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL",
        f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}",
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "ticksy-jwt-secret-key-production-32-chars-long!")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=12)

    # Origin frontend Vite (dev server). Tambah lewat env kalau port-nya beda.
    CORS_ORIGINS = os.environ.get(
        "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
    ).split(",")

    # --- Upload dokumen (fitur #4): bukti bayar, poster event ---
    UPLOAD_DIR = os.environ.get("UPLOAD_DIR", os.path.join(BASE_DIR, "uploads"))

    # --- Email otomatis (fitur #5) ---
    # Default MAIL_SUPPRESS_SEND=True -> email hanya ditulis ke log server,
    # aman dipakai tanpa kredensial SMTP asli. Set False + isi kredensial
    # untuk kirim email sungguhan.
    MAIL_SUPPRESS_SEND = os.environ.get("MAIL_SUPPRESS_SEND", "true").lower() != "false"
    MAIL_SERVER = os.environ.get("MAIL_SERVER", "smtp.gmail.com")
    MAIL_PORT = int(os.environ.get("MAIL_PORT", "587"))
    MAIL_USE_TLS = os.environ.get("MAIL_USE_TLS", "true").lower() != "false"
    MAIL_USERNAME = os.environ.get("MAIL_USERNAME", "")
    MAIL_PASSWORD = os.environ.get("MAIL_PASSWORD", "")
    MAIL_FROM = os.environ.get("MAIL_FROM", "no-reply@ticksy.test")
