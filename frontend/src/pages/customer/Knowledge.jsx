import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import api from "../../api";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";

export default function Knowledge() {
  const [articles, setArticles] = useState([]);
  const [faqs, setFaqs] = useState([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    api.get("/kms/articles").then((r) => setArticles(r.data.data || []));
    api.get("/kms/faqs").then((r) => setFaqs(r.data.data || []));
  }, []);

  const search = () => api.get(`/kms/articles?q=${q}`).then((r) => setArticles(r.data.data || []));

  return (
    <div className="home-surface">
      <div className="mx-auto max-w-5xl px-6 py-8 lg:px-12">
        <h1 className="font-jakarta text-2xl font-bold text-ts-ink dark:text-white md:text-3xl">Pusat Bantuan Ticksy</h1>
        <div className="my-6 flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full rounded-full border border-ts-subtle bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-ts-primary dark:border-white/10 dark:bg-surface-container dark:text-white"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              placeholder="Cari artikel..."
            />
          </div>
          <Button onClick={search}>Cari</Button>
        </div>

        <h2 className="font-jakarta text-xl font-bold text-ts-ink dark:text-white">Artikel</h2>
        <div className="mt-3 space-y-3">
          {articles.map((a) => (
            <Card key={a.id}>
              <h3 className="font-jakarta font-bold text-ts-ink dark:text-white">{a.title}</h3>
              <p className="mt-1 text-sm text-ts-muted dark:text-slate-400">{a.content.slice(0, 150)}...</p>
            </Card>
          ))}
        </div>

        <h2 className="mt-8 font-jakarta text-xl font-bold text-ts-ink dark:text-white">FAQ</h2>
        <div className="mt-3 space-y-3">
          {faqs.map((f) => (
            <Card key={f.id}>
              <h3 className="font-jakarta font-bold text-ts-ink dark:text-white">{f.question}</h3>
              <p className="mt-1 text-sm text-ts-muted dark:text-slate-400">{f.answer}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
