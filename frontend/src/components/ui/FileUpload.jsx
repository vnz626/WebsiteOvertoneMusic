import { useRef, useState, useId } from "react";
import { UploadCloud, CheckCircle2, Loader2 } from "lucide-react";
import api from "../../api";
import { errorMessage } from "../../utils/format";

/**
 * Upload file sungguhan ke backend, menggantikan input teks URL.
 * `onUploaded(url)` dipanggil dengan path relatif ("/uploads/xxxx.jpg").
 */
export default function FileUpload({ label, accept = "image/*,.pdf", onUploaded, value }) {
  const inputRef = useRef(null);
  const inputId = useId();
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
      setError(errorMessage(err, "Gagal mengunggah berkas. Periksa ukuran (maks 5MB) dan format berkas."));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      {label && (
        <label htmlFor={inputId} className="block text-xs font-bold uppercase tracking-wider text-ink-secondary mb-1.5">
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="w-full flex items-center gap-3 rounded-sm border border-dashed border-line-strong bg-surface px-4 py-3 text-left text-xs font-medium text-ink-secondary hover:border-accent hover:bg-surface-muted transition-colors duration-fast"
      >
        {uploading ? (
          <Loader2 size={18} className="animate-spin text-accent shrink-0" aria-hidden="true" />
        ) : value ? (
          <CheckCircle2 size={18} className="text-status-success-text shrink-0" aria-hidden="true" />
        ) : (
          <UploadCloud size={18} className="text-ink-muted shrink-0" aria-hidden="true" />
        )}
        <span>
          {uploading
            ? "Mengunggah berkas..."
            : value
            ? "Berkas berhasil diunggah — klik untuk mengganti"
            : "Pilih berkas gambar atau PDF (maksimal 5MB)"}
        </span>
      </button>
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={handleChange}
      />
      {error && (
        <p role="alert" className="mt-1.5 text-xs font-medium text-status-danger-text">
          {error}
        </p>
      )}
    </div>
  );
}
