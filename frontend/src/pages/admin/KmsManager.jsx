import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import api from "../../api";
import DashboardLayout from "../../components/layout/DashboardLayout";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import { SkeletonGrid } from "../../components/ui/Skeleton";
import { errorMessage, formatDate } from "../../utils/format";

// ─── tiny helpers ─────────────────────────────────────────────────────────────

function StatusPill({ status }) {
  const map = {
    published: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    draft:     "bg-amber-100  text-amber-700  dark:bg-amber-900/40  dark:text-amber-300",
    active:    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    inactive:  "bg-slate-100  text-ts-muted  dark:bg-surface-container     dark:text-slate-400",
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${map[status] ?? map.draft}`}>
      {status}
    </span>
  );
}

function Modal({ title, onClose, children }) {
  const ref = useRef();
  // Close on backdrop click
  function onBackdrop(e) { if (e.target === ref.current) onClose(); }
  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      onClick={onBackdrop}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
    >
      <div className="glass-card w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-surface-high"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-slate-600 dark:text-slate-300">
        {label}{required && <span className="ml-1 text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-ts-subtle bg-white px-3 py-2 text-sm outline-none transition " +
  "focus:border-ts-primary focus:ring-2 focus:ring-brand-500/20 " +
  "dark:border-white/10 dark:bg-surface-container dark:text-slate-100";

// ─── Articles Tab ─────────────────────────────────────────────────────────────

function ArticlesTab({ categories }) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState(null); // null = new

  const load = useCallback(() => {
    setLoading(true);
    api.get("/kms/admin/articles")
      .then((r) => setArticles(r.data.data || []))
      .catch((e) => toast.error(errorMessage(e, "Gagal memuat artikel")))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  function openNew()  { setEditing(null); setShowForm(true); }
  function openEdit(a) { setEditing(a);   setShowForm(true); }

  async function handleDelete(id, title) {
    if (!window.confirm(`Hapus artikel "${title}"?`)) return;
    try {
      await api.delete(`/kms/admin/articles/${id}`);
      toast.success("Artikel dihapus");
      load();
    } catch (e) { toast.error(errorMessage(e)); }
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={openNew} id="btn-new-article">+ Tambah Artikel</Button>
      </div>

      {loading ? (
        <SkeletonGrid count={3} />
      ) : articles.length === 0 ? (
        <EmptyState title="Belum ada artikel" description="Klik '+ Tambah Artikel' untuk membuat artikel baru." />
      ) : (
        <div className="flex flex-col gap-3">
          {articles.map((a) => (
            <Card key={a.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold truncate">{a.title}</h3>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Dibuat oleh <span className="font-medium text-slate-600 dark:text-slate-300">{a.creator_name}</span>
                    {a.created_at && ` · ${formatDate(a.created_at)}`}
                    {a.category_id && ` · Kategori #${a.category_id}`}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusPill status={a.status} />
                  <button
                    onClick={() => openEdit(a)}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-surface-high dark:hover:bg-slate-600 transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(a.id, a.title)}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 transition"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showForm && (
        <ArticleForm
          categories={categories}
          initial={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}
    </>
  );
}

