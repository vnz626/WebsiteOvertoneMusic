"""
Generator dokumen otomatis (fitur #2): e-ticket ber-QR & invoice PDF.

Pakai `reportlab` (layout PDF) + `qrcode` (kode QR). Keduanya belum termasuk
di requirements lama, jadi ditambahkan di requirements.txt. Import di-guard
supaya server tetap bisa jalan untuk fitur lain walau kedua paket ini belum
ke-install; endpoint dokumen akan membalas 501 dengan pesan yang jelas.
"""
import io

try:
    import qrcode
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.lib.utils import ImageReader, simpleSplit
    from reportlab.pdfgen import canvas

    PDF_AVAILABLE = True
except ImportError:  # pragma: no cover - lingkungan tanpa reportlab/qrcode
    PDF_AVAILABLE = False


# ---------------------------------------------------------------------------
# Design tokens (selaras dengan --ticksy-primary di frontend/src/styles/theme.css)
# ---------------------------------------------------------------------------
PRIMARY = "#6C5CE7"
PRIMARY_LIGHT = "#8E7CFF"
PRIMARY_DARK = "#241E5C"
PRIMARY_DEEP = "#3A2FA0"
INK = "#1E1B3A"
MUTED = "#6B6890"
BG = "#F3F1FC"
LINE = "#E6E3F5"
SOFT = "#F1EFFD"
PANEL_LABEL = "#BDB5FF"

STATUS_STYLES = {
    "paid": ("LUNAS", "#E3F8EE", "#0F9D58"),
    "failed": ("DITOLAK", "#FDE8E8", "#D93025"),
}
STATUS_PENDING = ("MENUNGGU VERIFIKASI", "#FFF4DE", "#B7791F")

HARI = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"]
BULAN = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
]
ANGKA = {1: "ONE", 2: "TWO", 3: "THREE", 4: "FOUR", 5: "FIVE", 6: "SIX"}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _hex(value):
    return colors.HexColor(value)


def _rupiah(amount) -> str:
    return f"Rp {int(amount or 0):,}".replace(",", ".")


def _tanggal(d, with_day=False) -> str:
    if not d:
        return "-"
    text = f"{d.day} {BULAN[d.month - 1]} {d.year}"
    return f"{HARI[d.weekday()]}, {text}" if with_day else text


def _tier_label(trx) -> str:
    return trx.tier.tier_name if getattr(trx, "tier", None) else "Standard"


def _status_style(status):
    return STATUS_STYLES.get(status, STATUS_PENDING)


def _fit(c, text, font, size, max_w) -> str:
    """Potong teks dengan '...' kalau lebih lebar dari max_w."""
    text = str(text or "-")
    if c.stringWidth(text, font, size) <= max_w:
        return text
    while text and c.stringWidth(text + "...", font, size) > max_w:
        text = text[:-1]
    return text.rstrip() + "..."


def _wrap(c, text, font, size, max_w, max_lines):
    lines = simpleSplit(str(text or "-"), font, size, max_w) or ["-"]
    if len(lines) > max_lines:
        lines = lines[:max_lines]
        lines[-1] = _fit(c, lines[-1] + " ...", font, size, max_w)
    return lines


def _qr_image(data: str, fill="black"):
    qr = qrcode.QRCode(border=2, box_size=10, error_correction=qrcode.constants.ERROR_CORRECT_M)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color=fill, back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return ImageReader(buf)


def _gradient_round_rect(c, x, y, w, h, r, start, end, bubbles=False):
    """Kotak rounded berisi gradien diagonal + ornamen lingkaran transparan."""
    c.saveState()
    p = c.beginPath()
    if r > 0:
        p.roundRect(x, y, w, h, r)
    else:
        p.rect(x, y, w, h)
    c.clipPath(p, stroke=0, fill=0)
    c.linearGradient(x, y + h, x + w, y, (_hex(start), _hex(end)), extend=True)
    if bubbles:
        c.setFillColor(colors.white)
        c.setFillAlpha(0.06)
        c.circle(x + w - 8 * mm, y + h - 6 * mm, 30 * mm, fill=1, stroke=0)
        c.setFillAlpha(0.05)
        c.circle(x + w - 2 * mm, y + h - 30 * mm, 18 * mm, fill=1, stroke=0)
        c.circle(x + 6 * mm, y - 6 * mm, 22 * mm, fill=1, stroke=0)
    c.restoreState()


