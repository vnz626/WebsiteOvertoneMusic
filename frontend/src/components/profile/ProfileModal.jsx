import { useState, useEffect, useRef } from "react";
import { X, User, MapPin, Phone, Mail } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../api";
import { useAuth } from "../../auth/AuthContext";
import Button from "../ui/Button";
import { errorMessage } from "../../utils/format";

export default function ProfileModal({ isOpen, onClose }) {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyWhatsapp, setNotifyWhatsapp] = useState(true);
  const [saving, setSaving] = useState(false);
  const nameInputRef = useRef(null);

  useEffect(() => {
    if (user && isOpen) {
      setName(user.name || "");
      setPhone(user.phone || "");
      setAddress(user.address || "");
      setNotifyEmail(user.notify_email !== undefined ? Boolean(user.notify_email) : true);
      setNotifyWhatsapp(user.notify_whatsapp !== undefined ? Boolean(user.notify_whatsapp) : true);
      setTimeout(() => nameInputRef.current?.focus(), 20);
    }
  }, [user, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  async function handleSave(e) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Nama lengkap wajib diisi sebelum menyimpan profil.");
      return;
    }

    setSaving(true);
    try {
      const res = await api.put("/auth/profile", {
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        notify_email: notifyEmail,
        notify_whatsapp: notifyWhatsapp,
      });
      const updated = res?.data?.user;
      if (updated) {
        updateUser(updated);
      }
      toast.success("Profil dan preferensi notifikasi berhasil disimpan.");
      onClose();
    } catch (err) {
      toast.error(errorMessage(err, "Gagal menyimpan perubahan profil. Silakan periksa koneksi Anda."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-lg rounded-3xl fp-glass-card !p-6 sm:!p-8 shadow-2xl text-[#0F1B2D]">
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup pengaturan profil"
          className="absolute right-5 top-5 p-2 rounded-full text-[#64748B] hover:text-[#0F1B2D] hover:bg-white/60 transition-colors"
        >
          <X size={18} aria-hidden="true" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3.5 border-b border-[#0F1B2D]/10 pb-4 mb-5">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#E8622C] text-white shadow-md shadow-[#E8622C]/25"
            aria-hidden="true"
          >
            <User size={20} />
          </div>
          <div>
            <h2 id="profile-modal-title" className="font-display text-lg font-bold text-[#0F1B2D]">
              Pengaturan Profil Akun
            </h2>
            <p className="text-xs text-[#64748B]">
              Kelola identitas akun, alamat pengiriman studio, dan saluran notifikasi pesanan.
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label htmlFor="profile-name" className="block text-xs font-bold text-[#0F1B2D] mb-1.5">
              Nama Lengkap
            </label>
            <input
              id="profile-name"
              ref={nameInputRef}
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama lengkap sesuai identitas penerima"
              className="w-full rounded-full border border-[#0F1B2D]/15 bg-white/80 backdrop-blur-md px-4 py-2.5 text-xs text-[#0F1B2D] placeholder:text-[#94A3B8] focus:border-[#E8622C] focus:bg-white focus:outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="profile-email"
                className="block text-xs font-bold text-[#0F1B2D] mb-1.5 flex items-center gap-1"
              >
                <Mail size={12} className="text-[#64748B]" aria-hidden="true" />
                <span>Email Akun (Terkunci)</span>
              </label>
              <input
                id="profile-email"
                type="email"
                disabled
                value={user?.email || ""}
                className="w-full rounded-full border border-[#0F1B2D]/10 bg-slate-100/70 backdrop-blur-md px-4 py-2.5 text-xs text-[#64748B] cursor-not-allowed"
              />
            </div>
            <div>
              <label
                htmlFor="profile-phone"
                className="block text-xs font-bold text-[#0F1B2D] mb-1.5 flex items-center gap-1"
              >
                <Phone size={12} className="text-[#64748B]" aria-hidden="true" />
                <span>Nomor WhatsApp / HP</span>
              </label>
              <input
                id="profile-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Contoh: 081234567890"
                className="w-full rounded-full border border-[#0F1B2D]/15 bg-white/80 backdrop-blur-md px-4 py-2.5 text-xs text-[#0F1B2D] placeholder:text-[#94A3B8] focus:border-[#E8622C] focus:bg-white focus:outline-none transition-all tabular-nums"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="profile-address"
              className="block text-xs font-bold text-[#0F1B2D] mb-1.5 flex items-center gap-1"
            >
              <MapPin size={12} className="text-[#64748B]" aria-hidden="true" />
              <span>Alamat Pengiriman Utama / Studio</span>
            </label>
            <textarea
              id="profile-address"
              rows={3}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Nama Studio/Gedung, Jalan, Nomor, RT/RW, Kecamatan, Kota/Kabupaten, Kode Pos"
              className="w-full rounded-2xl border border-[#0F1B2D]/15 bg-white/80 backdrop-blur-md p-3.5 text-xs text-[#0F1B2D] placeholder:text-[#94A3B8] focus:border-[#E8622C] focus:bg-white focus:outline-none transition-all"
            />
            <p className="mt-1 text-[11px] text-[#64748B]">
              Alamat ini otomatis terisi saat memilih pengiriman ekspedisi di checkout.
            </p>
          </div>

          {/* Saluran Notifikasi Pesanan & Tracking */}
          <div className="rounded-2xl border border-white/80 bg-white/60 backdrop-blur-md p-4">
            <h3 className="font-display text-xs font-bold uppercase tracking-wider text-[#0F1B2D] mb-2.5">
              Preferensi Notifikasi &amp; Pelacakan
            </h3>
            <div className="space-y-2.5">
              <label
                htmlFor="notify-wa"
                className="flex items-center justify-between gap-3 cursor-pointer"
              >
                <div>
                  <span className="text-xs font-bold text-[#0F1B2D]">Notifikasi WhatsApp</span>
                  <p className="text-[11px] text-[#64748B]">
                    Kirim pembaruan nomor resi kurir dan kode Pickup Pass ke WhatsApp.
                  </p>
                </div>
                <input
                  id="notify-wa"
                  type="checkbox"
                  checked={notifyWhatsapp}
                  onChange={(e) => setNotifyWhatsapp(e.target.checked)}
                  className="h-4 w-4 rounded accent-[#E8622C] cursor-pointer shrink-0"
                />
              </label>

              <label
                htmlFor="notify-email"
                className="flex items-center justify-between gap-3 cursor-pointer border-t border-[#0F1B2D]/10 pt-2.5"
              >
                <div>
                  <span className="text-xs font-bold text-[#0F1B2D]">Notifikasi Email</span>
                  <p className="text-[11px] text-[#64748B]">
                    Kirim faktur pembelian resmi, konfirmasi pembayaran, dan bukti serah terima.
                  </p>
                </div>
                <input
                  id="notify-email"
                  type="checkbox"
                  checked={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.checked)}
                  className="h-4 w-4 rounded accent-[#E8622C] cursor-pointer shrink-0"
                />
              </label>
            </div>
          </div>

          <div className="border-t border-[#0F1B2D]/10 pt-4 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-full border border-[#0F1B2D]/20 bg-white/70 px-4 py-2 text-xs font-bold text-[#0F1B2D] hover:bg-white transition-all disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-[#E8622C] hover:bg-[#d45522] px-5 py-2 text-xs font-bold text-white shadow-md transition-all disabled:opacity-50"
            >
              {saving ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
