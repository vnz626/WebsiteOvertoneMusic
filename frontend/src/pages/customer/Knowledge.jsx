import { useEffect, useState } from "react";
import { Search, BookOpen, MessageCircleQuestion, ChevronRight } from "lucide-react";
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
    <div className="min-h-[calc(100vh-72px)] bg-canvas py-10 text-ink">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10">

        {/* Header */}
        <div className="border-b border-line pb-8 mb-10">
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent block">
            Pusat Bantuan &amp; Basis Pengetahuan (KMS)
          </span>
          <h1 className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-ink mt-1.5">
            Pusat Bantuan Overtone Pro Cinema Store
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-ink-secondary max-w-2xl leading-relaxed">
            Temukan panduan lengkap seputar pembelian kamera bioskop, layanan Click &amp; Collect di Pro Cinema Store, kalibrasi sensor di Cleanroom Bench, garansi distributor resmi, hingga prosedur klaim retur 7 hari.
          </p>

          {/* Search Box */}
          <form onSubmit={search} className="mt-6 flex max-w-xl gap-2">
            <div className="relative flex-1">
              <label htmlFor="kms-public-search" className="sr-only">Cari artikel bantuan atau FAQ</label>
              <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
              <input
                id="kms-public-search"
                type="search"
                className="ot-input pl-10"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari artikel bantuan, garansi, atau FAQ..."
              />
            </div>
            <Button type="submit" variant="primary">
              Cari Solusi
            </Button>
          </form>
        </div>

        {/* 2-Column Content: Articles & FAQ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

          {/* Kolom Kiri: Panduan & Artikel (col 7) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center gap-2 border-b border-line pb-3">
              <BookOpen size={18} className="text-accent" aria-hidden="true" />
              <h2 className="font-display text-lg font-bold text-ink">
                Artikel &amp; Panduan Cinema Gear
              </h2>
            </div>

            {loading ? (
              <div className="space-y-3" role="status" aria-busy="true">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-28 rounded-md bg-surface border border-line skeleton" />
                ))}
              </div>
            ) : articles.length === 0 ? (
              <div className="rounded-md border border-dashed border-line-strong bg-surface p-8 text-center text-xs text-ink-muted">
                Tidak ada artikel yang cocok dengan kata kunci pencarian Anda.
              </div>
            ) : (
              <div className="space-y-4">
                {articles.map((a) => (
                  <article
                    key={a.id}
                    className="rounded-md border border-line bg-surface p-5 transition-colors hover:border-line-strong"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-accent">
                          {a.category || "Panduan Resmi"}
                        </span>
                        <h3 className="font-display font-bold text-ink text-sm mt-0.5">
                          {a.title}
                        </h3>
                      </div>
                      <ChevronRight size={16} className="text-ink-muted shrink-0 mt-1" aria-hidden="true" />
                    </div>
                    <p className="mt-2 text-xs text-ink-secondary leading-relaxed max-w-[65ch]">
                      {a.content?.slice(0, 220)}{a.content?.length > 220 ? "..." : ""}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </div>

          {/* Kolom Kanan: FAQ (col 5) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="flex items-center gap-2 border-b border-line pb-3">
              <MessageCircleQuestion size={18} className="text-accent" aria-hidden="true" />
              <h2 className="font-display text-lg font-bold text-ink">
                Pertanyaan Umum (FAQ)
              </h2>
            </div>

            {loading ? (
              <div className="space-y-3" role="status" aria-busy="true">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 rounded-md bg-surface border border-line skeleton" />
                ))}
              </div>
            ) : faqs.length === 0 ? (
              <div className="rounded-md border border-dashed border-line-strong bg-surface p-8 text-center text-xs text-ink-muted">
                Belum ada pertanyaan umum yang terdaftar.
              </div>
            ) : (
              <div className="space-y-3.5">
                {faqs.map((f) => (
                  <article
                    key={f.id}
                    className="rounded-md border border-line bg-surface p-4"
                  >
                    <h3 className="font-display font-bold text-ink text-xs sm:text-sm">
                      {f.question}
                    </h3>
                    <p className="mt-2 text-xs text-ink-secondary leading-relaxed border-t border-line pt-2">
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
