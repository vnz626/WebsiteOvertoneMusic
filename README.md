# Ticksy — Flask REST API + React (hasil perbaikan migrasi)

Arsitektur: **backend Flask (JSON API)** + **frontend React/Vite** yang benar-benar
saling terhubung (bukan lagi UI berisi data statis).

## Ringkasan perbaikan

| # | Masalah sebelumnya | Status |
|---|---|---|
| 1 | `from .extensions import db` di `app/models/models.py` → `ModuleNotFoundError` | ✅ jadi `from ..extensions import db` |
| 2 | `create_access_token(identity={...})` → semua route ber-JWT 422 "Subject must be a string" | ✅ identity kini string `"user:1"` / `"admin:3"`, role dikirim lewat `additional_claims` |
| 3 | Backend cuma 2 endpoint skeleton | ✅ 25 endpoint: events, orders, promoter, admin, finance, auth |
| 4 | Halaman React isinya teks hardcode | ✅ semua halaman fetch ke API (loading, error, empty state) |
| 5 | File duplikat `pages/PromoterDashboard.jsx` jadi dead code | ✅ dihapus, logic-nya dipindah ke `pages/promoter/Dashboard.jsx` |
| 6 | Login tidak lewat `useAuth().login()` → ke-bounce balik ke `/login` | ✅ login lewat context + sesi dipulihkan via `GET /api/auth/me` |
| 7 | Class Tailwind dipakai tanpa Tailwind terpasang | ✅ tailwindcss + postcss + autoprefixer + `tailwind.config.js` + `vite.config.js` |
| 8 | Sidebar/DashboardLayout/ThemeToggle/EmptyState/Skeleton/Badge tidak terpakai | ✅ semuanya dipakai di halaman dashboard |
| 9 | Bukti bayar & poster event cuma input URL manual | ✅ upload file sungguhan (`/api/uploads`), disajikan lewat `/uploads/<file>` |
| 10 | Tidak ada e-ticket/invoice sungguhan | ✅ generate PDF ber-QR otomatis (`reportlab` + `qrcode`) |
| 11 | Tidak ada notifikasi/email di setiap transisi status | ✅ notifikasi in-dashboard + email (log-only di dev) untuk order/approve/reject/verifikasi |
| 12 | Tidak ada tempat baca pesan di dashboard | ✅ lonceng notifikasi di Navbar + halaman "Pesan" (`/notifications`) |
| 13 | Login internal (admin/staff/finance) terlihat publik di halaman login | ✅ dipisah ke `/internal/portal`, tidak ditautkan di UI manapun |

## Menjalankan

### Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate     # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Pastikan database `ticketing_event` sudah dibuat di phpMyAdmin (XAMPP).
# Mau coba tanpa MySQL? set dulu: export DATABASE_URL=sqlite:///ticksy.db

flask --app run.py init-db     # buat tabel
flask --app run.py seed        # isi akun & event contoh
python run.py                  # jalan di http://localhost:5000
```

### Frontend
```bash
cd frontend
npm install
npm run dev                    # jalan di http://localhost:5173
```

## Akun contoh (dari `flask seed`)

| Login | Username / Email | Password | Role |
|---|---|---|---|
| Internal | `admin` | `admin123` | admin |
| Internal | `promoter` | `promoter123` | staff (promoter) |
| Internal | `finance` | `finance123` | finance |
| Pembeli | `user@ticksy.test` | `user123` | customer |

Di halaman login ada dua tab: **Pembeli** (pakai email) dan **Internal** (pakai username).

## Daftar endpoint

**Auth** — `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/admin/login`, `GET /api/auth/me`

**Publik** — `GET /api/events?q=`, `GET /api/events/<id>`

**Pembeli** — `POST /api/orders`, `GET /api/orders/my`, `GET /api/orders/<invoice_code>`

**Promoter (staff)** — `GET|POST /api/promoter/events`, `PUT|DELETE /api/promoter/events/<id>`, `GET /api/promoter/stats`

**Admin** — `GET /api/admin/events?status=`, `POST /api/admin/events/<id>/approve`, `POST /api/admin/events/<id>/reject`, `GET /api/admin/stats`

**Finance** — `GET /api/finance/transactions?status=`, `POST /api/finance/transactions/<id>/verify`, `POST /api/finance/transactions/<id>/reject`, `GET /api/finance/summary`

**Dokumen** — `GET /api/orders/<invoice_code>/ticket` (e-ticket PDF ber-QR, khusus status lunas), `GET /api/orders/<invoice_code>/invoice` (invoice PDF)

**Upload** — `POST /api/uploads` (multipart/form-data, field `file`; jpg/png/webp/pdf, maks 5MB) → `{url: "/uploads/xxxx.jpg"}`

**Notifikasi** — `GET /api/notifications`, `GET /api/notifications/unread-count`, `POST /api/notifications/<id>/read`, `POST /api/notifications/read-all`

## Alur bisnis

1. Promoter mengajukan event → status `pending`.
2. Admin approve/reject (reject wajib disertai alasan; event yang ditolak lalu diedit otomatis kembali ke `pending`). Promoter dapat notifikasi in-dashboard di kedua kasus.
3. Event `approved` muncul di katalog publik.
4. Pembeli checkout, opsional langsung upload bukti bayar → transaksi `menunggu_verifikasi` (kuota dicek saat pemesanan). Pembeli dapat notifikasi + email konfirmasi; finance dapat notifikasi ada order baru.
5. Finance verifikasi → `paid` (kuota dicek ulang agar tidak overselling, e-ticket PDF ber-QR jadi bisa diunduh) atau `failed`. Pembeli dapat notifikasi + email hasilnya.

## Fitur Office Automation System (OAS)

| Fitur | Implementasi |
|---|---|
| **Generate dokumen otomatis** | E-ticket PDF (QR code untuk check-in) & invoice PDF, dibuat on-demand lewat `app/documents.py` |
| **Manajemen dokumen** | Upload bukti bayar & poster event sungguhan (`app/api/uploads.py`), bukan lagi input URL manual |
| **Notifikasi & korespondensi otomatis** | `app/notifications.py` — notifikasi in-dashboard + email di setiap transisi status penting |
| **Pesan dalam dashboard** | Lonceng notifikasi di Navbar + halaman kotak masuk `/notifications`, tersedia untuk semua role |

### Catatan konfigurasi email

Default `MAIL_SUPPRESS_SEND=true` — email tidak benar-benar terkirim, hanya ditulis ke log server (`logger.info`). Ini sengaja supaya bisa dites tanpa kredensial SMTP asli. Untuk kirim email sungguhan, set di `.env`:
```
MAIL_SUPPRESS_SEND=false
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=akun@gmail.com
MAIL_PASSWORD=app-password-gmail
```

### Login internal (tersembunyi)

Halaman `/login` publik sekarang khusus pembeli. Akun admin/promoter/finance login lewat:
```
http://localhost:5173/internal/portal
```
URL ini sengaja **tidak ditautkan** di Navbar, Sidebar, atau halaman manapun — cukup untuk mencegah pengunjung biasa menemukannya tanpa sengaja. Ini bukan pengaman utama; kredensial kuat & rate limiting di sisi server tetap wajib untuk produksi.

## Catatan

- Struktur tabel (`users`, `admins`, `events`, `transactions`) tidak diubah, tetap kompatibel dengan database versi Flask+Jinja lama.
- Isolasi data promoter: staff hanya melihat event dengan `created_by` miliknya sendiri; admin melihat semua.
- Token kedaluwarsa 12 jam; kalau API balas 401, frontend otomatis membersihkan sesi dan kembali ke `/login`.