def _draw_logo(c, x, y, size, inverted=False, notch_color=None):
    """Ikon Ticksy: tiket rounded + centang."""
    box, mark = (colors.white, _hex(PRIMARY)) if inverted else (_hex(PRIMARY), colors.white)
    c.saveState()
    c.setFillColor(box)
    c.roundRect(x, y, size, size, size * 0.22, fill=1, stroke=0)
    # notch kiri-kanan supaya terlihat seperti tiket
    c.setFillColor(notch_color or colors.white)
    c.circle(x, y + size / 2, size * 0.12, fill=1, stroke=0)
    c.circle(x + size, y + size / 2, size * 0.12, fill=1, stroke=0)
    # centang
    c.setStrokeColor(mark)
    c.setLineWidth(size * 0.11)
    c.setLineCap(1)
    c.setLineJoin(1)
    p = c.beginPath()
    p.moveTo(x + size * 0.28, y + size * 0.50)
    p.lineTo(x + size * 0.44, y + size * 0.34)
    p.lineTo(x + size * 0.73, y + size * 0.66)
    c.drawPath(p, stroke=1, fill=0)
    c.restoreState()


def _icon_calendar(c, x, y, s, color):
    c.saveState()
    c.setFillColor(color)
    c.setStrokeColor(color)
    c.roundRect(x, y, s, s * 0.86, s * 0.15, fill=0, stroke=1)
    c.rect(x, y + s * 0.56, s, s * 0.30, fill=1, stroke=0)
    c.setLineWidth(1.1)
    c.line(x + s * 0.28, y + s * 0.78, x + s * 0.28, y + s)
    c.line(x + s * 0.72, y + s * 0.78, x + s * 0.72, y + s)
    for i in range(3):
        c.rect(x + s * (0.18 + i * 0.25), y + s * 0.18, s * 0.14, s * 0.14, fill=1, stroke=0)
    c.restoreState()


def _icon_pin(c, x, y, s, color, hole):
    c.saveState()
    c.setFillColor(color)
    cx, cy, r = x + s / 2, y + s * 0.62, s * 0.36
    p = c.beginPath()
    p.moveTo(cx - r * 0.92, cy - r * 0.38)
    p.lineTo(cx, y)
    p.lineTo(cx + r * 0.92, cy - r * 0.38)
    p.close()
    c.drawPath(p, fill=1, stroke=0)
    c.circle(cx, cy, r, fill=1, stroke=0)
    c.setFillColor(hole)
    c.circle(cx, cy, r * 0.42, fill=1, stroke=0)
    c.restoreState()


def _icon_lock(c, x, y, s, color):
    c.saveState()
    c.setStrokeColor(color)
    c.setFillColor(color)
    c.setLineWidth(1)
    c.roundRect(x, y, s, s * 0.62, s * 0.12, fill=1, stroke=0)
    p = c.beginPath()
    p.arc(x + s * 0.2, y + s * 0.42, x + s * 0.8, y + s * 1.05, 0, 180)
    c.drawPath(p, stroke=1, fill=0)
    c.restoreState()


def _chip(c, x, y, text, bg, fg, size=7.5, h=6.5 * mm, dot=True, align="left"):
    """Badge pill. (x, y) = pojok kiri-bawah, atau kanan-bawah kalau align='right'."""
    tw = c.stringWidth(text, "Helvetica-Bold", size)
    w = tw + (8.5 if dot else 6) * mm
    if align == "right":
        x -= w
    c.saveState()
    c.setFillColor(_hex(bg))
    c.roundRect(x, y, w, h, h / 2, fill=1, stroke=0)
    c.setFillColor(_hex(fg))
    tx = x + 3 * mm
    if dot:
        c.circle(x + 3.6 * mm, y + h / 2, 1 * mm, fill=1, stroke=0)
        tx = x + 5.6 * mm
    c.setFont("Helvetica-Bold", size)
    c.drawString(tx, y + h / 2 - size * 0.35, text)
    c.restoreState()
    return w