function ArticleForm({ categories, initial, onClose, onSaved }) {
  const isEdit = !!initial;
  const [form, setForm] = useState({
    title:       initial?.title   ?? "",
    content:     initial?.content ?? "",
    category_id: initial?.category_id ?? "",
    status:      initial?.status  ?? "draft",
  });
  const [saving, setSaving] = useState(false);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) {
      toast.error("Judul dan konten wajib diisi"); return;
    }
    setSaving(true);
    const payload = {
      title:       form.title.trim(),
      content:     form.content.trim(),
      category_id: form.category_id || null,
      status:      form.status,
    };
    try {
      if (isEdit) {
        await api.put(`/kms/admin/articles/${initial.id}`, payload);
        toast.success("Artikel diperbarui");
      } else {
        await api.post("/kms/admin/articles", payload);
        toast.success("Artikel dibuat");
      }
      onSaved();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={isEdit ? "Edit Artikel" : "Tambah Artikel"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Judul" required>
          <input id="article-title" className={inputCls} value={form.title}
            onChange={(e) => set("title", e.target.value)} placeholder="Judul artikel…" />
        </Field>
        <Field label="Konten" required>
          <textarea id="article-content" className={`${inputCls} min-h-[140px] resize-y`}
            value={form.content} onChange={(e) => set("content", e.target.value)}
            placeholder="Tulis konten artikel di sini…" />
        </Field>
        <Field label="Kategori">
          <select id="article-category" className={inputCls} value={form.category_id}
            onChange={(e) => set("category_id", e.target.value)}>
            <option value="">— Tanpa kategori —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Status">
          <select id="article-status" className={inputCls} value={form.status}
            onChange={(e) => set("status", e.target.value)}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </Field>
        <div className="flex gap-2 pt-2">
          <Button type="submit" disabled={saving} id="btn-save-article">
            {saving ? "Menyimpan…" : isEdit ? "Simpan Perubahan" : "Buat Artikel"}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>Batal</Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── FAQs Tab ─────────────────────────────────────────────────────────────────

function FaqsTab({ categories }) {
  const [faqs, setFaqs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api.get("/kms/admin/faqs")
      .then((r) => setFaqs(r.data.data || []))
      .catch((e) => toast.error(errorMessage(e, "Gagal memuat FAQ")))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  function openNew()   { setEditing(null); setShowForm(true); }
  function openEdit(f) { setEditing(f);   setShowForm(true); }

  async function handleDelete(id, q) {
    if (!window.confirm(`Hapus FAQ "${q}"?`)) return;
    try {
      await api.delete(`/kms/admin/faqs/${id}`);
      toast.success("FAQ dihapus");
      load();
    } catch (e) { toast.error(errorMessage(e)); }
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={openNew} id="btn-new-faq">+ Tambah FAQ</Button>
      </div>

      {loading ? (
        <SkeletonGrid count={3} />
      ) : faqs.length === 0 ? (
        <EmptyState title="Belum ada FAQ" description="Klik '+ Tambah FAQ' untuk membuat FAQ baru." />
      ) : (
        <div className="flex flex-col gap-3">
          {faqs.map((f) => (
            <Card key={f.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold leading-snug">{f.question}</p>
                  <p className="mt-1 text-sm text-ts-muted line-clamp-2">{f.answer}</p>
                  <p className="mt-1.5 text-xs text-slate-400">
                    Dibuat oleh <span className="font-medium text-slate-600 dark:text-slate-300">{f.creator_name}</span>
                    {f.created_at && ` · ${formatDate(f.created_at)}`}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusPill status={f.status} />
                  <button
                    onClick={() => openEdit(f)}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-surface-high dark:hover:bg-slate-600 transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(f.id, f.question)}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 transition"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showForm && (
        <FaqForm
          categories={categories}
          initial={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}
    </>
  );
}

function FaqForm({ categories, initial, onClose, onSaved }) {
  const isEdit = !!initial;
  const [form, setForm] = useState({
    question:    initial?.question ?? "",
    answer:      initial?.answer   ?? "",
    category_id: initial?.category_id ?? "",
    status:      initial?.status   ?? "active",
  });
  const [saving, setSaving] = useState(false);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.question.trim() || !form.answer.trim()) {
      toast.error("Pertanyaan dan jawaban wajib diisi"); return;
    }
    setSaving(true);
    const payload = {
      question:    form.question.trim(),
      answer:      form.answer.trim(),
      category_id: form.category_id || null,
      status:      form.status,
    };
    try {
      if (isEdit) {
        await api.put(`/kms/admin/faqs/${initial.id}`, payload);
        toast.success("FAQ diperbarui");
      } else {
        await api.post("/kms/admin/faqs", payload);
        toast.success("FAQ dibuat");
      }
      onSaved();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={isEdit ? "Edit FAQ" : "Tambah FAQ"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Pertanyaan" required>
          <input id="faq-question" className={inputCls} value={form.question}
            onChange={(e) => set("question", e.target.value)} placeholder="Pertanyaan yang sering diajukan…" />
        </Field>
        <Field label="Jawaban" required>
          <textarea id="faq-answer" className={`${inputCls} min-h-[120px] resize-y`}
            value={form.answer} onChange={(e) => set("answer", e.target.value)}
            placeholder="Tulis jawaban di sini…" />
        </Field>
        <Field label="Kategori">
          <select id="faq-category" className={inputCls} value={form.category_id}
            onChange={(e) => set("category_id", e.target.value)}>
            <option value="">— Tanpa kategori —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Status">
          <select id="faq-status" className={inputCls} value={form.status}
            onChange={(e) => set("status", e.target.value)}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </Field>
        <div className="flex gap-2 pt-2">
          <Button type="submit" disabled={saving} id="btn-save-faq">
            {saving ? "Menyimpan…" : isEdit ? "Simpan Perubahan" : "Buat FAQ"}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>Batal</Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Categories Tab ──────────────────────────────────────────────────────────

function CategoriesTab({ categories, onRefresh }) {
  const [name, setName]   = useState("");
  const [desc, setDesc]   = useState("");
  const [saving, setSaving] = useState(false);

  async function handleAdd(e) {
    e.preventDefault();
    if (!name.trim()) { toast.error("Nama wajib diisi"); return; }
    setSaving(true);
    try {
      await api.post("/kms/admin/categories", { name: name.trim(), description: desc.trim() });
      toast.success("Kategori ditambahkan");
      setName(""); setDesc("");
      onRefresh();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally { setSaving(false); }
  }

  async function handleDelete(id, catName) {
    if (!window.confirm(`Hapus kategori "${catName}"? Artikel/FAQ di dalamnya tidak akan terhapus.`)) return;
    try {
      await api.delete(`/kms/admin/categories/${id}`);
      toast.success("Kategori dihapus");
      onRefresh();
    } catch (e) { toast.error(errorMessage(e)); }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Daftar kategori */}
      <div>
        <h3 className="mb-3 font-semibold">Daftar Kategori</h3>
        {categories.length === 0 ? (
          <EmptyState title="Belum ada kategori" description="" />
        ) : (
          <div className="flex flex-col gap-2">
            {categories.map((c) => (
              <div key={c.id}
                className="flex items-center justify-between rounded-xl border border-ts-subtle bg-white px-4 py-3 dark:border-white/10 dark:bg-surface-container"
              >
                <div>
                  <p className="font-medium">{c.name}</p>
                  {c.description && <p className="text-xs text-slate-400">{c.description}</p>}
                </div>
                <button
                  onClick={() => handleDelete(c.id, c.name)}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 transition"
                >
                  Hapus
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Form tambah kategori */}
      <div>
        <h3 className="mb-3 font-semibold">Tambah Kategori Baru</h3>
        <Card>
          <form onSubmit={handleAdd} className="flex flex-col gap-4">
            <Field label="Nama Kategori" required>
              <input id="cat-name" className={inputCls} value={name}
                onChange={(e) => setName(e.target.value)} placeholder="mis. Akun & Login" />
            </Field>
            <Field label="Deskripsi">
              <input id="cat-desc" className={inputCls} value={desc}
                onChange={(e) => setDesc(e.target.value)} placeholder="Opsional…" />
            </Field>
            <Button type="submit" disabled={saving} id="btn-add-category">
              {saving ? "Menyimpan…" : "Tambah Kategori"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

const TABS = [
  { key: "articles",   label: "📄 Artikel" },
  { key: "faqs",       label: "❓ FAQ" },
  { key: "categories", label: "🗂️ Kategori" },
];

export default function KmsManager() {
  const [tab, setTab]           = useState("articles");
  const [categories, setCategories] = useState([]);

  const loadCategories = useCallback(() => {
    api.get("/kms/admin/categories")
      .then((r) => setCategories(r.data.data || []))
      .catch(() => {});
  }, []);

  useEffect(loadCategories, [loadCategories]);

  return (
    <DashboardLayout
      title="Manajemen KMS"
      subtitle="Kelola artikel, FAQ, dan kategori Pusat Bantuan Ticksy"
    >
      {/* Tab bar */}
      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            id={`tab-kms-${t.key}`}
            onClick={() => setTab(t.key)}
            className={`rounded-xl px-5 py-2 text-sm font-medium transition-all ${
              tab === t.key
                ? "bg-ts-primary text-white shadow-md shadow-brand-600/30"
                : "bg-white text-slate-600 hover:bg-slate-100 dark:bg-surface-container dark:text-slate-300 dark:hover:bg-surface-high"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "articles"   && <ArticlesTab   categories={categories} />}
      {tab === "faqs"       && <FaqsTab       categories={categories} />}
      {tab === "categories" && <CategoriesTab categories={categories} onRefresh={loadCategories} />}
    </DashboardLayout>
  );
}
