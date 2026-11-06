import React, { useState, useEffect } from "react";
import {
  Clock,
  Store,
  Headphones,
  MapPin,
  CheckCircle2,
  ArrowRight,
  Shield,
  AlertCircle,
} from "lucide-react";
import api from "../../api";

export default function StaffAttendanceGate({ user, onShiftStarted, branches = [] }) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedMode, setSelectedMode] = useState("offline_store");
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (branches.length > 0 && !selectedBranchId) {
      setSelectedBranchId(branches[0].id);
    }
  }, [branches]);

  const formattedTime = currentTime.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const formattedDate = currentTime.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const staffName = user?.name || user?.username || "Staf Focalpoint.pro";

  const handleClockIn = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (selectedMode === "offline_store" && !selectedBranchId) {
      setErrorMsg("Silakan pilih cabang Offline Store tempat Anda bertugas hari ini.");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        shift_mode: selectedMode,
        branch_id: selectedMode === "offline_store" ? parseInt(selectedBranchId, 10) : null,
        notes: notes.trim(),
      };

      const res = await api.post("/store/shift/check-in", payload);
      const shiftData = res.data?.data;
      if (onShiftStarted) {
        onShiftStarted(shiftData, selectedMode);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(
        err.response?.data?.message ||
          "Gagal mencatat presensi masuk. Periksa koneksi jaringan dan coba kembali."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-4 sm:p-8 bg-canvas">
      <div className="w-full max-w-2xl rounded-lg bg-surface border border-line-strong shadow-sm p-6 sm:p-10">
        {/* Header Status & Waktu Aktual */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-line gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-xs bg-status-warning-bg border border-status-warning-border text-status-warning-text text-[10px] font-bold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden="true" />
                <span>Shift Belum Aktif (Wajib Clock-In)</span>
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-ink mt-2">
              Selamat Bertugas, {staffName}
            </h1>
            <p className="text-xs text-ink-secondary mt-1">
              Pilih penugasan kerja hari ini untuk membuka konsol operasional Focalpoint.pro.
            </p>
          </div>

          <div className="sm:text-right bg-surface-muted p-3 rounded-sm border border-line">
            <div className="text-xl sm:text-2xl tabular-nums font-display font-bold text-ink tracking-tight flex sm:justify-end items-center gap-1.5">
              <Clock className="w-4 h-4 text-accent" aria-hidden="true" />
              <span>{formattedTime}</span>
              <span className="text-xs font-sans font-bold text-ink-muted">WIB</span>
            </div>
            <div className="text-[11px] text-ink-secondary font-medium capitalize mt-0.5">
              {formattedDate}
            </div>
          </div>
        </div>

        {/* Peringatan Error */}
        {errorMsg && (
          <div
            role="alert"
            className="mt-6 p-3 rounded-sm bg-status-danger-bg border border-status-danger-border text-status-danger-text text-xs font-bold flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Formulir Presensi */}
        <form onSubmit={handleClockIn} className="mt-7 space-y-6">
          <fieldset>
            <legend className="block text-xs font-bold uppercase tracking-wider text-ink mb-3">
              Pilih Mode Penugasan Hari Ini (Wajib)
            </legend>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Opsi 1: Offline Store */}
              <button
                type="button"
                aria-pressed={selectedMode === "offline_store"}
                onClick={() => setSelectedMode("offline_store")}
                className={`relative p-5 rounded-md border text-left transition-colors duration-fast ${
                  selectedMode === "offline_store"
                    ? "border-accent bg-accent-subtle/40 ring-1 ring-accent"
                    : "border-line bg-surface hover:border-line-strong hover:bg-surface-muted"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`p-2 rounded-sm border ${
                        selectedMode === "offline_store"
                          ? "bg-accent text-accent-on border-accent"
                          : "bg-surface-muted text-ink-secondary border-line"
                      }`}
                      aria-hidden="true"
                    >
                      <Store className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="font-display text-sm font-bold text-ink">
                        Mode 1: Staf Offline Store
                      </h2>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                        Kasir &amp; Cabang Fisik
                      </span>
                    </div>
                  </div>
                  {selectedMode === "offline_store" && (
                    <CheckCircle2 className="w-4 h-4 text-accent shrink-0" aria-hidden="true" />
                  )}
                </div>

                <p className="text-[11px] text-ink-secondary mt-3 leading-relaxed">
                  Bertugas di lantai cabang fisik: Kasir POS Walk-In, serah-terima Click &amp; Collect, dan pengecekan stok cabang.
                </p>
              </button>

              {/* Opsi 2: Online CS */}
              <button
                type="button"
                aria-pressed={selectedMode === "online_cs"}
                onClick={() => setSelectedMode("online_cs")}
                className={`relative p-5 rounded-md border text-left transition-colors duration-fast ${
                  selectedMode === "online_cs"
                    ? "border-accent bg-accent-subtle/40 ring-1 ring-accent"
                    : "border-line bg-surface hover:border-line-strong hover:bg-surface-muted"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`p-2 rounded-sm border ${
                        selectedMode === "online_cs"
                          ? "bg-accent text-accent-on border-accent"
                          : "bg-surface-muted text-ink-secondary border-line"
                      }`}
                      aria-hidden="true"
                    >
                      <Headphones className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="font-display text-sm font-bold text-ink">
                        Mode 2: Staf Online &amp; CS
                      </h2>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                        Live Chat &amp; Helpdesk
                      </span>
                    </div>
                  </div>
                  {selectedMode === "online_cs" && (
                    <CheckCircle2 className="w-4 h-4 text-accent shrink-0" aria-hidden="true" />
                  )}
                </div>

                <p className="text-[11px] text-ink-secondary mt-3 leading-relaxed">
                  Bertugas secara daring: Konsultasi Live Chat Concierge, verifikasi klaim retur/garansi, serta informasi stok lintas cabang.
                </p>
              </button>
            </div>
          </fieldset>

          {selectedMode === "offline_store" && (
            <div className="p-4 rounded-md bg-surface-muted border border-line-strong space-y-2">
              <label
                htmlFor="gate-branch-select"
                className="block text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-1.5"
              >
                <MapPin className="w-3.5 h-3.5 text-accent" aria-hidden="true" />
                <span>Pilih Lokasi Cabang Offline Store Penempatan *</span>
              </label>
              <select
                id="gate-branch-select"
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                required
                className="ot-input"
              >
                <option value="" disabled>
                  -- Pilih Cabang Offline Store Penempatan --
                </option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.city || "Cabang Resmi"})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-ink-secondary">
                Seluruh pemotongan stok Kasir POS Walk-In otomatis tercatat pada cabang ini.
              </p>
            </div>
          )}

          <div>
            <label
              htmlFor="gate-shift-notes"
              className="block text-xs font-bold uppercase tracking-wider text-ink mb-1.5"
            >
              Catatan Shift (Opsional)
            </label>
            <input
              id="gate-shift-notes"
              type="text"
              placeholder="Contoh: Shift Pagi, pemeriksaan display gitar akustik & meja kasir..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="ot-input"
            />
          </div>

          <div className="pt-4 border-t border-line flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-[11px] text-ink-secondary">
              <Shield className="w-3.5 h-3.5 text-status-success-text shrink-0" aria-hidden="true" />
              <span>Presensi digital terverifikasi dan tercatat di server OAS.</span>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 rounded-sm bg-accent hover:bg-accent-hover text-accent-on text-xs font-bold uppercase tracking-wider transition-colors duration-fast disabled:opacity-55"
            >
              {submitting ? (
                "Mencatat Presensi..."
              ) : (
                <>
                  <span>Clock-In &amp; Buka Ruang Kerja</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