# ---------------------------------------------------------------------------
# E-TICKET
# ---------------------------------------------------------------------------
def _ticket_panel(c, trx, event, x, top, w, draw=True) -> float:
    """Isi panel gelap e-ticket. Dipanggil 2x: ukur tinggi (draw=False) lalu gambar."""
    px, pw = x + 8 * mm, w - 16 * mm
    white = colors.white
    label_color = _hex(PANEL_LABEL)

    def label(text, yy, xx=px):
        if draw:
            c.setFillColor(label_color)
            c.setFont("Helvetica", 8.5)
            c.drawString(xx, yy, text)

    def text(value, yy, xx, font="Helvetica-Bold", size=11, color=white):
        if draw:
            c.setFillColor(color)
            c.setFont(font, size)
            c.drawString(xx, yy, value)

    y = top - 9 * mm
    label("Nama Event", y)

    size = 20
    name_lines = simpleSplit(event.name.upper(), "Helvetica-Bold", size, pw)
    if len(name_lines) > 2:
        size = 16
        name_lines = _wrap(c, event.name.upper(), "Helvetica-Bold", size, pw, 3)
    y -= (6.8 if size == 20 else 5.8) * mm
    for i, line in enumerate(name_lines):
        if i:
            y -= size * 1.12
        text(line, y, px, size=size)

    # Tanggal & waktu
    y -= 8.5 * mm
    label("Tanggal & Waktu", y)
    y -= 6 * mm
    when = _tanggal(event.event_date, with_day=True).upper()
    if event.event_time:
        when += f"  |  {event.event_time.upper()}"
    if draw:
        _icon_calendar(c, px, y - 0.4 * mm, 3.6 * mm, white)
    text(_fit(c, when, "Helvetica-Bold", 11, pw - 6 * mm), y, px + 6 * mm)

    # Tempat
    y -= 8.5 * mm
    label("Tempat", y)
    y -= 6 * mm
    venue = ", ".join(v for v in [event.location, event.city] if v) or "-"
    venue_lines = _wrap(c, venue.upper(), "Helvetica-Bold", 11, pw - 6 * mm, 2)
    if draw:
        _icon_pin(c, px, y - 0.6 * mm, 4 * mm, white, _hex(PRIMARY_DEEP))
    for i, line in enumerate(venue_lines):
        if i:
            y -= 5.2 * mm
        text(line, y, px + 6 * mm)

    # Nama penonton (pill) | Penyelenggara
    y -= 8.5 * mm
    col2 = px + pw * 0.58
    label("Nama Penonton", y)
    label("Penyelenggara", y, col2)
    buyer = _fit(c, trx.buyer_name.upper(), "Helvetica-Bold", 10.5, pw * 0.58 - 12 * mm)
    pill_w = c.stringWidth(buyer, "Helvetica-Bold", 10.5) + 6 * mm
    if draw:
        c.setFillColor(white)
        c.roundRect(px, y - 10 * mm, pill_w, 7.5 * mm, 2 * mm, fill=1, stroke=0)
    text(buyer, y - 7.6 * mm, px + 3 * mm, size=10.5, color=_hex(INK))
    organizer = _fit(c, (event.organizer or "-").upper(), "Helvetica-Bold", 10.5, pw * 0.42)
    text(organizer, y - 7.6 * mm, col2, size=10.5)

    # Kode tiket | Jumlah
    y -= 17 * mm
    label("Kode Tiket", y)
    label("Jumlah Tiket", y, col2)
    y -= 6 * mm
    text(f"#{trx.invoice_code}", y, px, size=12.5)
    text(f"{trx.quantity} ORANG", y, col2, size=12.5)

    y -= 9 * mm
    return top - y


