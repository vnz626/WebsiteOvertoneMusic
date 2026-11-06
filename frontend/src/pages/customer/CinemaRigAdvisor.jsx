import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Sparkles,
  Cpu,
  Layers,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Package,
  ArrowRight,
  Camera,
  Film,
  Zap,
  Sliders,
  Maximize2,
  BookOpen,
  ShoppingBag,
  Weight,
  HardDrive,
  BatteryCharging
} from "lucide-react";
import api from "../../api";
import { formatRupiah, fileUrl } from "../../utils/format";

export default function CinemaRigAdvisor() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("recommender"); // 'recommender' | 'checker'

  // ==========================================
  // STATE MODE 1: SHOOT RECOMMENDER
  // ==========================================
  const [shootingType, setShootingType] = useState("wedding");
  const [lightingCondition, setLightingCondition] = useState("low_light");
  const [mobility, setMobility] = useState("handheld_gimbal");
  const [targetResolution, setTargetResolution] = useState("4k_120p");
  const [maxBudget, setMaxBudget] = useState(150000000);
  const [loadingRecommender, setLoadingRecommender] = useState(false);
  const [recommendResult, setRecommendResult] = useState(null);

  // ==========================================
  // STATE MODE 2: COMPATIBILITY CHECKER
  // ==========================================
  const [catalogCameras, setCatalogCameras] = useState([]);
  const [catalogLenses, setCatalogLenses] = useState([]);
  const [catalogGimbals, setCatalogGimbals] = useState([]);
  const [catalogMonitors, setCatalogMonitors] = useState([]);

  const [selectedCameraId, setSelectedCameraId] = useState("");
  const [selectedLensId, setSelectedLensId] = useState("");
  const [selectedGimbalId, setSelectedGimbalId] = useState("");
  const [selectedMonitorId, setSelectedMonitorId] = useState("");
  const [loadingChecker, setLoadingChecker] = useState(false);
  const [compatResult, setCompatResult] = useState(null);

  // Load catalog options for Mode 2
  useEffect(() => {
    api.get("/products?limit=100")
      .then((res) => {
        const items = res.data.data || [];
        const cams = items.filter((p) => (p.category || p.instrument_type || "").includes("Camera"));
        const lenses = items.filter((p) => (p.category || p.instrument_type || "").includes("Lens"));
        const gimbals = items.filter((p) => (p.category || p.instrument_type || "").includes("Gimbal") || (p.category || p.instrument_type || "").includes("Stabilizer"));
        const monitors = items.filter((p) => (p.category || p.instrument_type || "").includes("Monitor"));

        setCatalogCameras(cams);
        setCatalogLenses(lenses);
        setCatalogGimbals(gimbals);
        setCatalogMonitors(monitors);

        if (cams.length > 0) setSelectedCameraId(cams[0].id);
        if (lenses.length > 0) setSelectedLensId(lenses[0].id);
        if (gimbals.length > 0) setSelectedGimbalId(gimbals[0].id);
        if (monitors.length > 0) setSelectedMonitorId(monitors[0].id);
      })
      .catch(() => {});
  }, []);

  // Run Recommender
  function handleRunRecommender(e) {
    if (e) e.preventDefault();
    setLoadingRecommender(true);
    api.post("/es/recommend-gear", {
      shooting_type: shootingType,
      lighting_condition: lightingCondition,
      mobility: mobility,
      target_resolution: targetResolution,
      max_budget: maxBudget,
    })
      .then((res) => {
        setRecommendResult(res.data);
        toast.success(`Inferensi pakar selesai (CF: ${res.data.confidence_score}%)`);
      })
      .catch((err) => {
        toast.error(err.response?.data?.message || "Gagal menjalankan inferensi pakar.");
      })
      .finally(() => setLoadingRecommender(false));
  }

  // Run Compatibility Checker
  function handleRunChecker(e) {
    if (e) e.preventDefault();
    setLoadingChecker(true);
    api.post("/es/check-compatibility", {
      camera_id: selectedCameraId ? Number(selectedCameraId) : null,
      lens_id: selectedLensId ? Number(selectedLensId) : null,
      gimbal_id: selectedGimbalId ? Number(selectedGimbalId) : null,
      monitor_id: selectedMonitorId ? Number(selectedMonitorId) : null,
    })
      .then((res) => {
        setCompatResult(res.data);
        if (res.data.verdict === "OPTIMAL_COMPATIBLE") {
          toast.success("Rig 100% kompatibel dan siap syuting!");
        } else {
          toast("Catatan kompatibilitas terdeteksi.", { icon: "⚠️" });
        }
      })
      .catch((err) => {
        toast.error(err.response?.data?.message || "Gagal memvalidasi kompatibilitas rig.");
      })
      .finally(() => setLoadingChecker(false));
  }

  // Trigger initial recommender on mount
  useEffect(() => {
    handleRunRecommender();
  }, []);

  return (
    <div className="min-h-screen fp-home-canvas text-[#0F1B2D] pb-24">
      {/* Top Glass Header Bar */}
      <div className="border-b border-[#0F1B2D]/10 bg-white/70 backdrop-blur-md sticky top-0 z-30">
        <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-12">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="fp-section-pill mb-2">
                <Cpu size={12} className="text-[#E8622C]" aria-hidden="true" />
                <span>Subsistem ke-6: Expert System · Forward Chaining &amp; CF Engine</span>
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0F1B2D]">
                Cinema Rig Advisor &amp; Compatibility Engine
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-[#475569] max-w-2xl leading-relaxed">
                Asisten kecerdasan pakar ritel untuk merekomendasikan setup kamera bioskop, lensa prime, gimbal, pencahayaan, media, dan daya berdasarkan kaidah teknis sinematografi terverifikasi.
              </p>
            </div>

            {/* Mode Switcher Capsule */}
            <div className="flex items-center gap-1.5 rounded-full border border-white/80 bg-white/60 p-1.5 shadow-xs backdrop-blur-md self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setActiveTab("recommender")}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all ${
                  activeTab === "recommender"
                    ? "bg-[#E8622C] text-white shadow-md shadow-[#E8622C]/20"
                    : "text-[#475569] hover:text-[#0F1B2D] hover:bg-white/80"
                }`}
              >
                <Sparkles size={14} aria-hidden="true" />
                <span>Smart Shoot Recommender</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("checker");
                  if (!compatResult && selectedCameraId) handleRunChecker();
                }}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all ${
                  activeTab === "checker"
                    ? "bg-[#0F1B2D] text-white shadow-md"
                    : "text-[#475569] hover:text-[#0F1B2D] hover:bg-white/80"
                }`}
              >
                <Layers size={14} aria-hidden="true" />
                <span>Rig Compatibility Validator</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1440px] px-4 pt-8 sm:px-6 lg:px-12">
        {/* ================================================================= */}
        {/* TAB 1: SMART SHOOT RECOMMENDER                                    */}
        {/* ================================================================= */}
        {activeTab === "recommender" && (
          <div className="grid gap-8 lg:grid-cols-12 items-start">
            {/* Kolom Kiri: Form Parameter Skenario Syuting */}
            <div className="lg:col-span-4 fp-glass-card !p-6 sm:!p-7 shadow-xl">
              <div className="flex items-center justify-between border-b border-[#0F1B2D]/10 pb-4 mb-5">
                <div>
                  <h2 className="font-display text-base font-bold text-[#0F1B2D] flex items-center gap-2">
                    <Sliders size={18} className="text-[#E8622C]" aria-hidden="true" />
                    <span>Parameter Kebutuhan Syuting</span>
                  </h2>
                  <p className="text-[11px] text-[#64748B] mt-0.5">
                    Basis fakta untuk penarikan kesimpulan forward chaining
                  </p>
                </div>
              </div>

              <form onSubmit={handleRunRecommender} className="space-y-4">
                {/* 1. Skenario Proyek */}
                <div>
                  <label className="block text-xs font-bold text-[#0F1B2D] mb-1.5">
                    1. Jenis Proyek / Skenario Syuting
                  </label>
                  <select
                    value={shootingType}
                    onChange={(e) => setShootingType(e.target.value)}
                    className="w-full rounded-2xl border border-[#0F1B2D]/15 bg-white/85 px-3.5 py-2.5 text-xs text-[#0F1B2D] focus:border-[#E8622C] focus:outline-none transition-all shadow-xs"
                  >
                    <option value="wedding">Wedding &amp; Event Run-and-Gun Cepat</option>
                    <option value="commercial">Iklan Komersial / Film Bioskop Naratif 6K</option>
                    <option value="documentary">Dokumenter Alam &amp; Low-Light Guerrilla</option>
                    <option value="broadcast">Multi-Cam Live Podcast / Siaran TV Broadcast</option>
                    <option value="studio">Studio Controlled 3-Point Lighting &amp; Product</option>
                  </select>
                </div>

                {/* 2. Kondisi Pencahayaan */}
                <div>
                  <label className="block text-xs font-bold text-[#0F1B2D] mb-1.5">
                    2. Kondisi Pencahayaan Utama
                  </label>
                  <select
                    value={lightingCondition}
                    onChange={(e) => setLightingCondition(e.target.value)}
                    className="w-full rounded-2xl border border-[#0F1B2D]/15 bg-white/85 px-3.5 py-2.5 text-xs text-[#0F1B2D] focus:border-[#E8622C] focus:outline-none transition-all shadow-xs"
                  >
                    <option value="low_light">Ekstrem Low-Light / Malam Hari (Tanpa Lighting Berat)</option>
                    <option value="studio_controlled">Full Studio Controlled (Key, Fill, Rim Light)</option>
                    <option value="outdoor_daylight">Outdoor Daylight Terik (Perlu Lampu High Output)</option>
                  </select>
                </div>

                {/* 3. Kebutuhan Mobilitas */}
                <div>
                  <label className="block text-xs font-bold text-[#0F1B2D] mb-1.5">
                    3. Gaya Operasional Kamera
                  </label>
                  <select
                    value={mobility}
                    onChange={(e) => setMobility(e.target.value)}
                    className="w-full rounded-2xl border border-[#0F1B2D]/15 bg-white/85 px-3.5 py-2.5 text-xs text-[#0F1B2D] focus:border-[#E8622C] focus:outline-none transition-all shadow-xs"
                  >
                    <option value="handheld_gimbal">Stabilisasi Gimbal 3-Axis / Handheld Bergerak Aktif</option>
                    <option value="tripod_studio">Tripod Cinema Kokoh / Studio Pedestal</option>
                    <option value="cinema_rig">Shoulder Rig Berat Lengkap Matte Box &amp; V-Mount</option>
                  </select>
                </div>

                {/* 4. Target Resolusi & Codec */}
                <div>
                  <label className="block text-xs font-bold text-[#0F1B2D] mb-1.5">
                    4. Target Resolusi &amp; Frame Rate
                  </label>
                  <select
                    value={targetResolution}
                    onChange={(e) => setTargetResolution(e.target.value)}
                    className="w-full rounded-2xl border border-[#0F1B2D]/15 bg-white/85 px-3.5 py-2.5 text-xs text-[#0F1B2D] focus:border-[#E8622C] focus:outline-none transition-all shadow-xs"
                  >
                    <option value="4k_120p">4K 120 FPS High Frame Rate Slow Motion</option>
                    <option value="6k_raw">6K / 8K Uncompressed Cinema RAW (16-bit)</option>
                    <option value="4k_24p">Standard Cinematic 4K 24 FPS (All-Intra 10-bit 4:2:2)</option>
                  </select>
                </div>

                {/* 5. Pagu Anggaran Maksimal */}
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-[#0F1B2D] mb-1.5">
                    <span>5. Pagu Anggaran Maksimal</span>
                    <span className="text-[#E8622C] font-mono tabular-nums">{formatRupiah(maxBudget)}</span>
                  </div>
                  <input
                    type="range"
                    min={40000000}
                    max={300000000}
                    step={10000000}
                    value={maxBudget}
                    onChange={(e) => setMaxBudget(Number(e.target.value))}
                    className="w-full accent-[#E8622C] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-[#64748B] font-mono">
                    <span>Rp 40 Jt</span>
                    <span>Rp 150 Jt</span>
                    <span>Rp 300 Jt+</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loadingRecommender}
                  className="w-full fp-btn-glass-primary !py-3 !rounded-2xl !bg-[#E8622C] hover:!bg-[#d45522] !shadow-lg text-white font-bold flex items-center justify-center gap-2 mt-4"
                >
                  <Cpu size={16} aria-hidden="true" />
                  <span>{loadingRecommender ? "Menjalankan Inferensi..." : "Jalankan Inferensi Pakar (ES)"}</span>
                </button>
              </form>

              {/* Rujukan SOP KMS */}
              {recommendResult?.kms_reference && (
                <div className="mt-6 rounded-2xl border border-white/80 bg-white/60 p-4">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#E8622C] mb-1">
                    <BookOpen size={12} aria-hidden="true" />
                    <span>Rujukan Pengetahuan Resmi KMS</span>
                  </div>
                  <h4 className="font-display text-xs font-bold text-[#0F1B2D]">
                    {recommendResult.kms_reference.title}
                  </h4>
                  {recommendResult.kms_reference.sop_code && (
                    <span className="inline-block mt-1 text-[10px] font-mono bg-[#0F1B2D]/5 px-2 py-0.5 rounded text-[#475569]">
                      Kode SOP: {recommendResult.kms_reference.sop_code}
                    </span>
                  )}
                  <p className="mt-1 text-[11px] text-[#64748B] line-clamp-2 leading-relaxed">
                    {recommendResult.kms_reference.excerpt}
                  </p>
                </div>
              )}
            </div>

            {/* Kolom Kanan: Hasil Inferensi & Rekomendasi Gear */}
            <div className="lg:col-span-8 space-y-6">
              {recommendResult ? (
                <>
                  {/* Banner Hasil Kesimpulan & Skor CF */}
                  <div className="fp-glass-card !p-6 sm:!p-7 shadow-xl border-l-4 border-l-[#E8622C]">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-0.5 text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                            <CheckCircle2 size={13} aria-hidden="true" />
                            <span>Tingkat Kepastian: {recommendResult.confidence_score}% Certainty Factor</span>
                          </span>
                          <span className="text-[11px] font-mono text-[#64748B]">
                            {recommendResult.session_code}
                          </span>
                        </div>
                        <h2 className="font-display text-xl sm:text-2xl font-extrabold text-[#0F1B2D]">
                          {recommendResult.scenario_title}
                        </h2>
                        <p className="mt-2 text-xs sm:text-sm text-[#475569] leading-relaxed">
                          {recommendResult.expert_advice}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[11px] font-semibold text-[#64748B] block uppercase tracking-wider">
                          Estimasi Total Paket Rig
                        </span>
                        <span className="font-display text-xl sm:text-2xl font-extrabold text-[#E8622C] font-mono">
                          {formatRupiah(recommendResult.total_kit_price)}
                        </span>
                        {recommendResult.is_within_budget ? (
                          <span className="inline-block mt-1 text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                            ✓ Sesuai Pagu Anggaran
                          </span>
                        ) : (
                          <span className="inline-block mt-1 text-[10px] font-bold text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-full">
                            Melebihi Anggaran Standar
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Matched Rules Pills */}
                    {recommendResult.matched_rules?.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-[#0F1B2D]/10 flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                          Aturan Pakar Terpicu:
                        </span>
                        {recommendResult.matched_rules.map((r) => (
                          <span
                            key={r.rule_code}
                            className="rounded-full bg-white/80 border border-[#0F1B2D]/10 px-2.5 py-0.5 text-[10px] font-bold text-[#0F1B2D]"
                          >
                            {r.rule_code} (CF: {Math.round(r.cf * 100)}%)
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Grid 6 Komponen Rig Rekomendasi */}
                  <div>
                    <div className="flex items-center justify-between mb-3.5">
                      <h3 className="font-display text-base font-bold text-[#0F1B2D] flex items-center gap-2">
                        <Camera size={18} className="text-[#E8622C]" aria-hidden="true" />
                        <span>Komponen Rig Sinema Terintegrasi (Turnkey Ready)</span>
                      </h3>
                      <span className="text-xs text-[#64748B]">
                        {recommendResult.kit_items?.length} Alat Terpilih
                      </span>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {recommendResult.kit_items?.map((item) => (
                        <div
                          key={item.product_id}
                          className="fp-glass-card !p-4 flex flex-col justify-between group hover:border-[#E8622C]/40 transition-all shadow-md"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className="rounded-full bg-[#E8622C]/10 border border-[#E8622C]/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#E8622C] truncate">
                                {item.role}
                              </span>
                              <span className="text-[10px] font-bold text-[#64748B] uppercase">
                                {item.brand}
                              </span>
                            </div>

                            <div className="aspect-square w-full fp-glass-stage rounded-2xl p-3 flex items-center justify-center overflow-hidden mb-3">
                              {item.image_url ? (
                                <img
                                  src={fileUrl(item.image_url)}
                                  alt={item.name}
                                  className="h-full w-full object-contain group-hover:scale-105 transition-transform"
                                />
                              ) : (
                                <Package size={36} className="text-[#64748B]/40" />
                              )}
                            </div>

                            <h4 className="font-display text-xs font-bold text-[#0F1B2D] line-clamp-2 leading-snug">
                              {item.name}
                            </h4>
                          </div>

                          <div className="mt-3 pt-3 border-t border-[#0F1B2D]/10 flex items-center justify-between gap-2">
                            <div>
                              <span className="text-[10px] text-[#64748B] block">Harga Resmi</span>
                              <span className="font-display text-sm font-bold text-[#E8622C] font-mono">
                                {formatRupiah(item.price)}
                              </span>
                            </div>
                            <Link
                              to={`/products/${item.product_id}`}
                              className="rounded-full bg-white/80 border border-white hover:border-[#E8622C] p-2 text-[#0F1B2D] transition-colors"
                              title="Lihat Spesifikasi Lengkap"
                            >
                              <ArrowRight size={14} aria-hidden="true" />
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Rekomendasi Media & Daya Pakar */}
                  {recommendResult.media_power_advice?.length > 0 && (
                    <div className="fp-glass-card !p-6 shadow-xl">
                      <h3 className="font-display text-sm font-bold text-[#0F1B2D] flex items-center gap-2 mb-3.5">
                        <Zap size={16} className="text-[#E8622C]" aria-hidden="true" />
                        <span>Rekomendasi Media Rekam &amp; Distribusi Daya (Power Delivery)</span>
                      </h3>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {recommendResult.media_power_advice.map((adv, idx) => (
                          <div
                            key={idx}
                            className="rounded-2xl border border-white/80 bg-white/70 p-4 space-y-1.5"
                          >
                            <div className="flex items-center gap-2">
                              {adv.type === "STORAGE_MEDIA" ? (
                                <HardDrive size={16} className="text-sky-600" />
                              ) : (
                                <BatteryCharging size={16} className="text-amber-600" />
                              )}
                              <span className="text-xs font-bold text-[#0F1B2D]">
                                {adv.recommendation}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#475569] leading-relaxed">
                              {adv.technical_reason}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Bottom Action CTA */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-3xl bg-gradient-to-r from-[#0F1B2D] to-[#1A2D4A] p-6 text-white shadow-xl">
                    <div>
                      <h4 className="font-display text-base font-bold text-white">
                        Siap Menguji Rig di Showroom Terdekat?
                      </h4>
                      <p className="text-xs text-white/75 mt-0.5">
                        Pesan paket ini sekarang dengan Click &amp; Collect untuk gratis uji coba di Studio Camera Test Bay.
                      </p>
                    </div>
                    <Link
                      to="/checkout"
                      className="rounded-full bg-[#E8622C] hover:bg-[#d45522] px-6 py-3 text-xs font-bold text-white shadow-lg transition-all flex items-center gap-2 shrink-0"
                    >
                      <ShoppingBag size={15} />
                      <span>Lanjut ke Formulir Pemesanan</span>
                    </Link>
                  </div>
                </>
              ) : (
                <div className="fp-glass-card !p-12 text-center max-w-md mx-auto">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/80 border border-white text-[#64748B] mb-3 shadow-xs">
                    <Cpu size={26} className="text-[#E8622C]" />
                  </div>
                  <h3 className="font-display font-bold text-[#0F1B2D] text-base">
                    Pilih Parameter &amp; Jalankan Inferensi
                  </h3>
                  <p className="mt-1 text-xs text-[#64748B] max-w-sm mx-auto">
                    Pilih skenario syuting di sebelah kiri untuk menghasilkan konfigurasi gear bioskop yang optimal.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 2: INTERACTIVE RIG COMPATIBILITY VALIDATOR                    */}
        {/* ================================================================= */}
        {activeTab === "checker" && (
          <div className="grid gap-8 lg:grid-cols-12 items-start">
            {/* Kolom Kiri: Form Seleksi Komponen Rig */}
            <div className="lg:col-span-5 fp-glass-card !p-6 sm:!p-7 shadow-xl">
              <div className="border-b border-[#0F1B2D]/10 pb-4 mb-5">
                <h2 className="font-display text-base font-bold text-[#0F1B2D] flex items-center gap-2">
                  <Layers size={18} className="text-[#E8622C]" aria-hidden="true" />
                  <span>Pilih Kombinasi Komponen Rig Sinema</span>
                </h2>
                <p className="text-[11px] text-[#64748B] mt-0.5">
                  Validasi kecocokan flange focal distance, optical crop, dan payload gimbal
                </p>
              </div>

              <form onSubmit={handleRunChecker} className="space-y-4">
                {/* 1. Kamera Body */}
                <div>
                  <label className="block text-xs font-bold text-[#0F1B2D] mb-1.5 flex items-center gap-1.5">
                    <Camera size={14} className="text-[#E8622C]" />
                    <span>Bodi Kamera Utama (Core Sensor)</span>
                  </label>
                  <select
                    value={selectedCameraId}
                    onChange={(e) => setSelectedCameraId(e.target.value)}
                    className="w-full rounded-2xl border border-[#0F1B2D]/15 bg-white/85 px-3.5 py-2.5 text-xs text-[#0F1B2D] focus:border-[#E8622C] focus:outline-none transition-all shadow-xs"
                  >
                    {catalogCameras.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.brand?.name || "Official"})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Lensa */}
                <div>
                  <label className="block text-xs font-bold text-[#0F1B2D] mb-1.5 flex items-center gap-1.5">
                    <Film size={14} className="text-[#E8622C]" />
                    <span>Lensa Prime / Cine Zoom</span>
                  </label>
                  <select
                    value={selectedLensId}
                    onChange={(e) => setSelectedLensId(e.target.value)}
                    className="w-full rounded-2xl border border-[#0F1B2D]/15 bg-white/85 px-3.5 py-2.5 text-xs text-[#0F1B2D] focus:border-[#E8622C] focus:outline-none transition-all shadow-xs"
                  >
                    {catalogLenses.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name} ({l.brand?.name || "Official"})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Gimbal Stabilizer */}
                <div>
                  <label className="block text-xs font-bold text-[#0F1B2D] mb-1.5 flex items-center gap-1.5">
                    <Maximize2 size={14} className="text-[#E8622C]" />
                    <span>Gimbal Stabilizer 3-Axis</span>
                  </label>
                  <select
                    value={selectedGimbalId}
                    onChange={(e) => setSelectedGimbalId(e.target.value)}
                    className="w-full rounded-2xl border border-[#0F1B2D]/15 bg-white/85 px-3.5 py-2.5 text-xs text-[#0F1B2D] focus:border-[#E8622C] focus:outline-none transition-all shadow-xs"
                  >
                    {catalogGimbals.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g.brand?.name || "Official"})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 4. Field Monitor & Recorder */}
                <div>
                  <label className="block text-xs font-bold text-[#0F1B2D] mb-1.5 flex items-center gap-1.5">
                    <HardDrive size={14} className="text-[#E8622C]" />
                    <span>Monitor Lapangan / Field Recorder</span>
                  </label>
                  <select
                    value={selectedMonitorId}
                    onChange={(e) => setSelectedMonitorId(e.target.value)}
                    className="w-full rounded-2xl border border-[#0F1B2D]/15 bg-white/85 px-3.5 py-2.5 text-xs text-[#0F1B2D] focus:border-[#E8622C] focus:outline-none transition-all shadow-xs"
                  >
                    {catalogMonitors.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.brand?.name || "Official"})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={loadingChecker}
                  className="w-full fp-btn-glass-primary !py-3 !rounded-2xl !bg-[#0F1B2D] hover:!bg-black !shadow-lg text-white font-bold flex items-center justify-center gap-2 mt-4"
                >
                  <Layers size={16} aria-hidden="true" />
                  <span>{loadingChecker ? "Menganalisis Kompatibilitas..." : "Uji Kompatibilitas Fisik & Torsi (ES)"}</span>
                </button>
              </form>
            </div>

            {/* Kolom Kanan: Laporan Kompatibilitas Pakar */}
            <div className="lg:col-span-7 space-y-6">
              {compatResult ? (
                <>
                  {/* Status Banner */}
                  <div
                    className={`fp-glass-card !p-6 sm:!p-7 shadow-xl border-l-4 ${
                      compatResult.verdict === "OPTIMAL_COMPATIBLE"
                        ? "border-l-emerald-500"
                        : compatResult.verdict === "NEEDS_ADAPTER_OR_CAGE"
                        ? "border-l-amber-500"
                        : "border-l-rose-500"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span
                            className={`rounded-full px-3 py-0.5 text-xs font-bold flex items-center gap-1.5 ${
                              compatResult.verdict === "OPTIMAL_COMPATIBLE"
                                ? "bg-emerald-500/15 text-emerald-800 border border-emerald-500/30"
                                : compatResult.verdict === "NEEDS_ADAPTER_OR_CAGE"
                                ? "bg-amber-500/15 text-amber-800 border border-amber-500/30"
                                : "bg-rose-500/15 text-rose-800 border border-rose-500/30"
                            }`}
                          >
                            {compatResult.verdict === "OPTIMAL_COMPATIBLE" ? (
                              <CheckCircle2 size={14} />
                            ) : compatResult.verdict === "NEEDS_ADAPTER_OR_CAGE" ? (
                              <AlertTriangle size={14} />
                            ) : (
                              <XCircle size={14} />
                            )}
                            <span>{compatResult.status_label}</span>
                          </span>
                          <span className="text-[11px] font-mono text-[#64748B]">
                            CF: {compatResult.confidence_score}%
                          </span>
                        </div>
                        <h3 className="font-display text-lg sm:text-xl font-bold text-[#0F1B2D]">
                          Laporan Verifikasi Kompatibilitas Rig
                        </h3>
                        <p className="mt-1 text-xs text-[#475569] leading-relaxed">
                          {compatResult.expert_advice}
                        </p>
                      </div>
                    </div>

                    {/* Quick Specs Matrix */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-5 pt-4 border-t border-[#0F1B2D]/10">
                      <div className="rounded-xl bg-white/70 p-2.5">
                        <span className="text-[10px] text-[#64748B] block">Mount Kamera</span>
                        <span className="text-xs font-bold text-[#0F1B2D] truncate block">
                          {compatResult.camera_mount}
                        </span>
                      </div>
                      <div className="rounded-xl bg-white/70 p-2.5">
                        <span className="text-[10px] text-[#64748B] block">Mount Lensa</span>
                        <span className="text-xs font-bold text-[#0F1B2D] truncate block">
                          {compatResult.lens_mount}
                        </span>
                      </div>
                      <div className="rounded-xl bg-white/70 p-2.5">
                        <span className="text-[10px] text-[#64748B] block">Bobot Total Rig</span>
                        <span className="text-xs font-bold text-[#0F1B2D] font-mono">
                          {compatResult.total_rig_weight_kg} kg
                        </span>
                      </div>
                      <div className="rounded-xl bg-white/70 p-2.5">
                        <span className="text-[10px] text-[#64748B] block">Beban Gimbal</span>
                        <span className="text-xs font-bold text-[#0F1B2D] font-mono">
                          {compatResult.payload_utilization_pct}% ({compatResult.gimbal_max_payload_kg} kg max)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* List Catatan Isu & Solusi */}
                  {compatResult.issues?.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-display text-xs font-bold uppercase tracking-wider text-[#0F1B2D] flex items-center gap-1.5">
                        <AlertTriangle size={14} className="text-amber-500" />
                        <span>Catatan Ketidakcocokan &amp; Solusi Adapter</span>
                      </h4>
                      {compatResult.issues.map((iss, i) => (
                        <div
                          key={i}
                          className="rounded-2xl border border-amber-300/80 bg-amber-50/80 p-4 space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-amber-900">
                              {iss.label}
                            </span>
                            <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-200/60 px-2 py-0.5 rounded">
                              CF: {Math.round(iss.cf * 100)}%
                            </span>
                          </div>
                          <p className="text-xs text-amber-800">{iss.detail}</p>
                          <div className="pt-1.5 border-t border-amber-200 text-xs font-semibold text-amber-950 flex items-center gap-1.5">
                            <ShieldCheck size={13} className="text-emerald-700 shrink-0" />
                            <span>Solusi Pakar: {iss.solution}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* List Parameter Terverifikasi Aman */}
                  {compatResult.successes?.length > 0 && (
                    <div className="space-y-2.5">
                      <h4 className="font-display text-xs font-bold uppercase tracking-wider text-[#0F1B2D] flex items-center gap-1.5">
                        <CheckCircle2 size={14} className="text-emerald-500" />
                        <span>Parameter Fisik Terverifikasi Aman</span>
                      </h4>
                      {compatResult.successes.map((s, idx) => (
                        <div
                          key={idx}
                          className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3.5 flex items-start gap-3"
                        >
                          <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="text-xs font-bold text-emerald-950 block">
                              {s.label}
                            </span>
                            <span className="text-[11px] text-emerald-850 text-emerald-800">
                              {s.detail}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="fp-glass-card !p-12 text-center max-w-md mx-auto">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/80 border border-white text-[#64748B] mb-3 shadow-xs">
                    <Layers size={26} className="text-[#0F1B2D]" />
                  </div>
                  <h3 className="font-display font-bold text-[#0F1B2D] text-base">
                    Pilih Komponen &amp; Jalankan Uji
                  </h3>
                  <p className="mt-1 text-xs text-[#64748B] max-w-sm mx-auto">
                    Pilih bodi kamera, lensa, dan gimbal di sebelah kiri untuk menganalisis kecocokan fisik.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
