"""
Kompilasi template Email HTML dan WhatsApp teks untuk siklus notifikasi pesanan Overtone Pro Cinema Store.
Triggers:
- order_created
- payment_confirmed
- packed
- shipped (dengan nomor resi)
- ready_for_pickup (dengan pickup code)
- picked_up
- refund_processed
"""


def render_whatsapp_template(template_key: str, payload: dict) -> str:
    """Render pesan WhatsApp teks berbasis payload."""
    invoice = payload.get("invoice_code", "-")
    buyer_name = payload.get("buyer_name", "Filmmaker")
    product_name = payload.get("product_name", "Cinema Gear")
    total_price = payload.get("total_price_formatted", "Rp 0")

    if template_key == "order_created":
        return (
            f"Halo {buyer_name}! 🎬\n\n"
            f"Pesanan Anda di *Overtone Pro Cinema Store* berhasil dibuat!\n"
            f"🧾 No. Invoice: *{invoice}*\n"
            f"📦 Produk: {product_name}\n"
            f"💰 Total Tagihan: *{total_price}*\n\n"
            f"Silakan selesaikan pembayaran agar unit cinema gear Anda dapat segera disiapkan dan lolos uji kalibrasi sensor.\n"
            f"Lacak pesanan: {payload.get('tracking_url', 'http://localhost:5173/track')}\n\n"
            f"Salam hangat,\nOvertone Cinema & Broadcast Specialist"
        )
    elif template_key == "payment_confirmed":
        return (
            f"Halo {buyer_name}! ✅\n\n"
            f"Pembayaran untuk invoice *{invoice}* telah BERHASIL diverifikasi!\n"
            f"📦 Pesanan: {product_name}\n\n"
            f"Tim teknisi cleanroom kami sedang melakukan inspeksi 10-point sensor calibration & firmware check sebelum packing.\n"
            f"Lacak status: {payload.get('tracking_url', 'http://localhost:5173/track')}\n\n"
            f"Terima kasih atas kepercayaannya!"
        )
    elif template_key == "packed":
        return (
            f"Halo {buyer_name}! 📦\n\n"
            f"Pesanan *{invoice}* telah lolos uji QC sensor dan selesai dikemas dengan proteksi hardcase kayu anti-statis. Paket siap diserahkan ke kurir logistik berasuransi.\n"
            f"Kami akan menginfokan nomor resi begitu paket diserahkan ke ekspedisi."
        )
    elif template_key == "shipped":
        courier = payload.get("courier", "JNE / J&T")
        tracking_number = payload.get("tracking_number", "-")
        return (
            f"Halo {buyer_name}! 🚚\n\n"
            f"Kabar gembira! Pesanan Anda *{invoice}* telah DIKIRIM!\n"
            f"Ekspedisi: *{courier}*\n"
            f"Nomor Resi: *{tracking_number}*\n\n"
            f"Lacak pengiriman langsung di website ekspedisi atau portal pelacakan kami:\n"
            f"{payload.get('tracking_url', 'http://localhost:5173/track')}\n\n"
            f"Selamat bersiap menyambut cinema gear impian produksi Anda!"
        )
    elif template_key == "ready_for_pickup":
        pickup_code = payload.get("pickup_code", "-")
        branch_name = payload.get("branch_name", "Showroom Utama")
        branch_address = payload.get("branch_address", "")
        return (
            f"Halo {buyer_name}! 🏛️\n\n"
            f"Pesanan Click & Collect Anda *{invoice}* SUDAH SIAP DIAMBIL!\n\n"
            f"📍 Lokasi Pengambilan: *{branch_name}*\n"
            f"{branch_address}\n\n"
            f"🎫 *Kode Verifikasi Pickup*: *{pickup_code}*\n\n"
            f"Tunjukkan pesan ini beserta kode verifikasi pickup kepada staf showroom kami saat pengambilan cinema gear untuk validasi dan tes sensor bay."
        )
    elif template_key == "picked_up":
        return (
            f"Halo {buyer_name}! 🎉\n\n"
            f"Pesanan *{invoice}* telah berhasil diambil di showroom. Selamat berkarya untuk project film Anda!\n\n"
            f"Daftarkan garansi resmi Anda dan simpan invoice ini untuk klaim berkala kalibrasi sensor di Overtone Cleanroom Bench."
        )
    elif template_key == "refund_processed":
        refund_amount = payload.get("refund_amount_formatted", total_price)
        return (
            f"Halo {buyer_name},\n\n"
            f"Dana pengembalian (refund) untuk invoice *{invoice}* sebesar *{refund_amount}* telah berhasil diproses oleh tim Finance kami.\n"
            f"Ref ID: {payload.get('refund_ref', '-')}\n"
            f"Dana akan kembali ke metode pembayaran asal sesuai estimasi bank/gateway Anda."
        )
    else:
        return f"Update pesanan {invoice}: {payload.get('message', 'Status pesanan Anda telah diperbarui.')}"


