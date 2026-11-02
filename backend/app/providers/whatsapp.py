"""
Provider WhatsApp Overtone Music Store (Fitur 1.3).
Membungkus pengiriman pesan WhatsApp (Fonnte / WhatsApp Business API / Mock Development).
Menggunakan urllib standar agar tidak bergantung pada modul eksternal.
"""
import os
import logging
import json
import urllib.request
import urllib.parse
import urllib.error

logger = logging.getLogger("overtone.whatsapp")


class WhatsAppProvider:
    """Wrapper provider pengiriman pesan WhatsApp."""

    def __init__(self):
        self.api_token = os.getenv("WHATSAPP_API_TOKEN", "")
        self.api_url = os.getenv("WHATSAPP_API_URL", "https://api.fonnte.com/send")
        # Jika token kosong atau WHATSAPP_SIMULATE=True, jalankan mode simulasi (log)
        self.is_simulation = os.getenv("WHATSAPP_SIMULATE", "true").lower() in ("true", "1", "yes") or not self.api_token

    def send_message(self, phone: str, message: str) -> dict:
        """Kirim pesan teks WhatsApp ke nomor tujuan."""
        if not phone:
            return {"success": False, "error": "Nomor WhatsApp kosong"}

        clean_phone = phone.strip().replace(" ", "").replace("-", "")
        if clean_phone.startswith("08"):
            clean_phone = "628" + clean_phone[2:]
        elif clean_phone.startswith("+62"):
            clean_phone = clean_phone[1:]

        if self.is_simulation:
            logger.info("[WHATSAPP MOCK SIMULATION] To: %s\nMessage:\n%s", clean_phone, message)
            return {
                "success": True,
                "simulated": True,
                "message": f"Simulated send to {clean_phone}"
            }

        try:
            data = urllib.parse.urlencode({
                "target": clean_phone,
                "message": message,
                "countryCode": "62"
            }).encode("utf-8")

            req = urllib.request.Request(
                self.api_url,
                data=data,
                headers={"Authorization": self.api_token, "User-Agent": "OvertoneMusic/1.0"}
            )
            with urllib.request.urlopen(req, timeout=10) as response:
                res_body = response.read().decode("utf-8")
                res_json = json.loads(res_body)
                if response.status == 200 and res_json.get("status"):
                    return {"success": True, "data": res_json}
                return {"success": False, "error": res_json.get("reason", res_body)}
        except Exception as e:
            logger.exception("Gagal mengirim WhatsApp ke %s: %s", clean_phone, str(e))
            return {"success": False, "error": str(e)}


whatsapp_client = WhatsAppProvider()


def send_whatsapp(phone: str, message: str) -> dict:
    return whatsapp_client.send_message(phone, message)
