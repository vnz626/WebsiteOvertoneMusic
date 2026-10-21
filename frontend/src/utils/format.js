export function formatRupiah(value) {
  const number = Number(value || 0);
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(number);
}

export function formatDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

export function errorMessage(err, fallback = "Terjadi kesalahan") {
  return err?.response?.data?.message || err?.message || fallback;
}

/** File yang di-upload disimpan sebagai path relatif ("/uploads/xxx.jpg"). */
export function fileUrl(path) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
  const origin = apiBase.replace(/\/api\/?$/, "");
  return `${origin}${path}`;
}
