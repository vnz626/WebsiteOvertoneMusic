import { useRef, useState } from "react";
import { UploadCloud, CheckCircle2, Loader2 } from "lucide-react";
import api from "../../api";
import { errorMessage } from "../../utils/format";

/**
 * Upload file sungguhan ke backend (fitur #4), menggantikan input teks URL.
 * `onUploaded(url)` dipanggil dengan path relatif ("/uploads/xxxx.jpg").
 */
export default function FileUpload({ label, accept = "image/*,.pdf", onUploaded, value }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post("/uploads", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onUploaded(res.data.url);
    } catch (err) {
      setError(errorMessage(err, "Upload gagal"));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      {label && <label className="text-sm font-medium">{label}</label>}
      <div
        onClick={() => inputRef.current?.click()}
        className="mt-1 flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-500 hover:border-brand-500 dark:border-slate-600"
      >
        {uploading ? (
          <Loader2 size={18} className="animate-spin" />
        ) : value ? (
          <CheckCircle2 size={18} className="text-emerald-500" />
        ) : (
          <UploadCloud size={18} />
        )}
        <span>
          {uploading ? "Mengunggah..." : value ? "File terunggah — klik untuk ganti" : "Klik untuk pilih file (max 5MB)"}
        </span>
        <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleChange} />
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
