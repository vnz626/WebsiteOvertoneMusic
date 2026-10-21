# Integrasi Fitur Kategori Ticket Tier (Ticketing System)

## 1. Ringkasan Fitur
Fitur **Kategori Tier Tiket** memungkinkan setiap promotor event menentukan kategori tiket (misalnya: *VIP*, *Presale*, *Regular*, *Early Bird*, *CAT 1*, *Festival*) beserta harga dan kuota khusus untuk masing-masing tier pada setiap event. Fitur ini telah diintegrasikan secara penuh di seluruh lapisan sistem (Backend API, Database Models, Document Generator, Customer Flow, Promoter Dashboard, Finance Verification, dan MIS Analytics).

---

## 2. Perubahan Model Database & Serializer

### Backend Models (`app/models/models.py`)
- **`Event` Model**:
  - Ditambahkan relasi `tiers` (`db.relationship("TicketTier", backref="event", cascade="all, delete-orphan")`).
- **`TicketTier` Model**:
  - Menampung atribut `event_id`, `tier_name`, `price`, `quota`, dan `created_at`.
  - Ditambahkan properti terhitung `@property def tickets_sold` (total kuantitas dari transaksi berstatus `paid`).
  - Ditambahkan properti terhitung `@property def remaining_quota` (`max(0, quota - tickets_sold)`).
- **`Transaction` Model**:
  - Memiliki `tier_id` yang terhubung ke `TicketTier` dan relasi `tier`.

### Serializer (`app/serializers.py`)
- **`event_to_dict(e, detail=True)`**: Memuat array `tiers` berisi informasi `id`, `tier_name`, `price`, `quota`, `tickets_sold`, dan `remaining_quota`.
- **`transaction_to_dict(t)`**: Memuat objek `ticket_tier` yang berisi `id`, `tier_name`, dan `price`.

---

## 3. API Endpoints

| Method | Endpoint | Role / Akses | Deskripsi |
|---|---|---|---|
| `GET` | `/api/events/<id>/tiers` | Publik | Mendapatkan daftar tier tiket beserta sisa kuota untuk event |
| `GET` | `/api/promoter/events/<id>/tiers` | Staff (Promoter) / Admin | Menampilkan daftar tier tiket yang dibuat oleh promoter |
| `POST` | `/api/promoter/events/<id>/tiers` | Staff (Promoter) / Admin | Menambahkan kategori tier baru untuk event |
| `PUT` | `/api/promoter/tiers/<tier_id>` | Staff (Promoter) / Admin | Memperbarui nama, harga, atau kuota tier tiket |
| `DELETE` | `/api/promoter/tiers/<tier_id>` | Staff (Promoter) / Admin | Menghapus tier tiket (dibatasi jika sudah ada penjualan) |
| `GET` | `/api/promoter/events/<id>/tier-sales` | Staff (Promoter) / Admin | Mendapatkan laporan performa penjualan per tier |
| `POST` | `/api/orders` | Customer | Memesan tiket dengan memvalidasi kuota berdasarkan `tier.remaining_quota` |

---

## 4. Alur Bisnis & Tampilan Frontend

1. **Promoter (Kelola Tier)**:
   - Promoter dapat masuk ke **Dashboard Promoter** -> tombol **Tier Tiket**.
   - Halaman `TicketTiers.jsx` menyediakan antarmuka modern untuk **tambah**, **edit**, dan **hapus** tier tiket, lengkap dengan indikator sisa kuota & status *Sold Out*.
2. **Customer (Beli Tiket)**:
   - Halaman **Detail Event** (`EventDetail.jsx`) menampilkan pilihan tier tiket secara interaktif dalam bentuk card interaktif yang menyajikan harga dan ketersediaan kuota secara real-time.
   - Halaman **Checkout** (`Checkout.jsx`) menampilkan rincian kategori tier yang dipilih.
   - Halaman **Tiket Saya** (`MyTickets.jsx`) menampilkan badge kategori tier pada setiap tiket yang dibeli.
3. **Finance (Verifikasi Pembayaran)**:
   - Halaman **Finance Dashboard** (`FinanceDashboard.jsx`) menampilkan informasi kategori tier pada setiap transaksi pembeli.
4. **Dokumen Otomats (E-Ticket & Invoice PDF)**:
   - `build_ticket_pdf` dan `build_invoice_pdf` mencantumkan informasi **Kategori Tier** pada E-Ticket PDF ber-QR dan Invoice PDF.
5. **MIS Analytics**:
   - Halaman **Detail Event Analytics** (`EventAnalytics.jsx`) menampilkan tabel *Performa Penjualan per Kategori Tier* lengkap dengan perhitungan perkiraan omset per tier.
