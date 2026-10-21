import { useState, useEffect } from "react";
import { X, User, MapPin, Phone, Mail, CheckCircle2 } from "lucide-react";
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
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user && isOpen) {
      setName(user.name || "");
      setPhone(user.phone || "");
      setAddress(user.address || "");
    }
  }, [user, isOpen]);

  if (!isOpen) return null;

  async function handleSave(e) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Nama lengkap tidak boleh kosong");
      return;
    }

    setSaving(true);
    try {
      const res = await api.put("/auth/profile", {
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
      });
      const updated = res?.data?.user;
      if (updated) {
        updateUser(updated);
      }
      toast.success("Profil dan alamat berhasil disimpan!");
      onClose();
    } catch (err) {
      toast.error(errorMessage(err, "Gagal menyimpan perubahan profil"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg rounded-2xl bg-white border border-gray-200 p-6 sm:p-7 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-full text-gray-400 hover:text-black hover:bg-gray-100 transition-colors"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#111111] text-white">
            <User size={18} />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">Profil Saya</h2>
            <p className="text-xs text-gray-500">Kelola identitas akun dan alamat pengiriman pesanan Anda.</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Nama Lengkap</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama lengkap Anda"
              className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs sm:text-sm text-gray-900 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                <Mail size={12} className="text-gray-400" /> Email (Permanen)
              </label>
              <input
                type="email"
                disabled
                value={user?.email || ""}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2 text-xs text-gray-500 cursor-not-allowed outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                <Phone size={12} className="text-gray-400" /> Nomor Handphone / WhatsApp
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Contoh: 08123456789"
                className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs sm:text-sm text-gray-900 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
              <MapPin size={12} className="text-gray-400" /> Alamat Pengiriman Utama
            </label>
            <textarea
              rows={3}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Masukkan alamat lengkap (Nama Jalan, No. Rumah, RT/RW, Kelurahan, Kecamatan, Kota, Kode Pos)"
              className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs sm:text-sm text-gray-900 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all"
            />
            <p className="mt-1 text-[11px] text-gray-500">
              Alamat ini otomatis terisi di formulir Checkout pengiriman ekspedisi bergaransi.
            </p>
          </div>

          <div className="border-t border-gray-100 pt-4 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Batal
            </button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-[#111111] hover:bg-black text-white text-xs font-semibold px-5 py-2 rounded-xl shadow-sm transition-all"
            >
              {saving ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
