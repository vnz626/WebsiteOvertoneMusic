import { useEffect, useState } from "react";
import { Search, BookOpen, MessageCircleQuestion, ChevronRight, HelpCircle } from "lucide-react";
import api from "../../api";
import Button from "../../components/ui/Button";

export default function Knowledge() {
  const [articles, setArticles] = useState([]);
  const [faqs, setFaqs] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/kms/articles").then((r) => setArticles(r.data.data || [])).catch(() => setArticles([])),
      api.get("/kms/faqs").then((r) => setFaqs(r.data.data || [])).catch(() => setFaqs([])),
    ]).finally(() => setLoading(false));
  }, []);

  const search = (e) => {
    if (e) e.preventDefault();
    if (!q.trim()) {
      api.get("/kms/articles").then((r) => setArticles(r.data.data || []));
      return;
    }
    api.get(`/kms/articles?q=${encodeURIComponent(q)}`).then((r) => setArticles(r.data.data || []));
  };

  return (
    <div className="min-h-screen fp-home-canvas pb-24 px-4 sm:px-6 lg:px-12 pt-8">
      <div className="mx-auto max-w-[1440px]">

        {/* Header Frosted Glass Box */}
        <div className="fp-glass-card !p-8 sm:!p-10 mb-10">
          <div className="fp-section-pill mb-2">
            <HelpCircle size={12} className="text-[#E8622C]" aria-hidden="true" />
            <span>Pusat Bantuan &amp; Basis Pengetahuan (KMS)</span>
          </div>
          <h1 className="font-display text-2xl sm:text-4xl font-extrabold tracking-tight text-[#0F1B2D] mt-1.5">
            Pusat Panduan &amp; FAQ Focalpoint Pro
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-[#3A4A63] max-w-2xl leading-relaxed">
            Temukan panduan lengkap seputar pembelian kamera bioskop, layanan Click &amp; Collect di Showroom, kalibrasi sensor di Cleanroom Bench, garansi distributor resmi, hingga prosedur klaim retur 7 hari.
          </p>

          {/* Search Box */}
          <form onSubmit={search} className="mt-6 flex max-w-xl gap-2.5">
            <div className="relative flex-1">
              <label htmlFor="kms-public-search" className="sr-only">Cari artikel bantuan atau FAQ</label>
              <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#3A4A63]" aria-hidden="true" />
              <input
                id="kms-public-search"
                type="search"
                className="h-10 w-full rounded-full border border-white/80 bg-white/80 pl-11 pr-4 text-xs font-medium text-[#0F1B2D] placeholder:text-[#3A4A63]/80 focus:border-[#E8622C] focus:bg-white focus:outline-none transition-all shadow-xs"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari artikel bantuan, garansi, atau FAQ..."
              />
            </div>
            <button type="submit" className="fp-btn-glass-primary !py-2 !px-5 !text-xs shrink-0">
              Cari Solusi
            </button>
          </form>
        </div>

        {/* 2-Column Content: Articles & FAQ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* Kolom Kiri: Panduan & Artikel (col 7) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center gap-2 border-b border-[#0F1B2D]/10 pb-3">
              <BookOpen size={18} className="text-[#E8622C]" aria-hidden="true" />
              <h2 className="font-display text-lg font-bold text-[#0F1B2D]">
                Artikel &amp; Panduan Cinema Gear
              </h2>
            </div>

            {loading ? (
              <div className="space-y-3" role="status" aria-busy="true">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-28 rounded-2xl bg-white/60 skeleton" />
                ))}
              </div>
            ) : articles.length === 0 ? (
              <div className="fp-glass-card !p-8 text-center text-xs text-[#3A4A63]">
                Tidak ada artikel yang cocok dengan kata kunci pencarian Anda.
              </div>
            ) : (
              <div className="space-y-4">
                {articles.map((a) => (
                  <article
                    key={a.id}
                    className="fp-glass-card !p-5 hover:border-[#E8622C]/40 transition-all cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#E8622C]">
                          {a.category || "Panduan Resmi"}
                        </span>
                        <h3 className="font-display font-bold text-[#0F1B2D] text-sm mt-0.5">
                          {a.title}
                        </h3>
                      </div>
                      <ChevronRight size={16} className="text-[#3A4A63] shrink-0 mt-1" aria-hidden="true" />
                    </div>
                    <p className="mt-2 text-xs text-[#3A4A63] leading-relaxed max-w-[65ch]">
                      {a.content?.slice(0, 220)}{a.content?.length > 220 ? "..." : ""}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </div>

          {/* Kolom Kanan: FAQ (col 5) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-[#0F1B2D]/10 pb-3">
              <MessageCircleQuestion size={18} className="text-[#E8622C]" aria-hidden="true" />
              <h2 className="font-display text-lg font-bold text-[#0F1B2D]">
                Pertanyaan Umum (FAQ)
              </h2>
            </div>

            {loading ? (
              <div className="space-y-3" role="status" aria-busy="true">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 rounded-2xl bg-white/60 skeleton" />
                ))}
              </div>
            ) : faqs.length === 0 ? (
              <div className="fp-glass-card !p-8 text-center text-xs text-[#3A4A63]">
                Belum ada pertanyaan umum yang terdaftar.
              </div>
            ) : (
              <div className="space-y-3.5">
                {faqs.map((f) => (
                  <article
                    key={f.id}
                    className="fp-glass-card !p-5"
                  >
                    <h3 className="font-display font-bold text-[#0F1B2D] text-xs sm:text-sm">
                      {f.question}
                    </h3>
                    <p className="mt-2 text-xs text-[#3A4A63] leading-relaxed border-t border-[#0F1B2D]/10 pt-2">
                      {f.answer}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
