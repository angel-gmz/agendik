"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { BookOpen, FileText, Globe, Plus, Trash2, Upload, Loader2 } from "lucide-react";

interface Faq {
  id: string;
  question: string;
  answer: string;
  category: string;
}

interface KnowledgeDoc {
  id: string;
  title: string;
  sourceType: string;
  sourceUrl: string | null;
  status: string;
  chunkCount: number;
  createdAt: string;
}

export default function KnowledgePage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
  const [maxDocs, setMaxDocs] = useState(10);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  // FAQ form
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [category, setCategory] = useState("General");

  // Text / URL doc form
  const [docMode, setDocMode] = useState<"text" | "url" | "file">("text");
  const [docTitle, setDocTitle] = useState("");
  const [docContent, setDocContent] = useState("");
  const [docUrl, setDocUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const loadData = useCallback(async () => {
    const res = await fetch(`/api/tenants/${tenantSlug}/knowledge`);
    if (res.ok) {
      const data = await res.json();
      setFaqs(data.faqs || []);
      setDocs(data.documents || []);
      setMaxDocs(data.maxKnowledgeDocs || 10);
    }
  }, [tenantSlug]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function addFaq(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch(`/api/tenants/${tenantSlug}/knowledge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "faq", question, answer, category }),
      });
      if (res.ok) {
        setQuestion("");
        setAnswer("");
        setMsg("FAQ agregada.");
        loadData();
      }
    } finally {
      setBusy(false);
    }
  }

  async function addDocument(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      let res: Response;
      if (docMode === "file" && file) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("title", docTitle || file.name);
        res = await fetch(`/api/tenants/${tenantSlug}/knowledge`, {
          method: "POST",
          body: fd,
        });
      } else {
        res = await fetch(`/api/tenants/${tenantSlug}/knowledge`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            docMode === "url"
              ? { kind: "url", title: docTitle, url: docUrl }
              : { kind: "text", title: docTitle, content: docContent }
          ),
        });
      }
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || "Error indexando documento");
      } else {
        setDocTitle("");
        setDocContent("");
        setDocUrl("");
        setFile(null);
        setMsg("Documento indexado correctamente en la base RAG.");
        loadData();
      }
    } finally {
      setBusy(false);
    }
  }

  async function removeItem(kind: "faq" | "document", id: string) {
    await fetch(`/api/tenants/${tenantSlug}/knowledge?kind=${kind}&id=${id}`, {
      method: "DELETE",
    });
    loadData();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Base de Conocimiento (FAQs + RAG)</h1>
        <p className="text-sm text-slate-500">
          Entrena a tu agente con preguntas frecuentes y documentos PDF, TXT o URLs indexados con pgvector
        </p>
      </div>

      {msg && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm text-indigo-800">
          {msg}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* FAQs Section */}
        <div className="space-y-4">
          <form
            onSubmit={addFaq}
            className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
              <BookOpen className="h-4 w-4 text-indigo-600" /> Nueva Pregunta Frecuente (FAQ)
            </h2>
            <input
              type="text"
              placeholder="Categoría (ej. Pagos, Horarios, Servicios)"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              type="text"
              required
              placeholder="Pregunta del cliente"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <textarea
              required
              rows={3}
              placeholder="Respuesta oficial del negocio..."
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" /> Guardar FAQ
            </button>
          </form>

          <div className="space-y-2.5">
            {faqs.map((f) => (
              <div
                key={f.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                      {f.category}
                    </span>
                    <h3 className="mt-1 text-sm font-bold text-slate-900">{f.question}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">{f.answer}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem("faq", f.id)}
                    className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RAG Documents Section */}
        <div className="space-y-4">
          <form
            onSubmit={addDocument}
            className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
                <FileText className="h-4 w-4 text-indigo-600" /> Documentos RAG ({docs.length}/
                {maxDocs})
              </h2>
              <div className="flex gap-1">
                {[
                  { id: "text", label: "Texto" },
                  { id: "file", label: "PDF/TXT" },
                  { id: "url", label: "URL" },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setDocMode(m.id as typeof docMode)}
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                      docMode === m.id
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <input
              type="text"
              placeholder="Título del documento"
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              required={docMode !== "file"}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />

            {docMode === "text" && (
              <textarea
                required
                rows={4}
                placeholder="Pega políticas, catálogo de precios, manuales..."
                value={docContent}
                onChange={(e) => setDocContent(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            )}

            {docMode === "url" && (
              <input
                type="url"
                required
                placeholder="https://minegocio.com/preguntas-frecuentes"
                value={docUrl}
                onChange={(e) => setDocUrl(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            )}

            {docMode === "file" && (
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-5 text-xs text-slate-500 hover:border-indigo-300">
                <Upload className="mb-1.5 h-5 w-5 text-indigo-500" />
                <span>{file ? file.name : "Seleccionar archivo .PDF o .TXT"}</span>
                <input
                  type="file"
                  accept=".pdf,.txt,.md"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </label>
            )}

            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Indexar en RAG
            </button>
          </form>

          <div className="space-y-2.5">
            {docs.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {d.sourceType === "URL" ? (
                      <Globe className="h-4 w-4 text-sky-500" />
                    ) : (
                      <FileText className="h-4 w-4 text-indigo-500" />
                    )}
                    <span className="truncate text-sm font-bold text-slate-900">{d.title}</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {d.sourceType} · {d.chunkCount} fragmentos · Estado:{" "}
                    <span className="font-semibold text-emerald-600">{d.status}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem("document", d.id)}
                  className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