def render_email_template(template_key: str, payload: dict) -> tuple:
    """Render subject dan body HTML email berbasis payload."""
    invoice = payload.get("invoice_code", "-")
    buyer_name = payload.get("buyer_name", "Filmmaker")
    product_name = payload.get("product_name", "Cinema Gear")
    total_price = payload.get("total_price_formatted", "Rp 0")
    tracking_url = payload.get("tracking_url", f"http://localhost:5173/orders/{invoice}")

    subjects = {
        "order_created": f"Pesanan Diterima: {invoice} - Overtone Pro Cinema Store",
        "payment_confirmed": f"Pembayaran Dikonfirmasi: {invoice} - Cinema Gear Anda Sedang Disiapkan",
        "packed": f"Pesanan Siap Dikirim: {invoice} - Overtone Sensor QC Inspection Passed",
        "shipped": f"Pesanan Dalam Pengiriman: {invoice} - Nomor Resi Tersedia",
        "ready_for_pickup": f"Pesanan Siap Diambil di Showroom: {invoice} - Kode Verifikasi Pickup",
        "picked_up": f"Pesanan Telah Diambil: {invoice} - Selamat Berkarya di Set Film!",
        "refund_processed": f"Pengembalian Dana Berhasil: {invoice} - Overtone Finance",
    }
    subject = subjects.get(template_key, f"Update Pesanan {invoice} - Overtone Pro Cinema Store")

    # Content body
    content_html = ""
    if template_key == "order_created":
        content_html = f"""
        <p>Terima kasih telah berbelanja di <strong>Overtone Pro Cinema Store</strong>. Pesanan Anda telah berhasil dibuat dengan rincian berikut:</p>
        <div style="background-color: #f8fafc; border-left: 4px solid #8F834B; padding: 16px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 4px 0;"><strong>Invoice:</strong> {invoice}</p>
            <p style="margin: 4px 0;"><strong>Produk:</strong> {product_name}</p>
            <p style="margin: 4px 0;"><strong>Total Pembayaran:</strong> <span style="color: #8F834B; font-weight: bold;">{total_price}</span></p>
        </div>
        <p>Silakan selesaikan pembayaran Anda agar pesanan segera diproses ke tahap uji kalibrasi sensor dan pengiriman bergaransi resmi.</p>
        """
    elif template_key == "payment_confirmed":
        content_html = f"""
        <div style="background-color: #ecfdf5; border: 1px solid #10b981; border-radius: 6px; padding: 14px; margin-bottom: 20px; color: #065f46;">
            <strong>✓ Pembayaran Berhasil Dikonfirmasi</strong>
        </div>
        <p>Kami telah menerima pembayaran Anda untuk pesanan <strong>{invoice}</strong>. Tim spesialis teknisi cleanroom kami saat ini sedang melakukan pengecekan 10-point sensor calibration &amp; firmware update sebelum barang dikemas.</p>
        """
    elif template_key == "shipped":
        courier = payload.get("courier", "JNE Express")
        tracking_number = payload.get("tracking_number", "-")
        content_html = f"""
        <p>Cinema gear pesanan Anda sedang dalam perjalanan menuju alamat Anda dengan proteksi berasuransi!</p>
        <div style="background-color: #f8fafc; border-left: 4px solid #3b82f6; padding: 16px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 4px 0;"><strong>Kurir / Ekspedisi:</strong> {courier}</p>
            <p style="margin: 4px 0;"><strong>Nomor Resi:</strong> <code style="font-size: 16px; font-weight: bold; background: #e2e8f0; padding: 2px 6px; border-radius: 3px;">{tracking_number}</code></p>
        </div>
        """
    elif template_key == "ready_for_pickup":
        pickup_code = payload.get("pickup_code", "-")
        branch_name = payload.get("branch_name", "Showroom Utama")
        branch_address = payload.get("branch_address", "")
        content_html = f"""
        <p>Cinema gear pesanan Anda sudah siap dan dapat diambil langsung di showroom!</p>
        <div style="background-color: #fefce8; border: 1px solid #eab308; padding: 18px; margin: 20px 0; border-radius: 6px; text-align: center;">
            <div style="font-size: 13px; color: #854d0e; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Kode Verifikasi Pickup</div>
            <div style="font-size: 28px; font-weight: 800; color: #713f12; letter-spacing: 3px; margin: 8px 0;">{pickup_code}</div>
            <p style="margin: 0; font-size: 13px; color: #a16207;">Tunjukkan kode ini kepada tim Store Staff saat pengambilan barang untuk tes langsung di Studio Camera Test Bay.</p>
        </div>
        <p><strong>Lokasi Showroom:</strong><br/>{branch_name}<br/><span style="color: #64748b;">{branch_address}</span></p>
        """
    elif template_key == "refund_processed":
        refund_amount = payload.get("refund_amount_formatted", total_price)
        content_html = f"""
        <p>Tim Finance Overtone telah menyelesaikan pengembalian dana untuk invoice <strong>{invoice}</strong>.</p>
        <div style="background-color: #f8fafc; padding: 16px; margin: 20px 0; border-radius: 6px;">
            <p style="margin: 4px 0;"><strong>Jumlah Refund:</strong> {refund_amount}</p>
            <p style="margin: 4px 0;"><strong>Nomor Referensi:</strong> {payload.get('refund_ref', '-')}</p>
        </div>
        """
    else:
        content_html = f"<p>{payload.get('message', 'Status pesanan Anda telah diperbarui.')}</p>"

    html_email = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <title>{subject}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 30px 15px; color: #1e293b;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
            <div style="background-color: #18181b; padding: 24px 30px; text-align: left; border-bottom: 2px solid #8F834B;">
                <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 0.5px;">OVERTONE <span style="color: #8F834B;">PRO CINEMA</span></h1>
                <p style="color: #a1a1aa; margin: 4px 0 0 0; font-size: 12px;">Cinema Cameras, Lenses & Broadcast Gear Specialists</p>
            </div>
            <div style="padding: 30px;">
                <h2 style="font-size: 18px; margin-top: 0; color: #0f172a;">Halo {buyer_name},</h2>
                {content_html}
                <div style="margin-top: 30px; text-align: center;">
                    <a href="{tracking_url}" style="display: inline-block; background-color: #8F834B; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 600; font-size: 14px;">Lacak Pesanan Anda</a>
                </div>
            </div>
            <div style="background-color: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
                <p style="margin: 0 0 4px 0;">Butuh bantuan teknis atau konsultasi cinema rig? Hubungi Live Gear Concierge kami.</p>
                <p style="margin: 0;">&copy; 2026 PT Overtone Retail Nusantara. Seluruh hak cipta dilindungi.</p>
            </div>
        </div>
    </body>
    </html>
    """
    return subject, html_email
