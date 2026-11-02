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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#181614]/70"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-lg rounded-lg bg-surface border border-line-strong p-6 sm:p-7 shadow-lg text-ink">
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup pengaturan profil"
          className="absolute right-4 top-4 p-1.5 rounded-sm text-ink-muted hover:text-ink hover:bg-surface-muted transition-colors duration-fast"
        >
          <X size={18} aria-hidden="true" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-line pb-4 mb-5">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-sm bg-ink text-surface"
            aria-hidden="true"
          >
            <User size={18} />
          </div>
          <div>
            <h2 id="profile-modal-title" className="font-display text-base font-bold text-ink">
              Pengaturan Profil Musisi
            </h2>
            <p className="text-xs text-ink-secondary">
              Kelola identitas akun, alamat pengiriman utama, dan saluran notifikasi pesanan.
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label htmlFor="profile-name" className="block text-xs font-bold text-ink mb-1">
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
              className="ot-input"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="profile-email"
                className="block text-xs font-bold text-ink mb-1 flex items-center gap-1"
              >
                <Mail size={12} className="text-ink-muted" aria-hidden="true" />
                <span>Email Akun (Permanen)</span>
              </label>
              <input
                id="profile-email"
                type="email"
                disabled
                value={user?.email || ""}
                className="ot-input bg-surface-muted text-ink-muted cursor-not-allowed"
              />
            </div>
            <div>
              <label
                htmlFor="profile-phone"
                className="block text-xs font-bold text-ink mb-1 flex items-center gap-1"
              >
                <Phone size={12} className="text-ink-muted" aria-hidden="true" />
                <span>Nomor Telepon / WhatsApp</span>
              </label>
              <input
                id="profile-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Contoh: 081234567890"
                className="ot-input tabular-nums"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="profile-address"
              className="block text-xs font-bold text-ink mb-1 flex items-center gap-1"
            >
              <MapPin size={12} className="text-ink-muted" aria-hidden="true" />
              <span>Alamat Pengiriman Utama</span>
            </label>
            <textarea
              id="profile-address"
              rows={3}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Nama Jalan, Nomor Rumah, RT/RW, Kecamatan, Kota/Kabupaten, Provinsi, Kode Pos"
              className="ot-input"
            />
            <p className="mt-1 text-[11px] text-ink-muted">
              Alamat ini otomatis terisi saat Anda memilih pengiriman ekspedisi berasuransi di halaman Checkout.
            </p>
          </div>

          {/* Saluran Notifikasi Pesanan & Tracking */}
          <div className="rounded-md border border-line bg-surface-muted p-4">
            <h3 className="font-display text-xs font-bold uppercase tracking-wider text-ink mb-2.5">
              Preferensi Notifikasi &amp; Pelacakan
            </h3>
            <div className="space-y-2.5">
              <label
                htmlFor="notify-wa"
                className="flex items-center justify-between gap-3 cursor-pointer"
              >
                <div>
                  <span className="text-xs font-bold text-ink">Notifikasi WhatsApp</span>
                  <p className="text-[11px] text-ink-secondary">
                    Kirim pembaruan nomor resi kurir dan kode Pickup Pass ke WhatsApp.
                  </p>
                </div>
                <input
                  id="notify-wa"
                  type="checkbox"
                  checked={notifyWhatsapp}
                  onChange={(e) => setNotifyWhatsapp(e.target.checked)}
                  className="h-4 w-4 rounded-xs accent-[var(--color-accent)] cursor-pointer shrink-0"
                />
              </label>

              <label
                htmlFor="notify-email"
                className="flex items-center justify-between gap-3 cursor-pointer border-t border-line pt-2.5"
              >
                <div>
                  <span className="text-xs font-bold text-ink">Notifikasi Email</span>
                  <p className="text-[11px] text-ink-secondary">
                    Kirim faktur pembelian resmi, konfirmasi pembayaran, dan bukti serah terima.
                  </p>
                </div>
                <input
                  id="notify-email"
                  type="checkbox"
                  checked={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.checked)}
                  className="h-4 w-4 rounded-xs accent-[var(--color-accent)] cursor-pointer shrink-0"
                />
              </label>
            </div>
          </div>

          <div className="border-t border-line pt-4 flex items-center justify-end gap-2.5">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Batal
            </Button>
            <Button type="submit" variant="primary" loading={saving}>
              {saving ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