def build_ticket_pdf(trx, event) -> bytes:
    """Satu halaman e-ticket bergaya tiket konser: panel event + stub QR untuk check-in."""
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    c.setTitle(f"E-Ticket {trx.invoice_code} - {event.name}")
    c.setAuthor("Ticksy")
    width, height = A4

    c.setFillColor(_hex(BG))
    c.rect(0, 0, width, height, fill=1, stroke=0)

    tier = _tier_label(trx)
    card_x, card_w = 30 * mm, 150 * mm
    inner_x, inner_w = card_x + 8 * mm, card_w - 16 * mm

    header_h, label_h, stub_h, footer_h = 24 * mm, 10 * mm, 58 * mm, 16 * mm
    panel_h = _ticket_panel(c, trx, event, inner_x, 0, inner_w, draw=False)
    card_h = header_h + label_h + panel_h + stub_h + footer_h
    card_top = height - 18 * mm
    card_y = card_top - card_h
    radius = 5 * mm

    # --- kartu + bayangan ---
    c.setFillColor(_hex("#E2DDF7"))
    c.roundRect(card_x + 0.6 * mm, card_y - 1.4 * mm, card_w, card_h, radius, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setStrokeColor(_hex(LINE))
    c.setLineWidth(0.6)
    c.roundRect(card_x, card_y, card_w, card_h, radius, fill=1, stroke=1)

    # aksen gradien di tepi atas kartu
    c.saveState()
    p = c.beginPath()
    p.roundRect(card_x, card_y, card_w, card_h, radius)
    c.clipPath(p, stroke=0, fill=0)
    p2 = c.beginPath()
    p2.rect(card_x, card_top - 3 * mm, card_w, 3 * mm)
    c.clipPath(p2, stroke=0, fill=0)
    c.linearGradient(card_x, 0, card_x + card_w, 0, (_hex(PRIMARY), _hex(PRIMARY_LIGHT)), extend=True)
    c.restoreState()

    # --- header: logo | E-TICKET | badge tier ---
    mid = card_top - 3 * mm - (header_h - 3 * mm) / 2
    _draw_logo(c, inner_x, mid - 4.5 * mm, 9 * mm)
    c.setFillColor(_hex(INK))
    c.setFont("Helvetica-Bold", 17)
    c.drawString(inner_x + 11.5 * mm, mid - 2.2 * mm, "Ticksy")
    div_x = inner_x + 11.5 * mm + c.stringWidth("Ticksy", "Helvetica-Bold", 17) + 4.5 * mm
    c.setStrokeColor(_hex(LINE))
    c.setLineWidth(1)
    c.line(div_x, mid - 5 * mm, div_x, mid + 5 * mm)
    c.setFillColor(_hex(INK))
    c.setFont("Helvetica-Bold", 14)
    c.drawString(div_x + 4.5 * mm, mid - 1.8 * mm, "E-TICKET", charSpace=1)

    badge = _fit(c, tier.upper(), "Helvetica-Bold", 10, 52 * mm)
    bw = c.stringWidth(badge, "Helvetica-Bold", 10) + 9 * mm
    bx = inner_x + inner_w - bw
    _gradient_round_rect(c, bx, mid - 4 * mm, bw, 8 * mm, 2 * mm, PRIMARY_DEEP, PRIMARY)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 10)
    c.drawCentredString(bx + bw / 2, mid - 1.3 * mm, badge)

    c.setStrokeColor(_hex(LINE))
    c.line(card_x, card_top - header_h, card_x + card_w, card_top - header_h)

    # --- label section ---
    c.setFillColor(_hex(MUTED))
    c.setFont("Helvetica-Bold", 8.5)
    c.drawString(inner_x, card_top - header_h - 6.8 * mm, "DETAIL TIKET", charSpace=1.2)
    _chip(c, inner_x + inner_w, card_top - header_h - 8.6 * mm, "E-TICKET RESMI",
          SOFT, PRIMARY, size=6.8, h=5.4 * mm, dot=False, align="right")

    # --- panel event ---
    panel_top = card_top - header_h - label_h
    panel_y = panel_top - panel_h
    _gradient_round_rect(c, inner_x, panel_y, inner_w, panel_h, 4 * mm, PRIMARY_DARK, PRIMARY_DEEP, bubbles=True)
    _ticket_panel(c, trx, event, inner_x, panel_top, inner_w, draw=True)

    # --- perforasi + notch ---
    perf_y = panel_y - 5 * mm
    c.saveState()
    c.setStrokeColor(_hex("#CFCBE8"))
    c.setLineWidth(1.2)
    c.setDash(2.2 * mm, 1.6 * mm)
    c.line(card_x + 7 * mm, perf_y, card_x + card_w - 7 * mm, perf_y)
    c.restoreState()
    c.setFillColor(_hex(BG))
    c.setStrokeColor(_hex(LINE))
    for nx in (card_x, card_x + card_w):
        c.circle(nx, perf_y, 4.2 * mm, fill=1, stroke=0)

    # --- stub: admit + QR ---
    qr_size = 38 * mm
    qr_x = inner_x + inner_w - qr_size
    qr_y = perf_y - 6 * mm - qr_size
    c.setFillColor(colors.white)
    c.setStrokeColor(_hex(LINE))
    c.setLineWidth(0.8)
    c.roundRect(qr_x - 1.5 * mm, qr_y - 1.5 * mm, qr_size + 3 * mm, qr_size + 3 * mm, 2.5 * mm, fill=1, stroke=1)
    c.drawImage(_qr_image(trx.invoice_code, fill=INK), qr_x, qr_y, qr_size, qr_size)
    c.setFillColor(_hex(MUTED))
    c.setFont("Courier-Bold", 8)
    c.drawCentredString(qr_x + qr_size / 2, qr_y - 5.5 * mm, trx.invoice_code)

    admit = ANGKA.get(trx.quantity, str(trx.quantity))
    left_w = inner_w - qr_size - 8 * mm
    c.setFillColor(_hex(INK))
    c.setFont("Helvetica-Bold", 20)
    c.drawString(inner_x, perf_y - 14 * mm, f"ADMIT {admit}")
    c.setFillColor(_hex(PRIMARY))
    c.setFont("Helvetica-Bold", 13)
    c.drawString(inner_x, perf_y - 21 * mm, _fit(c, f"/ {tier.upper()}", "Helvetica-Bold", 13, left_w))
    c.setFillColor(_hex(MUTED))
    c.setFont("Helvetica-Bold", 8.5)
    c.drawString(inner_x, perf_y - 29.5 * mm, "SCAN QR CODE UNTUK MASUK", charSpace=0.3)
    c.setFont("Helvetica-Oblique", 8)
    c.drawString(inner_x, perf_y - 34 * mm, "Scan QR code for entry")

    status_text, status_bg, status_fg = _status_style(trx.status)
    if trx.status == "paid" and trx.verified_at:
        status_text += f"  -  {_tanggal(trx.verified_at)}"
    _chip(c, inner_x, perf_y - 45 * mm, status_text, status_bg, status_fg)

    # --- footer kartu ---
    foot_top = card_y + footer_h
    c.setStrokeColor(_hex(LINE))
    c.setLineWidth(0.6)
    c.line(card_x + 6 * mm, foot_top, card_x + card_w - 6 * mm, foot_top)
    fmid = card_y + footer_h / 2
    _draw_logo(c, inner_x, fmid - 3 * mm, 6 * mm)
    c.setFillColor(_hex(MUTED))
    c.setFont("Helvetica", 6.5)
    c.drawString(inner_x + 8 * mm, fmid + 1.2 * mm, "Powered by")
    c.setFillColor(_hex(INK))
    c.setFont("Helvetica-Bold", 10)
    c.drawString(inner_x + 8 * mm, fmid - 2.8 * mm, "Ticksy")

    chip_text = "SECURE & VERIFIED"
    cw = c.stringWidth(chip_text, "Helvetica-Bold", 7) + 10 * mm
    cx = inner_x + inner_w - cw
    c.setFillColor(_hex(SOFT))
    c.roundRect(cx, fmid - 3.2 * mm, cw, 6.4 * mm, 3.2 * mm, fill=1, stroke=0)
    _icon_lock(c, cx + 3 * mm, fmid - 1.6 * mm, 2.6 * mm, _hex(PRIMARY_DEEP))
    c.setFillColor(_hex(PRIMARY_DEEP))
    c.setFont("Helvetica-Bold", 7)
    c.drawString(cx + 7 * mm, fmid - 1.1 * mm, chip_text)

    # --- catatan di bawah kartu ---
    y = card_y - 10 * mm
    c.setFillColor(_hex(INK))
    c.setFont("Helvetica-Bold", 9)
    c.drawString(card_x, y, "Catatan Penting")
    notes = [
        "Tunjukkan QR code ini (dicetak atau dari layar HP) kepada petugas di pintu masuk.",
        f"Satu QR berlaku untuk {trx.quantity} orang sesuai jumlah tiket pada pesanan ini.",
        "Jangan bagikan atau unggah tiket ini ke media sosial untuk mencegah penyalahgunaan.",
        "Tiket ini sah tanpa tanda tangan dan diterbitkan otomatis oleh sistem Ticksy.",
    ]
    c.setFont("Helvetica", 8)
    for note in notes:
        y -= 4.8 * mm
        c.setFillColor(_hex(PRIMARY))
        c.circle(card_x + 1 * mm, y + 1 * mm, 0.7 * mm, fill=1, stroke=0)
        c.setFillColor(_hex(MUTED))
        c.drawString(card_x + 3.5 * mm, y, note)

    c.showPage()
    c.save()
    return buf.getvalue()


