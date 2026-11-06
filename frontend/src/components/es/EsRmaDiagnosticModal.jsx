import { useState, useEffect } from "react";
import {
  X,
  Cpu,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldCheck,
  BookOpen,
  Loader2,
  FileText
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../../api";
import Button from "../ui/Button";

const DEFAULT_SYMPTOMS = [
  { code: "FACT_DEAD_PIXEL_LINE", label: "Garis Dead Pixel Vertikal/Horizontal pada Sensor CMOS (Cacat Pabrik)", category: "sensor" },
  { code: "FACT_MAINBOARD_PORT_FAIL", label: "Port HDMI/SDI Mainboard Tidak Keluar Sinyal Video (Cacat IC BGA)", category: "electronic" },
  { code: "FACT_GIMBAL_MOTOR_DRIFT", label: "Motor Axis Gimbal Drift Spontan Tanpa Kerusakan Fisik Luar (Cacat Gyro IMU)", category: "hardware" },
  { code: "FACT_LASER_BURN", label: "Luka Bakar Sensor Berupa Titik/Pelangi Akibat Paparan Laser Konser (Kelalaian)", category: "user_fault" },
  { code: "FACT_LDI_RED_CORROSION", label: "Indikator LDI Merah / Terdapat Korosi Oksidasi Cairan (Water Damage)", category: "user_fault" },
  { code: "FACT_OPTICAL_FUNGUS", label: "Jamur Optik Lensa Filamen Akibat Disimpan Tanpa Dry Cabinet (Kelembapan)", category: "user_fault" },
];

export default function EsRmaDiagnosticModal({ isOpen, onClose, returnItem, onSuccess }) {
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [technicianNotes, setTechnicianNotes] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState(null);

  useEffect(() => {
    if (returnItem && isOpen) {
      setSelectedSymptoms([]);
      setTechnicianNotes("");
      setDiagnosticResult(null);

      // Pre-select symptom if customer reason matches
      const reason = (returnItem.reason || "").toLowerCase();
      if (reason.includes("sensor") || reason.includes("pixel")) {
        setSelectedSymptoms(["FACT_DEAD_PIXEL_LINE"]);
      } else if (reason.includes("gimbal") || reason.includes("motor")) {
        setSelectedSymptoms(["FACT_GIMBAL_MOTOR_DRIFT"]);
      } else if (reason.includes("electronic") || reason.includes("hdmi")) {
        setSelectedSymptoms(["FACT_MAINBOARD_PORT_FAIL"]);
      }
    }
  }, [returnItem, isOpen]);

  if (!isOpen || !returnItem) return null;

  function toggleSymptom(code) {
    setSelectedSymptoms((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  }

  async function handleAnalyze() {
    if (selectedSymptoms.length === 0) {
      toast.error("Pilih minimal 1 parameter gejala hasil inspeksi fisik.");
      return;
    }

    setAnalyzing(true);
    try {
      const res = await api.post("/es/diagnose-rma", {
        return_request_id: returnItem.id,
        product_id: returnItem.order?.product_id,
        symptoms: selectedSymptoms,
        technician_notes: technicianNotes,
        execute_action: false,
      });
      setDiagnosticResult(res.data);
      toast.success(`Analisis selesai: ${res.data.verdict_label}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal menjalankan diagnosa pakar.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleApplyDecision() {
    if (!diagnosticResult) return;
    setApplying(true);
    try {
      const res = await api.post("/es/diagnose-rma", {
        return_request_id: returnItem.id,
        product_id: returnItem.order?.product_id,
        symptoms: selectedSymptoms,
        technician_notes: technicianNotes,
        execute_action: true,
      });
      toast.success(`Keputusan pakar berhasil diterapkan ke tiket retur (Status: ${res.data.verdict})`);
      onSuccess?.();
      onClose?.();
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal menerapkan keputusan retur.");
    } finally {
      setApplying(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-2xl rounded-2xl bg-surface border border-line p-6 sm:p-7 shadow-2xl text-ink max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-sm text-ink-muted hover:text-ink hover:bg-surface-muted transition-colors"
          aria-label="Tutup modal"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 border-b border-line pb-4 mb-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-on shadow-sm">
            <Cpu size={22} />
          </div>
          <div>
            <h2 className="font-display text-base font-bold text-ink flex items-center gap-2">
              <span>Sistem Pakar Diagnosa 10-Point QC (ES)</span>
              <span className="rounded-full bg-status-info-bg border border-status-info-border px-2 py-0.5 text-[9px] font-bold text-status-info-text uppercase">
                Forward Chaining + CF
              </span>
            </h2>
            <p className="text-xs text-ink-secondary">
              Evaluasi kepastian cacat produksi resmi vs kelalaian pengguna untuk Tiket #{returnItem.id}
            </p>
          </div>
        </div>

        {/* Info Produk & Klaim Pelanggan */}
        <div className="rounded-md border border-line bg-surface-muted p-3.5 mb-5 space-y-1 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-ink-muted">Unit Hardware:</span>
            <span className="font-bold text-ink">
              {returnItem.order?.product_name || "Cinema Hardware"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-ink-muted">Alasan Pelanggan:</span>
            <span className="font-bold text-accent uppercase">
              {returnItem.reason?.replace(/_/g, " ")}
            </span>
          </div>
          {returnItem.customer_notes && (
            <div className="pt-1.5 border-t border-line text-[11px] text-ink-secondary italic">
              &quot;{returnItem.customer_notes}&quot;
            </div>
          )}
        </div>

        {/* Checklist 10-Point QC Symptoms */}
        <div className="space-y-3 mb-5">
          <label className="block text-xs font-bold uppercase tracking-wider text-ink">
            Checklist Temuan Gejala Fisik (10-Point Sensor &amp; Hardware QC):
          </label>
          <div className="grid gap-2 sm:grid-cols-1">
            {DEFAULT_SYMPTOMS.map((sym) => {
              const isChecked = selectedSymptoms.includes(sym.code);
              return (
                <label
                  key={sym.code}
                  className={`flex items-start gap-3 rounded-md border p-3 cursor-pointer transition-all ${
                    isChecked
                      ? "border-accent bg-accent/5 text-ink shadow-xs"
                      : "border-line bg-surface text-ink-secondary hover:border-line-strong hover:text-ink"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleSymptom(sym.code)}
                    className="mt-0.5 h-4 w-4 rounded accent-accent shrink-0"
                  />
                  <div className="text-xs">
                    <span className="font-semibold block text-ink">{sym.label}</span>
                    <span className="text-[10px] font-mono text-ink-muted uppercase">
                      Code: {sym.code}
                    </span>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Catatan Tambahan Teknisi */}
        <div className="mb-5">
          <label className="block text-xs font-bold text-ink mb-1.5">
            Catatan Tambahan Teknisi Cleanroom:
          </label>
          <input
            type="text"
            value={technicianNotes}
            onChange={(e) => setTechnicianNotes(e.target.value)}
            placeholder="Contoh: Pemeriksaan mikroskop stereo pada sensor cover glass menunjukkan ketiadaan retak..."
            className="ot-input text-xs"
          />
        </div>

        {/* Action Button 1: Analyze */}
        <div className="mb-5">
          <Button
            type="button"
            variant="primary"
            className="w-full justify-center"
            onClick={handleAnalyze}
            disabled={analyzing || selectedSymptoms.length === 0}
            loading={analyzing}
          >
            <Cpu size={15} className="mr-1.5" />
            <span>Jalankan Inferensi Diagnosa Pakar (CF Engine)</span>
          </Button>
        </div>

        {/* Hasil Analisis Pakar */}
        {diagnosticResult && (
          <div className="rounded-lg border border-line-strong bg-surface p-4 space-y-3 mb-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-line pb-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink-secondary">
                Hasil Keputusan Pakar
              </span>
              <span className="text-xs font-bold font-mono bg-surface-muted px-2.5 py-0.5 rounded text-accent">
                CF: {diagnosticResult.confidence_score}%
              </span>
            </div>

            <div className="flex items-start gap-2.5">
              {diagnosticResult.verdict === "APPROVED_WARRANTY_DEFECT" ? (
                <CheckCircle2 size={20} className="text-status-success shrink-0 mt-0.5" />
              ) : (
                <XCircle size={20} className="text-status-danger shrink-0 mt-0.5" />
              )}
              <div>
                <h4
                  className={`text-xs font-bold uppercase tracking-wide ${
                    diagnosticResult.verdict === "APPROVED_WARRANTY_DEFECT"
                      ? "text-status-success"
                      : "text-status-danger"
                  }`}
                >
                  {diagnosticResult.verdict_label}
                </h4>
                <p className="mt-1 text-xs text-ink-secondary leading-relaxed">
                  {diagnosticResult.expert_advice}
                </p>
              </div>
            </div>

            {/* Rujukan SOP KMS */}
            {diagnosticResult.kms_sop_reference && (
              <div className="pt-2 border-t border-line flex items-center gap-2 text-[11px] text-ink-secondary">
                <BookOpen size={13} className="text-accent shrink-0" />
                <span>
                  SOP Terkait: <strong>{diagnosticResult.kms_sop_reference.sop_code}</strong> — {diagnosticResult.kms_sop_reference.title}
                </span>
              </div>
            )}

            {/* Tombol Terapkan Keputusan ke TPS */}
            <div className="pt-3 border-t border-line">
              <Button
                type="button"
                variant={diagnosticResult.verdict === "APPROVED_WARRANTY_DEFECT" ? "primary" : "outline"}
                className="w-full justify-center !text-xs font-bold"
                onClick={handleApplyDecision}
                disabled={applying}
                loading={applying}
              >
                <FileText size={14} className="mr-1.5" />
                <span>
                  Terapkan Keputusan Pakar &amp; Perbarui Status Tiket (TPS x OAS)
                </span>
              </Button>
            </div>
          </div>
        )}

        <div className="border-t border-line pt-3 flex justify-end">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Tutup Jendela
          </Button>
        </div>
      </div>
    </div>
  );
}
