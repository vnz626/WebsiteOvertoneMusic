import { Link } from "react-router-dom";
import { ArrowRight, Award, Store, Truck, CheckCircle2 } from "lucide-react";

/**
 * Seksi Editorial Asimetris Focalpoint Pro (Glassmorphism Design System):
 * Standar teknis kalibrasi sensor, cleanroom QC, dan pengiriman berproteksi penuh.
 */
export default function Editorial() {
  return (
    <section
      aria-labelledby="editorial-heading"
      className="py-16 lg:py-24 relative z-10 border-t border-white/70"
    >
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-12">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
          {/* Kolom Kiri (5 Kolom): Frosted Glass Manifesto Card */}
          <div className="lg:col-span-5 lg:sticky lg:top-24 fp-glass-card p-7 sm:p-9 space-y-5">
            <div className="fp-section-pill">
              <span className="fp-section-pill-dot" aria-hidden="true" />
              <span>Standar Kalibrasi Sensor &amp; QC Cinema</span>
            </div>

            <h2
              id="editorial-heading"
              className="font-display text-2xl sm:text-3xl lg:text-[34px] font-bold text-[#0F1B2D] tracking-tight leading-[1.12]"
            >
              Setiap Kamera &amp; Lensa Diuji Kalibrasi Sensor{" "}
              <span className="text-[#3A4A63] font-semibold">
                Serta Firmware Sebelum Diserahkan.
              </span>
            </h2>

            <p className="text-sm text-[#2C3D52] leading-relaxed editorial-measure">
              Berbeda dari ritel umum, setiap kamera sinema, lensa prime,
              gimbal, dan monitor lapangan di{" "}
              <strong className="font-bold text-[#0F1B2D]">
                Focalpoint Pro
              </strong>{" "}
              melewati tahap pengujian <em>cleanroom</em> bebas debu mikro,
              pemeriksaan <em>dead pixel</em> pada sensor, verifikasi nomor seri
              pabrik, serta pembaruan firmware produksi terbaru.
            </p>

            <div className="pt-2 flex flex-wrap gap-3">
              <Link to="/offline-stores" className="fp-btn-glass-primary">
                <span>Kunjungi 5 Cabang Showroom</span>
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
              <Link to="/help" className="fp-btn-glass-secondary">
                <span>Baca SOP Garansi &amp; Kalibrasi</span>
              </Link>
            </div>
          </div>

          {/* Kolom Kanan (7 Kolom): Susunan Kartu Glass Spesifikasi Layanan */}
          <div className="lg:col-span-7 space-y-4">
            <article className="fp-glass-card p-6 sm:p-7 flex flex-col sm:flex-row gap-4 sm:items-start justify-between">
              <div className="flex gap-4 items-start max-w-xl">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#E8622C]/12 border border-[#E8622C]/25 text-[#E8622C]"
                  aria-hidden="true"
                >
                  <Award size={20} />
                </div>
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#E8622C]">
                    01 / Inspeksi 10-Point Sensor Calibration &amp; Firmware QC
                  </span>
                  <h3 className="font-display text-base sm:text-lg font-bold text-[#0F1B2D]">
                    Dead Pixel Scan, Back-Focus Lensa, dan Firmware Siap
                    Produksi
                  </h3>
                  <p className="text-xs sm:text-sm text-[#3A4A63] leading-relaxed">
                    Teknisi kami memeriksa kebersihan <em>sensor chamber</em>{" "}
                    pada aperture f/22, akurasi <em>back-focus</em> lensa
                    sinematik, kestabilan <em>active cooling fan</em>, serta
                    instalasi firmware terbaru sebelum unit diserahkan.
                  </p>
                </div>
              </div>
              <span className="shrink-0 self-start rounded-full bg-emerald-500/12 border border-emerald-600/25 px-3.5 py-1 text-[11px] font-bold text-emerald-900 inline-flex items-center gap-1.5 backdrop-blur-md">
                <CheckCircle2 size={13} aria-hidden="true" />
                <span>Gratis Kalibrasi Sensor</span>
              </span>
            </article>

            <article className="fp-glass-card p-6 sm:p-7 flex flex-col sm:flex-row gap-4 sm:items-start justify-between">
              <div className="flex gap-4 items-start max-w-xl">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#0F1B2D]/[0.07] border border-[#0F1B2D]/15 text-[#0F1B2D]"
                  aria-hidden="true"
                >
                  <Store size={20} />
                </div>
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#E8622C]">
                    02 / Click &amp; Collect dengan Pickup Pass Terverifikasi
                  </span>
                  <h3 className="font-display text-base sm:text-lg font-bold text-[#0F1B2D]">
                    Kunci Stok Online, Uji Coba Fisik di Cleanroom Bench &amp;
                    Studio Test Bay
                  </h3>
                  <p className="text-xs sm:text-sm text-[#3A4A63] leading-relaxed">
                    Pilih metode pengambilan di cabang Senayan City, PIK Avenue,
                    Bandung, Surabaya, atau Bali. Anda menerima kode Pickup Pass
                    untuk <em>unboxing</em> bersama di Cleanroom Tech Bench dan
                    uji coba rig di studio pameran kami.
                  </p>
                </div>
              </div>
              <span className="shrink-0 self-start rounded-full bg-[#0F1B2D]/[0.07] border border-[#0F1B2D]/15 px-3.5 py-1 text-[11px] font-bold text-[#0F1B2D] backdrop-blur-md">
                5 Cabang Resmi
              </span>
            </article>

            <article className="fp-glass-card p-6 sm:p-7 flex flex-col sm:flex-row gap-4 sm:items-start justify-between">
              <div className="flex gap-4 items-start max-w-xl">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-500/12 border border-sky-600/25 text-sky-900"
                  aria-hidden="true"
                >
                  <Truck size={20} />
                </div>
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#E8622C]">
                    03 / Pengiriman Packing Kayu Anti-Statis &amp; Proteksi
                    Retur 7 Hari
                  </span>
                  <h3 className="font-display text-base sm:text-lg font-bold text-[#0F1B2D]">
                    Rangka Kayu Pelindung Sensor &amp; Asuransi Logistik Penuh
                  </h3>
                  <p className="text-xs sm:text-sm text-[#3A4A63] leading-relaxed">
                    Pengiriman antarkota dilindungi rangka kayu khusus dengan
                    bantalan anti-statis dan <em>silica gel</em> untuk mencegah
                    pergeseran sensor dan kelembapan, dilengkapi jaminan klaim
                    retur 7 hari apabila ditemukan <em>factory defect</em> saat{" "}
                    <em>unboxing</em>.
                  </p>
                </div>
              </div>
              <span className="shrink-0 self-start rounded-full bg-sky-500/12 border border-sky-600/25 px-3.5 py-1 text-[11px] font-bold text-sky-900 backdrop-blur-md">
                Asuransi 100%
              </span>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