# ---------------------------------------------------------------------------
# INVOICE
# ---------------------------------------------------------------------------
def build_invoice_pdf(trx, event) -> bytes:
    """Invoice/kwitansi pembayaran satu halaman."""
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    c.setTitle(f"Invoice {trx.invoice_code}")
    c.setAuthor("Ticksy")
    width, height = A4
    left, right = 20 * mm, width - 20 * mm
    content_w = right - left

    tier = _tier_label(trx)
    status_text, status_bg, status_fg = _status_style(trx.status)
    unit_price = trx.total_price // trx.quantity if trx.quantity else trx.total_price
    method = (trx.payment_method or "-").replace("_", " ").upper()

    # --- header band ---
    band_h = 50 * mm
    _gradient_round_rect(c, 0, height - band_h, width, band_h, 0, PRIMARY_DARK, PRIMARY, bubbles=True)
    _draw_logo(c, left, height - 26 * mm, 11 * mm, inverted=True, notch_color=_hex(PRIMARY_DARK))
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 21)
    c.drawString(left + 14 * mm, height - 22.5 * mm, "Ticksy")
    c.setFillColor(_hex("#D9D4FF"))
    c.setFont("Helvetica", 8.5)
    c.drawString(left + 14 * mm, height - 27.5 * mm, "Platform Tiket Event Terpercaya")

    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 28)
    c.drawRightString(right, height - 23 * mm, "INVOICE")
    c.setFillColor(_hex("#E5E1FF"))
    c.setFont("Helvetica", 10)
    c.drawRightString(right, height - 30 * mm, f"No. {trx.invoice_code}")

    # --- info strip (overlap header) ---
    strip_h, strip_y = 20 * mm, height - band_h - 10 * mm
    c.setFillColor(_hex("#E2DDF7"))
    c.roundRect(left + 0.5 * mm, strip_y - 1 * mm, content_w, strip_h, 3.5 * mm, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setStrokeColor(_hex(LINE))
    c.setLineWidth(0.6)
    c.roundRect(left, strip_y, content_w, strip_h, 3.5 * mm, fill=1, stroke=1)

    col_w = content_w / 3
    info = [
        ("TANGGAL TERBIT", _tanggal(trx.created_at)),
        ("METODE PEMBAYARAN", method),
        ("STATUS", None),
    ]
    for i, (lbl, val) in enumerate(info):
        cx = left + i * col_w + 7 * mm
        if i:
            c.setStrokeColor(_hex(LINE))
            c.line(left + i * col_w, strip_y + 4 * mm, left + i * col_w, strip_y + strip_h - 4 * mm)
        c.setFillColor(_hex(MUTED))
        c.setFont("Helvetica-Bold", 7.5)
        c.drawString(cx, strip_y + 13 * mm, lbl, charSpace=0.8)
        if val is None:
            _chip(c, cx, strip_y + 4 * mm, status_text, status_bg, status_fg)
        else:
            c.setFillColor(_hex(INK))
            c.setFont("Helvetica-Bold", 11)
            c.drawString(cx, strip_y + 6 * mm, _fit(c, val, "Helvetica-Bold", 11, col_w - 12 * mm))

    # --- ditagihkan kepada | detail event ---
    y = strip_y - 14 * mm
    half = content_w / 2
    ev_x = left + half + 6 * mm
    for x, title in ((left, "DITAGIHKAN KEPADA"), (ev_x, "DETAIL EVENT")):
        c.setFillColor(_hex(PRIMARY))
        c.rect(x, y - 0.6 * mm, 1 * mm, 4 * mm, fill=1, stroke=0)
        c.setFillColor(_hex(MUTED))
        c.setFont("Helvetica-Bold", 8)
        c.drawString(x + 3 * mm, y, title, charSpace=1)

    by = y - 8 * mm
    c.setFillColor(_hex(INK))
    c.setFont("Helvetica-Bold", 12)
    c.drawString(left, by, _fit(c, trx.buyer_name, "Helvetica-Bold", 12, half - 8 * mm))
    c.setFillColor(_hex(MUTED))
    c.setFont("Helvetica", 9.5)
    c.drawString(left, by - 5.5 * mm, _fit(c, trx.buyer_email, "Helvetica", 9.5, half - 8 * mm))
    c.drawString(left, by - 10.5 * mm, trx.buyer_phone or "-")

    ev_w = right - ev_x
    ey = y - 8 * mm
    c.setFillColor(_hex(INK))
    c.setFont("Helvetica-Bold", 12)
    for i, line in enumerate(_wrap(c, event.name, "Helvetica-Bold", 12, ev_w, 2)):
        c.drawString(ev_x, ey - i * 5.2 * mm, line)
        last = ey - i * 5.2 * mm
    when = _tanggal(event.event_date, with_day=True)
    if event.event_time:
        when += f" | {event.event_time}"
    venue = ", ".join(v for v in [event.location, event.city] if v) or "-"
    c.setFillColor(_hex(MUTED))
    c.setFont("Helvetica", 9.5)
    ey = last
    for line in (when, venue, f"Penyelenggara: {event.organizer or '-'}"):
        ey -= 5.2 * mm
        c.drawString(ev_x, ey, _fit(c, line, "Helvetica", 9.5, ev_w))

    # --- tabel item ---
    ty = min(by - 10.5 * mm, ey) - 14 * mm
    cols = [left + 5 * mm, left + 98 * mm, left + 132 * mm, right - 5 * mm]
    th = 9 * mm
    _gradient_round_rect(c, left, ty - th, content_w, th, 2.5 * mm, PRIMARY_DARK, PRIMARY_DEEP)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 8.5)
    hy = ty - th / 2 - 1.1 * mm
    c.drawString(cols[0], hy, "DESKRIPSI", charSpace=0.6)
    c.drawRightString(cols[1] + 22 * mm, hy, "HARGA SATUAN", charSpace=0.6)
    c.drawCentredString(cols[2] + 3 * mm, hy, "QTY", charSpace=0.6)
    c.drawRightString(cols[3], hy, "SUBTOTAL", charSpace=0.6)

    ry = ty - th - 9 * mm
    c.setFillColor(_hex(INK))
    c.setFont("Helvetica-Bold", 10.5)
    c.drawString(cols[0], ry, _fit(c, f"Tiket {event.name}", "Helvetica-Bold", 10.5, 85 * mm))
    c.setFont("Helvetica", 9)
    c.setFillColor(_hex(MUTED))
    c.drawString(cols[0], ry - 5 * mm, f"Kategori: {tier}")
    c.setFillColor(_hex(INK))
    c.setFont("Helvetica", 10)
    c.drawRightString(cols[1] + 22 * mm, ry - 2.5 * mm, _rupiah(unit_price))
    c.drawCentredString(cols[2] + 3 * mm, ry - 2.5 * mm, str(trx.quantity))
    c.setFont("Helvetica-Bold", 10)
    c.drawRightString(cols[3], ry - 2.5 * mm, _rupiah(trx.total_price))

    line_y = ry - 10 * mm
    c.setStrokeColor(_hex(LINE))
    c.setLineWidth(0.8)
    c.line(left, line_y, right, line_y)

    # --- ringkasan total (kanan) ---
    sx, sw = left + content_w * 0.55, content_w * 0.45
    sy = line_y - 9 * mm
    for lbl, val in (("Subtotal", _rupiah(trx.total_price)), ("Jumlah Tiket", f"{trx.quantity} tiket")):
        c.setFillColor(_hex(MUTED))
        c.setFont("Helvetica", 9.5)
        c.drawString(sx + 5 * mm, sy, lbl)
        c.setFillColor(_hex(INK))
        c.setFont("Helvetica-Bold", 9.5)
        c.drawRightString(right - 5 * mm, sy, val)
        sy -= 6.5 * mm
    total_h = 20 * mm
    total_y = sy - total_h + 2 * mm
    _gradient_round_rect(c, sx, total_y, sw, total_h, 3 * mm, PRIMARY_DEEP, PRIMARY)
    c.setFillColor(_hex("#E5E1FF"))
    c.setFont("Helvetica-Bold", 8)
    c.drawString(sx + 5 * mm, total_y + total_h - 6.5 * mm, "TOTAL PEMBAYARAN", charSpace=0.8)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 18)
    c.drawRightString(right - 5 * mm, total_y + 4.5 * mm, _rupiah(trx.total_price))

    # --- info pembayaran (kiri) ---
    bx, bw = left, content_w * 0.55 - 8 * mm
    box_top = line_y - 4 * mm
    box_h = box_top - total_y
    c.setFillColor(_hex(SOFT))
    c.roundRect(bx, total_y, bw, box_h, 3 * mm, fill=1, stroke=0)
    c.setFillColor(_hex(INK))
    c.setFont("Helvetica-Bold", 9.5)
    c.drawString(bx + 5 * mm, box_top - 7 * mm, "Informasi Pembayaran")
    if trx.status == "paid":
        msg = (f"Pembayaran telah diverifikasi oleh tim Finance pada {_tanggal(trx.verified_at)}. "
               "E-ticket dapat diunduh di menu Tiket Saya.")
    elif trx.status == "failed":
        msg = "Pembayaran ditolak oleh tim Finance. Silakan hubungi tim support Ticksy untuk bantuan."
    else:
        msg = ("Pembayaran sedang diverifikasi oleh tim Finance. "
               "E-ticket akan tersedia setelah status berubah menjadi LUNAS.")
    c.setFillColor(_hex(MUTED))
    c.setFont("Helvetica", 8.5)
    my = box_top - 12.5 * mm
    for line in simpleSplit(msg, "Helvetica", 8.5, bw - 10 * mm)[:4]:
        c.drawString(bx + 5 * mm, my, line)
        my -= 4.3 * mm

    # --- stempel status ---
    stamp = {"paid": "LUNAS", "failed": "DITOLAK"}.get(trx.status, "MENUNGGU")
    c.saveState()
    c.translate(left + content_w / 2, total_y - 32 * mm)
    c.rotate(-8)
    c.setStrokeColor(_hex(status_fg))
    c.setFillColor(_hex(status_fg))
    c.setStrokeAlpha(0.3)
    c.setFillAlpha(0.3)
    c.setLineWidth(3)
    sw_text = c.stringWidth(stamp, "Helvetica-Bold", 34) + 3 * len(stamp)
    c.roundRect(-sw_text / 2 - 7 * mm, -6 * mm, sw_text + 14 * mm, 20 * mm, 3 * mm, fill=0, stroke=1)
    c.setFont("Helvetica-Bold", 34)
    c.drawCentredString(0, 0, stamp, charSpace=3)
    c.restoreState()

    # --- footer: terima kasih + QR verifikasi ---
    qr_size = 24 * mm
    fy = 26 * mm
    c.setStrokeColor(_hex(LINE))
    c.setLineWidth(0.6)
    c.line(left, fy + qr_size + 6 * mm, right, fy + qr_size + 6 * mm)
    c.setFillColor(_hex(PRIMARY))
    c.setFont("Helvetica-Bold", 13)
    c.drawString(left, fy + 16 * mm, "Terima kasih telah bertransaksi di Ticksy!")
    c.setFillColor(_hex(MUTED))
    c.setFont("Helvetica", 8.5)
    c.drawString(left, fy + 10 * mm, "Simpan invoice ini sebagai bukti pembayaran yang sah.")
    c.drawString(left, fy + 5.5 * mm, "Dokumen diterbitkan secara elektronik dan sah tanpa tanda tangan.")
    c.drawImage(_qr_image(trx.invoice_code, fill=INK), right - qr_size, fy, qr_size, qr_size)
    c.setFont("Helvetica", 7)
    c.drawCentredString(right - qr_size / 2, fy - 3.5 * mm, "Scan untuk verifikasi")

    _gradient_round_rect(c, 0, 0, width, 4 * mm, 0, PRIMARY_DARK, PRIMARY)
    c.setFillColor(_hex(MUTED))
    c.setFont("Helvetica", 7)
    c.drawCentredString(width / 2, 8 * mm, f"Ticksy  |  Invoice {trx.invoice_code}")

    c.showPage()
    c.save()
    return buf.getvalue()
